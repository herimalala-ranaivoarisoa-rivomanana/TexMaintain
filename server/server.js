// ================== server.js ==================

// Load environment variables
require("dotenv").config();

// Validate environment variables
const { validateEnv } = require("./config/validateEnv");
validateEnv();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("./models/Factory"); // Register Factory model explicitly

// Routes
const basicRoutes = require("./routes/index");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const seedRoutes = require("./routes/seedRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const equipmentCategoriesRoutes = require("./routes/equipmentCategoriesRoutes");
const equipmentTypesRoutes = require("./routes/equipmentTypesRoutes");
const brandsRoutes = require("./routes/brandsRoutes");
const interventionsRoutes = require("./routes/interventionsRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const processAreasRoutes = require("./routes/processAreasRoutes");
const processDepartmentsRoutes = require("./routes/processDepartmentsRoutes");
const machinistRoutes = require("./routes/machinistRoutes");
const mechanicRoutes = require("./routes/mechanicRoutes");
const electricianRoutes = require("./routes/electricianRoutes");
const maintenanceWorkerRoutes = require("./routes/maintenanceWorkerRoutes");
const breakdownMediaRoutes = require("./routes/breakdownMedia");
const equipmentPartsRoutes = require("./routes/equipmentPartsRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const procurementRoutes = require("./routes/procurementRoutes");
const projectRoutes = require("./routes/projectRoutes");
const assetClassesRoutes = require("./routes/assetClassesRoutes");
const businessUnitsRoutes = require("./routes/businessUnitsRoutes");
const sitesRoutes = require("./routes/sitesRoutes");
const subAssetsRoutes = require("./routes/subAssetsRoutes");
const backfillInterventions = require("./backfill_interventions_v2");

// Config
const { connectDB } = require("./config/database");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const pino = require("pino");
const pinoHttp = require("pino-http");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Pretty-print JSON responses
app.enable("json spaces");
app.enable("strict routing");

// ================== CORS ==================
const corsOptions = {
  origin: function (origin, callback) {
    // Liste des origines autorisées
    const allowedOrigins = [
      'https://tex-maintain.vercel.app',
      'https://tex-maintain-ii0g8dolf.vercel.app',
      /^https:\/\/tex-main.*\.vercel\.app$/, // Tous les previews Vercel
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    // Autoriser les requêtes sans origine (Postman, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est autorisée
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ Origin blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important pour les cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-factory-id',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight 24h
};

app.use(cors(corsOptions));

// ================== Security ==================
app.use(helmet());
app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Logging
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize to prevent NoSQL injection
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      logger.warn(`Sanitized potentially malicious input: ${key}`);
    },
  })
);

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================== Routes ==================

// Root / health check
app.get("/", (req, res) => {
  res.json({
    name: "TexMaintain API",
    status: "running",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date(),
  });
});

// Basic routes
app.use(basicRoutes);

// Health check
app.use("/api", healthRoutes);

// Authentication
app.use("/api/auth", authRoutes);

// Seed
app.use("/api/seed", seedRoutes);

// Domain routes
app.use("/api/equipment", equipmentRoutes);
app.use("/api/assets", equipmentRoutes);
app.use("/api/equipment-categories", equipmentCategoriesRoutes);
app.use("/api/equipment-types", equipmentTypesRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/interventions", interventionsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/process-areas", processAreasRoutes);
app.use("/api/process-departments", processDepartmentsRoutes);
app.use("/api/machinists", machinistRoutes);
app.use("/api/mechanics", mechanicRoutes);
app.use("/api/electricians", electricianRoutes);
app.use("/api/maintenance-workers", maintenanceWorkerRoutes);
app.use("/api/breakdown-media", breakdownMediaRoutes);
app.use("/api/equipment-parts", equipmentPartsRoutes);
app.use("/api/media", require("./routes/mediaRoutes"));
app.use("/api/reports", reportsRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/asset-classes", assetClassesRoutes);
app.use("/api/business-units", businessUnitsRoutes);
app.use("/api/sites", sitesRoutes);
app.use("/api/sub-assets", subAssetsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ================== Database & Server ==================
connectDB()
  .then(() => {
    // Run backfill / migrations
    backfillInterventions().catch((err) =>
      console.error("Startup backfill failed:", err)
    );

    // Start server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

// ================== Error listener ==================
app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});
