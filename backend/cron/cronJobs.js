const cron = require('node-cron');
const Task = require('../models/Task');

// Run every midnight: 0 0 * * *
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily automation tasks...');

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const next24Hours = new Date();
    next24Hours.setHours(next24Hours.getHours() + 24);

    // Rule 1: Task Due Date < Today AND Status != Completed => Overdue = true
    const rule1Result = await Task.updateMany(
      { 
        dueDate: { $lt: now }, 
        status: { $ne: 'Completed' },
        overdue: false // only update if not already overdue
      },
      { $set: { overdue: true } }
    );
    console.log(`Rule 1 (Overdue) updated ${rule1Result.modifiedCount} tasks.`);

    // Rule 2: Task Completed AND 30 days have passed => Archived = true
    const rule2Result = await Task.updateMany(
      { 
        status: 'Completed', 
        updatedAt: { $lt: thirtyDaysAgo },
        archived: false
      },
      { $set: { archived: true } }
    );
    console.log(`Rule 2 (Archived) updated ${rule2Result.modifiedCount} tasks.`);

    // Rule 3: High Priority AND Due within 24 hours AND != Completed => Risk = High
    const rule3Result = await Task.updateMany(
      { 
        priority: 'High', 
        dueDate: { $gt: now, $lt: next24Hours },
        status: { $ne: 'Completed' },
        risk: { $ne: 'High' }
      },
      { $set: { risk: 'High' } }
    );
    console.log(`Rule 3 (High Risk) updated ${rule3Result.modifiedCount} tasks.`);

  } catch (error) {
    console.error('Error running automation tasks:', error);
  }
});
