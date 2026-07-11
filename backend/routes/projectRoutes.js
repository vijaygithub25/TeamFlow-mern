const express = require('express');
const router = express.Router();
const { 
  createProject, getProjects, inviteUser, 
  getInvitations, acceptInvitation, getActivityFeed 
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createProject);
router.get('/', protect, getProjects);
router.post('/:projectId/invite', protect, inviteUser);
router.get('/invitations', protect, getInvitations);
router.post('/invitations/:id/accept', protect, acceptInvitation);
router.get('/:projectId/activity', protect, getActivityFeed);

module.exports = router;
