const mongoose = require('mongoose');
const { Factory } = require('./models/Factory');
const { Asset } = require('./models/Asset');
const { ProcessArea } = require('./models/ProcessArea');
const { ProcessDepartment } = require('./models/ProcessDepartment');
require('dotenv').config();

async function verify() {
    await mongoose.connect(process.env.DATABASE_URL);

    const factories = await Factory.find();
    console.log(`\nFactories Found: ${factories.length}`);

    for (const f of factories) {
        const areas = await ProcessArea.countDocuments({ factory: f._id });
        const departments = await ProcessDepartment.aggregate([
            {
                $lookup: {
                    from: 'processareas',
                    localField: 'processArea',
                    foreignField: '_id',
                    as: 'pa'
                }
            },
            { $match: { 'pa.factory': f._id } },
            { $count: 'count' }
        ]);
        const deptCount = departments.length > 0 ? departments[0].count : 0;
        const equip = await Asset.countDocuments({ factory: f._id });
        console.log(`- ${f.name} (${f.code}): ProcessAreas=${areas}, Departments=${deptCount}, Asset=${equip}`);
    }

    await mongoose.disconnect();
}

verify();
