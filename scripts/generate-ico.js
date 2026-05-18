const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPng = path.join(__dirname, '..', 'public', 'icon', 'logo-512.png');
const outputIco = path.join(__dirname, '..', 'public', 'icon', 'logo-512.ico');

// ICO 文件需要的尺寸（Windows 资源管理器常用尺寸）
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function generateIco() {
  console.log('Generating multi-size ICO file...');
  console.log('Input:', inputPng);
  console.log('Output:', outputIco);

  try {
    // 读取原始 PNG
    const inputBuffer = fs.readFileSync(inputPng);

    // 为每个尺寸生成 PNG 缓冲区
    const pngBuffers = [];
    for (const size of sizes) {
      console.log(`Generating ${size}x${size}...`);
      const pngBuffer = await sharp(inputBuffer)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      pngBuffers.push({ size, buffer: pngBuffer });
    }

    // 构建 ICO 文件
    const icoBuffer = createIcoBuffer(pngBuffers);
    fs.writeFileSync(outputIco, icoBuffer);

    console.log('ICO file generated successfully!');
    console.log('Sizes included:', sizes.join(', '));
  } catch (error) {
    console.error('Error generating ICO:', error);
    process.exit(1);
  }
}

function createIcoBuffer(images) {
  const iconDirEntries = [];
  const imageData = [];
  let offset = 6 + images.length * 16; // Header + ICONDIRENTRY array

  // 准备每个图像的数据
  for (const img of images) {
    const width = img.size === 256 ? 0 : img.size;
    const height = img.size === 256 ? 0 : img.size;

    iconDirEntries.push({
      width,
      height,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: img.buffer.length,
      imageOffset: offset
    });

    imageData.push(img.buffer);
    offset += img.buffer.length;
  }

  // 构建 ICO 文件缓冲区
  const icoBuffer = Buffer.alloc(offset);

  // ICO Header
  icoBuffer.writeUInt16LE(0, 0); // Reserved
  icoBuffer.writeUInt16LE(1, 2); // Type: ICO
  icoBuffer.writeUInt16LE(images.length, 4); // Count

  // ICONDIRENTRY array
  let entryOffset = 6;
  for (const entry of iconDirEntries) {
    icoBuffer.writeUInt8(entry.width, entryOffset);
    icoBuffer.writeUInt8(entry.height, entryOffset + 1);
    icoBuffer.writeUInt8(entry.colorCount, entryOffset + 2);
    icoBuffer.writeUInt8(entry.reserved, entryOffset + 3);
    icoBuffer.writeUInt16LE(entry.planes, entryOffset + 4);
    icoBuffer.writeUInt16LE(entry.bitCount, entryOffset + 6);
    icoBuffer.writeUInt32LE(entry.bytesInRes, entryOffset + 8);
    icoBuffer.writeUInt32LE(entry.imageOffset, entryOffset + 12);
    entryOffset += 16;
  }

  // Image data
  let dataOffset = 6 + images.length * 16;
  for (const data of imageData) {
    data.copy(icoBuffer, dataOffset);
    dataOffset += data.length;
  }

  return icoBuffer;
}

generateIco();
