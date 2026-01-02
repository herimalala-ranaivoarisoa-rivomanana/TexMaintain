const mongoose = require('mongoose');
require('dotenv').config();
const { Project } = require('./models/Project');

async function checkProjects() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to DB');

        const count = await Project.countDocuments();
        console.log(`Total Projects: ${count}`);

        const projects = await Project.find({}, 'title status');
        console.log('Projects found:', projects);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProjects();
