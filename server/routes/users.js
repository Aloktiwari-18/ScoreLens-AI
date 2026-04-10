const express = require('express');
const { getStudents } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/students', authorize('teacher'), getStudents);

module.exports = router;
