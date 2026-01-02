const axios = require('axios');
require('dotenv').config();

// MOCKING the local API since I can't verify SSL/CORS from node easily same as browser
// But I can hit the backend directly.
// Backend URL: http://localhost:5000 (usually)
// Let's assume port 5000 based on standard setup, or check .env

const BASE_URL = 'http://127.0.0.1:3000/api';

async function testLogin() {
    try {
        console.log('Attempting login...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@texmaintain.com',
            password: 'admin123'
        });

        const token = loginRes.data.accessToken;
        console.log('Login successful. Token obtained.');
        console.log('User ID:', loginRes.data._id);
        console.log('Factories in Login Response:', loginRes.data.factories ? loginRes.data.factories.length : 'MISSING');

        console.log('\nFetching /auth/me ...');
        const meRes = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('/auth/me Response Data Keys:', Object.keys(meRes.data));

        // Check factories
        const user = meRes.data; // or meRes.data.user depending on what we see

        console.log('Factories in /auth/me:', user.factories ? JSON.stringify(user.factories, null, 2) : 'MISSING');

        if (Array.isArray(user.factories)) {
            console.log(`\nCOUNT: ${user.factories.length} factories found.`);
            if (user.factories.length > 0) {
                const first = user.factories[0];
                if (typeof first === 'object' && first.name) {
                    console.log('SUCCESS: Factories are populated objects.');
                } else {
                    console.log('WARNING: Factories might be just IDs (strings).');
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();
