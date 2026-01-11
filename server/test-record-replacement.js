/**
 * Script pour tester le recalcul lors de l'enregistrement d'un remplacement
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { AssetPart } = require('./models/AssetPart');
const { Asset } = require('./models/Asset');
const { Part } = require('./models/Part');

async function testRecordReplacement() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // Trouver une association
    const assoc = await AssetPart.findOne({
      replacementFrequencyPerYear: { $gt: 0 }
    })
    .populate('asset', 'model serialNumber')
    .populate('part', 'name partNumber');

    if (!assoc) {
      console.log('❌ Aucune association trouvée');
      process.exit(1);
    }

    console.log('📦 Association trouvée:');
    console.log(`   Équipement: ${assoc.asset?.model}`);
    console.log(`   Pièce: ${assoc.part?.name}`);
    console.log(`   Fréquence: ${assoc.replacementFrequencyPerYear}/an`);
    console.log(`   Dernier remplacement AVANT: ${assoc.lastReplacementDate?.toLocaleDateString('fr-FR') || 'Jamais'}`);
    console.log(`   Prochain remplacement AVANT: ${assoc.nextReplacementDate?.toLocaleDateString('fr-FR') || 'Non défini'}\n`);

    // Simuler un userId (utiliser un ObjectId valide)
    const fakeUserId = new mongoose.Types.ObjectId();

    // Enregistrer un remplacement
    console.log('🔄 Enregistrement d\'un remplacement...');
    await assoc.recordReplacement(1, fakeUserId, 'Test de recalcul automatique');
    
    console.log('   ✅ Remplacement enregistré\n');

    // Recharger l'association pour voir les changements
    const updated = await AssetPart.findById(assoc._id);
    
    console.log('📊 Résultat:');
    console.log(`   Dernier remplacement APRÈS: ${updated.lastReplacementDate?.toLocaleDateString('fr-FR')}`);
    console.log(`   Prochain remplacement APRÈS: ${updated.nextReplacementDate?.toLocaleDateString('fr-FR')}`);
    
    // Calculer ce que ça devrait être
    const expectedDays = Math.round(365 / updated.replacementFrequencyPerYear);
    const expectedDate = new Date(updated.lastReplacementDate.getTime() + expectedDays * 24 * 60 * 60 * 1000);
    console.log(`\n   📊 Attendu: ${expectedDate.toLocaleDateString('fr-FR')} (dans ${expectedDays} jours)`);
    console.log(`   📊 Obtenu: ${updated.nextReplacementDate?.toLocaleDateString('fr-FR')}`);
    
    const isCorrect = Math.abs(updated.nextReplacementDate.getTime() - expectedDate.getTime()) < 24 * 60 * 60 * 1000;
    console.log(`   ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    // Supprimer l'entrée de test de l'historique
    console.log('🔄 Nettoyage de l\'historique de test...');
    updated.replacementHistory.pop();
    await updated.save();
    console.log('   ✅ Nettoyé\n');

    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testRecordReplacement();
