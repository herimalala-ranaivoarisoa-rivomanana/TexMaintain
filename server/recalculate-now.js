/**
 * Script simple pour recalculer toutes les associations
 * Exécuter avec: node recalculate-now.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { AssetPart } = require('./models/AssetPart');
const { Asset } = require('./models/Asset');
const { Part } = require('./models/Part');

async function recalculate() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    console.log(`   URI: ${mongoUri.replace(/:[^:@]+@/, ':***@')}`); // Masquer le mot de passe
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    console.log('📊 Récupération des associations...');
    const associations = await AssetPart.find({});
    console.log(`   Trouvé: ${associations.length} association(s)\n`);

    console.log('🔄 Recalcul en cours...');
    let updated = 0;
    let errors = 0;

    for (const assoc of associations) {
      try {
        // Charger avec les relations
        const populated = await AssetPart.findById(assoc._id)
          .populate('asset', 'model serialNumber')
          .populate('part', 'name partNumber');

        // Afficher avant
        const before = {
          qty: populated.quantityPerMachine,
          freq: populated.replacementFrequencyPerYear,
          annual: populated.annualConsumption,
          daily: populated.dailyConsumption,
          safety: populated.safetyStock,
          reorder: populated.reorderPoint
        };

        console.log(`\n   📦 ${populated.asset?.model || 'Unknown'} + ${populated.part?.name || 'Unknown'}`);
        console.log(`      Params: qty=${before.qty}, freq=${before.freq}/an`);
        console.log(`      AVANT:  annual=${before.annual}, daily=${before.daily?.toFixed(3) || 0}, safety=${before.safety}, reorder=${before.reorder}`);

        // Sauvegarder (déclenche le hook pre-save)
        await assoc.save();

        // Recharger pour voir les nouvelles valeurs
        const updated_assoc = await AssetPart.findById(assoc._id);

        const after = {
          annual: updated_assoc.annualConsumption,
          daily: updated_assoc.dailyConsumption,
          safety: updated_assoc.safetyStock,
          reorder: updated_assoc.reorderPoint
        };

        console.log(`      APRÈS:  annual=${after.annual}, daily=${after.daily?.toFixed(3) || 0}, safety=${after.safety}, reorder=${after.reorder}`);

        if (before.annual !== after.annual) {
          console.log(`      ✅ MODIFIÉ !`);
        } else {
          console.log(`      ⚪ Inchangé`);
        }

        updated++;
      } catch (err) {
        console.error(`   ❌ Erreur pour association ${assoc._id}:`, err.message);
        errors++;
      }
    }

    console.log('\n✅ Recalcul terminé !');
    console.log(`   - Succès: ${updated}`);
    console.log(`   - Erreurs: ${errors}`);
    console.log(`   - Total: ${associations.length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

recalculate();
