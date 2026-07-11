const express = require('express');
const { getTasks, createTask, updateTask, deleteTask, getTaskHistory, restoreTaskVersion } = require('../controllers/taskController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.route('/:id')
  .put(protect, updateTask)
  .delete(protect, adminOnly, deleteTask);

router.route('/:id/history')
  .get(protect, getTaskHistory);

router.route('/:id/restore/:version')
  .post(protect, restoreTaskVersion);

module.exports = router;
