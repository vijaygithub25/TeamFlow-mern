const Project = require('../models/Project');
const Invitation = require('../models/Invitation');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

exports.createProject = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create projects' });
    }
    const project = await Project.create({
      name: req.body.name,
      admin: req.user.id,
      members: []
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.find({ admin: req.user.id }).populate('members', 'email role');
    } else {
      projects = await Project.find({ members: req.user.id }).populate('admin', 'email');
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.inviteUser = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can invite' });
    }

    const project = await Project.findOne({ _id: projectId, admin: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const userToInvite = await User.findById(userId);
    if (!userToInvite) return res.status(404).json({ message: 'User not found' });

    if (project.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    const existingInvite = await Invitation.findOne({ project: projectId, invitedUser: userId, status: 'Pending' });
    if (existingInvite) return res.status(400).json({ message: 'Invitation already pending' });

    const invite = await Invitation.create({ project: projectId, invitedUser: userId });

    await ActivityLog.create({
      project: projectId,
      action: 'Invitation Sent',
      details: `Invited ${userToInvite.email}`,
      user: req.user.id
    });

    res.json(invite);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invitation' });
  }
};

exports.getInvitations = async (req, res) => {
  try {
    const invites = await Invitation.find({ invitedUser: req.user.id, status: 'Pending' }).populate('project', 'name');
    res.json(invites);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get invitations' });
  }
};

exports.acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const invite = await Invitation.findOne({ _id: id, invitedUser: req.user.id, status: 'Pending' }).populate('project');
    if (!invite) return res.status(404).json({ message: 'Invitation not found' });

    invite.status = 'Accepted';
    await invite.save();

    const project = await Project.findById(invite.project._id);
    project.members.push(req.user.id);
    await project.save();

    await ActivityLog.create({
      project: project._id,
      action: 'Invitation Accepted',
      details: 'User joined the project',
      user: req.user.id
    });

    res.json({ message: 'Invitation accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

exports.getActivityFeed = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const logs = await ActivityLog.find({ project: projectId }).populate('user', 'email').sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
};
