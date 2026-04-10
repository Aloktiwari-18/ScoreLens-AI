const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');

class AIEvaluationService {
  constructor() {
    this.model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 2000,
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.parser = new JsonOutputParser();
    this._buildChains();
  }

  _buildChains() {
    // --- Single Question Evaluation Chain ---
    const evaluationTemplate = `You are an expert academic evaluator. Evaluate the student's answer for the given question strictly based on the rubric provided.

QUESTION: {question}

STUDENT ANSWER: {studentAnswer}

RUBRIC CRITERIA:
{rubric}

TOTAL MARKS FOR THIS QUESTION: {maxMarks}

IDEAL ANSWER HINT (if provided): {idealAnswerHint}

STRICT EVALUATION INSTRUCTIONS:
1. Evaluate ONLY based on the rubric criteria listed above.
2. For each criterion, assign marks out of the allocated maximum.
3. Be objective, fair, and consistent.
4. The sum of all criterion scores MUST NOT exceed the total marks.
5. Provide specific, actionable feedback.
6. Identify key improvements the student should make.
7. If the student's answer is blank or irrelevant, give 0 marks.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "marks": <total marks awarded as number>,
  "maxMarks": <maximum marks as number>,
  "rubric": {{
    <criterion_name>: {{
      "score": <score as number>,
      "maxScore": <max score as number>,
      "comment": "<specific comment about this criterion>"
    }}
  }},
  "feedback": "<overall detailed feedback in 3-4 sentences>",
  "improvements": "<specific actionable improvements in 2-3 sentences>",
  "ideal_answer": "<a concise ideal answer for this question>",
  "confidence": <your confidence in this evaluation from 0-100>
}}`;

    this.evaluationPrompt = PromptTemplate.fromTemplate(evaluationTemplate);

    // --- Batch Summary Chain ---
    const summaryTemplate = `You are an academic analytics AI. Given evaluation results for a student's submission, generate an overall performance summary.

STUDENT EVALUATIONS:
{evaluations}

TOTAL MARKS AWARDED: {totalMarks} / {maxMarks}

Generate a holistic performance summary. Return ONLY valid JSON:
{{
  "overallFeedback": "<comprehensive 4-5 sentence overall feedback>",
  "grade": "<letter grade: A+, A, B+, B, C+, C, D, F>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "studyRecommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}}`;

    this.summaryPrompt = PromptTemplate.fromTemplate(summaryTemplate);
  }

  /**
   * Evaluate a single question-answer pair
   */
  async evaluateAnswer(question, studentAnswer, rubric, maxMarks, idealAnswerHint = '') {
    try {
      // Format rubric for prompt
      const rubricText = rubric && rubric.length > 0
        ? rubric.map(r => `- ${r.name}: ${r.maxMarks} marks - ${r.description || 'Based on quality and accuracy'}`).join('\n')
        : `- Content Accuracy: ${Math.floor(maxMarks * 0.5)} marks - Correctness and completeness of information\n- Depth & Detail: ${Math.floor(maxMarks * 0.3)} marks - Thoroughness and insight\n- Structure & Clarity: ${Math.floor(maxMarks * 0.2)} marks - Organization and presentation`;

      const chain = RunnableSequence.from([
        this.evaluationPrompt,
        this.model,
        this.parser,
      ]);

      const result = await chain.invoke({
        question: question || 'General response',
        studentAnswer: studentAnswer || '(No answer provided)',
        rubric: rubricText,
        maxMarks: maxMarks || 10,
        idealAnswerHint: idealAnswerHint || 'Not provided',
      });

      // Validate and clamp marks
      result.marks = Math.min(Math.max(0, Number(result.marks) || 0), maxMarks);
      result.maxMarks = maxMarks;
      result.confidence = Math.min(100, Math.max(0, Number(result.confidence) || 70));

      // Normalize rubric scores
      if (result.rubric) {
        for (const key in result.rubric) {
          const criterion = result.rubric[key];
          const rubricItem = rubric?.find(r => r.name.toLowerCase() === key.toLowerCase());
          const maxScore = rubricItem?.maxMarks || criterion.maxScore || 0;
          criterion.score = Math.min(Math.max(0, Number(criterion.score) || 0), maxScore);
          criterion.maxScore = maxScore;
        }
      }

      return result;
    } catch (error) {
      console.error('AI evaluation error:', error.message);
      // Return fallback evaluation
      return this._fallbackEvaluation(studentAnswer, maxMarks, rubric);
    }
  }

