/**
 * Script pour recalculer les valeurs de toutes les associations existantes
 * À exécuter une seule fois pour corriger les données existantes
 */

const mongoose = require('mongoose');
const { AssetPart } = require('../models/AssetPart');
require('dotenv').config();

async function recalculateAllAssociations() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/texmaintain');
    console.log('✅ Connecté à MongoDB');

    // Récupérer toutes les associations
    const associations = await AssetPart.find({});
    console.log(`📊 ${associations.length} associations trouvées`);

    let updated = 0;
    let errors = 0;

    // Recalculer pour chaque association
    for (const assoc of associations) {
      try {
        // Le hook pre-save va recalculer automatiquement
        // On force juste une sauvegarde
        await assoc.save();
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`⏳ ${updated}/${associations.length} associations recalculées...`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour association ${assoc._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Recalcul terminé !');
    console.log(`   - Succès: ${updated}`);
    console.log(`   - Erreurs: ${errors}`);
    console.log(`   - Total: ${associations.length}`);

    // Afficher quelques exemples
    const samples = await AssetPart.find({}).limit(3).populate('asset', 'model').populate('part', 'name');
    console.log('\n📋 Exemples de valeurs recalculées:');
    samples.forEach(s => {
      console.log(`   - ${s.asset.model} + ${s.part.name}:`);
      console.log(`     Quantité: ${s.quantityPerMachine}, Fréquence: ${s.replacementFrequencyPerYear}/an`);
      console.log(`     → Consommation annuelle: ${s.annualConsumption} pièces`);
      console.log(`     → Consommation journalière: ${s.dailyConsumption.toFixed(3)} pièces`);
      console.log(`     → Stock de sécurité: ${s.safetyStock} pièces`);
      console.log(`     → Point de réappro: ${s.reorderPoint} pièces`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
recalculateAllAssociations();
