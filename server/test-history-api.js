/**
 * Test the Asset Status History API endpoint
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const { Asset } = require('./models/Asset');
const { Category } = require('./models/Category');
const { SubCategory } = require('./models/SubCategory');

async function testHistoryAPI() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Get first asset
    const asset = await Asset.findOne().populate('category type').lean();
    if (!asset) {
      console.log('❌ No asset found in database');
      return;
    }

    const assetId = asset._id.toString();
    console.log('📦 Testing with Asset:');
    console.log(`   ID: ${assetId}`);
    console.log(`   Location: ${asset.location}`);
    console.log(`   Category: ${asset.category?.name}`);
    console.log(`   Type: ${asset.type?.name}`);
    console.log(`   Current Status: ${asset.status}\n`);

    // First, let's check if we need to login
    // For testing, we'll check if the server requires auth
    console.log('🧪 Testing API endpoint: GET /api/asset/:id/status-history\n');

    try {
      const url = `http://localhost:3000/api/asset/${assetId}/status-history?limit=10`;
      console.log(`📡 Request URL: ${url}\n`);

      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json'
        },
        validateStatus: () => true // Accept any status code
      });

      console.log(`📊 Response Status: ${response.status}`);

      if (response.status === 401 || response.status === 403) {
        console.log('🔒 Authentication required. Testing requires login.\n');
        console.log('💡 Suggestion: Test manually in the browser after login.');
      } else if (response.status === 200) {
        console.log('✅ Success! Response data:\n');
        console.log(`   Total entries: ${response.data.total}`);
        console.log(`   Returned entries: ${response.data.history?.length || 0}`);
        console.log(`   Page: ${response.data.page}`);
        console.log(`   Limit: ${response.data.limit}\n`);

        if (response.data.history && response.data.history.length > 0) {
          console.log('📋 Latest status change:');
          const latest = response.data.history[0];
          console.log(`   Previous Status: ${latest.previousStatus || 'N/A'}`);
          console.log(`   New Status: ${latest.newStatus}`);
          console.log(`   Changed By: ${latest.changedBy?.email || 'N/A'}`);
          console.log(`   Timestamp: ${new Date(latest.timestamp).toLocaleString()}`);
          
          if (latest.machinist) {
            console.log(`   Machinist: ${latest.machinist.fullName || latest.machinist.firstName} (${latest.machinist.matricule})`);
          }
          
          if (latest.mechanic) {
            console.log(`   Mechanic: ${latest.mechanic.fullName || latest.mechanic.firstName} (${latest.mechanic.matricule})`);
          }
          
          if (latest.electrician) {
            console.log(`   Electrician: ${latest.electrician.fullName || latest.electrician.firstName} (${latest.electrician.matricule})`);
          }
          
          if (latest.maintenanceWorker) {
            console.log(`   Maintenance Worker: ${latest.maintenanceWorker.fullName || latest.maintenanceWorker.firstName} (${latest.maintenanceWorker.matricule})`);
          }
          
          if (latest.breakdownInfo) {
            console.log(`   Breakdown Type: ${latest.breakdownInfo.type}`);
            console.log(`   Breakdown Description: ${latest.breakdownInfo.description}`);
          }
          
          if (latest.duration) {
            console.log(`   Duration: ${latest.duration} minutes`);
          }
          
          // Verify this entry belongs to the correct asset
          console.log(`\n   ✅ Asset ID match: ${latest.asset === assetId || latest.asset.toString() === assetId}`);
        } else {
          console.log('ℹ️  No history entries found for this asset');
        }
      } else {
        console.log(`❌ Unexpected status code: ${response.status}`);
        console.log('Response:', response.data);
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on port 3000');
        console.log('💡 Start the server with: npm start');
      } else {
        console.error('❌ Request failed:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testHistoryAPI();
