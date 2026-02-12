const fs = require('fs');
const path = require('path');

const dir = process.argv[2];

if (!dir) {
  console.error('Usage: node fix-cjs.js <directory>');
  process.exit(1);
}

function walk(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/require\("(\..+?)\.js"\)/g, 'require("$1.cjs")');
      const newPath = fullPath.replace(/\.js$/, '.cjs');

      fs.writeFileSync(newPath, newContent);
      fs.unlinkSync(fullPath);
      console.log(`Converted: ${file} -> ${path.basename(newPath)}`);
    } else if (file.endsWith('.js.map')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const json = JSON.parse(content);
      json.file = json.file.replace(/\.js$/, '.cjs');
      const newPath = fullPath.replace(/\.js\.map$/, '.cjs.map');

      fs.writeFileSync(newPath, JSON.stringify(json));
      fs.unlinkSync(fullPath);
    }
  }
}

const targetDir = path.resolve(process.cwd(), dir);
if (fs.existsSync(targetDir)) {
  console.log(`Processing CJS files in: ${targetDir}`);
  walk(targetDir);
} else {
  console.error(`Directory not found: ${targetDir}`);
  process.exit(1);
}
