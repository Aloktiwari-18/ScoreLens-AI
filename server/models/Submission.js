const mongoose = require('mongoose');

const rubricScoreSchema = new mongoose.Schema({
  criterion: { type: String, required: true },
  score: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 0 },
  comment: { type: String, default: '' },
});

const questionEvaluationSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, default: '' },
  studentAnswer: { type: String, default: '' },
  marks: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 0 },
  rubricScores: [rubricScoreSchema],
  feedback: { type: String, default: '' },
  improvements: { type: String, default: '' },
  idealAnswer: { type: String, default: '' },
  confidence: { type: Number, default: 0 },
});

const plagiarismMatchSchema = new mongoose.Schema({
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: { type: String },
  similarityScore: { type: Number, min: 0, max: 100 },
  matchedSections: [String],
  isSuspicious: { type: Boolean, default: false },
});

const embeddingSchema = new mongoose.Schema({
  questionNumber: { type: Number },
  vector: [Number],
  text: { type: String },
});

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  fileUrl: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  fileType: {
    type: String,
    enum: ['pdf', 'image', 'text'],
    default: 'pdf',
  },
  rawText: {
    type: String,
    default: '',
  },
  extractedQuestions: [{
    number: Number,
    text: String,
  }],
  extractedAnswers: [{
    questionNumber: Number,
    text: String,
  }],
  evaluations: [questionEvaluationSchema],
  totalMarks: {
    type: Number,
    default: 0,
  },
  maxPossibleMarks: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  overallFeedback: {
    type: String,
    default: '',
  },
  grade: {
    type: String,
    default: '',
  },
  plagiarismMatches: [plagiarismMatchSchema],
  highestSimilarity: {
    type: Number,
    default: 0,
  },
  isPlagiarismSuspect: {
    type: Boolean,
    default: false,
  },
  embeddings: [embeddingSchema],
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'ocr_complete', 'evaluated', 'error'],
    default: 'uploaded',
  },
  processingError: {
    type: String,
    default: '',
  },
  evaluatedAt: {
    type: Date,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

submissionSchema.index({ student: 1, assignment: 1 });
submissionSchema.index({ assignment: 1 });
submissionSchema.index({ status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