  /**
   * Evaluate all answers in a submission
   */
  async evaluateSubmission(extractedAnswers, assignmentQuestions, globalRubric) {
    const evaluations = [];
    let totalMarks = 0;
    let maxPossibleMarks = 0;

    for (const answer of extractedAnswers) {
      const qNum = answer.questionNumber;
      const assignmentQ = assignmentQuestions?.find(q => q.number === qNum);
      
      const questionText = assignmentQ?.text || answer.questionText || `Question ${qNum}`;
      const maxMarks = assignmentQ?.maxMarks || 10;
      const rubric = assignmentQ?.rubric?.length > 0 ? assignmentQ.rubric : globalRubric || [];
      const idealAnswerHint = assignmentQ?.idealAnswer || '';

      maxPossibleMarks += maxMarks;

      try {
        const evaluation = await this.evaluateAnswer(
          questionText,
          answer.text,
          rubric,
          maxMarks,
          idealAnswerHint
        );

        evaluations.push({
          questionNumber: qNum,
          questionText,
          studentAnswer: answer.text,
          marks: evaluation.marks,
          maxMarks,
          rubricScores: this._convertRubricToArray(evaluation.rubric),
          feedback: evaluation.feedback || '',
          improvements: evaluation.improvements || '',
          idealAnswer: evaluation.ideal_answer || '',
          confidence: evaluation.confidence || 70,
        });

        totalMarks += evaluation.marks;
      } catch (err) {
        console.error(`Failed to evaluate Q${qNum}:`, err.message);
        evaluations.push({
          questionNumber: qNum,
          questionText,
          studentAnswer: answer.text,
          marks: 0,
          maxMarks,
          rubricScores: [],
          feedback: 'Evaluation failed. Please re-evaluate manually.',
          improvements: '',
          idealAnswer: '',
          confidence: 0,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate overall summary
    let summaryResult = { overallFeedback: '', grade: 'N/A', strengths: [], weaknesses: [], studyRecommendations: [] };
    
    try {
      summaryResult = await this.generateSummary(evaluations, totalMarks, maxPossibleMarks);
    } catch (err) {
      console.error('Summary generation error:', err.message);
      summaryResult.grade = this._calculateGrade((totalMarks / maxPossibleMarks) * 100);
      summaryResult.overallFeedback = `Student scored ${totalMarks}/${maxPossibleMarks}.`;
    }

    return {
      evaluations,
      totalMarks: Math.round(totalMarks * 10) / 10,
      maxPossibleMarks,
      percentage: maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 1000) / 10 : 0,
      overallFeedback: summaryResult.overallFeedback,
      grade: summaryResult.grade,
    };
  }

  /**
   * Generate submission summary
   */
  async generateSummary(evaluations, totalMarks, maxMarks) {
    const evaluationsSummary = evaluations.map(e =>
      `Q${e.questionNumber}: ${e.marks}/${e.maxMarks} - ${e.feedback?.slice(0, 100) || 'No feedback'}`
    ).join('\n');

    const chain = RunnableSequence.from([
      this.summaryPrompt,
      this.model,
      this.parser,
    ]);

    return await chain.invoke({
      evaluations: evaluationsSummary,
      totalMarks,
      maxMarks,
    });
  }

  _convertRubricToArray(rubricObj) {
    if (!rubricObj || typeof rubricObj !== 'object') return [];
    return Object.entries(rubricObj).map(([criterion, data]) => ({
      criterion,
      score: data.score || 0,
      maxScore: data.maxScore || 0,
      comment: data.comment || '',
    }));
  }

  _fallbackEvaluation(studentAnswer, maxMarks, rubric) {
    const hasContent = studentAnswer && studentAnswer.trim().length > 20;
    const baseScore = hasContent ? Math.floor(maxMarks * 0.4) : 0;

    const rubricScores = {};
    if (rubric && rubric.length > 0) {
      rubric.forEach(r => {
        rubricScores[r.name] = {
          score: hasContent ? Math.floor(r.maxMarks * 0.4) : 0,
          maxScore: r.maxMarks,
          comment: 'Auto-evaluated (AI unavailable)',
        };
      });
    }

    return {
      marks: baseScore,
      maxMarks,
      rubric: rubricScores,
      feedback: 'Automatic evaluation was not available. This score is a placeholder.',
      improvements: 'Please request manual re-evaluation.',
      ideal_answer: 'Not available',
      confidence: 0,
    };
  }

  _calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  }
}

module.exports = new AIEvaluationService();
