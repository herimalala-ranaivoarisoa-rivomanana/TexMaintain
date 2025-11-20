/**
 * Script pour tester le recalcul lors de l'édition d'une association
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { EquipmentPart } = require('./models/EquipmentPart');
const { Equipment } = require('./models/Equipment');
const { Part } = require('./models/Part');

async function testEditAssociation() {
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
    console.log(`   Fréquence AVANT: ${assoc.replacementFrequencyPerYear}/an`);
    console.log(`   Dernier remplacement: ${assoc.lastReplacementDate.toLocaleDateString('fr-FR')}`);
    console.log(`   Prochain remplacement AVANT: ${assoc.nextReplacementDate?.toLocaleDateString('fr-FR') || 'Non défini'}\n`);

    // Simuler une édition via la route (comme le ferait le frontend)
    console.log('🔄 Simulation d\'une édition (changement de fréquence)...');
    const oldFrequency = assoc.replacementFrequencyPerYear;
    const newFrequency = oldFrequency === 2 ? 4 : 2;
    
    console.log(`   Changement: ${oldFrequency}/an → ${newFrequency}/an`);
    
    // Méthode 1: Utiliser Object.assign + save (comme la route PATCH)
    Object.assign(assoc, { replacementFrequencyPerYear: newFrequency });
    await assoc.save();
    
    console.log('   ✅ Sauvegardé via save()\n');

    // Recharger pour voir le résultat
    const updated = await EquipmentPart.findById(assoc._id);
    
    console.log('📊 Résultat:');
    console.log(`   Fréquence APRÈS: ${updated.replacementFrequencyPerYear}/an`);
    console.log(`   Prochain remplacement APRÈS: ${updated.nextReplacementDate?.toLocaleDateString('fr-FR')}`);
    
    // Calculer ce que ça devrait être
    const expectedDays = Math.round(365 / newFrequency);
    const expectedDate = new Date(updated.lastReplacementDate.getTime() + expectedDays * 24 * 60 * 60 * 1000);
    console.log(`\n   📊 Attendu: ${expectedDate.toLocaleDateString('fr-FR')} (dans ${expectedDays} jours)`);
    console.log(`   📊 Obtenu: ${updated.nextReplacementDate?.toLocaleDateString('fr-FR')}`);
    
    const isCorrect = Math.abs(updated.nextReplacementDate.getTime() - expectedDate.getTime()) < 24 * 60 * 60 * 1000;
    console.log(`   ${isCorrect ? '✅ CORRECT - Hook pre-save déclenché !' : '❌ INCORRECT'}\n`);

    // Restaurer la fréquence originale
    console.log('🔄 Restauration de la fréquence originale...');
    updated.replacementFrequencyPerYear = oldFrequency;
    await updated.save();
    console.log(`   ✅ Restauré à ${oldFrequency}/an\n`);

    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testEditAssociation();
