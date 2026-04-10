const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// @GET /api/analytics/teacher
exports.getTeacherAnalytics = async (req, res) => {
  if (req.user.role !== 'teacher') throw new AppError('Access denied.', 403);

  const assignments = await Assignment.find({ teacher: req.user._id });
  const assignmentIds = assignments.map(a => a._id);

  const submissions = await Submission.find({
    assignment: { $in: assignmentIds },
  }).populate('student', 'name').populate('assignment', 'title totalMarks');

  const evaluatedSubs = submissions.filter(s => s.status === 'evaluated');

  // Score distribution
  const scoreDistribution = { 'A+ (90-100)': 0, 'A (80-89)': 0, 'B (70-79)': 0, 'C (60-69)': 0, 'D (50-59)': 0, 'F (<50)': 0 };
  evaluatedSubs.forEach(s => {
    const p = s.percentage;
    if (p >= 90) scoreDistribution['A+ (90-100)']++;
    else if (p >= 80) scoreDistribution['A (80-89)']++;
    else if (p >= 70) scoreDistribution['B (70-79)']++;
    else if (p >= 60) scoreDistribution['C (60-69)']++;
    else if (p >= 50) scoreDistribution['D (50-59)']++;
    else scoreDistribution['F (<50)']++;
  });

  // Top performers
  const studentScores = {};
  evaluatedSubs.forEach(s => {
    const sId = s.student?._id?.toString();
    if (!sId) return;
    if (!studentScores[sId]) {
      studentScores[sId] = { name: s.student.name, totalPercentage: 0, count: 0 };
    }
    studentScores[sId].totalPercentage += s.percentage;
    studentScores[sId].count++;
  });

  const topPerformers = Object.values(studentScores)
    .map(s => ({ name: s.name, avgScore: Math.round(s.totalPercentage / s.count * 10) / 10 }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  // Assignment-wise stats
  const assignmentStats = assignments.map(a => {
    const aSubs = evaluatedSubs.filter(s => s.assignment?._id?.toString() === a._id.toString());
    const avgScore = aSubs.length > 0
      ? Math.round(aSubs.reduce((sum, s) => sum + s.percentage, 0) / aSubs.length * 10) / 10
      : 0;

    return {
      title: a.title,
      course: a.course,
      submissions: aSubs.length,
      avgScore,
      highestScore: aSubs.length > 0 ? Math.max(...aSubs.map(s => s.percentage)) : 0,
      lowestScore: aSubs.length > 0 ? Math.min(...aSubs.map(s => s.percentage)) : 0,
      passRate: aSubs.length > 0
        ? Math.round(aSubs.filter(s => s.percentage >= 40).length / aSubs.length * 100)
        : 0,
    };
  });

  // Plagiarism summary
  const plagiarismAlerts = evaluatedSubs.filter(s => s.isPlagiarismSuspect);

  // Processing stats
  const processingStats = {
    total: submissions.length,
    evaluated: evaluatedSubs.length,
    processing: submissions.filter(s => s.status === 'processing').length,
    error: submissions.filter(s => s.status === 'error').length,
    uploaded: submissions.filter(s => s.status === 'uploaded').length,
  };

  res.json({
    success: true,
    analytics: {
      overview: {
        totalAssignments: assignments.length,
        publishedAssignments: assignments.filter(a => a.isPublished).length,
        totalSubmissions: submissions.length,
        evaluatedSubmissions: evaluatedSubs.length,
        avgScore: evaluatedSubs.length > 0
          ? Math.round(evaluatedSubs.reduce((s, sub) => s + sub.percentage, 0) / evaluatedSubs.length * 10) / 10
          : 0,
        plagiarismAlerts: plagiarismAlerts.length,
      },
      scoreDistribution: Object.entries(scoreDistribution).map(([grade, count]) => ({ grade, count })),
      topPerformers,
      assignmentStats,
      plagiarismAlerts: plagiarismAlerts.map(s => ({
        studentName: s.student?.name,
        assignmentTitle: s.assignment?.title,
        highestSimilarity: s.highestSimilarity,
        submissionId: s._id,
      })),
      processingStats,
    },
  });
};

// @GET /api/analytics/student
exports.getStudentAnalytics = async (req, res) => {
  const submissions = await Submission.find({
    student: req.user._id,
    status: 'evaluated',
  }).populate('assignment', 'title course totalMarks');

  const totalScore = submissions.reduce((sum, s) => sum + s.percentage, 0);
  const avgScore = submissions.length > 0 ? Math.round(totalScore / submissions.length * 10) / 10 : 0;

  const performanceTrend = submissions
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(s => ({
      assignment: s.assignment?.title,
      score: s.percentage,
      grade: s.grade,
      date: s.createdAt,
    }));

  // Rubric performance aggregation
  const rubricPerformance = {};
  submissions.forEach(s => {
    s.evaluations.forEach(e => {
      e.rubricScores.forEach(r => {
        if (!rubricPerformance[r.criterion]) {
          rubricPerformance[r.criterion] = { total: 0, max: 0, count: 0 };
        }
        rubricPerformance[r.criterion].total += r.score;
        rubricPerformance[r.criterion].max += r.maxScore;
        rubricPerformance[r.criterion].count++;
      });
    });
  });

  const rubricStats = Object.entries(rubricPerformance).map(([criterion, data]) => ({
    criterion,
    percentage: data.max > 0 ? Math.round((data.total / data.max) * 100) : 0,
    avgScore: data.count > 0 ? Math.round(data.total / data.count * 10) / 10 : 0,
  }));

  res.json({
    success: true,
    analytics: {
      overview: {
        totalSubmissions: submissions.length,
        avgScore,
        bestScore: submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)) : 0,
        latestGrade: submissions.length > 0 ? submissions[submissions.length - 1].grade : 'N/A',
      },
      performanceTrend,
      rubricStats,
    },
  });
};

// @GET /api/analytics/assignment/:id
exports.getAssignmentAnalytics = async (req, res) => {
  if (req.user.role !== 'teacher') throw new AppError('Access denied.', 403);

  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new AppError('Assignment not found.', 404);
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized.', 403);
  }

  const submissions = await Submission.find({
    assignment: req.params.id,
    status: 'evaluated',
  }).populate('student', 'name email');

  const scoreData = submissions.map(s => ({
    student: s.student?.name,
    score: s.percentage,
    grade: s.grade,
    marks: s.totalMarks,
    maxMarks: s.maxPossibleMarks,
  }));

  const avg = submissions.length > 0
    ? submissions.reduce((s, sub) => s + sub.percentage, 0) / submissions.length
    : 0;

  res.json({
    success: true,
    analytics: {
      assignment: { title: assignment.title, totalMarks: assignment.totalMarks },
      submissions: scoreData,
      stats: {
        count: submissions.length,
        average: Math.round(avg * 10) / 10,
        highest: submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)) : 0,
        lowest: submissions.length > 0 ? Math.min(...submissions.map(s => s.percentage)) : 0,
        passRate: submissions.length > 0
          ? Math.round(submissions.filter(s => s.percentage >= 40).length / submissions.length * 100)
          : 0,
      },
    },
  });
};
