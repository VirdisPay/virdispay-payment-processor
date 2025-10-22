#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function runTestSuite(testType, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${colorize('🧪', 'cyan')} ${colorize(description, 'bright')}`);
    console.log(`${colorize('─'.repeat(60), 'blue')}`);

    const jestProcess = spawn('npx', ['jest', `--testPathPattern=tests/${testType}`, '--verbose'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    jestProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`${colorize('✅', 'green')} ${description} - ${colorize('PASSED', 'green')}`);
        resolve();
      } else {
        console.log(`${colorize('❌', 'red')} ${description} - ${colorize('FAILED', 'red')}`);
        reject(new Error(`Test suite failed with code ${code}`));
      }
    });

    jestProcess.on('error', (error) => {
      console.log(`${colorize('❌', 'red')} ${description} - ${colorize('ERROR', 'red')}: ${error.message}`);
      reject(error);
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  
  console.log(`${colorize('🚀', 'magenta')} ${colorize('VoodooHemp Payment Processor - Test Suite', 'bright')}`);
  console.log(`${colorize('═'.repeat(60), 'blue')}`);

  const testSuites = [
    { type: 'setup', description: 'Test Setup & Configuration' },
    { type: 'unit', description: 'Unit Tests - Models & Services' },
    { type: 'integration', description: 'Integration Tests - API Routes' },
    { type: 'payment-flows', description: 'Payment Flow Tests' },
    { type: 'security', description: 'Security & Authentication Tests' }
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  for (const suite of testSuites) {
    try {
      await runTestSuite(suite.type, suite.description);
      results.passed++;
    } catch (error) {
      results.failed++;
      results.errors.push({ suite: suite.description, error: error.message });
    }
  }

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n${colorize('📊', 'cyan')} ${colorize('Test Results Summary', 'bright')}`);
  console.log(`${colorize('═'.repeat(60), 'blue')}`);
  console.log(`${colorize('Duration:', 'yellow')} ${duration}s`);
  console.log(`${colorize('Passed:', 'green')} ${results.passed} test suites`);
  console.log(`${colorize('Failed:', 'red')} ${results.failed} test suites`);

  if (results.errors.length > 0) {
    console.log(`\n${colorize('❌', 'red')} ${colorize('Failed Test Suites:', 'red')}`);
    results.errors.forEach(({ suite, error }) => {
      console.log(`  • ${suite}: ${error}`);
    });
  }

  if (results.failed === 0) {
    console.log(`\n${colorize('🎉', 'green')} ${colorize('All tests passed! Your payment processor is ready for production.', 'green')}`);
    process.exit(0);
  } else {
    console.log(`\n${colorize('⚠️', 'yellow')} ${colorize('Some tests failed. Please review and fix issues before deployment.', 'yellow')}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const testType = args[0];

if (testType && ['setup', 'unit', 'integration', 'payment-flows', 'security'].includes(testType)) {
  // Run specific test suite
  const descriptions = {
    setup: 'Test Setup & Configuration',
    unit: 'Unit Tests - Models & Services',
    integration: 'Integration Tests - API Routes',
    'payment-flows': 'Payment Flow Tests',
    security: 'Security & Authentication Tests'
  };

  runTestSuite(testType, descriptions[testType])
    .then(() => {
      console.log(`\n${colorize('✅', 'green')} ${colorize('Test suite completed successfully!', 'green')}`);
      process.exit(0);
    })
    .catch((error) => {
      console.log(`\n${colorize('❌', 'red')} ${colorize('Test suite failed!', 'red')}`);
      console.log(`${colorize('Error:', 'red')} ${error.message}`);
      process.exit(1);
    });
} else if (testType === 'coverage') {
  // Run tests with coverage
  console.log(`${colorize('📊', 'cyan')} ${colorize('Running tests with coverage analysis...', 'bright')}`);
  
  const coverageProcess = spawn('npx', ['jest', '--coverage', '--verbose'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  coverageProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n${colorize('📊', 'green')} ${colorize('Coverage report generated successfully!', 'green')}`);
      console.log(`${colorize('📁', 'blue')} Check the coverage/ directory for detailed reports.`);
    } else {
      console.log(`\n${colorize('❌', 'red')} ${colorize('Coverage generation failed!', 'red')}`);
    }
    process.exit(code);
  });
} else {
  // Run all tests
  runAllTests().catch((error) => {
    console.log(`\n${colorize('💥', 'red')} ${colorize('Test runner failed!', 'red')}`);
    console.log(`${colorize('Error:', 'red')} ${error.message}`);
    process.exit(1);
  });
}



