const fs = require('fs');
const path = require('path');

const distMainPath = path.join(__dirname, '..', 'dist', 'main');
const mainSubPath = path.join(distMainPath, 'main');
const sharedSubPath = path.join(distMainPath, 'shared');

// 如果 dist/main/main 存在，将文件移动到 dist/main
if (fs.existsSync(mainSubPath)) {
  const files = fs.readdirSync(mainSubPath);
  for (const file of files) {
    const srcPath = path.join(mainSubPath, file);
    const destPath = path.join(distMainPath, file);
    fs.renameSync(srcPath, destPath);
  }
  fs.rmdirSync(mainSubPath);
  console.log('Moved files from dist/main/main to dist/main');
}

// 如果 dist/main/shared 不存在，从 src/shared 复制
if (!fs.existsSync(sharedSubPath)) {
  const srcSharedPath = path.join(__dirname, '..', 'src', 'shared');
  fs.mkdirSync(sharedSubPath, { recursive: true });

  function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(srcSharedPath, sharedSubPath);
  console.log('Copied src/shared to dist/main/shared');
}

// 修复 JS 文件中的导入路径：将 ../shared/ 改为 ./shared/
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // 替换 ../shared/ 为 ./shared/
  content = content.replace(/require\("\.\.\/shared\//g, 'require("./shared/');
  content = content.replace(/require\('\.\.\/shared\//g, 'require(\'./shared/');
  fs.writeFileSync(filePath, content, 'utf-8');
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory() && entry.name !== 'shared') {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  }
}

processDirectory(distMainPath);
console.log('Fixed import paths in JS files');

console.log('Dist structure fixed successfully');
