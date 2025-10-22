// Fix CSS serving issue on Netlify
// This script ensures CSS files are served with correct headers

const fs = require('fs');
const path = require('path');

// Create _redirects file for Netlify
const redirectsContent = `# CSS files
/css/* /css/:splat 200

# JS files  
/js/* /js/:splat 200

# Images
/images/* /images/:splat 200

# Assets
/assets/* /assets/:splat 200

# Force CSS files to be served with correct content type
/css/* /css/:splat 200
Content-Type: text/css

# Force JS files to be served with correct content type
/js/* /js/:splat 200
Content-Type: application/javascript

# Force images to be served with correct content type
/images/* /images/:splat 200
Content-Type: image/*

# Catch all for SPA
/* /index.html 200
`;

// Create _headers file for Netlify
const headersContent = `# CSS files
/css/*
  Content-Type: text/css
  Cache-Control: public, max-age=31536000

# JS files
/js/*
  Content-Type: application/javascript
  Cache-Control: public, max-age=31536000

# Images
/images/*
  Content-Type: image/*
  Cache-Control: public, max-age=31536000

# Assets
/assets/*
  Cache-Control: public, max-age=31536000

# HTML files
/*.html
  Content-Type: text/html
  Cache-Control: public, max-age=0

# Root files
/
  Content-Type: text/html
  Cache-Control: public, max-age=0
`;

// Create netlify.toml file
const netlifyTomlContent = `[build]
  publish = "."

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/css/*"
  [headers.values]
    Content-Type = "text/css"
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/js/*"
  [headers.values]
    Content-Type = "application/javascript"
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/images/*"
  [headers.values]
    Content-Type = "image/*"
    Cache-Control = "public, max-age=31536000"

[[redirects]]
  from = "/css/*"
  to = "/css/:splat"
  status = 200

[[redirects]]
  from = "/js/*"
  to = "/js/:splat"
  status = 200

[[redirects]]
  from = "/images/*"
  to = "/images/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

// Write the files
fs.writeFileSync('_redirects', redirectsContent);
fs.writeFileSync('_headers', headersContent);
fs.writeFileSync('netlify.toml', netlifyTomlContent);

console.log('✅ Created Netlify configuration files:');
console.log('   - _redirects (for URL routing)');
console.log('   - _headers (for content type headers)');
console.log('   - netlify.toml (for build settings)');
console.log('');
console.log('🚀 These files will fix the CSS serving issue on Netlify!');
console.log('   Upload your website again and the CSS should work properly.');

