const mongoose = require('mongoose');

const TaskHistorySchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String },
  status: { type: String },
  dueDate: { type: Date },
  versionNumber: { type: Number, required: true },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  modifiedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaskHistory', TaskHistorySchema);
