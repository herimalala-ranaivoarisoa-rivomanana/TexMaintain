/**
 * Script pour tester la duplication automatique
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Equipment } = require('./models/Equipment');
const { EquipmentType } = require('./models/EquipmentType');
const { EquipmentPart } = require('./models/EquipmentPart');
const { Part } = require('./models/Part');

async function testDuplication() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    const mongoUri = process.env.DATABASE_URL || 'mongodb://root:example@localhost:27017/texmaintain?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // 1. Trouver tous les équipements et leurs types
    console.log('📊 Analyse des équipements...\n');
    const equipments = await Equipment.find()
      .populate('type', 'name')
      .sort({ type: 1 });

    const typeGroups = {};
    for (const eq of equipments) {
      const typeName = eq.type?.name || 'Sans type';
      if (!typeGroups[typeName]) {
        typeGroups[typeName] = [];
      }
      typeGroups[typeName].push(eq);
    }

    console.log('🏭 Équipements par type:');
    for (const [typeName, eqs] of Object.entries(typeGroups)) {
      console.log(`\n   ${typeName}: ${eqs.length} équipement(s)`);
      for (const eq of eqs) {
        console.log(`      - ${eq.model} (${eq.serialNumber})`);
      }
    }

    // 2. Vérifier les associations existantes
    console.log('\n\n📦 Analyse des associations...\n');
    
    for (const [typeName, eqs] of Object.entries(typeGroups)) {
      if (eqs.length < 2) continue; // Besoin d'au moins 2 équipements du même type
      
      console.log(`\n🔍 Type: ${typeName} (${eqs.length} équipements)`);
      
      for (const eq of eqs) {
        const associations = await EquipmentPart.find({ equipment: eq._id })
          .populate('part', 'name type');
        
        console.log(`\n   ${eq.model}:`);
        if (associations.length === 0) {
          console.log(`      ❌ Aucune association`);
        } else {
          for (const assoc of associations) {
            console.log(`      ✅ ${assoc.part.name} (${assoc.part.type})`);
            if (assoc.notes && assoc.notes.includes('Auto-duplicated')) {
              console.log(`         📝 ${assoc.notes}`);
            }
          }
        }
      }
    }

    // 3. Vérifier si certaines pièces devraient être dupliquées mais ne le sont pas
    console.log('\n\n🔎 Recherche d\'incohérences...\n');
    
    for (const [typeName, eqs] of Object.entries(typeGroups)) {
      if (eqs.length < 2) continue;
      
      // Récupérer toutes les pièces associées à ce type d'équipement
      const allParts = new Map(); // partId -> [equipmentIds]
      
      for (const eq of eqs) {
        const associations = await EquipmentPart.find({ equipment: eq._id });
        for (const assoc of associations) {
          const partId = assoc.part.toString();
          if (!allParts.has(partId)) {
            allParts.set(partId, []);
          }
          allParts.get(partId).push(eq._id.toString());
        }
      }
      
      // Vérifier les incohérences
      for (const [partId, equipmentIds] of allParts.entries()) {
        if (equipmentIds.length < eqs.length) {
          const part = await Part.findById(partId);
          console.log(`\n   ⚠️ Incohérence détectée:`);
          console.log(`      Pièce: ${part.name} (${part.type})`);
          console.log(`      Présente sur: ${equipmentIds.length}/${eqs.length} équipements`);
          console.log(`      Manquante sur:`);
          
          for (const eq of eqs) {
            if (!equipmentIds.includes(eq._id.toString())) {
              console.log(`         - ${eq.model} (${eq.serialNumber})`);
            }
          }
        }
      }
    }

    await mongoose.disconnect();
    console.log('\n\n🔌 Déconnecté');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testDuplication();
