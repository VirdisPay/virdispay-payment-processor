/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before server starts
 */

const chalk = require('chalk');

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'NODE_ENV'
];

const optionalEnvVars = [
  'PORT',
  'CLIENT_URL',
  'POLYGON_RPC_URL',
  'REDIS_URL'
];

function validateEnvironment() {
  console.log(chalk.blue('\n🔍 Validating Environment Variables...\n'));

  let hasErrors = false;

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(chalk.red(`❌ FATAL: ${varName} environment variable is not set`));
      hasErrors = true;
    } else {
      console.log(chalk.green(`✓ ${varName} is set`));
    }
  });

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    const secret = process.env.JWT_SECRET.trim();
    
    if (secret.length < 32) {
      console.error(chalk.red(`❌ FATAL: JWT_SECRET must be at least 32 characters (current: ${secret.length})`));
      hasErrors = true;
    } else if (secret === 'your-secret-key' || 
               secret === 'your-super-secret-jwt-key-change-this-in-production' ||
               secret.includes('your-super-secret') || 
               secret.includes('change-this')) {
      console.error(chalk.red('❌ FATAL: JWT_SECRET is using default/example value. Change it to a secure random string!'));
      hasErrors = true;
    } else {
      console.log(chalk.green(`✓ JWT_SECRET is strong (${secret.length} characters)`));
    }
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    console.warn(chalk.yellow(`⚠️  WARNING: NODE_ENV should be one of: ${validEnvs.join(', ')}`));
  }

  // Check production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    console.log(chalk.blue('\n🔒 Production Mode - Additional Checks:\n'));

    // Ensure strong secrets in production
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      console.warn(chalk.yellow('⚠️  WARNING: For production, JWT_SECRET should be 64+ characters'));
    }

    // Ensure HTTPS
    if (process.env.CLIENT_URL && process.env.CLIENT_URL.startsWith('http://')) {
      console.error(chalk.red('❌ FATAL: CLIENT_URL should use HTTPS in production'));
      hasErrors = true;
    }

    // Check optional but recommended vars
    const productionRecommended = ['REDIS_URL', 'SENTRY_DSN', 'AWS_BUCKET_NAME'];
    productionRecommended.forEach(varName => {
      if (!process.env[varName]) {
        console.warn(chalk.yellow(`⚠️  RECOMMENDED: ${varName} is not set for production`));
      }
    });
  }

  // Check optional variables
  console.log(chalk.blue('\n📋 Optional Variables:\n'));
  optionalEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(chalk.gray(`  ${varName}: set`));
    } else {
      console.log(chalk.gray(`  ${varName}: using default`));
    }
  });

  console.log(''); // Empty line

  // Exit if critical errors
  if (hasErrors) {
    console.error(chalk.red('\n❌ Environment validation failed! Please fix the errors above.\n'));
    console.error(chalk.yellow('💡 For development, copy env.example to .env and update the values:\n'));
    console.error(chalk.gray('   cp env.example .env\n'));
    process.exit(1);
  }

  console.log(chalk.green('✅ Environment validation passed!\n'));
}

// Generate a secure random JWT secret (for reference)
function generateSecureSecret(length = 64) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

// Utility to display example .env file
function showEnvExample() {
  console.log(chalk.blue('\n📝 Example .env File:\n'));
  console.log(chalk.gray(`
# Copy this to .env and update with your values

# REQUIRED
JWT_SECRET=${generateSecureSecret()}
MONGODB_URI=mongodb://localhost:27017/virdispay-payments
NODE_ENV=development

# Server
PORT=5000
CLIENT_URL=http://localhost:3000

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com

# Optional
REDIS_URL=redis://localhost:6379
  `));
}

module.exports = {
  validateEnvironment,
  generateSecureSecret,
  showEnvExample
};

