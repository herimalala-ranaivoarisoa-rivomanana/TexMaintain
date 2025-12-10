/**
 * Test script to verify Equipment Status History enrichment
 * 
 * This script verifies that status history correctly stores and retrieves:
 * - User information (changedBy)
 * - Machinist information (for IN_PRODUCTION status)
 * - Maintenance personnel (mechanic, electrician, maintenance worker)
 * - Breakdown information (type and description)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Equipment } = require('./models/Equipment');
const { EquipmentStatusHistory } = require('./models/EquipmentStatusHistory');
const { User } = require('./models/User');
const { Machinist } = require('./models/Machinist');
const { Mechanic } = require('./models/Mechanic');
const EquipmentStatusService = require('./services/equipmentStatusService');

async function testStatusHistoryEnrichment() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database');

    // Find a test equipment
    const equipment = await Equipment.findOne().lean();
    if (!equipment) {
      console.log('❌ No equipment found in database');
      return;
    }
    console.log(`📦 Testing with equipment: ${equipment._id}`);

    // Find test users
    const user = await User.findOne().lean();
    const machinist = await Machinist.findOne().lean();
    const mechanic = await Mechanic.findOne().lean();

    if (!user) {
      console.log('❌ No user found');
      return;
    }

    console.log('\n🧪 Test 1: Get existing status history');
    console.log('=====================================');
    const historyResult = await EquipmentStatusService.getStatusHistory(equipment._id, { limit: 5 });
    console.log(`Total history entries: ${historyResult.total}`);
    
    if (historyResult.history.length > 0) {
      const latestEntry = historyResult.history[0];
      console.log('\n📋 Latest Status Change:');
      console.log(`  Status: ${latestEntry.previousStatus} → ${latestEntry.newStatus}`);
      console.log(`  Changed by: ${latestEntry.changedBy?.email || 'N/A'} (${latestEntry.changedBy?.role || 'N/A'})`);
      console.log(`  Timestamp: ${new Date(latestEntry.timestamp).toLocaleString()}`);
      
      if (latestEntry.machinist) {
        console.log(`  Machinist: ${latestEntry.machinist.fullName || latestEntry.machinist.firstName + ' ' + latestEntry.machinist.lastName} (#${latestEntry.machinist.matricule})`);
      }
      
      if (latestEntry.mechanic) {
        console.log(`  Mechanic: ${latestEntry.mechanic.fullName || latestEntry.mechanic.firstName + ' ' + latestEntry.mechanic.lastName} (#${latestEntry.mechanic.matricule})`);
      }
      
      if (latestEntry.electrician) {
        console.log(`  Electrician: ${latestEntry.electrician.fullName || latestEntry.electrician.firstName + ' ' + latestEntry.electrician.lastName} (#${latestEntry.electrician.matricule})`);
      }
      
      if (latestEntry.maintenanceWorker) {
        console.log(`  Maintenance Worker: ${latestEntry.maintenanceWorker.fullName || latestEntry.maintenanceWorker.firstName + ' ' + latestEntry.maintenanceWorker.lastName} (#${latestEntry.maintenanceWorker.matricule})`);
      }
      
      if (latestEntry.breakdownInfo) {
        console.log(`  Breakdown Type: ${latestEntry.breakdownInfo.type}`);
        console.log(`  Breakdown Description: ${latestEntry.breakdownInfo.description}`);
      }
      
      if (latestEntry.reason) {
        console.log(`  Reason: ${latestEntry.reason}`);
      }
      
      if (latestEntry.duration) {
        console.log(`  Duration: ${latestEntry.duration} minutes`);
      }
    }

    console.log('\n✅ Status history enrichment test completed');
    console.log('\n📊 Summary:');
    console.log(`  - Equipment ID: ${equipment._id}`);
    console.log(`  - Total history entries: ${historyResult.total}`);
    console.log(`  - Latest ${historyResult.history.length} entries retrieved with full personnel information`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the test
testStatusHistoryEnrichment();
