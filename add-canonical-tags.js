/**
 * Add canonical tags to all blog posts
 */

const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'website', 'blog');
const baseUrl = 'https://virdispay.com';

// Get all HTML files in blog directory
const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.html'));

console.log(`Found ${blogFiles.length} blog posts to update\n`);

blogFiles.forEach(file => {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if canonical tag already exists
  if (content.includes('rel="canonical"')) {
    console.log(`⏭️  ${file} - Already has canonical tag`);
    return;
  }
  
  // Find the viewport meta tag and add canonical after it
  const viewportPattern = /(<meta name="viewport" content="width=device-width, initial-scale=1\.0">)/;
  
  if (viewportPattern.test(content)) {
    const canonicalUrl = `${baseUrl}/blog/${file}`;
    const canonicalTag = `    <link rel="canonical" href="${canonicalUrl}" />\n`;
    
    content = content.replace(viewportPattern, `$1\n${canonicalTag}`);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} - Added canonical: ${canonicalUrl}`);
  } else {
    console.log(`⚠️  ${file} - Could not find viewport tag`);
  }
});

console.log('\n✅ Done! All blog posts updated.');

