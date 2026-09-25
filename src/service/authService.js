const User = require('../models/User');
const Wallet = require('../models/wallet');
const generateToken = require('../utils/generateToken');

const registerUser = async (userData) => {
  const { email, password, name, role } = userData;
  const userExists = await User.findOne({ email });
  if (userExists) throw new Error('User already exists');

  const user = await User.create({ name, email, password, role });
  // Create wallet for user
  await Wallet.create({ user: user._id, balance: 0 });

  const token = generateToken(user._id, user.role);
  return { user, token };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid email or password');
  }
  const token = generateToken(user._id, user.role);
  return { user, token };
};

module.exports = { registerUser, loginUser };