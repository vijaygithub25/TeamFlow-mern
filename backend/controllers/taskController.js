const Task = require('../models/Task');
const TaskHistory = require('../models/TaskHistory');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');

// Helper to check access
const getProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isAdmin = project.admin.toString() === userId;
  const isMember = project.members.includes(userId);
  if (!isAdmin && !isMember) return null;
  return { project, isAdmin, isMember };
};

exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

    const access = await getProjectAccess(projectId, req.user.id);
    if (!access) return res.status(403).json({ error: 'Unauthorized for this project' });

    const tasks = await Task.find({ project: projectId })
      .populate('dependsOn', 'title status')
      .populate('assignedTo', 'email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, dependsOn, priority, dueDate, project, assignedTo } = req.body;
    if (!title || !project) return res.status(400).json({ error: 'Task title and project are required' });

    const access = await getProjectAccess(project, req.user.id);
    if (!access || !access.isAdmin) return res.status(403).json({ error: 'Only admins can create tasks' });

    const taskData = { title, description, user: req.user.id, project };
    if (dependsOn) taskData.dependsOn = dependsOn;
    if (priority) taskData.priority = priority;
    if (dueDate) taskData.dueDate = dueDate;
    if (assignedTo) taskData.assignedTo = assignedTo;

    const task = await Task.create(taskData);
    await task.populate('dependsOn', 'title status');
    await task.populate('assignedTo', 'email');

    await ActivityLog.create({
      project,
      action: 'Task Created',
      details: `Created task "${title}"`,
      user: req.user.id
    });

    if (assignedTo) {
      await ActivityLog.create({
        project,
        action: 'Task Assigned',
        details: `Assigned task "${title}" to user`,
        user: req.user.id
      });
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id).populate('dependsOn');
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    const access = await getProjectAccess(existingTask.project, req.user.id);
    if (!access) return res.status(403).json({ error: 'Unauthorized' });

    // Validate permissions: User can ONLY update status
    if (!access.isAdmin) {
      const restrictedFields = ['title', 'description', 'priority', 'dueDate', 'dependsOn', 'assignedTo'];
      for (const field of restrictedFields) {
        if (req.body[field] !== undefined && req.body[field] !== existingTask[field]?.toString()) {
           return res.status(403).json({ error: `Users can only update status. Field ${field} is restricted.` });
        }
      }
    }

    if (req.body.status === 'In Progress' || req.body.status === 'Completed') {
      if (existingTask.dependsOn && existingTask.dependsOn.status !== 'Completed') {
        return res.status(400).json({ message: 'Complete the dependent task first.' });
      }
    }

    // Save history
    await TaskHistory.create({
      taskId: existingTask._id,
      title: existingTask.title,
      description: existingTask.description,
      priority: existingTask.priority,
      status: existingTask.status,
      dueDate: existingTask.dueDate,
      versionNumber: existingTask.versionNumber || 1,
      modifiedBy: req.user.id
    });

    const nextVersion = (existingTask.versionNumber || 1) + 1;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body, versionNumber: nextVersion },
      { new: true }
    ).populate('dependsOn', 'title status').populate('assignedTo', 'email');

    // Activity Logs
    if (req.body.status && req.body.status !== existingTask.status) {
      const action = req.body.status === 'Completed' ? 'Task Completed' : 'Status Changed';
      await ActivityLog.create({
        project: existingTask.project,
        action: action,
        details: `Task "${task.title}" status changed to ${task.status}`,
        user: req.user.id
      });
    } else {
      await ActivityLog.create({
        project: existingTask.project,
        action: 'Task Updated',
        details: `Task "${task.title}" was updated`,
        user: req.user.id
      });
    }

    if (req.body.assignedTo && req.body.assignedTo !== existingTask.assignedTo?.toString()) {
       await ActivityLog.create({
        project: existingTask.project,
        action: 'Task Assigned',
        details: `Re-assigned task "${task.title}"`,
        user: req.user.id
      });
    }
    
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    const access = await getProjectAccess(existingTask.project, req.user.id);
    if (!access || !access.isAdmin) return res.status(403).json({ error: 'Only admins can delete tasks' });

    const dependentTask = await Task.findOne({ dependsOn: req.params.id });
    if (dependentTask) {
      return res.status(400).json({ message: 'This task cannot be deleted because other tasks depend on it.' });
    }

    await Task.findByIdAndDelete(req.params.id);

    await ActivityLog.create({
      project: existingTask.project,
      action: 'Task Deleted',
      details: `Deleted task "${existingTask.title}"`,
      user: req.user.id
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTaskHistory = async (req, res) => {
  try {
    const history = await TaskHistory.find({ taskId: req.params.id }).sort({ modifiedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restoreTaskVersion = async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    const access = await getProjectAccess(existingTask.project, req.user.id);
    if (!access || !access.isAdmin) return res.status(403).json({ error: 'Only admins can restore versions' });

    const historyRecord = await TaskHistory.findOne({ taskId: req.params.id, versionNumber: req.params.version });
    if (!historyRecord) return res.status(404).json({ error: 'Version not found' });

    // Save current to history before restore
    await TaskHistory.create({
      taskId: existingTask._id,
      title: existingTask.title,
      description: existingTask.description,
      priority: existingTask.priority,
      status: existingTask.status,
      dueDate: existingTask.dueDate,
      versionNumber: existingTask.versionNumber || 1,
      modifiedBy: req.user.id
    });

    const nextVersion = (existingTask.versionNumber || 1) + 1;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title: historyRecord.title,
        description: historyRecord.description,
        priority: historyRecord.priority,
        status: historyRecord.status,
        dueDate: historyRecord.dueDate,
        versionNumber: nextVersion
      },
      { new: true }
    ).populate('dependsOn', 'title status').populate('assignedTo', 'email');

    await ActivityLog.create({
      project: existingTask.project,
      action: 'Task Updated',
      details: `Restored task "${task.title}" to version ${req.params.version}`,
      user: req.user.id
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
