const express = require('express');
const {
  createSubmission,
  getMySubmissions,
  getSubmission,
  reprocessSubmission,
  runPlagiarismCheck,
  overrideGrade,
} = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.post('/', upload.single('file'), createSubmission);
router.get('/my', getMySubmissions);
router.get('/:id', getSubmission);
router.post('/:id/reprocess', reprocessSubmission);
router.post('/:id/plagiarism-check', authorize('teacher'), runPlagiarismCheck);
router.put('/:id/grade-override', authorize('teacher'), overrideGrade);

module.exports = router;
