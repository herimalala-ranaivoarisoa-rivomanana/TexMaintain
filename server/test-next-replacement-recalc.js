/**
 * Script pour tester le recalcul automatique de nextReplacementDate
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { EquipmentPart } = require('./models/EquipmentPart');
const { Equipment } = require('./models/Equipment');
const { Part } = require('./models/Part');

async function testRecalculation() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // Trouver une association avec lastReplacementDate
    const assoc = await EquipmentPart.findOne({
      lastReplacementDate: { $exists: true, $ne: null },
      replacementFrequencyPerYear: { $gt: 0 }
    })
    .populate('equipment', 'model serialNumber')
    .populate('part', 'name partNumber');

    if (!assoc) {
      console.log('❌ Aucune association avec lastReplacementDate trouvée');
      process.exit(1);
    }

    console.log('📦 Association trouvée:');
    console.log(`   Équipement: ${assoc.equipment?.model}`);
    console.log(`   Pièce: ${assoc.part?.name}`);
    console.log(`   Fréquence actuelle: ${assoc.replacementFrequencyPerYear}/an`);
    console.log(`   Dernier remplacement: ${assoc.lastReplacementDate.toLocaleDateString('fr-FR')}`);
    console.log(`   Prochain remplacement actuel: ${assoc.nextReplacementDate?.toLocaleDateString('fr-FR') || 'Non défini'}\n`);

    // Test 1: Modifier la fréquence
    console.log('🔄 TEST 1: Modification de la fréquence');
    const oldFrequency = assoc.replacementFrequencyPerYear;
    const newFrequency = oldFrequency === 2 ? 4 : 2; // Changer entre 2 et 4
    
    console.log(`   Changement: ${oldFrequency}/an → ${newFrequency}/an`);
    
    assoc.replacementFrequencyPerYear = newFrequency;
    await assoc.save();
    
    console.log(`   ✅ Sauvegardé`);
    console.log(`   Nouveau prochain remplacement: ${assoc.nextReplacementDate?.toLocaleDateString('fr-FR')}\n`);

    // Calculer ce que ça devrait être
    const expectedDays = Math.round(365 / newFrequency);
    const expectedDate = new Date(assoc.lastReplacementDate.getTime() + expectedDays * 24 * 60 * 60 * 1000);
    console.log(`   📊 Attendu: ${expectedDate.toLocaleDateString('fr-FR')} (dans ${expectedDays} jours)`);
    console.log(`   📊 Obtenu: ${assoc.nextReplacementDate?.toLocaleDateString('fr-FR')}`);
    
    const isCorrect = Math.abs(assoc.nextReplacementDate.getTime() - expectedDate.getTime()) < 24 * 60 * 60 * 1000;
    console.log(`   ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    // Restaurer la fréquence originale
    console.log('🔄 Restauration de la fréquence originale...');
    assoc.replacementFrequencyPerYear = oldFrequency;
    await assoc.save();
    console.log(`   ✅ Restauré à ${oldFrequency}/an\n`);

    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testRecalculation();
