/**
 * Script pour trouver les associations avec consommation = 0
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { AssetPart } = require('./models/AssetPart');
const { Asset } = require('./models/Asset');
const { Part } = require('./models/Part');

async function check() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // Trouver les associations avec consommation = 0
    const zeroConsumption = await AssetPart.find({
      annualConsumption: 0
    })
    .populate('asset', 'model serialNumber')
    .populate('part', 'name partNumber');

    console.log(`📊 Associations avec annualConsumption = 0: ${zeroConsumption.length}\n`);

    if (zeroConsumption.length > 0) {
      for (const assoc of zeroConsumption) {
        console.log(`❌ ${assoc.asset?.model || 'Unknown'} + ${assoc.part?.name || 'Unknown'}`);
        console.log(`   ID: ${assoc._id}`);
        console.log(`   Quantité: ${assoc.quantityPerMachine}`);
        console.log(`   Fréquence: ${assoc.replacementFrequencyPerYear}/an`);
        console.log(`   Consommation annuelle: ${assoc.annualConsumption}`);
        console.log(`   Notes: ${assoc.notes || 'Aucune'}\n`);
      }
    } else {
      console.log('✅ Aucune association avec consommation = 0\n');
    }

    // Afficher TOUTES les associations
    console.log('📋 TOUTES les associations:\n');
    const all = await AssetPart.find({})
      .populate('asset', 'model serialNumber')
      .populate('part', 'name partNumber');

    for (const assoc of all) {
      const status = assoc.annualConsumption === 0 ? '❌' : '✅';
      console.log(`${status} ${assoc.asset?.model || 'Unknown'} (${assoc.asset?.serialNumber}) + ${assoc.part?.name || 'Unknown'}`);
      console.log(`   Qty: ${assoc.quantityPerMachine}, Freq: ${assoc.replacementFrequencyPerYear}/an, Annual: ${assoc.annualConsumption}`);
      console.log(`   Notes: ${assoc.notes || 'Aucune'}\n`);
    }

    await mongoose.disconnect();
    console.log('✅ Terminé');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

check();
