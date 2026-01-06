// Load environment variables
require("dotenv").config();

// Validate environment variables first
const { validateEnv } = require("./config/validateEnv");
validateEnv();

const mongoose = require("mongoose");
const express = require('express'); // Force restart 1
const session = require("express-session");
const MongoStore = require('connect-mongo');
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
const personnelRoutes = require("./routes/personnelRoutes");
const { connectDB } = require("./config/database");
const backfillInterventions = require("./backfill_interventions_v2");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const pino = require('pino');
const pinoHttp = require('pino-http');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
// Pretty-print JSON responses
app.enable('json spaces');
// We want to be consistent with URL paths, so we enable strict routing
app.enable('strict routing');

// Secure CORS configuration
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://172.19.144.1:5173'];
const allowedOrigins = process.env.FRONTEND_URL
  ? [...process.env.FRONTEND_URL.split(','), ...defaultOrigins]
  : defaultOrigins;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));

app.use(helmet());

// Compress all responses
app.use(compression());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Structured request logging
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized potentially malicious input: ${key}`);
  }
}));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
connectDB().then(() => {
  // Run backfill/migration logic on startup
  backfillInterventions().catch(err => console.error('Startup backfill failed:', err));

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Basic Routes
app.use(basicRoutes);
// Health Check Routes (no auth required)
app.use('/api', healthRoutes);
// Authentication Routes
app.use('/api/auth', authRoutes);
// Seed Routes
app.use('/api/seed', seedRoutes);
// Domain Routes
app.use('/api/equipment', equipmentRoutes);
app.use('/api/equipment-categories', equipmentCategoriesRoutes);
app.use('/api/equipment-types', equipmentTypesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/interventions', interventionsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/process-areas', processAreasRoutes);
app.use('/api/process-departments', processDepartmentsRoutes);
app.use('/api/machinists', machinistRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/electricians', electricianRoutes);
app.use('/api/maintenance-workers', maintenanceWorkerRoutes);
app.use('/api/breakdown-media', breakdownMediaRoutes);
app.use('/api/equipment-parts', equipmentPartsRoutes);
app.use('/api/media', require("./routes/mediaRoutes"));
app.use('/api/reports', reportsRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/personnel', personnelRoutes);

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

// Forced restart for KPI fix