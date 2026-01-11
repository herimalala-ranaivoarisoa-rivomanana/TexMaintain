/**
 * Script pour vérifier les données d'un consommable spécifique
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Part } = require('./models/Part');
const { AssetPart } = require('./models/AssetPart');
const { Asset } = require('./models/Asset');

async function checkConsumable() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // Trouver MIG Welding Wire
    const part = await Part.findOne({ partNumber: 'WELD-WIRE-MIG' });
    
    if (!part) {
      console.log('❌ MIG Welding Wire non trouvé');
      process.exit(1);
    }

    console.log('📦 MIG Welding Wire');
    console.log(`   ID: ${part._id}`);
    console.log(`   Type: ${part.type}`);
    console.log(`   Stock actuel: ${part.currentStock}`);
    console.log(`   Min: ${part.minStock}`);
    console.log(`   Max: ${part.maxStock}\n`);

    // Trouver toutes les associations
    const associations = await AssetPart.find({ part: part._id })
      .populate('asset', 'model serialNumber')
      .lean();

    console.log(`🔗 ${associations.length} association(s) trouvée(s):\n`);

    for (const assoc of associations) {
      console.log(`   📍 ${assoc.asset?.model || 'Unknown'} (${assoc.asset?.serialNumber})`);
      console.log(`      Quantité: ${assoc.quantityPerMachine}`);
      console.log(`      Fréquence: ${assoc.replacementFrequencyPerYear}/an`);
      console.log(`      Consommation annuelle: ${assoc.annualConsumption}`);
      console.log(`      Consommation journalière: ${assoc.dailyConsumption.toFixed(3)}`);
      console.log(`      Stock sécurité: ${assoc.safetyStock}`);
      console.log(`      Point réappro: ${assoc.reorderPoint}`);
      console.log(`      Délai appro: ${assoc.leadTimeDays} jours`);
      console.log(`      Coefficient sécurité: ${assoc.safetyCoefficient}\n`);
    }

    // Calculer le global
    const globalStock = await AssetPart.calculateGlobalStock(part._id);
    
    console.log('📊 Calcul global:');
    console.log(`   Consommation annuelle totale: ${globalStock.totalAnnualConsumption}`);
    console.log(`   Consommation journalière totale: ${globalStock.totalDailyConsumption.toFixed(3)}`);
    console.log(`   Stock de sécurité global: ${globalStock.globalSafetyStock}`);
    console.log(`   Point de réappro global: ${globalStock.globalReorderPoint}`);
    console.log(`   Nombre d'équipements: ${globalStock.assetCount}\n`);

    console.log('✅ Valeurs attendues:');
    console.log(`   Min: ${globalStock.globalSafetyStock}`);
    console.log(`   Max: ${globalStock.globalReorderPoint}`);

    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkConsumable();
