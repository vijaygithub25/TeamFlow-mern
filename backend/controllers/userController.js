const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);
    const users = await User.find({ email: { $regex: email, $options: 'i' } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users' });
  }
};
