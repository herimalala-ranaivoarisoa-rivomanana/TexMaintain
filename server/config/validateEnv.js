/**
 * Environment Variables Validation
 * Ensures all required environment variables are present at startup
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'PORT',
  'LOG_LEVEL',
  'FRONTEND_URL',
  'REDIS_HOST',
  'REDIS_PORT'
];

function validateEnv() {
  console.log('🔍 Validating environment variables...');
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  // Warn about missing optional variables
  const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  WARNING: Missing optional environment variables (using defaults):');
    missingOptional.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
  }
  
  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security');
  }
  
  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.warn(`⚠️  WARNING: NODE_ENV should be one of: ${validEnvs.join(', ')}`);
  }
  
  console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnv };
