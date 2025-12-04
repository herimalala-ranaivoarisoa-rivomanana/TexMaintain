const { User } = require('../models/User.js');
const { Equipment } = require('../models/Equipment.js');
const { Intervention } = require('../models/Intervention.js');
const { Project } = require('../models/Project.js');
const { EquipmentCategory } = require('../models/EquipmentCategory.js');
const { EquipmentType } = require('../models/EquipmentType.js');
const { EquipmentPart } = require('../models/EquipmentPart.js');
const { Part } = require('../models/Part.js');
const { Brand } = require('../models/Brand.js');
const { generatePasswordHash } = require('../utils/password.js');
const { Mechanic } = require('../models/Mechanic.js');
const { Electrician } = require('../models/Electrician.js');
const { MaintenanceWorker } = require('../models/MaintenanceWorker.js');
const { Machinist } = require('../models/Machinist.js');
const { ProductionLine } = require('../models/ProductionLine.js');
const { ProductionSection } = require('../models/ProductionSection.js');

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
        { name: 'Single Needle Machine', category: categoryMap['sewingmachine'], description: 'Single needle sewing machines' },
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
      console.log('Starting equipment seeding...');

      // First ensure categories and types exist
      const categories = await EquipmentCategory.find();
      const types = await EquipmentType.find().populate('category');
      let brands = await Brand.find();

      if (categories.length === 0 || types.length === 0) {
        throw new Error('No equipment categories or types found. Please seed categories and types first.');
      }

      // Ensure at least one brand exists
      if (brands.length === 0) {
        console.warn('⚠️  No brands found. Creating default brand...');
        const defaultBrand = await Brand.create({
          name: 'Generic',
          description: 'Default brand for equipment without specific brand'
        });
        brands = [defaultBrand];
        console.log('✅ Default brand created');
      }

      // Create maps for easy lookup
      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = cat._id;
      });

      const typeMap = {};
      types.forEach(type => {
        typeMap[type.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = type._id;
      });

      const brandMap = {};
      brands.forEach(brand => {
        brandMap[brand.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = brand._id;
      });

      const equipmentData = [
        {
          name: 'Combing Machine CP-2000',
          code: 'EQ-SPIN-001',
          category: categoryMap['cuttingmachine'], // Assuming 'spinning' category doesn't exist, using 'cuttingmachine' as a placeholder or if it's meant to be a cutting machine for spinning
          type: typeMap['cuttingpress'], // Assuming 'spinning' type doesn't exist, using 'cuttingpress' as a placeholder
          status: 'stored',
          location: 'Production Floor - Spinning Area',
          model: 'CP-2000',
          brand: brandMap['rieter'] || brands[0]._id,
          manufacturer: 'Rieter',
          serialNumber: 'CP-2000-001',
          acquisitionDate: new Date('2022-01-15'),
          lastMaintenance: new Date('2024-10-01'),
          nextMaintenance: new Date('2025-01-01'),
          specifications: {
            cutting_area: '2.5m x 25m',
            thickness: '50mm max',
            accuracy: '±0.5mm'
          }
        },
        {
          name: 'Industrial Sewing Machine DDL-8700',
          code: 'EQ-SEW-001',
          category: categoryMap['sewingmachine'],
          type: typeMap['singleneedlemachine'],
          status: 'stored',
          location: 'Production Floor - Sewing Area',
          model: 'DDL-8700',
          brand: brandMap['juki'] || brands[0]._id,
          manufacturer: 'Juki',
          serialNumber: 'DDL-8700-001',
          acquisitionDate: new Date('2021-06-10'),
          lastMaintenance: new Date('2024-09-15'),
          nextMaintenance: new Date('2024-12-15'),
          specifications: {
            speed: '5500 spm',
            stitch_length: '5mm max',
            needle: 'DB x 1'
          }
        },
        {
          name: 'Steam Press Pro',
          code: 'EQ-PRESS-001',
          category: categoryMap['pressingironing'],
          type: typeMap['pressingmachine'],
          status: 'stored',
          location: 'Warehouse - Storage Area B',
          model: 'SteamPress Pro',
          brand: brandMap['monforts'] || brands[0]._id,
          manufacturer: 'Monforts',
          serialNumber: 'SPP-001',
          acquisitionDate: new Date('2020-03-20'),
          lastMaintenance: new Date('2024-10-20'),
          nextMaintenance: new Date('2024-11-20'),
          specifications: {
            temperature: '220°C max',
            pressure: '6 bar',
            steam_output: '50kg/h'
          }
        },
        {
          name: 'Fabric Inspector Pro',
          code: 'EQ-QC-001',
          category: categoryMap['qualitycontrol'],
          type: typeMap['qualitycontrolequipment'],
          status: 'stored',
          location: 'Quality Control Lab',
          model: 'FabricInspector Pro',
          brand: brandMap['other'] || brands[0]._id,
          manufacturer: 'QC Systems Ltd.',
          serialNumber: 'FIP-2023-001',
          acquisitionDate: new Date('2023-01-10'),
          lastMaintenance: new Date('2024-08-15'),
          nextMaintenance: new Date('2025-02-15'),
          specifications: {
            resolution: '0.01mm',
            measurement_range: '500mm x 300mm',
            accuracy: '±0.05mm'
          }
        },
        {
          name: 'ToolMaster 500',
          code: 'EQ-MAINT-001',
          category: categoryMap['maintenanceequipment'],
          type: typeMap['maintenanceequipment'],
          status: 'stored',
          location: 'Maintenance Workshop',
          model: 'ToolMaster 500',
          brand: brandMap['other'] || brands[0]._id,
          manufacturer: 'Workshop Solutions',
          serialNumber: 'TM-500-001',
          acquisitionDate: new Date('2022-11-05'),
          lastMaintenance: new Date('2024-07-10'),
          nextMaintenance: new Date('2025-01-10'),
          specifications: {
            power: '220V/50Hz',
            weight: '150kg',
            dimensions: '1200mm x 800mm x 600mm'
          }
        }
      ];

      // Generate 30 more random equipment
      for (let i = 1; i <= 30; i++) {
        const randomType = types[Math.floor(Math.random() * types.length)];
        const randomBrand = brands[Math.floor(Math.random() * brands.length)];
        // All equipment starts as stored, will be updated when assigned to a line
        const status = 'stored';

        const equipmentCode = `EQ-${randomType.name.substring(0, 4).toUpperCase()}-${String(i).padStart(3, '0')}`;
        const equipmentName = `${randomType.name} ${randomBrand.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000) + 1000}`;

        equipmentData.push({
          name: equipmentName,
          code: equipmentCode,
          category: randomType.category._id,
          type: randomType._id,
          status: status,
          location: `Warehouse - Storage Zone ${Math.floor(Math.random() * 5) + 1}`,
          model: `${randomBrand.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000) + 1000}`,
          brand: randomBrand._id,
          manufacturer: randomBrand.name,
          serialNumber: `SN-${Date.now()}-${i}`,
          acquisitionDate: new Date(Date.now() - Math.floor(Math.random() * 1000 * 24 * 60 * 60 * 1000)), // up to 1000 days ago
          lastMaintenance: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // up to 90 days ago
          nextMaintenance: new Date(Date.now() + Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // up to 90 days future
          specifications: {
            power: '220V/380V',
            capacity: `${Math.floor(Math.random() * 100) + 10} units/hr`
          }
        });
      }

      const createdEquipment = [];
      let skippedCount = 0;

      for (const equipData of equipmentData) {
        // Check if equipment with same serial number already exists
        const existingEquipment = await Equipment.findOne({
          serialNumber: equipData.serialNumber
        });

        if (existingEquipment) {
          skippedCount++;
          continue;
        }

        const equipment = new Equipment(equipData);
        await equipment.save();
        createdEquipment.push(equipment);
      }

      console.log(`Equipment seeding completed. Created: ${createdEquipment.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Equipment seeding completed. Created: ${createdEquipment.length}, Skipped: ${skippedCount}`,
        created: createdEquipment,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding equipment:', error);
      throw new Error(`Failed to seed equipment: ${error.message}`);
    }
  }

  static async seedProductionLines() {
    try {
      console.log('Starting process areas seeding...');

      const equipment = await Equipment.find();
      if (equipment.length === 0) {
        throw new Error('No equipment found. Please seed equipment first.');
      }

      const linesData = [
        {
          name: 'Line 1: Spinning',
          description: 'Cotton spinning line from blowroom to winding',
          status: 'active',
          sections: ['Blowroom', 'Carding', 'Drawing', 'Roving', 'Ring Spinning', 'Winding']
        },
        {
          name: 'Line 2: Weaving',
          description: 'High-speed air jet weaving line',
          status: 'active',
          sections: ['Warping', 'Sizing', 'Drawing-in', 'Weaving', 'Inspection']
        },
        {
          name: 'Line 3: Finishing',
          description: 'Dyeing and finishing process',
          status: 'maintenance',
          sections: ['Pre-treatment', 'Dyeing', 'Printing', 'Finishing', 'Quality Control']
        }
      ];

      const createdLines = [];
      let skippedCount = 0;

      // Shuffle equipment to distribute randomly
      const shuffledEquipment = [...equipment].sort(() => 0.5 - Math.random());
      let equipIndex = 0;

      for (const lineData of linesData) {
        const existingLine = await ProductionLine.findOne({ name: lineData.name });
        if (existingLine) {
          console.log(`Process Area already exists: ${lineData.name}`);
          skippedCount++;
          continue;
        }

        // Create the line first to get its ID
        const line = new ProductionLine({
          name: lineData.name,
          description: lineData.description,
          status: lineData.status,
          sections: [], // Will populate after creating sections
          stats: {
            targetOutput: Math.floor(Math.random() * 500) + 1000,
            actualOutput: Math.floor(Math.random() * 400) + 800,
            defectCount: Math.floor(Math.random() * 50),
            shiftDuration: 480,
            plannedDowntime: 30,
            lastUpdated: new Date()
          }
        });
        await line.save();

        // Create sections linked to the line
        const sectionObjects = [];
        for (const sectionName of lineData.sections) {
          // Assign 2-4 random equipment to each section
          const sectionEquipment = [];
          const numEquip = Math.floor(Math.random() * 3) + 2;

          for (let i = 0; i < numEquip; i++) {
            if (equipIndex < shuffledEquipment.length) {
              const eq = shuffledEquipment[equipIndex];
              sectionEquipment.push({
                equipmentId: eq._id,
                assignedDate: new Date()
              });

              // Update equipment status to in_production and location
              let newStatus = 'in_production';
              const rand = Math.random();
              if (rand > 0.9) newStatus = 'breakdown';
              else if (rand > 0.8) newStatus = 'scheduled_maintenance';

              await Equipment.findByIdAndUpdate(eq._id, {
                status: newStatus,
                location: `${lineData.name} - ${sectionName}`
              });

              equipIndex++;
            }
          }

          const section = await ProductionSection.create({
            name: sectionName,
            description: `${sectionName} section for ${lineData.name}`,
            status: 'active',
            productionLine: line._id, // Link to the created line
            equipment: sectionEquipment
          });

          sectionObjects.push({
            sectionId: section._id,
            order: sectionObjects.length + 1
          });
        }

        // Update the line with the created sections
        line.sections = sectionObjects;
        await line.save();

        // Update sections with production line ID
        for (const sec of sectionObjects) {
          await ProductionSection.findByIdAndUpdate(sec.sectionId, { productionLine: line._id });
        }

        createdLines.push(line);
        console.log(`Process Area created: ${line.name}`);
      }

      console.log(`Process areas seeding completed. Created: ${createdLines.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Process areas seeding completed. Created: ${createdLines.length}, Skipped: ${skippedCount}`,
        created: createdLines,
        skipped: skippedCount
      };

    } catch (error) {
      console.error('Error seeding process areas:', error);
      throw new Error(`Failed to seed process areas: ${error.message}`);
    }
  }

  static async seedParts() {
    try {
      console.log('Starting parts seeding...');

      const partsData = [
        // PIÈCES DE RECHANGE (41 pièces)
        {
          name: 'V-Belt Type A',
          partNumber: 'VB-A-001',
          category: 'Belts',
          type: 'part',
          currentStock: 15,
          minStock: 10,
          maxStock: 50,
          unitPrice: 25.50,
          supplier: 'Industrial Parts Co.',
          location: 'Warehouse A-1',
          pendingOrders: [
            { quantity: 20, status: 'ordered', orderDate: new Date(), expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
          ],
          pendingQuantity: 20
        },
        {
          name: 'V-Belt Type B',
          partNumber: 'VB-B-002',
          category: 'Belts',
          type: 'part',
          currentStock: 8,
          minStock: 12,
          maxStock: 40,
          unitPrice: 28.75,
          supplier: 'Industrial Parts Co.',
          location: 'Warehouse A-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Timing Belt XL',
          partNumber: 'TB-XL-003',
          category: 'Belts',
          type: 'part',
          currentStock: 22,
          minStock: 15,
          maxStock: 60,
          unitPrice: 35.00,
          supplier: 'Precision Parts Ltd.',
          location: 'Warehouse A-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Bearing 6205',
          partNumber: 'BR-6205',
          category: 'Bearings',
          type: 'part',
          currentStock: 5,
          minStock: 8,
          maxStock: 30,
          unitPrice: 12.75,
          supplier: 'Bearing Solutions Ltd.',
          location: 'Warehouse A-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Bearing 6306',
          partNumber: 'BR-6306',
          category: 'Bearings',
          type: 'part',
          currentStock: 12,
          minStock: 6,
          maxStock: 25,
          unitPrice: 18.50,
          supplier: 'Bearing Solutions Ltd.',
          location: 'Warehouse A-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Ball Bearing 608',
          partNumber: 'BR-608',
          category: 'Bearings',
          type: 'part',
          currentStock: 35,
          minStock: 20,
          maxStock: 100,
          unitPrice: 8.25,
          supplier: 'Bearing Solutions Ltd.',
          location: 'Warehouse A-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Tapered Roller Bearing',
          partNumber: 'BR-TRB-001',
          category: 'Bearings',
          type: 'part',
          currentStock: 7,
          minStock: 10,
          maxStock: 35,
          unitPrice: 45.00,
          supplier: 'Heavy Duty Parts Inc.',
          location: 'Warehouse A-2',
          pendingOrders: [
            { quantity: 15, status: 'pending', orderDate: new Date(), expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }
          ],
          pendingQuantity: 15
        },
        {
          name: 'Motor 3-Phase 2HP',
          partNumber: 'MOT-3PH-2HP',
          category: 'Motors',
          type: 'part',
          currentStock: 3,
          minStock: 2,
          maxStock: 8,
          unitPrice: 285.00,
          supplier: 'Electric Motors Co.',
          location: 'Warehouse B-3',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Servo Motor 750W',
          partNumber: 'MOT-SRV-750W',
          category: 'Motors',
          type: 'part',
          currentStock: 4,
          minStock: 3,
          maxStock: 12,
          unitPrice: 450.00,
          supplier: 'Automation Parts Ltd.',
          location: 'Warehouse B-3',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'DC Motor 12V',
          partNumber: 'MOT-DC-12V',
          category: 'Motors',
          type: 'part',
          currentStock: 8,
          minStock: 5,
          maxStock: 20,
          unitPrice: 65.00,
          supplier: 'Small Motors Inc.',
          location: 'Warehouse B-3',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Centrifugal Pump',
          partNumber: 'PMP-CF-001',
          category: 'Pumps',
          type: 'part',
          currentStock: 2,
          minStock: 1,
          maxStock: 5,
          unitPrice: 320.00,
          supplier: 'Pump Systems Ltd.',
          location: 'Warehouse C-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Gear Pump 5GPM',
          partNumber: 'PMP-GR-5GPM',
          category: 'Pumps',
          type: 'part',
          currentStock: 6,
          minStock: 4,
          maxStock: 15,
          unitPrice: 185.00,
          supplier: 'Industrial Pumps Co.',
          location: 'Warehouse C-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Solenoid Valve 1/2"',
          partNumber: 'VAL-SOL-12',
          category: 'Valves',
          type: 'part',
          currentStock: 18,
          minStock: 12,
          maxStock: 50,
          unitPrice: 45.00,
          supplier: 'Valve Specialists Inc.',
          location: 'Warehouse D-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Ball Valve 3/4"',
          partNumber: 'VAL-BALL-34',
          category: 'Valves',
          type: 'part',
          currentStock: 25,
          minStock: 15,
          maxStock: 75,
          unitPrice: 22.50,
          supplier: 'Valve Specialists Inc.',
          location: 'Warehouse D-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Pressure Relief Valve',
          partNumber: 'VAL-PRV-100',
          category: 'Valves',
          type: 'part',
          currentStock: 9,
          minStock: 6,
          maxStock: 25,
          unitPrice: 78.00,
          supplier: 'Safety Valves Ltd.',
          location: 'Warehouse D-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'HEPA Filter 24x24',
          partNumber: 'FLT-HEPA-2424',
          category: 'Filters',
          type: 'part',
          currentStock: 12,
          minStock: 8,
          maxStock: 30,
          unitPrice: 85.00,
          supplier: 'Air Filtration Systems',
          location: 'Warehouse E-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Oil Filter Element',
          partNumber: 'FLT-OIL-ELEM',
          category: 'Filters',
          type: 'part',
          currentStock: 45,
          minStock: 30,
          maxStock: 120,
          unitPrice: 12.00,
          supplier: 'Filter Tech Inc.',
          location: 'Warehouse E-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Air Filter Cartridge',
          partNumber: 'FLT-AIR-CART',
          category: 'Filters',
          type: 'part',
          currentStock: 28,
          minStock: 20,
          maxStock: 80,
          unitPrice: 18.50,
          supplier: 'Air Filtration Systems',
          location: 'Warehouse E-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Temperature Sensor PT100',
          partNumber: 'SEN-TEMP-PT100',
          category: 'Sensors',
          type: 'part',
          currentStock: 20,
          minStock: 15,
          maxStock: 60,
          unitPrice: 35.00,
          supplier: 'Sensor Solutions Ltd.',
          location: 'Warehouse F-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Proximity Sensor M18',
          partNumber: 'SEN-PROX-M18',
          category: 'Sensors',
          type: 'part',
          currentStock: 32,
          minStock: 25,
          maxStock: 100,
          unitPrice: 28.00,
          supplier: 'Sensor Solutions Ltd.',
          location: 'Warehouse F-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Pressure Transducer 0-10bar',
          partNumber: 'SEN-PRESS-10BAR',
          category: 'Sensors',
          type: 'part',
          currentStock: 14,
          minStock: 10,
          maxStock: 40,
          unitPrice: 95.00,
          supplier: 'Process Sensors Inc.',
          location: 'Warehouse F-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Linear Actuator 100mm',
          partNumber: 'ACT-LIN-100MM',
          category: 'Actuators',
          type: 'part',
          currentStock: 5,
          minStock: 3,
          maxStock: 12,
          unitPrice: 180.00,
          supplier: 'Motion Control Systems',
          location: 'Warehouse G-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Pneumatic Cylinder 50mm',
          partNumber: 'ACT-PNEU-50MM',
          category: 'Actuators',
          type: 'part',
          currentStock: 12,
          minStock: 8,
          maxStock: 35,
          unitPrice: 75.00,
          supplier: 'Pneumatic Solutions Ltd.',
          location: 'Warehouse G-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Stepper Motor NEMA23',
          partNumber: 'ACT-STEP-N23',
          category: 'Actuators',
          type: 'part',
          currentStock: 8,
          minStock: 5,
          maxStock: 20,
          unitPrice: 120.00,
          supplier: 'Motion Control Systems',
          location: 'Warehouse G-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'USB Cable Type A-B',
          partNumber: 'CAB-USB-AB',
          category: 'Cables',
          type: 'part',
          currentStock: 50,
          minStock: 30,
          maxStock: 150,
          unitPrice: 8.50,
          supplier: 'Cable Specialists Inc.',
          location: 'Warehouse H-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Ethernet Cable Cat6 1m',
          partNumber: 'CAB-ETH-C6-1M',
          category: 'Cables',
          type: 'part',
          currentStock: 75,
          minStock: 40,
          maxStock: 200,
          unitPrice: 12.00,
          supplier: 'Network Cables Ltd.',
          location: 'Warehouse H-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Power Cable 3-Core',
          partNumber: 'CAB-PWR-3C',
          category: 'Cables',
          type: 'part',
          currentStock: 30,
          minStock: 20,
          maxStock: 80,
          unitPrice: 15.50,
          supplier: 'Electrical Supplies Co.',
          location: 'Warehouse H-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Terminal Block 10-Pole',
          partNumber: 'CONN-TB-10P',
          category: 'Connectors',
          type: 'part',
          currentStock: 40,
          minStock: 25,
          maxStock: 120,
          unitPrice: 6.50,
          supplier: 'Electrical Connectors Ltd.',
          location: 'Warehouse I-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'RJ45 Connector',
          partNumber: 'CONN-RJ45',
          category: 'Connectors',
          type: 'part',
          currentStock: 100,
          minStock: 60,
          maxStock: 300,
          unitPrice: 2.25,
          supplier: 'Network Connectors Inc.',
          location: 'Warehouse I-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Relay SPDT 12V',
          partNumber: 'SW-RLY-SPDT-12V',
          category: 'Switches',
          type: 'part',
          currentStock: 35,
          minStock: 20,
          maxStock: 100,
          unitPrice: 8.75,
          supplier: 'Electronic Components Ltd.',
          location: 'Warehouse J-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Limit Switch Roller',
          partNumber: 'SW-LMT-RLR',
          category: 'Switches',
          type: 'part',
          currentStock: 22,
          minStock: 15,
          maxStock: 60,
          unitPrice: 18.50,
          supplier: 'Switch Specialists Inc.',
          location: 'Warehouse J-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Push Button Switch',
          partNumber: 'SW-PB-RED',
          category: 'Switches',
          type: 'part',
          currentStock: 55,
          minStock: 30,
          maxStock: 150,
          unitPrice: 5.25,
          supplier: 'Control Components Ltd.',
          location: 'Warehouse J-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Arduino Mega 2560',
          partNumber: 'PCB-ARD-MEGA',
          category: 'Circuit Boards',
          type: 'part',
          currentStock: 8,
          minStock: 5,
          maxStock: 20,
          unitPrice: 45.00,
          supplier: 'Electronics Warehouse',
          location: 'Warehouse K-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Raspberry Pi 4B',
          partNumber: 'PCB-RPI-4B',
          category: 'Circuit Boards',
          type: 'part',
          currentStock: 6,
          minStock: 4,
          maxStock: 15,
          unitPrice: 85.00,
          supplier: 'Raspberry Pi Store',
          location: 'Warehouse K-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Screw M8x50 Hex',
          partNumber: 'FST-SCR-M8X50',
          category: 'Fasteners',
          type: 'part',
          currentStock: 200,
          minStock: 100,
          maxStock: 500,
          unitPrice: 0.75,
          supplier: 'Fastener Supply Co.',
          location: 'Warehouse L-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Nut M8 Hex',
          partNumber: 'FST-NUT-M8',
          category: 'Fasteners',
          type: 'part',
          currentStock: 300,
          minStock: 150,
          maxStock: 800,
          unitPrice: 0.25,
          supplier: 'Fastener Supply Co.',
          location: 'Warehouse L-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Washer M8 Flat',
          partNumber: 'FST-WSH-M8-FLAT',
          category: 'Fasteners',
          type: 'part',
          currentStock: 400,
          minStock: 200,
          maxStock: 1000,
          unitPrice: 0.15,
          supplier: 'Fastener Supply Co.',
          location: 'Warehouse L-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Hammer 16oz',
          partNumber: 'TOOL-HMR-16OZ',
          category: 'Tools',
          type: 'part',
          currentStock: 12,
          minStock: 8,
          maxStock: 30,
          unitPrice: 25.00,
          supplier: 'Tool Masters Inc.',
          location: 'Warehouse M-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Screwdriver Set 10pc',
          partNumber: 'TOOL-SDR-10PC',
          category: 'Tools',
          type: 'part',
          currentStock: 18,
          minStock: 12,
          maxStock: 45,
          unitPrice: 35.00,
          supplier: 'Tool Masters Inc.',
          location: 'Warehouse M-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Digital Multimeter',
          partNumber: 'TOOL-DMM-BASIC',
          category: 'Tools',
          type: 'part',
          currentStock: 7,
          minStock: 5,
          maxStock: 20,
          unitPrice: 65.00,
          supplier: 'Electrical Tools Ltd.',
          location: 'Warehouse M-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Maintenance Tool Kit',
          partNumber: 'TOOL-KIT-MAINT',
          category: 'Maintenance Equipment',
          type: 'part',
          currentStock: 5,
          minStock: 3,
          maxStock: 12,
          unitPrice: 180.00,
          supplier: 'Maintenance Supplies Co.',
          location: 'Warehouse N-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Calibration Kit',
          partNumber: 'MAINT-CAL-KIT',
          category: 'Maintenance Equipment',
          type: 'part',
          currentStock: 4,
          minStock: 2,
          maxStock: 10,
          unitPrice: 250.00,
          supplier: 'Precision Instruments Ltd.',
          location: 'Warehouse N-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Needle Set 70/10',
          partNumber: 'NEEDLE-7010',
          category: 'Sewing Supplies',
          type: 'part',
          currentStock: 100,
          minStock: 50,
          maxStock: 200,
          unitPrice: 2.50,
          supplier: 'Sewing Parts Inc.',
          location: 'Warehouse O-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Bobbin Case Assembly',
          partNumber: 'SEW-BOB-CASE',
          category: 'Sewing Supplies',
          type: 'part',
          currentStock: 25,
          minStock: 15,
          maxStock: 60,
          unitPrice: 45.00,
          supplier: 'Sewing Parts Inc.',
          location: 'Warehouse O-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Cutting Blade 8"',
          partNumber: 'CUT-BLADE-8IN',
          category: 'Cutting Tools',
          type: 'part',
          currentStock: 15,
          minStock: 10,
          maxStock: 40,
          unitPrice: 28.00,
          supplier: 'Cutting Tools Specialists',
          location: 'Warehouse P-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Rotary Cutter 45mm',
          partNumber: 'CUT-ROT-45MM',
          category: 'Cutting Tools',
          type: 'part',
          currentStock: 20,
          minStock: 12,
          maxStock: 50,
          unitPrice: 35.00,
          supplier: 'Fabric Cutting Supplies',
          location: 'Warehouse P-1',
          pendingOrders: [],
          pendingQuantity: 0
        },

        // CONSOMMABLES (44 pièces)
        {
          name: 'Motor Oil SAE 30',
          partNumber: 'OIL-SAE30',
          category: 'Lubricants',
          type: 'consumable',
          currentStock: 25,
          minStock: 15,
          maxStock: 100,
          unitPrice: 8.90,
          supplier: 'Lubricant Express',
          location: 'Warehouse B-1',
          pendingOrders: [
            { quantity: 50, status: 'pending', orderDate: new Date(), expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }
          ],
          pendingQuantity: 50
        },
        {
          name: 'Grease NLGI 2',
          partNumber: 'GREASE-NLGI2',
          category: 'Lubricants',
          type: 'consumable',
          currentStock: 12,
          minStock: 20,
          maxStock: 80,
          unitPrice: 15.75,
          supplier: 'Lubricant Express',
          location: 'Warehouse B-2',
          pendingOrders: [
            { quantity: 30, status: 'ordered', orderDate: new Date(), expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
          ],
          pendingQuantity: 30
        },
        {
          name: 'Hydraulic Oil ISO 46',
          partNumber: 'OIL-HYD-ISO46',
          category: 'Lubricants',
          type: 'consumable',
          currentStock: 18,
          minStock: 25,
          maxStock: 90,
          unitPrice: 22.50,
          supplier: 'Industrial Lubricants Ltd.',
          location: 'Warehouse B-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Gear Oil 80W-90',
          partNumber: 'OIL-GEAR-8090',
          category: 'Lubricants',
          type: 'consumable',
          currentStock: 30,
          minStock: 20,
          maxStock: 120,
          unitPrice: 18.25,
          supplier: 'Gear Lubricants Inc.',
          location: 'Warehouse B-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Transmission Fluid ATF',
          partNumber: 'OIL-TRNS-ATF',
          category: 'Lubricants',
          type: 'consumable',
          currentStock: 22,
          minStock: 15,
          maxStock: 85,
          unitPrice: 16.75,
          supplier: 'Auto Fluids Supply',
          location: 'Warehouse B-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Cutting Oil Synthetic',
          partNumber: 'OIL-CUT-SYN',
          category: 'Lubricants',
          type: 'consumable',
          currentStock: 35,
          minStock: 25,
          maxStock: 150,
          unitPrice: 12.50,
          supplier: 'Metalworking Lubricants',
          location: 'Warehouse B-2',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Compressor Oil 10W',
          partNumber: 'OIL-COMP-10W',
          category: 'Oils',
          type: 'consumable',
          currentStock: 28,
          minStock: 20,
          maxStock: 100,
          unitPrice: 19.75,
          supplier: 'Compressor Specialists',
          location: 'Warehouse Q-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Transformer Oil',
          partNumber: 'OIL-TRNSFRM',
          category: 'Oils',
          type: 'consumable',
          currentStock: 15,
          minStock: 10,
          maxStock: 50,
          unitPrice: 45.00,
          supplier: 'Electrical Oils Ltd.',
          location: 'Warehouse Q-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Silicone Oil 100cSt',
          partNumber: 'OIL-SIL-100CST',
          category: 'Oils',
          type: 'consumable',
          currentStock: 20,
          minStock: 12,
          maxStock: 75,
          unitPrice: 28.50,
          supplier: 'Specialty Oils Co.',
          location: 'Warehouse Q-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'White Lithium Grease',
          partNumber: 'GREASE-WHT-LITH',
          category: 'Greases',
          type: 'consumable',
          currentStock: 40,
          minStock: 25,
          maxStock: 150,
          unitPrice: 8.75,
          supplier: 'Grease Manufacturers Inc.',
          location: 'Warehouse R-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'High Temp Grease',
          partNumber: 'GREASE-HT-500',
          category: 'Greases',
          type: 'consumable',
          currentStock: 18,
          minStock: 15,
          maxStock: 60,
          unitPrice: 24.00,
          supplier: 'Industrial Greases Ltd.',
          location: 'Warehouse R-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Food Grade Grease',
          partNumber: 'GREASE-FOOD-H1',
          category: 'Greases',
          type: 'consumable',
          currentStock: 12,
          minStock: 8,
          maxStock: 40,
          unitPrice: 35.00,
          supplier: 'Food Safe Lubricants',
          location: 'Warehouse R-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Coolant Ethylene Glycol',
          partNumber: 'COOL-ETH-GLYCOL',
          category: 'Coolants',
          type: 'consumable',
          currentStock: 45,
          minStock: 30,
          maxStock: 180,
          unitPrice: 14.25,
          supplier: 'Cooling Solutions Inc.',
          location: 'Warehouse S-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Coolant Propylene Glycol',
          partNumber: 'COOL-PROP-GLYCOL',
          category: 'Coolants',
          type: 'consumable',
          currentStock: 32,
          minStock: 25,
          maxStock: 120,
          unitPrice: 16.50,
          supplier: 'Cooling Solutions Inc.',
          location: 'Warehouse S-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Isopropyl Alcohol 99%',
          partNumber: 'CLN-IPA-99PCT',
          category: 'Cleaning Agents',
          type: 'consumable',
          currentStock: 60,
          minStock: 40,
          maxStock: 200,
          unitPrice: 12.00,
          supplier: 'Chemical Cleaners Ltd.',
          location: 'Warehouse T-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Degreaser Heavy Duty',
          partNumber: 'CLN-DEGR-HD',
          category: 'Cleaning Agents',
          type: 'consumable',
          currentStock: 25,
          minStock: 15,
          maxStock: 80,
          unitPrice: 18.75,
          supplier: 'Industrial Cleaners Co.',
          location: 'Warehouse T-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Contact Cleaner Spray',
          partNumber: 'CLN-CONTACT',
          category: 'Cleaning Agents',
          type: 'consumable',
          currentStock: 40,
          minStock: 25,
          maxStock: 120,
          unitPrice: 9.50,
          supplier: 'Electronic Cleaners Inc.',
          location: 'Warehouse T-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Epoxy Adhesive 5min',
          partNumber: 'ADH-EPOXY-5MIN',
          category: 'Adhesives',
          type: 'consumable',
          currentStock: 35,
          minStock: 20,
          maxStock: 100,
          unitPrice: 15.25,
          supplier: 'Adhesive Technologies',
          location: 'Warehouse U-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Super Glue Gel',
          partNumber: 'ADH-SUPER-GEL',
          category: 'Adhesives',
          type: 'consumable',
          currentStock: 50,
          minStock: 30,
          maxStock: 150,
          unitPrice: 6.50,
          supplier: 'Fast Bond Adhesives',
          location: 'Warehouse U-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Threadlocker Blue',
          partNumber: 'ADH-THRD-BLUE',
          category: 'Adhesives',
          type: 'consumable',
          currentStock: 28,
          minStock: 15,
          maxStock: 80,
          unitPrice: 12.00,
          supplier: 'Thread Sealing Solutions',
          location: 'Warehouse U-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'RTV Silicone Sealant',
          partNumber: 'SEAL-RTV-SIL',
          category: 'Sealants',
          type: 'consumable',
          currentStock: 42,
          minStock: 25,
          maxStock: 120,
          unitPrice: 8.75,
          supplier: 'Sealant Specialists',
          location: 'Warehouse V-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Gasket Maker Anaerobic',
          partNumber: 'SEAL-GKT-ANA',
          category: 'Sealants',
          type: 'consumable',
          currentStock: 18,
          minStock: 12,
          maxStock: 60,
          unitPrice: 22.50,
          supplier: 'Gasket Solutions Ltd.',
          location: 'Warehouse V-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Pipe Thread Sealant',
          partNumber: 'SEAL-PTHR-TAPE',
          category: 'Sealants',
          type: 'consumable',
          currentStock: 65,
          minStock: 40,
          maxStock: 200,
          unitPrice: 5.25,
          supplier: 'Pipe Sealing Experts',
          location: 'Warehouse V-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Spray Paint Black',
          partNumber: 'PAINT-SPR-BLK',
          category: 'Paints',
          type: 'consumable',
          currentStock: 30,
          minStock: 15,
          maxStock: 90,
          unitPrice: 11.50,
          supplier: 'Industrial Paints Co.',
          location: 'Warehouse W-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Rust Preventive Spray',
          partNumber: 'PAINT-RUST-PREV',
          category: 'Paints',
          type: 'consumable',
          currentStock: 22,
          minStock: 12,
          maxStock: 70,
          unitPrice: 16.75,
          supplier: 'Corrosion Protection Ltd.',
          location: 'Warehouse W-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Primer Metal',
          partNumber: 'PAINT-PRIM-METAL',
          category: 'Paints',
          type: 'consumable',
          currentStock: 15,
          minStock: 10,
          maxStock: 50,
          unitPrice: 19.00,
          supplier: 'Metal Primers Inc.',
          location: 'Warehouse W-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Clear Coat Spray',
          partNumber: 'COAT-CLEAR-SPR',
          category: 'Coatings',
          type: 'consumable',
          currentStock: 25,
          minStock: 15,
          maxStock: 75,
          unitPrice: 14.25,
          supplier: 'Coating Specialists',
          location: 'Warehouse X-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Anti-Corrosion Coating',
          partNumber: 'COAT-ANTI-CORR',
          category: 'Coatings',
          type: 'consumable',
          currentStock: 12,
          minStock: 8,
          maxStock: 40,
          unitPrice: 28.50,
          supplier: 'Corrosion Control Systems',
          location: 'Warehouse X-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Acetone Technical Grade',
          partNumber: 'CHEM-ACET-TECH',
          category: 'Chemicals',
          type: 'consumable',
          currentStock: 20,
          minStock: 10,
          maxStock: 60,
          unitPrice: 18.75,
          supplier: 'Chemical Suppliers Ltd.',
          location: 'Warehouse Y-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Methanol Pure',
          partNumber: 'CHEM-METH-PURE',
          category: 'Chemicals',
          type: 'consumable',
          currentStock: 15,
          minStock: 8,
          maxStock: 45,
          unitPrice: 25.00,
          supplier: 'Lab Chemicals Inc.',
          location: 'Warehouse Y-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Sodium Hydroxide',
          partNumber: 'CHEM-NAOH',
          category: 'Chemicals',
          type: 'consumable',
          currentStock: 8,
          minStock: 5,
          maxStock: 25,
          unitPrice: 32.50,
          supplier: 'Industrial Chemicals Co.',
          location: 'Warehouse Y-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Toluene Solvent',
          partNumber: 'SOLV-TOLUENE',
          category: 'Solvents',
          type: 'consumable',
          currentStock: 18,
          minStock: 12,
          maxStock: 55,
          unitPrice: 21.25,
          supplier: 'Solvent Specialists',
          location: 'Warehouse Z-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Xylene Mix',
          partNumber: 'SOLV-XYLENE',
          category: 'Solvents',
          type: 'consumable',
          currentStock: 14,
          minStock: 10,
          maxStock: 45,
          unitPrice: 19.75,
          supplier: 'Paint Thinners Ltd.',
          location: 'Warehouse Z-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Diesel Fuel Regular',
          partNumber: 'FUEL-DIESEL-REG',
          category: 'Fuels',
          type: 'consumable',
          currentStock: 120,
          minStock: 80,
          maxStock: 400,
          unitPrice: 1.85,
          supplier: 'Fuel Distributors Inc.',
          location: 'Warehouse AA-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Gasoline Unleaded',
          partNumber: 'FUEL-GAS-UNL',
          category: 'Fuels',
          type: 'consumable',
          currentStock: 85,
          minStock: 50,
          maxStock: 300,
          unitPrice: 1.95,
          supplier: 'Petrol Station Supply',
          location: 'Warehouse AA-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'AA Battery Pack',
          partNumber: 'BAT-AA-PACK',
          category: 'Batteries',
          type: 'consumable',
          currentStock: 60,
          minStock: 30,
          maxStock: 180,
          unitPrice: 4.25,
          supplier: 'Battery Wholesale Ltd.',
          location: 'Warehouse BB-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: '9V Battery',
          partNumber: 'BAT-9V',
          category: 'Batteries',
          type: 'consumable',
          currentStock: 45,
          minStock: 25,
          maxStock: 150,
          unitPrice: 2.75,
          supplier: 'Battery Wholesale Ltd.',
          location: 'Warehouse BB-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Cartridge Toner Black',
          partNumber: 'CART-TONER-BLK',
          category: 'Cartridges',
          type: 'consumable',
          currentStock: 12,
          minStock: 8,
          maxStock: 35,
          unitPrice: 65.00,
          supplier: 'Printer Supplies Co.',
          location: 'Warehouse CC-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Ink Cartridge Color',
          partNumber: 'CART-INK-COLOR',
          category: 'Cartridges',
          type: 'consumable',
          currentStock: 18,
          minStock: 12,
          maxStock: 50,
          unitPrice: 42.50,
          supplier: 'Ink Cartridge Specialists',
          location: 'Warehouse CC-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Duct Tape 2" x 50m',
          partNumber: 'TAPE-DUCT-2X50',
          category: 'Tapes',
          type: 'consumable',
          currentStock: 35,
          minStock: 20,
          maxStock: 100,
          unitPrice: 8.50,
          supplier: 'Tape Manufacturers Ltd.',
          location: 'Warehouse DD-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Electrical Tape Black',
          partNumber: 'TAPE-ELEC-BLK',
          category: 'Tapes',
          type: 'consumable',
          currentStock: 50,
          minStock: 30,
          maxStock: 150,
          unitPrice: 3.25,
          supplier: 'Electrical Supplies Co.',
          location: 'Warehouse DD-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Masking Tape 1"',
          partNumber: 'TAPE-MASK-1IN',
          category: 'Tapes',
          type: 'consumable',
          currentStock: 40,
          minStock: 25,
          maxStock: 120,
          unitPrice: 2.75,
          supplier: 'Painting Supplies Inc.',
          location: 'Warehouse DD-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Hot Glue Sticks 7mm',
          partNumber: 'GLUE-HOT-7MM',
          category: 'Glues',
          type: 'consumable',
          currentStock: 75,
          minStock: 40,
          maxStock: 250,
          unitPrice: 0.75,
          supplier: 'Glue Gun Supplies',
          location: 'Warehouse EE-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'PVC Cement Medium',
          partNumber: 'GLUE-PVC-MED',
          category: 'Glues',
          type: 'consumable',
          currentStock: 28,
          minStock: 15,
          maxStock: 80,
          unitPrice: 12.50,
          supplier: 'Pipe Cement Specialists',
          location: 'Warehouse EE-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'Welding Rod 7018 1/8"',
          partNumber: 'WELD-ROD-7018',
          category: 'Welding Supplies',
          type: 'consumable',
          currentStock: 45,
          minStock: 25,
          maxStock: 150,
          unitPrice: 5.25,
          supplier: 'Welding Supply Co.',
          location: 'Warehouse FF-1',
          pendingOrders: [],
          pendingQuantity: 0
        },
        {
          name: 'MIG Welding Wire',
          partNumber: 'WELD-WIRE-MIG',
          category: 'Welding Supplies',
          type: 'consumable',
          currentStock: 30,
          minStock: 20,
          maxStock: 100,
          unitPrice: 8.75,
          supplier: 'Welding Supply Co.',
          location: 'Warehouse FF-1',
          pendingOrders: [],
          pendingQuantity: 0
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

  static async seedBrands() {
    try {
      console.log('Starting brands seeding...');

      const brandsData = [
        { name: 'Rieter', description: 'Leading manufacturer of textile machinery, specializing in spinning systems' },
        { name: 'Schlafhorst', description: 'Premium textile machinery for rotor spinning and winding' },
        { name: 'Murata Machinery', description: 'Advanced textile machinery including air jet looms and spinning frames' },
        { name: 'Toyota Industries', description: 'High-speed air jet weaving machines and textile equipment' },
        { name: 'Picanol', description: 'Innovative weaving solutions and air jet looms' },
        { name: 'Sulzer', description: 'Precision weaving machinery and projectile looms' },
        { name: 'Itema', description: 'High-performance weaving machines and textile solutions' },
        { name: 'Benninger', description: 'Textile finishing equipment and dyeing machines' },
        { name: 'Lakshmi Machine Works', description: 'Comprehensive textile machinery manufacturer' },
        { name: 'Trützschler', description: 'Carding and blowroom equipment for spinning preparation' },
        { name: 'Juki', description: 'Industrial sewing machines and automation solutions' },
        { name: 'Gerber', description: 'Automated cutting systems for apparel and textiles' },
        { name: 'Monforts', description: 'Textile finishing and coating equipment' },
        { name: 'Thies', description: 'Dyeing and finishing machinery for textiles' },
        { name: 'Other', description: 'Other brands not listed' }
      ];

      const createdBrands = [];
      let skippedCount = 0;

      for (const brandData of brandsData) {
        const existing = await Brand.findOne({ name: brandData.name });
        if (existing) {
          console.log(`Brand already exists: ${brandData.name}`);
          skippedCount++;
          continue;
        }
        const brand = new Brand(brandData);
        await brand.save();
        createdBrands.push(brand);
        console.log(`Brand created: ${brand.name}`);
      }

      console.log(`Brands seeding completed. Created: ${createdBrands.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Brands seeding completed. Created: ${createdBrands.length}, Skipped: ${skippedCount}`,
        created: createdBrands,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding brands:', error);
      throw new Error(`Failed to seed brands: ${error.message}`);
    }
  }

  static async seedInterventions() {
    try {
      console.log('Starting interventions seeding...');

      const equipment = await Equipment.find();
      const users = await User.find();

      if (equipment.length === 0) {
        throw new Error('No equipment found. Please seed equipment first.');
      }

      const interventionTypes = ['Corrective', 'Preventive', 'Emergency'];
      const priorities = ['Low', 'Medium', 'High', 'Critical'];
      const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

      const interventionsData = [];
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1); // 1 year ago

      // Generate 50 random interventions over the last year
      for (let i = 0; i < 50; i++) {
        const randomEquipment = equipment[Math.floor(Math.random() * equipment.length)];
        const randomUser = users.length > 0 ? users[Math.floor(Math.random() * users.length)] : null;
        const type = interventionTypes[Math.floor(Math.random() * interventionTypes.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];

        // Random date within the last year
        const createdDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));

        // Determine status based on date (older ones likely completed)
        let status;
        const daysOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysOld > 30) {
          status = Math.random() > 0.1 ? 'Completed' : 'Cancelled';
        } else if (daysOld > 7) {
          status = Math.random() > 0.3 ? 'Completed' : 'In Progress';
        } else {
          status = Math.random() > 0.5 ? 'In Progress' : 'Pending';
        }

        interventionsData.push({
          title: `${type} maintenance for ${randomEquipment.model}`,
          type: type,
          priority: priority,
          status: status,
          equipment: randomEquipment.model, // Legacy field
          equipmentId: randomEquipment._id,
          assignedTo: randomUser ? randomUser.email : 'Unassigned',
          description: `Generated ${type.toLowerCase()} intervention for ${randomEquipment.model}. Issue reported on ${createdDate.toLocaleDateString()}.`,
          createdDate: createdDate,
          dueDate: new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000) // Due 1 week after creation
        });
      }

      const createdInterventions = [];
      let skippedCount = 0;

      for (const data of interventionsData) {
        // Simple check to avoid exact duplicates if re-running (though random dates make it unlikely)
        const existing = await Intervention.findOne({
          equipmentId: data.equipmentId,
          createdDate: data.createdDate
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const intervention = new Intervention(data);
        await intervention.save();
        createdInterventions.push(intervention);
      }

      console.log(`Interventions seeding completed. Created: ${createdInterventions.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Interventions seeding completed. Created: ${createdInterventions.length}, Skipped: ${skippedCount}`,
        created: createdInterventions,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding interventions:', error);
      throw new Error(`Failed to seed interventions: ${error.message}`);
    }
  }

  static async seedProjects() {
    try {
      console.log('Starting projects seeding...');
      const users = await User.find();
      const adminUser = users.find(u => u.role === 'admin') || users[0];

      const projectsData = [
        {
          title: 'Equipment Modernization Phase 1',
          description: 'Upgrading spinning machines with IoT sensors and predictive maintenance capabilities.',
          status: 'In Progress',
          budget: 450000,
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
          progress: 65,
          teamSize: 8,
          createdBy: adminUser?._id
        },
        {
          title: 'Equipment Modernization Phase 2',
          description: 'Extending IoT integration to weaving looms and quality control systems.',
          status: 'Planned',
          budget: 550000,
          startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 2 months from now
          endDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), // 8 months from now
          progress: 0,
          teamSize: 10,
          createdBy: adminUser?._id
        },
        {
          title: 'Equipment Modernization Phase 3',
          description: 'Full automation of material handling between spinning and weaving sections.',
          status: 'Planned',
          budget: 750000,
          startDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), // 8 months from now
          endDate: new Date(Date.now() + 420 * 24 * 60 * 60 * 1000), // 14 months from now
          progress: 0,
          teamSize: 15,
          createdBy: adminUser?._id
        },
        {
          title: 'Warehouse Automation',
          description: 'Implementing automated storage and retrieval system for spare parts inventory.',
          status: 'In Progress',
          budget: 1200000,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
          endDate: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000), // 11 months from now
          progress: 15,
          teamSize: 12,
          createdBy: adminUser?._id
        },
        {
          title: 'Energy Efficiency Overhaul',
          description: 'Replacing legacy motors with high-efficiency units across process areas.',
          status: 'Completed',
          budget: 280000,
          startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
          endDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          progress: 100,
          teamSize: 6,
          createdBy: adminUser?._id
        },
        {
          title: 'Solar Panel Installation',
          description: 'Installation of 500kW solar array on factory roof to reduce energy costs.',
          status: 'Completed',
          budget: 600000,
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
          endDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
          progress: 100,
          teamSize: 8,
          createdBy: adminUser?._id
        },
        {
          title: 'Safety Compliance Audit',
          description: 'Comprehensive safety audit and implementation of new safety protocols.',
          status: 'In Progress',
          budget: 50000,
          startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          progress: 45,
          teamSize: 4,
          createdBy: adminUser?._id
        },
        {
          title: 'ERP Integration',
          description: 'Integrating maintenance software with central ERP system.',
          status: 'On Hold',
          budget: 150000,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
          endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months from now
          progress: 30,
          teamSize: 5,
          createdBy: adminUser?._id
        },
        {
          title: 'Staff Training Program',
          description: 'Advanced technical training for maintenance staff on new equipment.',
          status: 'In Progress',
          budget: 25000,
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          progress: 33,
          teamSize: 20,
          createdBy: adminUser?._id
        },
        {
          title: 'Water Recycling Plant',
          description: 'Construction of a new water recycling facility for the dyeing section.',
          status: 'Planned',
          budget: 850000,
          startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000),
          progress: 0,
          teamSize: 18,
          createdBy: adminUser?._id
        }
      ];

      const createdProjects = [];
      let skippedCount = 0;

      for (const data of projectsData) {
        const existing = await Project.findOne({ title: data.title });
        if (existing) {
          skippedCount++;
          continue;
        }

        const project = new Project(data);
        await project.save();
        createdProjects.push(project);
      }

      console.log(`Projects seeding completed. Created: ${createdProjects.length}, Skipped: ${skippedCount}`);
      return {
        success: true,
        created: createdProjects,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding projects:', error);
      throw new Error(`Failed to seed projects: ${error.message}`);
    }
  }

  static async seedEquipmentParts() {
    try {
      console.log('Starting equipment parts seeding...');

      // Get all equipment and parts
      const equipment = await Equipment.find().populate('category').populate('type').lean();
      const parts = await Part.find().lean();
      const adminUser = await User.findOne({ role: 'admin' });

      if (equipment.length === 0 || parts.length === 0) {
        throw new Error('No equipment or parts found. Please seed equipment and parts first.');
      }

      if (!adminUser) {
        throw new Error('No admin user found. Please seed admin user first.');
      }

      const createdEquipmentParts = [];
      let skippedCount = 0;

      // For each equipment, assign some random parts
      for (const eq of equipment) {
        // Assign 1-3 random parts to each equipment
        const numParts = Math.floor(Math.random() * 3) + 1;
        const shuffledParts = parts.sort(() => 0.5 - Math.random());
        const selectedParts = shuffledParts.slice(0, numParts);

        for (const part of selectedParts) {
          // Check if association already exists
          const existing = await EquipmentPart.findOne({
            equipment: eq._id,
            part: part._id
          });

          if (existing) {
            console.log(`Equipment-Part association already exists: ${eq.location} - ${part.name}`);
            skippedCount++;
            continue;
          }

          const equipmentPartData = {
            equipment: eq._id,
            part: part._id,
            quantity: Math.floor(Math.random() * 5) + 1, // 1-5 units
            isStandardPart: Math.random() > 0.3, // 70% chance of being standard
            changedBy: adminUser._id
          };

          // Add replacement info for some parts
          if (Math.random() > 0.5) {
            equipmentPartData.lastReplacementDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            equipmentPartData.replacementFrequency = Math.floor(Math.random() * 200) + 50; // 50-250 hours
          }

          const equipmentPart = new EquipmentPart(equipmentPartData);
          await equipmentPart.save();
          createdEquipmentParts.push(equipmentPart);
          console.log(`Equipment-Part association created: ${eq.location} - ${part.name}`);
        }
      }

      console.log(`Equipment parts seeding completed. Created: ${createdEquipmentParts.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Equipment parts seeding completed. Created: ${createdEquipmentParts.length}, Skipped: ${skippedCount}`,
        created: createdEquipmentParts,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding equipment parts:', error);
      throw new Error(`Failed to seed equipment parts: ${error.message}`);
    }
  }
  static async seedMaintenancePersonnel() {
    try {
      console.log('Starting maintenance personnel seeding...');
      const results = {
        mechanics: { created: 0, skipped: 0 },
        electricians: { created: 0, skipped: 0 },
        workers: { created: 0, skipped: 0 },
        machinists: { created: 0, skipped: 0 }
      };

      // 1. Seed Mechanics
      const mechanicsData = [
        { matricule: 'MEC001', firstName: 'John', lastName: 'Doe', specialization: 'General Mechanics', certifications: ['Certified Master Mechanic'] },
        { matricule: 'MEC002', firstName: 'Mike', lastName: 'Smith', specialization: 'Hydraulics', certifications: ['Hydraulic Systems Specialist'] },
        { matricule: 'MEC003', firstName: 'David', lastName: 'Johnson', specialization: 'Pneumatics', certifications: [] },
        { matricule: 'MEC004', firstName: 'Robert', lastName: 'Brown', specialization: 'Welding', certifications: ['AWS Certified Welder'] }
      ];

      for (const data of mechanicsData) {
        const existing = await Mechanic.findOne({ matricule: data.matricule });
        if (existing) {
          results.mechanics.skipped++;
          continue;
        }
        await Mechanic.create(data);
        results.mechanics.created++;
      }

      // 2. Seed Electricians
      const electriciansData = [
        { matricule: 'ELEC001', firstName: 'James', lastName: 'Wilson', specialization: 'Industrial Electrical', certifications: ['Master Electrician'] },
        { matricule: 'ELEC002', firstName: 'Thomas', lastName: 'Anderson', specialization: 'Control Systems', certifications: ['PLC Programming'] },
        { matricule: 'ELEC003', firstName: 'William', lastName: 'Taylor', specialization: 'Motor Repair', certifications: [] },
        { matricule: 'ELEC004', firstName: 'Richard', lastName: 'Moore', specialization: 'Instrumentation', certifications: ['Instrumentation Tech'] }
      ];

      for (const data of electriciansData) {
        const existing = await Electrician.findOne({ matricule: data.matricule });
        if (existing) {
          results.electricians.skipped++;
          continue;
        }
        await Electrician.create(data);
        results.electricians.created++;
      }

      // 3. Seed Maintenance Workers
      const workersData = [
        { matricule: 'WRK001', firstName: 'Joseph', lastName: 'Martin', specialization: 'General Repairs' },
        { matricule: 'WRK002', firstName: 'Charles', lastName: 'Thompson', specialization: 'Facility Maintenance' },
        { matricule: 'WRK003', firstName: 'Daniel', lastName: 'Garcia', specialization: 'Cleaning' },
        { matricule: 'WRK004', firstName: 'Matthew', lastName: 'Martinez', specialization: 'Painting' }
      ];

      for (const data of workersData) {
        const existing = await MaintenanceWorker.findOne({ matricule: data.matricule });
        if (existing) {
          results.workers.skipped++;
          continue;
        }
        await MaintenanceWorker.create(data);
        results.workers.created++;
      }

      // 4. Seed Machinists
      const machinistsData = [
        { matricule: 'MAC001', firstName: 'Paul', lastName: 'Robinson' },
        { matricule: 'MAC002', firstName: 'Mark', lastName: 'Clark' },
        { matricule: 'MAC003', firstName: 'Donald', lastName: 'Rodriguez' },
        { matricule: 'MAC004', firstName: 'George', lastName: 'Lewis' }
      ];

      for (const data of machinistsData) {
        const existing = await Machinist.findOne({ matricule: data.matricule });
        if (existing) {
          results.machinists.skipped++;
          continue;
        }
        await Machinist.create(data);
        results.machinists.created++;
      }

      console.log('Maintenance personnel seeding completed.');
      return {
        success: true,
        message: 'Maintenance personnel seeded successfully',
        results
      };

    } catch (error) {
      console.error('Error seeding maintenance personnel:', error);
      throw new Error(`Failed to seed maintenance personnel: ${error.message}`);
    }
  }
}

module.exports = SeedService;