const { randomUUID } = require('crypto');

const { User, VALID_ROLES } = require('../models/User.js');
const { generatePasswordHash, validatePassword } = require('../utils/password.js');

class UserService {
  static async list() {
    try {
      return User.find();
    } catch (err) {
      throw new Error(`Database error while listing users: ${err}`);
    }
  }

  static async get(id) {
    try {
      return User.findOne({ _id: id }).exec();
    } catch (err) {
      throw new Error(`Database error while getting the user by their ID: ${err}`);
    }
  }

  static async getByEmail(email) {
    try {
      return User.findOne({ email }).exec();
    } catch (err) {
      throw new Error(`Database error while getting the user by their email: ${err}`);
    }
  }

  static async update(id, data) {
    try {
      return User.findOneAndUpdate({ _id: id }, data, { new: true, upsert: false });
    } catch (err) {
      throw new Error(`Database error while updating user ${id}: ${err}`);
    }
  }

  static async delete(id) {
    try {
      const result = await User.deleteOne({ _id: id }).exec();
      return (result.deletedCount === 1);
    } catch (err) {
      throw new Error(`Database error while deleting user ${id}: ${err}`);
    }
  }

  static async authenticateWithPassword(email, password) {
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');

    try {
      console.log(`Attempting to authenticate user: ${email}`);
      const user = await User.findOne({email}).exec();
      if (!user) {
        console.log(`User not found: ${email}`);
        return null;
      }

      const passwordValid = await validatePassword(password, user.password);
      if (!passwordValid) {
        console.log(`Invalid password for user: ${email}`);
        return null;
      }

      user.lastLoginAt = Date.now();
      const updatedUser = await user.save();
      console.log(`User authenticated successfully: ${email}, role: ${updatedUser.role}`);
      return updatedUser;
    } catch (err) {
      console.error(`Database error while authenticating user ${email}: ${err}`);
      throw new Error(`Database error while authenticating user ${email} with password: ${err}`);
    }
  }

  static async create({ email, password, role = 'general_maintenance_agent', name = '' }) {
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
    
    if (role && !VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const existingUser = await UserService.getByEmail(email);
    if (existingUser) throw new Error('User with this email already exists');

    const hash = await generatePasswordHash(password);

    try {
      console.log(`Creating new user: ${email}, role: ${role}`);
      const user = new User({
        email,
        password: hash,
        role,
        name,
      });

      await user.save();
      console.log(`User created successfully: ${email}, role: ${role}`);
      return user;
    } catch (err) {
      console.error(`Database error while creating new user: ${err}`);
      throw new Error(`Database error while creating new user: ${err}`);
    }
  }

  static async setPassword(user, password) {
    if (!password) throw new Error('Password is required');
    user.password = await generatePasswordHash(password); // eslint-disable-line

    try {
      if (!user.isNew) {
        await user.save();
      }

      return user;
    } catch (err) {
      throw new Error(`Database error while setting user password: ${err}`);
    }
  }
}

module.exports = UserService;