/**
 * Script pour recalculer les consommations annuelles de toutes les associations
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { EquipmentPart } = require('./models/EquipmentPart');
const { Equipment } = require('./models/Equipment');
const { EquipmentType } = require('./models/EquipmentType');
const { Part } = require('./models/Part');

async function fixAnnualConsumption() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    console.log('🔍 Recherche des associations avec des incohérences...\n');

    const associations = await EquipmentPart.find()
      .populate('equipment', 'model serialNumber')
      .populate('part', 'name type');

    let fixed = 0;
    let correct = 0;

    for (const assoc of associations) {
      const expectedAnnualConsumption = assoc.quantityPerMachine * assoc.replacementFrequencyPerYear;
      
      if (Math.abs(assoc.annualConsumption - expectedAnnualConsumption) > 0.01) {
        console.log(`❌ Incohérence détectée:`);
        console.log(`   Équipement: ${assoc.equipment?.model}`);
        console.log(`   Pièce: ${assoc.part?.name} (${assoc.part?.type})`);
        console.log(`   Quantité: ${assoc.quantityPerMachine}`);
        console.log(`   Fréquence: ${assoc.replacementFrequencyPerYear}/an`);
        console.log(`   Consommation actuelle: ${assoc.annualConsumption}`);
        console.log(`   Consommation attendue: ${expectedAnnualConsumption}`);
        
        // Forcer le recalcul en sauvegardant (déclenche le pre-save hook)
        await assoc.save();
        
        // Recharger pour vérifier
        const updated = await EquipmentPart.findById(assoc._id);
        console.log(`   ✅ Corrigé: ${updated.annualConsumption}\n`);
        fixed++;
      } else {
        correct++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`   ✅ Associations correctes: ${correct}`);
    console.log(`   🔧 Associations corrigées: ${fixed}`);
    console.log(`   📦 Total: ${associations.length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixAnnualConsumption();
