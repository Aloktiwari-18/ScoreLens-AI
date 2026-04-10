const path = require('path');
const fs = require('fs');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const pipelineService = require('../services/pipelineService');
const plagiarismService = require('../services/plagiarismService');
const { AppError } = require('../middleware/errorHandler');

// @POST /api/submissions
exports.createSubmission = async (req, res) => {
  if (req.user.role !== 'student') {
    throw new AppError('Only students can submit assignments.', 403);
  }

  if (!req.file) {
    throw new AppError('Please upload a file (PDF or image).', 400);
  }

  const { assignmentId } = req.body;
  if (!assignmentId) throw new AppError('Assignment ID is required.', 400);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError('Assignment not found.', 404);
  if (!assignment.isPublished) throw new AppError('This assignment is not open for submissions.', 400);

  // Check for duplicate submission
  const existing = await Submission.findOne({
    student: req.user._id,
    assignment: assignmentId,
    status: { $ne: 'error' },
  });
  if (existing) throw new AppError('You have already submitted this assignment.', 409);

  // Check late submission
  const isLate = assignment.dueDate && new Date() > assignment.dueDate;
  if (isLate && !assignment.allowLateSubmissions) {
    throw new AppError('The due date has passed. Late submissions are not allowed.', 400);
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileType = ext === '.pdf' ? 'pdf' : 'image';

  const submission = await Submission.create({
    student: req.user._id,
    assignment: assignmentId,
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType,
    status: 'uploaded',
    isLate,
    maxPossibleMarks: assignment.totalMarks,
  });

  // Start async pipeline
  const filePath = req.file.path;
  setImmediate(async () => {
    try {
      await pipelineService.runFullPipeline(submission._id, filePath, true);
      console.log(`[Controller] Pipeline completed for submission ${submission._id}`);
    } catch (err) {
      console.error(`[Controller] Pipeline error for ${submission._id}:`, err.message);
    }
  });

  res.status(201).json({
    success: true,
    message: 'Submission uploaded. AI evaluation is in progress.',
    submission,
  });
};

// @GET /api/submissions/my
exports.getMySubmissions = async (req, res) => {
  const submissions = await Submission.find({ student: req.user._id })
    .populate('assignment', 'title course totalMarks dueDate')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: submissions.length, submissions });
};

// @GET /api/submissions/:id
exports.getSubmission = async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('student', 'name email')
    .populate('assignment', 'title course totalMarks globalRubric questions');

  if (!submission) throw new AppError('Submission not found.', 404);

  // Access control
  if (req.user.role === 'student' && submission.student._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied.', 403);
  }

  if (req.user.role === 'teacher') {
    const assignment = await Assignment.findById(submission.assignment._id);
    if (!assignment || assignment.teacher.toString() !== req.user._id.toString()) {
      throw new AppError('Access denied.', 403);
    }
  }

  res.json({ success: true, submission });
};

// @POST /api/submissions/:id/reprocess
exports.reprocessSubmission = async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw new AppError('Submission not found.', 404);

  if (req.user.role === 'teacher') {
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment || assignment.teacher.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized.', 403);
    }
  }

  const filePath = path.join(__dirname, '..', submission.fileUrl);

  if (!fs.existsSync(filePath)) {
    throw new AppError('Original file not found. Cannot reprocess.', 404);
  }

  await Submission.findByIdAndUpdate(req.params.id, {
    status: 'processing',
    processingError: '',
    evaluations: [],
    plagiarismMatches: [],
  });

  setImmediate(async () => {
    try {
      await pipelineService.runFullPipeline(req.params.id, filePath, true);
    } catch (err) {
      console.error(`Reprocess failed for ${req.params.id}:`, err.message);
    }
  });

  res.json({ success: true, message: 'Reprocessing started.' });
};

// @POST /api/submissions/:id/plagiarism-check
exports.runPlagiarismCheck = async (req, res) => {
  if (req.user.role !== 'teacher') throw new AppError('Only teachers can run plagiarism checks.', 403);

  const submission = await Submission.findById(req.params.id).populate('student', 'name');
  if (!submission) throw new AppError('Submission not found.', 404);

  const assignment = await Assignment.findById(submission.assignment);
  if (!assignment || assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized.', 403);
  }

  // Get all other submissions for this assignment
  const allSubmissions = await Submission.find({
    assignment: submission.assignment,
    status: 'evaluated',
  }).populate('student', 'name');

  const { matches, highestSimilarity, isPlagiarismSuspect } =
    await plagiarismService.detectPlagiarism(submission, allSubmissions);

  await Submission.findByIdAndUpdate(req.params.id, {
    plagiarismMatches: matches,
    highestSimilarity,
    isPlagiarismSuspect,
  });

  res.json({
    success: true,
    plagiarism: { matches, highestSimilarity, isPlagiarismSuspect },
  });
};

// @PUT /api/submissions/:id/grade-override
exports.overrideGrade = async (req, res) => {
  if (req.user.role !== 'teacher') throw new AppError('Only teachers can override grades.', 403);

  const { totalMarks, overallFeedback, evaluations } = req.body;
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw new AppError('Submission not found.', 404);

  const assignment = await Assignment.findById(submission.assignment);
  if (!assignment || assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized.', 403);
  }

  const updates = {};
  if (totalMarks !== undefined) {
    updates.totalMarks = Math.min(totalMarks, submission.maxPossibleMarks);
    updates.percentage = (updates.totalMarks / submission.maxPossibleMarks) * 100;
  }
  if (overallFeedback) updates.overallFeedback = overallFeedback;
  if (evaluations) updates.evaluations = evaluations;

  const updated = await Submission.findByIdAndUpdate(req.params.id, updates, { new: true })
    .populate('student', 'name email');

  await pipelineService.updateAssignmentStats(submission.assignment);

  res.json({ success: true, submission: updated });
};
