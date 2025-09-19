const { User } = require('../models/User.js');
const { Equipment, EQUIPMENT_TYPES } = require('../models/Equipment.js');
const { Part } = require('../models/Part.js');
const { generatePasswordHash } = require('../utils/password.js');

class SeedService {
  static async seedAdminUser() {
    try {
      console.log('Starting admin user seeding...');
      
      const adminEmail = 'admin@texmaintain.com';
      const adminPassword = 'admin123';
      
      // Check if admin user already exists
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (existingAdmin) {
        console.log(`Admin user already exists with email: ${adminEmail}`);
        return {
          success: true,
          message: 'Admin user already exists',
          user: existingAdmin
        };
      }

      // Create admin user
      const hashedPassword = await generatePasswordHash(adminPassword);
      const adminUser = new User({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        lastLoginAt: new Date()
      });

      await adminUser.save();
      console.log(`Admin user created successfully with email: ${adminEmail}`);
      
      return {
        success: true,
        message: 'Admin user created successfully',
        user: adminUser,
        credentials: {
          email: adminEmail,
          password: adminPassword
        }
      };
    } catch (error) {
      console.error('Error seeding admin user:', error);
      throw new Error(`Failed to seed admin user: ${error.message}`);
    }
  }

  static async seedEquipmentTypes() {
    try {
      console.log('Starting equipment types seeding...');
      
      const equipmentTypesData = [
        {
          name: 'Ring Spinning Frame',
          type: 'spinning',
          status: 'operational',
          location: 'Spinning Department - Line 1',
          manufacturer: 'Rieter',
          model: 'G35',
          mtbf: 720,
          mttr: 4.5,
          specifications: {
            capacity: '1200 spindles',
            speed: '18000 rpm',
            yarn_count: 'Ne 20-60'
          }
        },
        {
          name: 'Air Jet Loom',
          type: 'weaving',
          status: 'operational', 
          location: 'Weaving Department - Line A',
          manufacturer: 'Toyota',
          model: 'JAT810',
          mtbf: 680,
          mttr: 6.2,
          specifications: {
            width: '190cm',
            speed: '900 rpm',
            fabric_type: 'Cotton/Polyester'
          }
        },
        {
          name: 'Jet Dyeing Machine',
          type: 'dyeing',
          status: 'maintenance',
          location: 'Dyeing Department - Unit 1',
          manufacturer: 'Thies',
          model: 'eco-soft',
          mtbf: 540,
          mttr: 8.1,
          specifications: {
            capacity: '500kg',
            temperature: '130°C max',
            pressure: '3 bar'
          }
        },
        {
          name: 'Stenter Machine',
          type: 'finishing',
          status: 'operational',
          location: 'Finishing Department',
          manufacturer: 'Monforts',
          model: 'Montex 6500',
          mtbf: 600,
          mttr: 5.8,
          specifications: {
            width: '3200mm',
            temperature: '220°C max',
            speed: '80 m/min'
          }
        },
        {
          name: 'Automated Cutting System',
          type: 'cutting',
          status: 'operational',
          location: 'Cutting Department',
          manufacturer: 'Gerber',
          model: 'DCS2500',
          mtbf: 480,
          mttr: 3.2,
          specifications: {
            cutting_area: '2.5m x 25m',
            thickness: '50mm max',
            accuracy: '±0.5mm'
          }
        },
        {
          name: 'Industrial Sewing Machine',
          type: 'sewing',
          status: 'operational',
          location: 'Sewing Department - Line 1',
          manufacturer: 'Juki',
          model: 'DDL-8700',
          mtbf: 360,
          mttr: 2.1,
          specifications: {
            speed: '5500 spm',
            stitch_length: '5mm max',
            needle: 'DB x 1'
          }
        }
      ];

      const createdEquipment = [];
      let skippedCount = 0;

      for (const equipmentData of equipmentTypesData) {
        // Check if equipment with same name already exists
        const existingEquipment = await Equipment.findOne({ name: equipmentData.name });
        
        if (existingEquipment) {
          console.log(`Equipment already exists: ${equipmentData.name}`);
          skippedCount++;
          continue;
        }

        // Generate unique serial number
        equipmentData.serialNumber = `${equipmentData.type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        equipmentData.installationDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date within last year
        equipmentData.lastMaintenance = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last month
        equipmentData.nextMaintenance = new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000); // Random date within next 2 months

        const equipment = new Equipment(equipmentData);
        await equipment.save();
        createdEquipment.push(equipment);
        console.log(`Equipment created: ${equipment.name} (${equipment.type})`);
      }

      console.log(`Equipment seeding completed. Created: ${createdEquipment.length}, Skipped: ${skippedCount}`);
      
      return {
        success: true,
        message: `Equipment seeding completed. Created: ${createdEquipment.length}, Skipped: ${skippedCount}`,
        created: createdEquipment,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding equipment types:', error);
      throw new Error(`Failed to seed equipment types: ${error.message}`);
    }
  }

  static async seedParts() {
    try {
      console.log('Starting parts seeding...');

      const partsData = [
        {
          name: 'V-Belt Type A',
          partNumber: 'VB-A-001',
          category: 'Belts',
          currentStock: 15,
          minStock: 10,
          maxStock: 50,
          unitPrice: 25.50,
          supplier: 'Industrial Parts Co.',
          location: 'Warehouse A-1'
        },
        {
          name: 'Bearing 6205',
          partNumber: 'BR-6205',
          category: 'Bearings',
          currentStock: 5,
          minStock: 8,
          maxStock: 30,
          unitPrice: 12.75,
          supplier: 'Bearing Solutions Ltd.',
          location: 'Warehouse A-2'
        },
        {
          name: 'Motor Oil SAE 30',
          partNumber: 'OIL-SAE30',
          category: 'Lubricants',
          currentStock: 25,
          minStock: 15,
          maxStock: 100,
          unitPrice: 8.90,
          supplier: 'Lubricant Express',
          location: 'Warehouse B-1'
        }
      ];

      const createdParts = [];
      let skippedCount = 0;

      for (const partData of partsData) {
        const existing = await Part.findOne({ partNumber: partData.partNumber });
        if (existing) {
          console.log(`Part already exists: ${partData.partNumber}`);
          skippedCount++;
          continue;
        }
        const part = new Part(partData);
        await part.save();
        createdParts.push(part);
        console.log(`Part created: ${part.name} (${part.partNumber})`);
      }

      console.log(`Parts seeding completed. Created: ${createdParts.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Parts seeding completed. Created: ${createdParts.length}, Skipped: ${skippedCount}`,
        created: createdParts,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding parts:', error);
      throw new Error(`Failed to seed parts: ${error.message}`);
    }
  }
}

module.exports = SeedService;