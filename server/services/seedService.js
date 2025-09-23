const { User } = require('../models/User.js');
const { Equipment } = require('../models/Equipment.js');
const { EquipmentCategory } = require('../models/EquipmentCategory.js');
const { EquipmentType } = require('../models/EquipmentType.js');
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

  static async seedEquipmentCategories() {
    try {
      console.log('Starting equipment categories seeding...');

      const categoriesData = [
        { name: 'Cutting Machine', description: 'Machines for cutting fabrics and materials' },
        { name: 'Sewing Machine', description: 'Industrial sewing machines for garment assembly' },
        { name: 'Overlock/Serger', description: 'Overlock machines for fabric edge finishing' },
        { name: 'Coverstitch Machine', description: 'Coverstitch machines for hems and edges' },
        { name: 'Embroidery Machine', description: 'Automated embroidery machines' },
        { name: 'Button/Buttonhole Machine', description: 'Machines for buttons and buttonholes' },
        { name: 'Pressing/Ironing', description: 'Pressing and ironing equipment' },
        { name: 'Finishing Equipment', description: 'Fabric finishing and treatment machines' },
        { name: 'Printing Machine', description: 'Fabric printing equipment' },
        { name: 'Packaging Equipment', description: 'Packaging and baling machines' },
        { name: 'Quality Control', description: 'Quality inspection equipment' },
        { name: 'Maintenance Equipment', description: 'Maintenance and repair tools' },
      ];

      const createdCategories = [];
      let skippedCount = 0;

      for (const categoryData of categoriesData) {
        const existing = await EquipmentCategory.findOne({ name: categoryData.name });
        if (existing) {
          console.log(`Category already exists: ${categoryData.name}`);
          skippedCount++;
          continue;
        }
        const category = new EquipmentCategory(categoryData);
        await category.save();
        createdCategories.push(category);
        console.log(`Category created: ${category.name}`);
      }

      console.log(`Categories seeding completed. Created: ${createdCategories.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Categories seeding completed. Created: ${createdCategories.length}, Skipped: ${skippedCount}`,
        created: createdCategories,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding equipment categories:', error);
      throw new Error(`Failed to seed equipment categories: ${error.message}`);
    }
  }

  static async seedEquipmentTypes() {
    try {
      console.log('Starting equipment types seeding...');

      // First ensure categories exist
      const categories = await EquipmentCategory.find();
      if (categories.length === 0) {
        throw new Error('No equipment categories found. Please seed categories first.');
      }

      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = cat._id;
      });

      const typesData = [
        // Cutting Machine types
        { name: 'Manual Cutter', category: categoryMap['cuttingmachine'], description: 'Manual cutting tools' },
        { name: 'Electric Cutter', category: categoryMap['cuttingmachine'], description: 'Electric cutting machines' },
        { name: 'CNC Cutting Machine', category: categoryMap['cuttingmachine'], description: 'Computer numerical control cutting systems' },
        { name: 'Cutting Press', category: categoryMap['cuttingmachine'], description: 'Hydraulic cutting presses' },

        // Sewing Machine types
        { name: 'Flat Stitch Machine (Straight Stitch)', category: categoryMap['sewingmachine'], description: 'Basic straight stitch sewing machines' },
        { name: 'Zigzag Machine', category: categoryMap['sewingmachine'], description: 'Zigzag stitch sewing machines' },
        { name: 'Double Needle Machine', category: categoryMap['sewingmachine'], description: 'Two-needle parallel stitching machines' },
        { name: 'Free Arm Machine', category: categoryMap['sewingmachine'], description: 'Free arm sewing machines for sleeves and tubes' },
        { name: 'Cylinder Bed Machine', category: categoryMap['sewingmachine'], description: 'Cylinder bed machines for difficult areas' },
        { name: 'Column Machine', category: categoryMap['sewingmachine'], description: 'Column machines for heavy fabrics' },
        { name: 'Triple Feed Machine', category: categoryMap['sewingmachine'], description: 'Triple feed machines for thick materials' },
        { name: 'Automated/Programmable Machine', category: categoryMap['sewingmachine'], description: 'Computer-controlled sewing machines' },

        // Overlock/Serger types
        { name: '3 Thread Overlock', category: categoryMap['overlockserger'], description: '3-thread overlock machines' },
        { name: '4 Thread Overlock', category: categoryMap['overlockserger'], description: '4-thread overlock machines' },
        { name: '5 Thread Overlock', category: categoryMap['overlockserger'], description: '5-thread overlock machines' },
        { name: 'Flatlock', category: categoryMap['overlockserger'], description: 'Flatlock overlock machines' },

        // Coverstitch types
        { name: 'Single Coverstitch', category: categoryMap['coverstitchmachine'], description: 'Single needle coverstitch machines' },
        { name: 'Double Coverstitch', category: categoryMap['coverstitchmachine'], description: 'Double needle coverstitch machines' },

        // Embroidery types
        { name: 'Single Head Embroidery Machine', category: categoryMap['embroiderymachine'], description: 'Single head embroidery machines' },
        { name: 'Multi-Head Embroidery Machine', category: categoryMap['embroiderymachine'], description: 'Multi-head embroidery machines' },

        // Button/Buttonhole types
        { name: 'Buttonhole Machine', category: categoryMap['buttonbuttonholemachine'], description: 'Automatic buttonhole cutting and sewing' },
        { name: 'Button Sewing Machine', category: categoryMap['buttonbuttonholemachine'], description: 'Automatic button attaching machines' },

        // Pressing/Ironing types
        { name: 'Pressing Machine', category: categoryMap['pressingironing'], description: 'Industrial pressing machines' },
        { name: 'Vacuum Table', category: categoryMap['pressingironing'], description: 'Vacuum tables for fabric holding' },
        { name: 'Inflatable Mannequin', category: categoryMap['pressingironing'], description: 'Inflatable forms for pressing' },
        { name: 'Steam Finishing Cabinet', category: categoryMap['pressingironing'], description: 'Steam finishing cabinets' },

        // Other categories
        { name: 'Finishing Equipment', category: categoryMap['finishingequipment'], description: 'General finishing equipment' },
        { name: 'Printing Machine', category: categoryMap['printingmachine'], description: 'Fabric printing machines' },
        { name: 'Packaging Equipment', category: categoryMap['packagingequipment'], description: 'Packaging and baling machines' },
        { name: 'Quality Control Equipment', category: categoryMap['qualitycontrol'], description: 'Quality inspection tools' },
        { name: 'Maintenance Equipment', category: categoryMap['maintenanceequipment'], description: 'Maintenance and repair tools' },
      ];

      const createdTypes = [];
      let skippedCount = 0;

      for (const typeData of typesData) {
        const existing = await EquipmentType.findOne({
          name: typeData.name,
          category: typeData.category
        });
        if (existing) {
          console.log(`Type already exists: ${typeData.name}`);
          skippedCount++;
          continue;
        }
        const type = new EquipmentType(typeData);
        await type.save();
        createdTypes.push(type);
        console.log(`Type created: ${type.name}`);
      }

      console.log(`Types seeding completed. Created: ${createdTypes.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Types seeding completed. Created: ${createdTypes.length}, Skipped: ${skippedCount}`,
        created: createdTypes,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding equipment types:', error);
      throw new Error(`Failed to seed equipment types: ${error.message}`);
    }
  }

  static async seedEquipment() {
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