// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const basicRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const seedRoutes = require("./routes/seedRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const equipmentCategoriesRoutes = require("./routes/equipmentCategoriesRoutes");
const equipmentTypesRoutes = require("./routes/equipmentTypesRoutes");
const brandsRoutes = require("./routes/brandsRoutes");
const interventionsRoutes = require("./routes/interventionsRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productionLinesRoutes = require("./routes/productionLinesRoutes");
const productionSectionsRoutes = require("./routes/productionSectionsRoutes");
const { connectDB } = require("./config/database");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL variables in .env missing.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;
// Pretty-print JSON responses
app.enable('json spaces');
// We want to be consistent with URL paths, so we enable strict routing
app.enable('strict routing');

app.use(cors({}));
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));
// Structured request logging
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
connectDB();

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Basic Routes
app.use(basicRoutes);
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
app.use('/api/production-lines', productionLinesRoutes);
app.use('/api/production-sections', productionSectionsRoutes);

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});