const ocrService = require('./ocrService');
const aiEvaluationService = require('./aiEvaluationService');
const plagiarismService = require('./plagiarismService');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const path = require('path');

class PipelineService {
  /**
   * OCR Agent: Extract text and parse Q&A structure
   */
  async runOCRAgent(submission, filePath) {
    console.log(`[OCR Agent] Processing submission ${submission._id}`);

    const fileType = path.extname(filePath).toLowerCase().replace('.', '');

    // Extract raw text
    const { text, method, confidence } = await ocrService.extractText(filePath, fileType);

    if (!text || text.trim().length < 5) {
      throw new Error('OCR could not extract meaningful text from the file.');
    }

    const cleanedText = ocrService.cleanText(text);

    // Parse questions and answers
    const { questions, answers } = ocrService.parseQuestionsAndAnswers(cleanedText);

    // Update submission with OCR results
    await Submission.findByIdAndUpdate(submission._id, {
      rawText: cleanedText,
      extractedQuestions: questions,
      extractedAnswers: answers,
      status: 'ocr_complete',
    });

    console.log(`[OCR Agent] Extracted ${questions.length} Q&A pairs. Method: ${method}, Confidence: ${confidence}%`);

    return { text: cleanedText, questions, answers, confidence };
  }

  /**
   * Evaluation Agent: AI-powered answer evaluation
   */
  async runEvaluationAgent(submission, assignment) {
    console.log(`[Evaluation Agent] Evaluating submission ${submission._id}`);

    const extractedAnswers = submission.extractedAnswers || [];
    const assignmentQuestions = assignment.questions || [];
    const globalRubric = assignment.globalRubric || [];

    // Build answer objects with question context
    const answersWithContext = extractedAnswers.map(answer => {
      const assignmentQ = assignmentQuestions.find(q => q.number === answer.questionNumber);
      return {
        ...answer,
        questionText: assignmentQ?.text || answer.questionText,
      };
    });

    const {
      evaluations,
      totalMarks,
      maxPossibleMarks,
      percentage,
      overallFeedback,
      grade,
    } = await aiEvaluationService.evaluateSubmission(
      answersWithContext,
      assignmentQuestions,
      globalRubric
    );

    // Update submission
    await Submission.findByIdAndUpdate(submission._id, {
      evaluations,
      totalMarks,
      maxPossibleMarks,
      percentage,
      overallFeedback,
      grade,
      evaluatedAt: new Date(),
    });

    console.log(`[Evaluation Agent] Completed. Score: ${totalMarks}/${maxPossibleMarks} (${percentage}%)`);

    return { evaluations, totalMarks, maxPossibleMarks, percentage, grade };
  }

  /**
   * Plagiarism Agent: Generate embeddings and detect plagiarism
   */
  async runPlagiarismAgent(submission, allSubmissions) {
    console.log(`[Plagiarism Agent] Checking submission ${submission._id}`);

    const answers = submission.extractedAnswers || [];

    if (answers.length === 0) {
      console.log('[Plagiarism Agent] No answers to check');
      return { matches: [], highestSimilarity: 0 };
    }

    // Generate embeddings for this submission
    let embeddings = submission.embeddings || [];
    if (embeddings.length === 0) {
      embeddings = await plagiarismService.generateEmbeddings(answers);
      await Submission.findByIdAndUpdate(submission._id, { embeddings });
      submission.embeddings = embeddings;
    }

    // Check against other submissions
    const { matches, highestSimilarity, isPlagiarismSuspect } =
      await plagiarismService.detectPlagiarism(submission, allSubmissions);

    // Update submission with plagiarism results
    await Submission.findByIdAndUpdate(submission._id, {
      plagiarismMatches: matches,
      highestSimilarity,
      isPlagiarismSuspect,
    });

    if (isPlagiarismSuspect) {
      console.log(`[Plagiarism Agent] ⚠️ SUSPICIOUS - Highest similarity: ${highestSimilarity}%`);
    } else {
      console.log(`[Plagiarism Agent] Clean. Highest similarity: ${highestSimilarity}%`);
    }

    return { matches, highestSimilarity, isPlagiarismSuspect };
  }

  /**
   * Feedback Agent: Generate personalized study recommendations
   */
  async runFeedbackAgent(submission) {
    console.log(`[Feedback Agent] Generating feedback for ${submission._id}`);
    // Feedback is already included in evaluation agent output
    // This agent can be extended for personalized learning paths
    return {
      status: 'complete',
      feedbackGenerated: true,
    };
  }

  /**
   * Full Pipeline: Run all agents in sequence
   */
  async runFullPipeline(submissionId, filePath, runPlagiarism = true) {
    const submission = await Submission.findById(submissionId).populate('student', 'name email');
    if (!submission) throw new Error('Submission not found');

    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) throw new Error('Assignment not found');

    console.log(`\n=== ScoreLens AI Pipeline Starting ===`);
    console.log(`Submission: ${submissionId}`);
    console.log(`Assignment: ${assignment.title}`);
    console.log(`Student: ${submission.student?.name || 'Unknown'}`);

    try {
      // Update status to processing
      await Submission.findByIdAndUpdate(submissionId, { status: 'processing' });

      // 1. OCR Agent
      const ocrResult = await this.runOCRAgent(submission, filePath);
      submission.extractedAnswers = ocrResult.answers;
      submission.extractedQuestions = ocrResult.questions;

      // 2. Evaluation Agent
      await this.runEvaluationAgent(submission, assignment);

      // 3. Plagiarism Agent (if requested)
      if (runPlagiarism) {
        const otherSubmissions = await Submission.find({
          assignment: submission.assignment,
          _id: { $ne: submissionId },
          status: 'evaluated',
          embeddings: { $exists: true, $not: { $size: 0 } },
        }).populate('student', 'name');

        await this.runPlagiarismAgent(submission, otherSubmissions);
      }

      // 4. Feedback Agent
      await this.runFeedbackAgent(submission);

      // Mark as evaluated
      await Submission.findByIdAndUpdate(submissionId, {
        status: 'evaluated',
        processingError: '',
      });

      // Update assignment stats
      await this.updateAssignmentStats(submission.assignment);

      console.log(`\n=== Pipeline Completed Successfully ===\n`);

      return await Submission.findById(submissionId).populate('student', 'name email');

    } catch (error) {
      console.error(`\n=== Pipeline Failed ===\nError: ${error.message}\n`);

      await Submission.findByIdAndUpdate(submissionId, {
        status: 'error',
        processingError: error.message,
      });

      throw error;
    }
  }

  /**
   * Update assignment aggregate statistics
   */
  async updateAssignmentStats(assignmentId) {
    const submissions = await Submission.find({
      assignment: assignmentId,
      status: 'evaluated',
    });

    if (submissions.length === 0) return;

    const avg = submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length;

    await Assignment.findByIdAndUpdate(assignmentId, {
      submissionsCount: submissions.length,
      averageScore: Math.round(avg * 10) / 10,
    });
  }
}

module.exports = new PipelineService();
