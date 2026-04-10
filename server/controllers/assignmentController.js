const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { AppError } = require('../middleware/errorHandler');

// @GET /api/assignments
exports.getAssignments = async (req, res) => {
  const query = req.user.role === 'teacher'
    ? { teacher: req.user._id }
    : { isPublished: true };

  const assignments = await Assignment.find(query)
    .populate('teacher', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: assignments.length, assignments });
};

// @POST /api/assignments
exports.createAssignment = async (req, res) => {
  if (req.user.role !== 'teacher') {
    throw new AppError('Only teachers can create assignments.', 403);
  }

  const {
    title, description, course, totalMarks,
    globalRubric, questions, dueDate, isPublished, allowLateSubmissions,
  } = req.body;

  // Validate totalMarks
  if (!totalMarks || totalMarks <= 0) {
    throw new AppError('Total marks must be greater than 0.', 400);
  }

  const assignment = await Assignment.create({
    title,
    description,
    course,
    totalMarks,
    globalRubric: globalRubric || [],
    questions: questions || [],
    dueDate,
    isPublished: isPublished || false,
    allowLateSubmissions: allowLateSubmissions || false,
    teacher: req.user._id,
  });

  res.status(201).json({ success: true, assignment });
};

// @GET /api/assignments/:id
exports.getAssignment = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate('teacher', 'name email institution');

  if (!assignment) throw new AppError('Assignment not found.', 404);

  // Teachers can only access their own assignments
  if (req.user.role === 'teacher' && assignment.teacher._id.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to access this assignment.', 403);
  }

  res.json({ success: true, assignment });
};

// @PUT /api/assignments/:id
exports.updateAssignment = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new AppError('Assignment not found.', 404);

  if (assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to update this assignment.', 403);
  }

  const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, assignment: updated });
};

// @DELETE /api/assignments/:id
exports.deleteAssignment = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new AppError('Assignment not found.', 404);

  if (assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to delete this assignment.', 403);
  }

  await Assignment.deleteOne({ _id: req.params.id });
  await Submission.deleteMany({ assignment: req.params.id });

  res.json({ success: true, message: 'Assignment and all submissions deleted.' });
};

// @GET /api/assignments/:id/submissions
exports.getAssignmentSubmissions = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new AppError('Assignment not found.', 404);

  if (req.user.role === 'teacher' && assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized.', 403);
  }

  const submissions = await Submission.find({ assignment: req.params.id })
    .populate('student', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: submissions.length, submissions });
};

// @POST /api/assignments/:id/publish
exports.publishAssignment = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new AppError('Assignment not found.', 404);
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized.', 403);
  }

  assignment.isPublished = true;
  await assignment.save();

  res.json({ success: true, message: 'Assignment published.', assignment });
};
