/**
 * Diagnostic script to check equipment status history data integrity
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Equipment } = require('./models/Equipment');
const { EquipmentStatusHistory } = require('./models/EquipmentStatusHistory');

async function diagnoseHistory() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Get all equipment
    const allEquipment = await Equipment.find().select('_id location category type').lean();
    console.log(`📦 Total equipment in database: ${allEquipment.length}\n`);

    // Get all history entries
    const allHistory = await EquipmentStatusHistory.find().lean();
    console.log(`📋 Total history entries: ${allHistory.length}\n`);

    // Group history by equipment
    const historyByEquipment = {};
    allHistory.forEach(entry => {
      const equipId = entry.equipment.toString();
      if (!historyByEquipment[equipId]) {
        historyByEquipment[equipId] = [];
      }
      historyByEquipment[equipId].push(entry);
    });

    console.log('📊 History distribution by equipment:');
    console.log('=====================================\n');

    for (const equipment of allEquipment.slice(0, 5)) { // First 5 equipment
      const equipId = equipment._id.toString();
      const historyCount = historyByEquipment[equipId]?.length || 0;
      
      console.log(`Equipment ID: ${equipId}`);
      console.log(`  Location: ${equipment.location || 'N/A'}`);
      console.log(`  History entries: ${historyCount}`);
      
      if (historyCount > 0) {
        const entries = historyByEquipment[equipId];
        console.log(`  Latest status change: ${entries[0].newStatus}`);
        console.log(`  Timestamp: ${new Date(entries[0].timestamp).toLocaleString()}`);
      }
      console.log('');
    }

    // Check for data integrity issues
    console.log('\n🔍 Checking for data integrity issues:');
    console.log('======================================\n');

    let orphanedEntries = 0;
    const equipmentIds = new Set(allEquipment.map(e => e._id.toString()));

    for (const entry of allHistory) {
      const equipId = entry.equipment.toString();
      if (!equipmentIds.has(equipId)) {
        orphanedEntries++;
        console.log(`⚠️  Orphaned entry found: ${entry._id} references non-existent equipment ${equipId}`);
      }
    }

    if (orphanedEntries === 0) {
      console.log('✅ No orphaned entries found');
    } else {
      console.log(`\n❌ Found ${orphanedEntries} orphaned entries`);
    }

    // Check if equipment field is stored correctly
    console.log('\n🔍 Checking equipment field type:');
    console.log('==================================\n');

    const sampleEntry = await EquipmentStatusHistory.findOne().lean();
    if (sampleEntry) {
      console.log('Sample entry:');
      console.log(`  _id: ${sampleEntry._id}`);
      console.log(`  equipment: ${sampleEntry.equipment}`);
      console.log(`  equipment type: ${typeof sampleEntry.equipment}`);
      console.log(`  equipment is ObjectId: ${sampleEntry.equipment instanceof mongoose.Types.ObjectId}`);
    }

    // Test query with specific equipment
    if (allEquipment.length > 0) {
      const testEquipment = allEquipment[0];
      console.log(`\n🧪 Testing query for equipment: ${testEquipment._id}`);
      console.log('================================================\n');

      // Query 1: String comparison
      const results1 = await EquipmentStatusHistory.find({ 
        equipment: testEquipment._id.toString() 
      }).lean();
      console.log(`Query with string: ${results1.length} entries`);

      // Query 2: ObjectId comparison
      const results2 = await EquipmentStatusHistory.find({ 
        equipment: testEquipment._id 
      }).lean();
      console.log(`Query with ObjectId: ${results2.length} entries`);

      // Query 3: Explicit ObjectId conversion
      const results3 = await EquipmentStatusHistory.find({ 
        equipment: mongoose.Types.ObjectId(testEquipment._id) 
      }).lean();
      console.log(`Query with explicit ObjectId: ${results3.length} entries`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

diagnoseHistory();
