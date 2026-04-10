const mongoose = require('mongoose');

const rubricCriterionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  maxMarks: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  weight: { type: Number, default: 1 },
});

const questionSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  text: { type: String, required: true },
  maxMarks: { type: Number, required: true, min: 0 },
  rubric: [rubricCriterionSchema],
  idealAnswer: { type: String, default: '' },
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  course: {
    type: String,
    default: '',
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0,
  },
  globalRubric: [rubricCriterionSchema],
  questions: [questionSchema],
  dueDate: {
    type: Date,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  allowLateSubmissions: {
    type: Boolean,
    default: false,
  },
  submissionsCount: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
