/**
 * Script pour initialiser les dates de prochain remplacement
 * basées sur la fréquence et la dernière date de remplacement
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { AssetPart } = require('./models/AssetPart');
const { Asset } = require('./models/Asset');
const { Part } = require('./models/Part');

async function initializeNextReplacementDates() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    console.log('🔄 Recherche des associations avec lastReplacementDate...');

    // Trouver toutes les associations qui ont une date de dernier remplacement
    const associations = await AssetPart.find({
      lastReplacementDate: { $exists: true, $ne: null },
      replacementFrequencyPerYear: { $gt: 0 }
    })
    .populate('asset', 'model serialNumber')
    .populate('part', 'name partNumber');

    console.log(`📊 ${associations.length} association(s) trouvée(s)\n`);

    let updated = 0;
    let skipped = 0;

    for (const assoc of associations) {
      try {
        const daysUntilNext = Math.round(365 / assoc.replacementFrequencyPerYear);
        const nextDate = new Date(
          assoc.lastReplacementDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000
        );

        console.log(`\n   📦 ${assoc.asset?.model} + ${assoc.part?.name}`);
        console.log(`      Fréquence: ${assoc.replacementFrequencyPerYear}/an`);
        console.log(`      Dernier remplacement: ${assoc.lastReplacementDate.toLocaleDateString('fr-FR')}`);
        console.log(`      Jours jusqu'au prochain: ${daysUntilNext}`);
        console.log(`      Prochain remplacement calculé: ${nextDate.toLocaleDateString('fr-FR')}`);

        if (assoc.nextReplacementDate) {
          console.log(`      Prochain remplacement actuel: ${assoc.nextReplacementDate.toLocaleDateString('fr-FR')}`);
          
          // Vérifier si la date est différente
          if (Math.abs(nextDate.getTime() - assoc.nextReplacementDate.getTime()) > 24 * 60 * 60 * 1000) {
            assoc.nextReplacementDate = nextDate;
            await assoc.save();
            console.log(`      ✅ MODIFIÉ`);
            updated++;
          } else {
            console.log(`      ⚪ Déjà correct`);
            skipped++;
          }
        } else {
          assoc.nextReplacementDate = nextDate;
          await assoc.save();
          console.log(`      ✅ CRÉÉ`);
          updated++;
        }
      } catch (err) {
        console.error(`   ❌ Erreur pour association ${assoc._id}:`, err.message);
      }
    }

    console.log('\n✅ Initialisation terminée !');
    console.log(`   - Modifiés/Créés: ${updated}`);
    console.log(`   - Déjà corrects: ${skipped}`);
    console.log(`   - Total: ${associations.length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initializeNextReplacementDates();
