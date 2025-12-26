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
const { AssetClass } = require('../models/AssetClass.js');
const { Site } = require('../models/Site.js');

class SeedService {
  static async clearDatabase() {
    try {
      console.log('🧹 Clearing database (except Users and Factories)...');

      // Clear operational data
      await Promise.all([
        Equipment.deleteMany({}),
        Intervention.deleteMany({}),
        Project.deleteMany({}),
        ProcessArea.deleteMany({}),
        ProcessDepartment.deleteMany({}),
        Part.deleteMany({}),
        EquipmentCategory.deleteMany({}),
        EquipmentType.deleteMany({}),
        Brand.deleteMany({}),
        ProductionLine.deleteMany({}),
        ProductionSection.deleteMany({}),
        Mechanic.deleteMany({}),
        Electrician.deleteMany({}),
        MaintenanceWorker.deleteMany({}),
        Machinist.deleteMany({})
      ]);

      console.log('✅ Database cleared successfully.');
    } catch (error) {
      console.error('❌ Error clearing database:', error);
      throw error;
    }
  }

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

  static async seedSites() {
    try {
      console.log('Starting sites seeding...');

      const sitesData = [
        { name: 'TANA', code: 'TANA', city: 'Antananarivo', country: 'Madagascar' },
        { name: 'TANA WASH PLANT', code: 'TANA-WASH_PLANT', city: 'Antananarivo', country: 'Madagascar' },
        { name: 'ANTSIRABE 1', code: 'ANTSIRABE_1', city: 'Antsirabe', country: 'Madagascar' },
        { name: 'ANTSIRABE 1 WASH PLANT', code: 'ANTSIRABE_1-WASH_PLANT', city: 'Antsirabe', country: 'Madagascar' },
        { name: 'ANTSIRABE 2', code: 'ANTSIRABE_2', city: 'Antsirabe', country: 'Madagascar' },
        { name: 'ANTSIRABE 2 WASH PLANT', code: 'ANTSIRABE_2-WASH_PLANT', city: 'Antsirabe', country: 'Madagascar' },
        { name: 'DEEPING', code: 'DEEPING', city: 'Unknown', country: 'Unknown' }
      ];

      // Clear existing sites to ensure only the requested list exists
      console.log('Clearing existing sites...');
      await Site.deleteMany({});
      console.log('Existing sites cleared.');

      const createdSites = [];
      let skippedCount = 0;

      for (const siteData of sitesData) {
        const existing = await Site.findOne({ code: siteData.code });
        if (existing) {
          console.log(`Site already exists: ${siteData.name}`);
          skippedCount++;
          continue;
        }
        const site = new Site(siteData);
        await site.save();
        createdSites.push(site);
        console.log(`Site created: ${site.name}`);
      }

      console.log(`Sites seeding completed. Created: ${createdSites.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Sites seeding completed. Created: ${createdSites.length}, Skipped: ${skippedCount}`,
        created: createdSites,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding sites:', error);
      throw new Error(`Failed to seed sites: ${error.message}`);
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

      const categories = await EquipmentCategory.find();
      const types = await EquipmentType.find();
      const brands = await Brand.find();
      const sections = await ProductionSection.find().populate('productionLine');
      const sites = await Site.find();
      console.log(`Available sections for assignment: ${sections.length}`);
      console.log(`Available sites for assignment: ${sites.length}`);

      if (sites.length === 0) {
        throw new Error('No sites found. Please seed sites first.');
      }


      if (categories.length === 0 || types.length === 0 || brands.length === 0) {
        throw new Error('No categories, types, or brands found. Please seed them first.');
      }

      // Add specific equipment models
      const SPECIFIC_MODELS = [
        'LBH 1795A', 'LBH 1795A-S', 'LBH 1796AN', 'LBH1790', 'LBH1790A-S', 'LBH1790AN', 'LBH1790N', 'LBH1790S',
        'LBH1795A', 'LBH1796AN', 'LK 1903', 'LK 1903A SS', 'LK 1903AN SS', 'LK1900-ASS', 'LK1900A',
        'LK1900B-SS', 'LK1903', 'LK1903-ASS', 'LK1903A', 'LK1903A-SS', 'LK1903AN-SS', 'LK1903B-SS',
        'LK1903N-SS', 'Lapseam', 'LF2290A-SS', 'LH-896N', 'LZ2290', 'LZ2290 ASS7', 'LZ2290-ASS-7',
        'M832-38', 'MH 380', 'MH380', 'MH381', 'MF7923D', 'MF796AN', 'MO 6700', 'MO6716DA', 'MO6716OA',
        'MO67143', 'MO-6700', 'MO-6743DA', 'MO6743AA', 'MO6743DA', 'NS 45', 'NS 50', 'NS 56', 'NS 58',
        'NS 87', 'NS 94', 'NS 1504', 'NS 2410', 'NS 310', 'NS 3533', 'NS 650', 'NS 8401', 'NS 8401 P',
        'NS 8402', 'NS 8402 P', 'NS 8403', 'NS 8403 P', 'NS 8661', 'NS 9205', 'NS 9401', 'NS 9404',
        'NS 9504', 'NS-55-1', 'NH-602-AS', 'OB-700A', 'OP301', 'Overlock', 'Pegasus', 'PEGASOO', 'PEGASUS',
        'PFC 320', 'PMM-CP-203', 'PMM-J10', 'PMM-SAP 25', 'PMM-SF-9A', 'PMM-VT-302', 'Prestex', 'Rassage',
        'RPL-CB13009', 'SBLT-100N', 'Santian', 'SM-201L', 'TP 201', 'UHS 01', 'WI20F', 'WK 001',
        // Lockstitch
        'JUKI DDL-9000C', 'JUKI DDL-8700', 'BROTHER S-7300A', 'SIRUBA DL7200', 'JUKI DDL-5550N',
        'JUKI DLM-5400', 'JUKI DLN-9010',
        // Overlock
        'JUKI MO-6800S', 'PEGASUS M900', 'SIRUBA 747K', 'YAMATO CZ-6000', 'BROTHER 3034D',
        'JUKI MO-6714DA', 'PEGASUS M832',
        // Buttonhole / Button Attach
        'JUKI LBH-1790A', 'BROTHER HE-800B', 'JUKI LK-1903B'
      ];

      const getDetailsFromModel = (model) => {
        const name = model.toUpperCase();
        let brandName = 'Juki'; // default
        let categoryKey = 'sewing'; // default
        let typeKey = 'lockstitch'; // default

        // Determine Brand
        if (name.includes('BROTHER')) brandName = 'Brother';
        else if (name.includes('PEGASUS')) brandName = 'Pegasus';
        else if (name.includes('SIRUBA')) brandName = 'Siruba';
        else if (name.includes('YAMATO')) brandName = 'Yamato';
        else if (name.includes('EASTMAN')) brandName = 'Eastman';
        else if (name.includes('KM')) brandName = 'KM';
        else if (name.includes('HASHIMA')) brandName = 'Hashima';
        else if (name.includes('MACPI')) brandName = 'Macpi';
        else if (name.includes('VEIT')) brandName = 'Veit';
        else if (name.includes('BRISAY')) brandName = 'Brisay';
        else if (name.includes('HP-')) brandName = 'Hashima'; // Guess

        // Determine Type
        if (name.includes('MO-') || name.includes('M900') || name.includes('747K') || name.includes('CZ-') || name.includes('3034D') || name.includes('M832')) {
          typeKey = 'overlock';
        } else if (name.includes('LBH') || name.includes('HE-')) {
          typeKey = 'buttonhole';
        } else if (name.includes('LK-')) {
          typeKey = 'buttonattach';
        } else if (name.includes('HP-') || name.includes('HASHIMA') || name.includes('MACPI') || name.includes('VEIT') || name.includes('BRISAY')) {
          categoryKey = 'ironingpress';
          typeKey = 'buckpress';
        } else if (name.includes('EASTMAN') || name.includes('KM')) {
          categoryKey = 'cutting';
          typeKey = 'cutter';
        }

        return { brandName, categoryKey, typeKey };
      };

      // Helper function to generate realistic metrics
      const generateMetrics = (acquisitionDate) => {
        const now = new Date();
        const daysSinceAcq = (now - acquisitionDate) / (1000 * 60 * 60 * 24);

        // Operating time (approx 8h/day, 5 days/week => ~2000h/year)
        const years = daysSinceAcq / 365;
        const operatingTime = Math.floor(years * 2000);

        // MTBF: Random between 500 and 3000 hours
        const mtbf = 500 + Math.floor(Math.random() * 2500);

        // MTTR: Random between 1 and 8 hours
        const mttr = 1 + Math.floor(Math.random() * 7);

        // Downtime: OperatingTime / MTBF * MTTR
        const failures = operatingTime / mtbf;
        const downtime = Math.floor(failures * mttr);

        // Availability calculation
        // Total Time = Operating Time + Downtime (simplification)
        const totalTime = operatingTime + downtime;
        const availability = totalTime > 0 ? (operatingTime / totalTime) * 100 : 100;

        return {
          mtbf,
          mttr,
          operatingTime,
          downtime,
          availability: parseFloat(availability.toFixed(2))
        };
      };

      // Update equipment seeding to distribute across factories
      const factories = await Factory.find();
      if (factories.length === 0) {
        console.warn('No factories found during equipment seeding. Defaulting to legacy behavior if possible.');
      }

      const equipmentData = [];

      // We want to create equipment for EACH factory effectively
      // Or distribute the specific models across factories
      // Let's create a set of equipment for each factory's process areas

      console.log(`Processing equipment for ${factories.length} factories...`);

      for (const factory of factories) {
        // Find departments belonging to this factory
        const factoryAreas = await ProcessArea.find({ factory: factory._id });
        const factoryAreaIds = factoryAreas.map(l => l._id);

        const factoryDepartments = await ProcessDepartment.find({ processArea: { $in: factoryAreaIds } });

        if (factoryDepartments.length === 0) {
          console.log(`No departments found for factory ${factory.name}, skipping equipment generation for it.`);
          continue;
        }

        let deptIndex = 0;

        // Generate a subset of equipment for this factory
        const factoryModels = SPECIFIC_MODELS.filter(() => Math.random() > 0.5); // 50% of models per factory

        for (const modelName of (factoryModels.length > 0 ? factoryModels : SPECIFIC_MODELS.slice(0, 10))) {
          const details = getDetailsFromModel(modelName);

          let category = categories.find(c => c.key === details.categoryKey);
          if (!category) category = categories.find(c => c.name.toLowerCase().includes(details.categoryKey)) || categories[0];

          let type = types.find(t => t.key === details.typeKey);
          if (!type) type = types.find(t => t.name.toLowerCase().includes(details.typeKey)) || types[0];

          let brand = brands.find(b => b.name === details.brandName);
          if (!brand) brand = brands[0];

          const serialNumber = `${factory.code.substring(0, 3)}-${modelName.substring(0, 3)}-${Math.floor(Math.random() * 100000)}`;

          // Status distribution
          let status = 'in_production';
          const rand = Math.random();
          if (rand > 0.90) status = 'breakdown';
          else if (rand > 0.80) status = 'scheduled_maintenance';

          // Assign to a section
          let location = 'Antsirabe-1';
          let assignedSection = null;
          let assignedLineId = null;

          if (sections.length > 0) {
            assignedSection = sections[sectionIndex % sections.length];
            assignedLineId = assignedSection.productionLine ? assignedSection.productionLine._id : null;
            // Assign site based on section or randomly if no logic
            // For now, distribute randomly across sites
            const randomSiteIndex = Math.floor(Math.random() * sites.length);
            location = sites[randomSiteIndex].name;
            sectionIndex++;
          } else {
            const randomSiteIndex = Math.floor(Math.random() * sites.length);
            location = sites[randomSiteIndex].name;
          }

          // Find the site object to link
          // We used location string above, but we also want the ID reference
          // Let's refine the logic:
          const randomSite = sites[Math.floor(Math.random() * sites.length)];
          const siteId = randomSite._id;
          location = randomSite.name; // Keep legacy string for now, or use address

          // Generate lifecycle
          const acquisitionDate = new Date(Date.now() - Math.floor(Math.random() * 1500 * 24 * 60 * 60 * 1000));
          const metrics = generateMetrics(acquisitionDate);

          equipmentData.push({
            name: `${details.brandName} ${modelName}`,
            code: `EQ-${modelName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}-${Math.floor(Math.random() * 99999)}`,
            category: category._id,
            type: type._id,
            status: status,
            location: location,
            site: siteId,
            productionLine: assignedLineId,
            productionSection: assignedSection ? assignedSection._id : null,
            model: modelName,
            brand: brand._id,
            manufacturer: details.brandName,
            serialNumber: serialNumber,
            acquisitionDate: acquisitionDate,
            lastMaintenance: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
            nextMaintenance: new Date(Date.now() + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),

            // Metrics
            mtbf: metrics.mtbf,
            mttr: metrics.mttr,
            downtime: metrics.downtime,
            operatingTime: metrics.operatingTime,
            availability: metrics.availability,
            timeSinceAcquisition: Math.floor((Date.now() - acquisitionDate) / (1000 * 60 * 60 * 24)),

            // Internal reference for linking
            _assignedDept: assignedDept
          });
        }
      }

      console.log(`Generated ${equipmentData.length} equipment entries across factories.`);

      const createdEquipment = [];
      let skippedCount = 0;

      for (const equipData of equipmentData) {
        // Check uniqueness by serial number AND factory to be safe (though serial includes factory code now)
        const existingEquipment = await Equipment.findOne({ serialNumber: equipData.serialNumber });
        if (existingEquipment) {
          skippedCount++;
          continue;
        }

        const assignedDept = equipData._assignedDept;
        delete equipData._assignedDept;

        const equipment = new Equipment(equipData);
        await equipment.save();
        createdEquipment.push(equipment);

        if (assignedDept) {
          await ProcessDepartment.findByIdAndUpdate(assignedDept._id, {
            $push: {
              equipment: {
                equipmentId: equipment._id,
                order: (assignedDept.equipment?.length || 0) + 1,
                mtbf: equipment.mtbf,
                mttr: equipment.mttr,
                downTime: equipment.downtime,
                workingTime: equipment.operatingTime,
                TimeSinceInsertion: equipment.timeSinceAcquisition
              }
            }
          });
        }
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

  static async seedProcessAreas() {
    try {
      console.log('Starting process areas seeding (ProcessArea/Department)...');

      // Ensure factories exist
      const factories = await Factory.find();
      if (factories.length === 0) {
        throw new Error('No factories found. Please seed factories first.');
      }

      const createdAreas = [];
      let skippedCount = 0;

      // Define standard areas and departments structure to replicate per factory
      const standardAreas = [
        {
          name: 'Line 1',
          description: 'Production Line 1',
          type: 'production',
          departments: ['Preparation', 'Assembly', 'Finishing', 'Quality Control']
        },
        {
          name: 'Line 2',
          description: 'Production Line 2',
          type: 'production',
          departments: ['Cutting', 'Sewing', 'Ironing', 'Packing']
        },
        {
          name: 'Line 3',
          description: 'Production Line 3',
          type: 'production',
          departments: ['Molding', 'Assembly', 'Testing']
        },
        {
          name: 'Utilities',
          description: 'Factory Utilities',
          type: 'utility',
          departments: ['Power Plant', 'Water Treatment', 'Compressor Room']
        }
      ];

      for (const factory of factories) {
        console.log(`Seeding process areas for factory: ${factory.name}`);

        for (const areaTemplate of standardAreas) {
          const existingArea = await ProcessArea.findOne({ name: areaTemplate.name, factory: factory._id });
          if (existingArea) {
            skippedCount++;
            createdAreas.push(existingArea);
            continue;
          }

          const area = new ProcessArea({
            name: areaTemplate.name,
            description: `${areaTemplate.description} - ${factory.name}`,
            status: 'active',
            type: areaTemplate.type,
            factory: factory._id,
            stats: {
              targetOutput: Math.floor(Math.random() * 500) + 1000,
              actualOutput: Math.floor(Math.random() * 400) + 800,
              defectCount: Math.floor(Math.random() * 50),
              shiftDuration: 480,
              plannedDowntime: 30,
              lastUpdated: new Date()
            }
          });
          await area.save();

          // Create departments
          const deptObjects = [];
          for (const deptName of areaTemplate.departments) {
            const department = new ProcessDepartment({
              name: deptName,
              description: `${deptName} - ${areaTemplate.name} (${factory.name})`,
              processArea: area._id,
              equipment: []
            });
            await department.save();

            deptObjects.push({
              departmentId: department._id,
              order: deptObjects.length + 1
            });
          }

          area.departments = deptObjects;
          await area.save();

          createdAreas.push(area);
          console.log(`Created Process Area ${area.name} for ${factory.name}`);
        }
      }

      console.log(`Process areas seeding completed. Created: ${createdAreas.length - skippedCount}, Skipped: ${skippedCount}`);

      return {
        success: true,
        message: `Process areas seeding completed.`,
        created: createdAreas,
        skipped: skippedCount
      };


    } catch (error) {
      console.error('Error seeding process areas:', error);
      throw new Error(`Failed to seed process areas: ${error.message} `);
    }
  }

  static async seedParts() {
    try {
      console.log('Starting parts seeding...');

      const factories = await Factory.find();
      if (factories.length === 0) throw new Error('No factories found. Seed factories first.');

      let totalCreated = 0;
      let totalSkipped = 0;
      const createdParts = [];

      for (const factory of factories) {
        console.log(`Seeding parts for factory: ${factory.name}`);

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

          // IRONING / BUCKPRESS PARTS (Repassage)
          {
            name: 'Solenoid Valve Steam 24V',
            partNumber: 'VLV-STM-24V',
            category: 'Valves',
            type: 'part',
            currentStock: 10,
            minStock: 4,
            maxStock: 25,
            unitPrice: 45.00,
            supplier: 'Hashima Parts',
            location: 'Shelf H-1',
            pendingOrders: [],
            pendingQuantity: 0
          },
          {
            name: 'Teflon Shoe HP-450',
            partNumber: 'SHOE-TEF-450',
            category: 'Consumables',
            type: 'consumable',
            currentStock: 15,
            minStock: 5,
            maxStock: 40,
            unitPrice: 22.00,
            supplier: 'Ironing Supplies',
            location: 'Cabinet I-2',
            pendingOrders: [],
            pendingQuantity: 0
          },
          {
            name: 'Press Padding Upper (Felt)',
            partNumber: 'PAD-UP-FELT',
            category: 'Consumables',
            type: 'consumable',
            currentStock: 8,
            minStock: 3,
            maxStock: 20,
            unitPrice: 35.00,
            supplier: 'Macpi Genuine',
            location: 'Rack J-3',
            pendingOrders: [],
            pendingQuantity: 0
          },
          {
            name: 'Steam Hose High Temp 5m',
            partNumber: 'HOSE-STM-HI-5M',
            category: 'Hoses',
            type: 'part',
            currentStock: 12,
            minStock: 5,
            maxStock: 30,
            unitPrice: 18.50,
            supplier: 'Industrial Hoses',
            location: 'Shelf K-1',
            pendingOrders: [],
            pendingQuantity: 0
          },
          {
            name: 'Ironing Table Cover',
            partNumber: 'CVR-TBL-STD',
            category: 'Consumables',
            type: 'consumable',
            currentStock: 20,
            minStock: 10,
            maxStock: 60,
            unitPrice: 12.00,
            supplier: 'Ironing Supplies',
            location: 'Rack J-4',
            pendingOrders: [],
            pendingQuantity: 0
          },

          // ELECTRICAL & SOLENOIDSOMMABLES (44 pièces)
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

        // Inject random low stock and pending orders for dashboard liveliness
        partsData.forEach(p => {
          const rand = Math.random();
          if (rand < 0.15) { // 15% chance of low stock
            p.currentStock = Math.max(0, Math.floor(p.minStock * 0.5));
          }
          if (rand < 0.15) { // 15% chance of pending orders
            p.pendingOrders.push({
              quantity: Math.floor(Math.random() * 20) + 5,
              status: 'ordered',
              orderDate: new Date(),
              expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            p.pendingQuantity = p.pendingOrders.reduce((acc, o) => acc + o.quantity, 0);
          }
        });

        const createdParts = [];
        let skippedCount = 0;

        for (const partData of partsData) {
          // Check uniqueness by partNumber AND factory
          const existing = await Part.findOne({ partNumber: partData.partNumber, factory: factory._id });
          if (existing) {
            totalSkipped++;
            continue;
          }

          const part = new Part({
            ...partData,
            factory: factory._id, // Assign to current factory
            // Randomize stock slightly per factory to distinguish data
            currentStock: Math.max(0, partData.currentStock + Math.floor(Math.random() * 10) - 5)
          });

          await part.save();
          createdParts.push(part);
          totalCreated++;
        }
      } // End factory loop

      console.log(`Parts seeding completed. Created: ${totalCreated}, Skipped: ${totalSkipped}`);

      return {
        success: true,
        message: `Parts seeding completed. Created: ${totalCreated}, Skipped: ${totalSkipped}`,
        created: createdParts,
        skipped: totalSkipped
      };
    } catch (error) {
      console.error('Error seeding parts:', error);
      throw new Error(`Failed to seed parts: ${error.message} `);
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
          console.log(`Brand already exists: ${brandData.name} `);
          skippedCount++;
          continue;
        }
        const brand = new Brand(brandData);
        await brand.save();
        createdBrands.push(brand);
        console.log(`Brand created: ${brand.name} `);
      }

      console.log(`Brands seeding completed.Created: ${createdBrands.length}, Skipped: ${skippedCount} `);

      return {
        success: true,
        message: `Brands seeding completed.Created: ${createdBrands.length}, Skipped: ${skippedCount} `,
        created: createdBrands,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding brands:', error);
      throw new Error(`Failed to seed brands: ${error.message} `);
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

      // Generate 250 random interventions over the last year
      for (let i = 0; i < 250; i++) {
        const randomEquipment = equipment[Math.floor(Math.random() * equipment.length)];
        const randomUser = users.length > 0 ? users[Math.floor(Math.random() * users.length)] : null;

        const isRecent = Math.random() > 0.8; // 20% recent (Active)

        let type = interventionTypes[Math.floor(Math.random() * interventionTypes.length)];
        let priority = priorities[Math.floor(Math.random() * priorities.length)];
        let createdDate;
        let status;

        if (isRecent) {
          createdDate = new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)); // Last 5 days
          status = Math.random() > 0.3 ? 'Pending' : 'In Progress';
          if (Math.random() > 0.7) priority = 'High';
        } else {
          createdDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime() - 5 * 24 * 60 * 60 * 1000));
          const daysOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld > 30) {
            status = Math.random() > 0.1 ? 'Completed' : 'Cancelled';
          } else {
            status = Math.random() > 0.3 ? 'Completed' : 'In Progress';
          }
        }

        interventionsData.push({
          title: `${type} maintenance for ${randomEquipment.model}`,
          type: type,
          priority: priority,
          status: status,
          equipment: randomEquipment.model, // Legacy field
          equipmentId: randomEquipment._id,
          factory: randomEquipment.factory, // Assign to same factory as equipment
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

      console.log(`Interventions seeding completed.Created: ${createdInterventions.length}, Skipped: ${skippedCount} `);

      return {
        success: true,
        message: `Interventions seeding completed.Created: ${createdInterventions.length}, Skipped: ${skippedCount} `,
        created: createdInterventions,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding interventions:', error);
      throw new Error(`Failed to seed interventions: ${error.message} `);
    }
  }

  static async seedProjects() {
    try {
      console.log('Starting projects seeding...');
      const users = await User.find();
      const adminUser = users.find(u => u.role === 'admin') || users[0];
      const factories = await Factory.find();
      console.log(`Found ${factories.length} factories for project seeding.`);

      const createdProjects = [];
      let skippedCount = 0;

      for (const factory of factories) {
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
          // Factory-specific title
          const title = `[${factory.name}] ${data.title}`;

          const existing = await Project.findOne({ title: title, factory: factory._id });
          if (existing) {
            skippedCount++;
            continue;
          }

          const project = new Project({
            ...data,
            title: title,
            factory: factory._id,
            // Randomize progress/status per factory
            progress: Math.floor(Math.random() * 100)
          });
          await project.save();
          createdProjects.push(project);
        }
      } // End factory loop

      console.log(`Projects seeding completed.Created: ${createdProjects.length}, Skipped: ${skippedCount} `);
      return {
        success: true,
        created: createdProjects,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding projects:', error);
      throw new Error(`Failed to seed projects: ${error.message} `);
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

      // Helper to determine compatible parts
      const getCompatibleParts = (equipmentModel, availableParts) => {
        const model = equipmentModel.toUpperCase();
        const compatible = [];

        // Universal parts (Oils, Grease, Fuses, Belts if generic)
        const universalParts = availableParts.filter(p =>
          ['Lubricants', 'Oils', 'Greases', 'Cleaning Agents', 'Electrical'].includes(p.category) ||
          p.name.includes('V-Belt') // Generic V-Belts usually fit many
        );

        // Specific Logic
        if (model.includes('DDL') || model.includes('DLM') || model.includes('DLN')) {
          // Lockstitch machines
          compatible.push(...availableParts.filter(p =>
            p.partNumber.includes('DBX1') ||
            p.name.includes('Rotary Hook') ||
            p.name.includes('Bobbin Case DDL') ||
            p.name.includes('Feed Dog B') ||
            p.name.includes('Needle Plate E')
          ));
        } else if (model.includes('MO') || model.includes('OVERLOCK') || model.includes('PEGASUS') || model.includes('M832')) {
          // Overlock machines
          compatible.push(...availableParts.filter(p =>
            p.partNumber.includes('DCX27') ||
            p.name.includes('Looper') ||
            p.name.includes('Knife')
          ));
        } else if (model.includes('HP') || model.includes('HASHIMA') || model.includes('MACPI') || model.includes('VEIT') || model.includes('BRISAY')) {
          // Ironing / Buckpress
          compatible.push(...availableParts.filter(p =>
            p.name.includes('Valve Steam') ||
            p.name.includes('Teflon Shoe') ||
            p.name.includes('Padding') ||
            p.name.includes('Steam Hose') ||
            p.name.includes('Cover')
          ));
        } else if (model.includes('LBH')) {
          // Buttonhole
          compatible.push(...availableParts.filter(p =>
            p.name.includes('Buttonhole Knife') ||
            p.partNumber.includes('DPX17') // Heavy duty usually
          ));
        } else {
          // Fallback for others - generic sewing supplies
          compatible.push(...availableParts.filter(p => p.category === 'Sewing Supplies'));
        }

        // Add some universal parts randomly (not all oils to every machine)
        const selectedUniversals = universalParts.sort(() => 0.5 - Math.random()).slice(0, 2);

        return [...new Set([...compatible, ...selectedUniversals])]; // Dedupe
      };

      // For each equipment, assign COMPATIBLE parts
      for (const eq of equipment) {
        // Determine compatible parts based on model name
        const compatibleParts = getCompatibleParts(eq.model, parts);

        // If no specifically compatible found, fallback to just universals or random valid parts
        const partsToAssign = compatibleParts.length > 0 ? compatibleParts : parts.slice(0, 3);

        for (const part of partsToAssign) {
          // Check if association already exists
          const existing = await EquipmentPart.findOne({
            equipment: eq._id,
            part: part._id
          });

          if (existing) {
            skippedCount++;
            continue;
          }

          const equipmentPartData = {
            equipment: eq._id,
            part: part._id,
            quantity: Math.floor(Math.random() * 2) + 1, // 1-2 units usually installed
            isStandardPart: true,
            changedBy: adminUser._id,
            // Add some lifecycle data
            lastReplacementDate: new Date(Date.now() - Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000)),
            replacementFrequency: part.category === 'Lubricants' ? 2000 : 500 // Hours
          };

          const equipmentPart = new EquipmentPart(equipmentPartData);
          await equipmentPart.save();
          createdEquipmentParts.push(equipmentPart);
        }
      }

      console.log(`Equipment parts seeding completed.Created: ${createdEquipmentParts.length}, Skipped: ${skippedCount} `);

      return {
        success: true,
        message: `Equipment parts seeding completed.Created: ${createdEquipmentParts.length}, Skipped: ${skippedCount} `,
        created: createdEquipmentParts,
        skipped: skippedCount
      };
    } catch (error) {
      console.error('Error seeding equipment parts:', error);
      throw new Error(`Failed to seed equipment parts: ${error.message} `);
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

  static async seedAssetClasses() {
    try {
      console.log('Starting asset classes seeding...');
      const items = [
        { name: 'Production Equipment', code: 'PRD', description: 'Production equipment' },
        { name: 'Utilities', code: 'UTL', description: 'Utilities: air, steam, power, water' },
        { name: 'Facilities & Buildings', code: 'FAC', description: 'Facilities, buildings, HVAC' },
        { name: 'Infrastructure & IT', code: 'INF', description: 'Infrastructure, networks, IT' },
        { name: 'Safety & Environment', code: 'SAF', description: 'Safety, environment' },
        { name: 'Material Handling Equipment', code: 'MHE', description: 'Forklifts, conveyors, handling' }
      ];

      const created = [];
      let skipped = 0;
      for (const it of items) {
        const exists = await AssetClass.findOne({ code: it.code });
        if (exists) { skipped++; continue; }
        const doc = await AssetClass.create(it);
        created.push(doc);
      }

      return { success: true, message: 'Asset classes seeding completed', created, skipped };
    } catch (error) {
      console.error('Error seeding asset classes:', error);
      throw new Error(`Failed to seed asset classes: ${error.message}`);
    }
  }

  static async seedSites() {
    try {
      console.log('Starting sites seeding...');
      const items = [
        { name: 'Factory A – Antananarivo', code: 'TANA', country: 'MG', city: 'Antananarivo', timezone: 'Africa/Nairobi' },
        { name: 'Factory B – Tamatave', code: 'TMV', country: 'MG', city: 'Toamasina', timezone: 'Africa/Nairobi' }
      ];

      const created = [];
      let skipped = 0;
      for (const it of items) {
        const exists = await Site.findOne({ code: it.code });
        if (exists) { skipped++; continue; }
        const doc = await Site.create(it);
        created.push(doc);
      }

      return { success: true, message: 'Sites seeding completed', created, skipped };
    } catch (error) {
      console.error('Error seeding sites:', error);
      throw new Error(`Failed to seed sites: ${error.message}`);
    }
  }
}

module.exports = SeedService;