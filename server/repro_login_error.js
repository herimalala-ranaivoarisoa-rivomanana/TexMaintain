const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./models/User');
const UserService = require('./services/userService');

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/texmaintain';

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGODB_URI);

        const email = 'admin@texmaintain.com'; // Try a known user or the one I tried to create
        console.log(`Finding user ${email}...`);
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found. Creating one...');
            // Create one manually
            try {
                await UserService.create({ email: 'test_repro@example.com', password: 'password123', role: 'admin' });
                console.log('Created test_repro@example.com');
            } catch (e) {
                console.error('Creation failed:', e.message);
            }
            return;
        }

        console.log('User found:', user.email);
        console.log('Password hash length:', user.password.length);

        console.log('Attempting save()...');
        user.lastLoginAt = Date.now();
        await user.save();
        console.log('Save successful!');

        console.log('Simulating Auth Route logic...');
        // We can't import generateRefreshToken easily if it requires env files loaded a specific way or if local repro doesn't have same context
        // But we can check if modifying refreshToken causes error
        const keys = require('./utils/auth');
        const refreshToken = keys.generateRefreshToken(user);
        console.log('Generated refresh token:', refreshToken);

        user.refreshToken = refreshToken;
        await user.save();
        console.log('Save with new refresh token successful!');

        console.log('Attempting authenticateWithPassword...');
        const authUser = await UserService.authenticateWithPassword(user.email, 'password123'); // Assuming password123
        console.log('Auth successful?', !!authUser);

    } catch (err) {
        console.error('ERROR:', err);
        if (err.errors) {
            console.error('Validation Errors:', JSON.stringify(err.errors, null, 2));
        }
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

run();
