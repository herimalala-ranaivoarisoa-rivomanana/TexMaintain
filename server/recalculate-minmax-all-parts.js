/**
 * Script pour recalculer le min/max de TOUTES les pièces
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Part } = require('./models/Part');
const { EquipmentPart } = require('./models/EquipmentPart');
const { Equipment } = require('./models/Equipment');
const EquipmentPartsService = require('./services/equipmentPartsService');

async function recalculateAllPartsMinMax() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // Récupérer toutes les pièces qui ont au moins une association
    const partsWithAssociations = await EquipmentPart.distinct('part');
    console.log(`📊 ${partsWithAssociations.length} pièce(s) avec associations trouvée(s)\n`);

    let updated = 0;
    let errors = 0;

    for (const partId of partsWithAssociations) {
      try {
        // Récupérer les infos de la pièce
        const part = await Part.findById(partId);
        if (!part) {
          console.log(`   ⚠️  Pièce ${partId} non trouvée`);
          continue;
        }

        console.log(`\n   📦 ${part.name} (${part.partNumber})`);
        console.log(`      AVANT: Min=${part.minStock}, Max=${part.maxStock}`);

        // Recalculer
        const result = await EquipmentPartsService.recalculateMinMaxForPart(partId);

        console.log(`      APRÈS: Min=${result.minStock}, Max=${result.maxStock}`);

        if (result.minStock !== part.minStock || result.maxStock !== part.maxStock) {
          console.log(`      ✅ MODIFIÉ !`);
          updated++;
        } else {
          console.log(`      ⚪ Inchangé`);
        }
      } catch (err) {
        console.error(`   ❌ Erreur pour pièce ${partId}:`, err.message);
        errors++;
      }
    }

    console.log('\n✅ Recalcul terminé !');
    console.log(`   - Modifiés: ${updated}`);
    console.log(`   - Inchangés: ${partsWithAssociations.length - updated - errors}`);
    console.log(`   - Erreurs: ${errors}`);
    console.log(`   - Total: ${partsWithAssociations.length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

recalculateAllPartsMinMax();
