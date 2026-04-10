const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, role, institution } = req.body;

  if (!name || !email || !password || !role) {
    throw new AppError('Please provide name, email, password, and role.', 400);
  }

  if (!['teacher', 'student'].includes(role)) {
    throw new AppError('Role must be either "teacher" or "student".', 400);
  }

  const user = await User.create({ name, email, password, role, institution });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    token,
    user,
  });
};

// @POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400);
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated.', 403);
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Logged in successfully.',
    token,
    user,
  });
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

// @PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  const { name, institution } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (institution !== undefined) updates.institution = institution;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, user });
};
