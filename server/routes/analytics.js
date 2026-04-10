const express = require('express');
const {
  getTeacherAnalytics,
  getStudentAnalytics,
  getAssignmentAnalytics,
} = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/teacher', authorize('teacher'), getTeacherAnalytics);
router.get('/student', getStudentAnalytics);
router.get('/assignment/:id', authorize('teacher'), getAssignmentAnalytics);

module.exports = router;
