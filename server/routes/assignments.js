const express = require('express');
const {
  getAssignments,
  createAssignment,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  publishAssignment,
} = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(getAssignments)
  .post(authorize('teacher'), createAssignment);

router.route('/:id')
  .get(getAssignment)
  .put(authorize('teacher'), updateAssignment)
  .delete(authorize('teacher'), deleteAssignment);

router.get('/:id/submissions', getAssignmentSubmissions);
router.post('/:id/publish', authorize('teacher'), publishAssignment);

module.exports = router;
