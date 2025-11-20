/**
 * Script pour traduire les notes existantes en base de données
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { EquipmentPart } = require('./models/EquipmentPart');
const { Equipment } = require('./models/Equipment');
const { Part } = require('./models/Part');

async function updateNotes() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    console.log('🔄 Mise à jour des notes...');

    // Trouver toutes les associations avec des notes en français
    const result = await EquipmentPart.updateMany(
      { notes: { $regex: 'Auto-dupliqué depuis équipement de référence' } },
      [
        {
          $set: {
            notes: {
              $replaceAll: {
                input: '$notes',
                find: 'Auto-dupliqué depuis équipement de référence',
                replacement: 'Auto-duplicated from reference equipment'
              }
            }
          }
        }
      ]
    );

    console.log(`✅ ${result.modifiedCount} note(s) mise(s) à jour\n`);

    // Afficher quelques exemples
    const examples = await EquipmentPart.find({
      notes: { $regex: 'Auto-duplicated from reference equipment' }
    })
    .limit(5)
    .populate('equipment', 'model serialNumber')
    .populate('part', 'name');

    if (examples.length > 0) {
      console.log('📝 Exemples de notes traduites:');
      for (const ex of examples) {
        console.log(`   - ${ex.equipment?.model} + ${ex.part?.name}`);
        console.log(`     "${ex.notes}"\n`);
      }
    }

    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

updateNotes();
