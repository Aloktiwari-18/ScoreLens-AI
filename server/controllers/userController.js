const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// @GET /api/users/students (teacher only)
exports.getStudents = async (req, res) => {
  if (req.user.role !== 'teacher') throw new AppError('Access denied.', 403);

  const students = await User.find({ role: 'student', isActive: true })
    .select('name email institution createdAt')
    .sort({ name: 1 });

  res.json({ success: true, count: students.length, students });
};
