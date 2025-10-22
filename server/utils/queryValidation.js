/**
 * MongoDB Query Validation Utilities
 * Prevents NoSQL injection by validating query parameters
 */

/**
 * Validate that a value is a string (not an object)
 * Prevents NoSQL injection via object notation
 */
function validateString(value, fieldName = 'field') {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return String(value).trim();
}

/**
 * Validate email format and prevent injection
 */
function validateEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = String(email).trim().toLowerCase();
  
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Invalid email format');
  }
  
  return cleanEmail;
}

/**
 * Validate MongoDB ObjectId
 */
function validateObjectId(id, fieldName = 'ID') {
  if (typeof id !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  // MongoDB ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  
  return id;
}

/**
 * Validate number
 */
function validateNumber(value, fieldName = 'field') {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  return num;
}

/**
 * Validate boolean
 */
function validateBoolean(value, fieldName = 'field') {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${fieldName} must be a boolean`);
}

/**
 * Validate array
 */
function validateArray(value, fieldName = 'field') {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  return value;
}

/**
 * Sanitize search query (prevent regex injection)
 */
function sanitizeSearchQuery(query) {
  if (typeof query !== 'string') {
    throw new Error('Search query must be a string');
  }
  
  // Escape special regex characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate enum value
 */
function validateEnum(value, allowedValues, fieldName = 'field') {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  return value;
}

/**
 * Safe query builder for MongoDB
 * Ensures all query parameters are properly typed
 */
function buildSafeQuery(params) {
  const safeQuery = {};
  
  for (const [key, value] of Object.entries(params)) {
    // Skip undefined/null values
    if (value === undefined || value === null) {
      continue;
    }
    
    // Reject object-type queries (potential injection)
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      throw new Error(`Query parameter '${key}' contains invalid object notation`);
    }
    
    safeQuery[key] = value;
  }
  
  return safeQuery;
}

module.exports = {
  validateString,
  validateEmail,
  validateObjectId,
  validateNumber,
  validateBoolean,
  validateArray,
  sanitizeSearchQuery,
  validateEnum,
  buildSafeQuery
};



