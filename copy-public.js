#!/usr/bin/env node
/**
 * Copy public folder to dist for deployment
 */

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const publicSrc = path.join(__dirname, 'public');
const publicDest = path.join(__dirname, 'dist', 'public');

console.log('📁 Copying public folder...');
console.log('   From:', publicSrc);
console.log('   To:', publicDest);

try {
  copyRecursive(publicSrc, publicDest);
  console.log('✅ Public folder copied successfully!');
} catch (error) {
  console.error('❌ Error copying public folder:', error);
  process.exit(1);
}
