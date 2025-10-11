/**
 * Migration Script: Add equipmentId to existing Interventions
 * 
 * This script migrates existing interventions by:
 * 1. Finding Equipment by matching intervention.equipment string with Equipment.location
 * 2. Setting the equipmentId field when a match is found
 * 3. Logging unmatched interventions for manual review
 * 
 * Usage:
 *   node server/migrations/migrateInterventionEquipmentId.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Intervention } = require('../models/Intervention');
const { Equipment } = require('../models/Equipment');

async function migrateInterventionEquipmentIds() {
  try {
    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected successfully\n');

    // Get all interventions without equipmentId
    const interventions = await Intervention.find({ 
      equipmentId: { $exists: false } 
    }).lean();

    console.log(`Found ${interventions.length} interventions to migrate\n`);

    let matched = 0;
    let unmatched = 0;
    const unmatchedList = [];

    for (const intervention of interventions) {
      // Try to find equipment by location matching intervention.equipment
      const equipment = await Equipment.findOne({
        location: { $regex: new RegExp(`^${intervention.equipment}$`, 'i') }
      }).lean();

      if (equipment) {
        // Update intervention with equipmentId
        await Intervention.findByIdAndUpdate(intervention._id, {
          equipmentId: equipment._id
        });
        matched++;
        console.log(`✓ Matched: "${intervention.equipment}" → Equipment ${equipment._id} (${equipment.location})`);
      } else {
        unmatched++;
        unmatchedList.push({
          id: intervention._id,
          title: intervention.title,
          equipment: intervention.equipment
        });
        console.log(`✗ No match: "${intervention.equipment}" (Intervention: ${intervention.title})`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total interventions: ${interventions.length}`);
    console.log(`Successfully matched: ${matched}`);
    console.log(`Unmatched: ${unmatched}`);

    if (unmatchedList.length > 0) {
      console.log('\n=== Unmatched Interventions ===');
      console.log('These interventions need manual review:');
      unmatchedList.forEach(item => {
        console.log(`  - ID: ${item.id}`);
        console.log(`    Title: ${item.title}`);
        console.log(`    Equipment string: "${item.equipment}"`);
        console.log('');
      });
    }

    console.log('\nMigration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateInterventionEquipmentIds();
