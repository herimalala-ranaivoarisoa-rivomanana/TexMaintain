/**
 * Diagnostic script to check asset status history data integrity
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Asset } = require('./models/Asset');
const { AssetStatusHistory } = require('./models/AssetStatusHistory');

async function diagnoseHistory() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Get all asset
    const allAsset = await Asset.find().select('_id location category type').lean();
    console.log(`📦 Total asset in database: ${allAsset.length}\n`);

    // Get all history entries
    const allHistory = await AssetStatusHistory.find().lean();
    console.log(`📋 Total history entries: ${allHistory.length}\n`);

    // Group history by asset
    const historyByAsset = {};
    allHistory.forEach(entry => {
      const equipId = entry.asset.toString();
      if (!historyByAsset[equipId]) {
        historyByAsset[equipId] = [];
      }
      historyByAsset[equipId].push(entry);
    });

    console.log('📊 History distribution by asset:');
    console.log('=====================================\n');

    for (const asset of allAsset.slice(0, 5)) { // First 5 asset
      const equipId = asset._id.toString();
      const historyCount = historyByAsset[equipId]?.length || 0;
      
      console.log(`Asset ID: ${equipId}`);
      console.log(`  Location: ${asset.location || 'N/A'}`);
      console.log(`  History entries: ${historyCount}`);
      
      if (historyCount > 0) {
        const entries = historyByAsset[equipId];
        console.log(`  Latest status change: ${entries[0].newStatus}`);
        console.log(`  Timestamp: ${new Date(entries[0].timestamp).toLocaleString()}`);
      }
      console.log('');
    }

    // Check for data integrity issues
    console.log('\n🔍 Checking for data integrity issues:');
    console.log('======================================\n');

    let orphanedEntries = 0;
    const assetIds = new Set(allAsset.map(e => e._id.toString()));

    for (const entry of allHistory) {
      const equipId = entry.asset.toString();
      if (!assetIds.has(equipId)) {
        orphanedEntries++;
        console.log(`⚠️  Orphaned entry found: ${entry._id} references non-existent asset ${equipId}`);
      }
    }

    if (orphanedEntries === 0) {
      console.log('✅ No orphaned entries found');
    } else {
      console.log(`\n❌ Found ${orphanedEntries} orphaned entries`);
    }

    // Check if asset field is stored correctly
    console.log('\n🔍 Checking asset field type:');
    console.log('==================================\n');

    const sampleEntry = await AssetStatusHistory.findOne().lean();
    if (sampleEntry) {
      console.log('Sample entry:');
      console.log(`  _id: ${sampleEntry._id}`);
      console.log(`  asset: ${sampleEntry.asset}`);
      console.log(`  asset type: ${typeof sampleEntry.asset}`);
      console.log(`  asset is ObjectId: ${sampleEntry.asset instanceof mongoose.Types.ObjectId}`);
    }

    // Test query with specific asset
    if (allAsset.length > 0) {
      const testAsset = allAsset[0];
      console.log(`\n🧪 Testing query for asset: ${testAsset._id}`);
      console.log('================================================\n');

      // Query 1: String comparison
      const results1 = await AssetStatusHistory.find({ 
        asset: testAsset._id.toString() 
      }).lean();
      console.log(`Query with string: ${results1.length} entries`);

      // Query 2: ObjectId comparison
      const results2 = await AssetStatusHistory.find({ 
        asset: testAsset._id 
      }).lean();
      console.log(`Query with ObjectId: ${results2.length} entries`);

      // Query 3: Explicit ObjectId conversion
      const results3 = await AssetStatusHistory.find({ 
        asset: mongoose.Types.ObjectId(testAsset._id) 
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
