const { OpenAIEmbeddings } = require('@langchain/openai');

class PlagiarismService {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_KEY,
      batchSize: 512,
    });

    // In-memory vector store (FAISS-like)
    this.vectorStore = new Map(); // submissionId -> { vectors, texts }
    this.SUSPICIOUS_THRESHOLD = parseFloat(process.env.PLAGIARISM_THRESHOLD) || 0.85;
    this.HIGH_SIMILAR_THRESHOLD = 0.70;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Generate embeddings for a submission's answers
   */
  async generateEmbeddings(answers) {
    const embeddings = [];

    for (const answer of answers) {
      if (!answer.text || answer.text.trim().length < 10) continue;

      try {
        const vector = await this.embeddings.embedQuery(
          answer.text.slice(0, 2000) // Limit text length
        );

        embeddings.push({
          questionNumber: answer.questionNumber,
          vector,
          text: answer.text.slice(0, 500),
        });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Embedding error for Q${answer.questionNumber}:`, err.message);
      }
    }

    return embeddings;
  }

  /**
   * Store embeddings in vector store
   */
  storeEmbeddings(submissionId, embeddings, studentInfo) {
    this.vectorStore.set(submissionId.toString(), {
      embeddings,
      studentInfo,
    });
  }

  /**
   * Compare a submission against all other submissions for an assignment
   */
  async detectPlagiarism(targetSubmission, allSubmissions) {
    const targetId = targetSubmission._id.toString();
    const targetEmbeddings = targetSubmission.embeddings || [];

    if (targetEmbeddings.length === 0) {
      return { matches: [], highestSimilarity: 0 };
    }

    const matches = [];

    for (const otherSubmission of allSubmissions) {
      const otherId = otherSubmission._id.toString();

      if (otherId === targetId) continue;

      const otherEmbeddings = otherSubmission.embeddings || [];
      if (otherEmbeddings.length === 0) continue;

      // Calculate per-question similarity
      let totalSimilarity = 0;
      let comparedQuestions = 0;
      const matchedSections = [];

      for (const targetEmb of targetEmbeddings) {
        const otherEmb = otherEmbeddings.find(
          e => e.questionNumber === targetEmb.questionNumber
        );

        if (!otherEmb) continue;

        const similarity = this.cosineSimilarity(
          targetEmb.vector,
          otherEmb.vector
        );

        totalSimilarity += similarity;
        comparedQuestions++;

        if (similarity > this.HIGH_SIMILAR_THRESHOLD) {
          matchedSections.push(`Q${targetEmb.questionNumber} (${Math.round(similarity * 100)}% similar)`);
        }
      }

      if (comparedQuestions === 0) continue;

      const avgSimilarity = totalSimilarity / comparedQuestions;
      const similarityPercent = Math.round(avgSimilarity * 100);

      if (similarityPercent >= 30) { // Only report if >= 30% similar
        matches.push({
          submissionId: otherSubmission._id,
          studentId: otherSubmission.student?._id || otherSubmission.student,
          studentName: otherSubmission.student?.name || 'Unknown',
          similarityScore: similarityPercent,
          matchedSections,
          isSuspicious: avgSimilarity >= this.SUSPICIOUS_THRESHOLD,
        });
      }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    const highestSimilarity = matches.length > 0 ? matches[0].similarityScore : 0;

    return {
      matches,
      highestSimilarity,
      isPlagiarismSuspect: matches.some(m => m.isSuspicious),
    };
  }

  /**
   * Run plagiarism check across all submissions for an assignment
   * Returns updated plagiarism data for all submissions
   */
  async runAssignmentPlagiarismCheck(submissions) {
    const results = new Map();

    // Initialize results
    for (const sub of submissions) {
      results.set(sub._id.toString(), {
        plagiarismMatches: [],
        highestSimilarity: 0,
        isPlagiarismSuspect: false,
      });
    }

    // Generate embeddings for submissions that don't have them
    for (const submission of submissions) {
      if (!submission.embeddings || submission.embeddings.length === 0) {
        if (submission.extractedAnswers && submission.extractedAnswers.length > 0) {
          try {
            const embeddings = await this.generateEmbeddings(submission.extractedAnswers);
            submission.embeddings = embeddings;
          } catch (err) {
            console.error(`Failed to generate embeddings for ${submission._id}:`, err.message);
          }
        }
      }
    }

    // Compare each submission against all others
    for (const submission of submissions) {
      try {
        const { matches, highestSimilarity, isPlagiarismSuspect } =
          await this.detectPlagiarism(submission, submissions);

        results.set(submission._id.toString(), {
          plagiarismMatches: matches,
          highestSimilarity,
          isPlagiarismSuspect,
        });
      } catch (err) {
        console.error(`Plagiarism check failed for ${submission._id}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Simple text-based similarity fallback (Jaccard similarity)
   */
  jaccardSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}

module.exports = new PlagiarismService();
