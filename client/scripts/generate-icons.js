import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceLogo = join(__dirname, '../public/logo-black.png'); // Black logo for light theme
const sourceLogoDark = join(__dirname, '../public/logo-white.png'); // White logo for dark theme
const outputDir = join(__dirname, '../public');
const iconsLightDir = join(outputDir, 'icons', 'light');
const iconsDarkDir = join(outputDir, 'icons', 'dark');

// Ensure output directories exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}
if (!existsSync(iconsLightDir)) {
  mkdirSync(iconsLightDir, { recursive: true });
}
if (!existsSync(iconsDarkDir)) {
  mkdirSync(iconsDarkDir, { recursive: true });
}

// Essential favicon configurations (stored at root)
const faviconConfigs = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
];

// Essential icon configurations (stored in icons/light and icons/dark)
// Only keeping the most essential sizes for modern browsers and devices
const iconConfigs = [
  // Apple touch icon (180x180 is the standard for modern iOS)
  { name: 'apple-touch-icon.png', size: 180 },
  
  // PWA icons (required for manifest)
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  
  // Maskable icons (required for Android PWA)
  { name: 'maskable-icon-192.png', size: 192, maskable: true },
  { name: 'maskable-icon-512.png', size: 512, maskable: true },
];

async function generateIcon(config, sourceImage = sourceLogo, outputFolder = iconsLightDir, isFavicon = false) {
  const outputPath = isFavicon ? join(outputDir, config.name) : join(outputFolder, config.name);
  
  try {
    let image = sharp(sourceImage);
    
    // For maskable icons, add padding (80% of size for safe area)
    if (config.maskable) {
      const safeSize = Math.round(config.size * 0.8);
      const padding = (config.size - safeSize) / 2;
      
      image = image
        .resize(safeSize, safeSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
    } else if (typeof config.size === 'object') {
      // For non-square sizes (like mstile-310x150)
      image = image.resize(config.size.width, config.size.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    } else {
      // Standard square resize
      image = image.resize(config.size, config.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }
    
    await image.png().toFile(outputPath);
    const relativePath = outputPath.replace(outputDir, '').replace(/\\/g, '/');
    console.log(`✓ Generated ${relativePath}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${config.name}:`, error.message);
  }
}

async function generateFaviconICO() {
  // Generate favicon.ico (multi-size ICO file)
  const icoPath = join(outputDir, 'favicon.ico');
  
  try {
    // Create ICO with multiple sizes (16, 32, 48)
    const sizes = [16, 32, 48];
    const buffers = [];
    
    for (const size of sizes) {
      const buffer = await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      buffers.push(buffer);
    }
    
    // For now, we'll use the 32x32 as favicon.ico
    // A proper ICO file would require a library, but most browsers accept PNG as ICO
    await sharp(sourceLogo)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icoPath);
    
    console.log(`✓ Generated favicon.ico`);
  } catch (error) {
    console.error(`✗ Failed to generate favicon.ico:`, error.message);
  }
}

async function generateFaviconSVG() {
  // Create a theme-aware SVG favicon that switches based on color scheme
  const svgPath = join(outputDir, 'favicon.svg');
  
  try {
    // Convert both light and dark PNGs to base64
    const lightBuffer = await sharp(sourceLogo)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    const lightBase64 = lightBuffer.toString('base64');
    
    let darkBase64 = null;
    if (existsSync(sourceLogoDark)) {
      const darkBuffer = await sharp(sourceLogoDark)
        .resize(32, 32, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      darkBase64 = darkBuffer.toString('base64');
    }
    
    // Create theme-aware SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32" viewBox="0 0 32 32">
  <style>
    .light-icon { display: block; }
    .dark-icon { display: none; }
    @media (prefers-color-scheme: dark) {
      .light-icon { display: none; }
      .dark-icon { display: block; }
    }
  </style>
  <image class="light-icon" width="32" height="32" xlink:href="data:image/png;base64,${lightBase64}"/>`;
  
    if (darkBase64) {
      svg += `\n  <image class="dark-icon" width="32" height="32" xlink:href="data:image/png;base64,${darkBase64}"/>`;
    }
    
    svg += `\n</svg>`;
    
    const fs = await import('fs/promises');
    await fs.writeFile(svgPath, svg, 'utf-8');
    console.log(`✓ Generated favicon.svg (theme-aware)`);
  } catch (error) {
    console.error(`✗ Failed to generate favicon.svg:`, error.message);
  }
}

async function main() {
  console.log('🎨 Generating icons from logo files...\n');
  
  // Check if source logo exists
  if (!existsSync(sourceLogo)) {
    console.error(`✗ Source logo not found: ${sourceLogo}`);
    process.exit(1);
  }
  
  const hasDarkLogo = existsSync(sourceLogoDark);
  if (hasDarkLogo) {
    console.log('✓ Dark logo found, generating dark variants...\n');
  }
  
  // Generate favicons at root (light theme)
  console.log('📌 Generating favicons...\n');
  for (const config of faviconConfigs) {
    await generateIcon(config, sourceLogo, outputDir, true);
  }
  
  // Generate all app icons in icons/light folder
  console.log('\n☀️ Generating light theme icons...\n');
  for (const config of iconConfigs) {
    await generateIcon(config, sourceLogo, iconsLightDir);
  }
  
  // Generate dark variants for app icons if dark logo exists
  if (hasDarkLogo) {
    console.log('\n🌙 Generating dark theme icons...\n');
    
    // Dark app icons (favicons stay light at root, dark variant in icons/dark)
    for (const config of iconConfigs) {
      await generateIcon(config, sourceLogoDark, iconsDarkDir);
    }
    
    // Dark favicons in icons/dark folder
    for (const config of faviconConfigs) {
      await generateIcon(config, sourceLogoDark, iconsDarkDir);
    }
  }
  
  // Generate favicon.ico (using light theme)
  await generateFaviconICO();
  
  // Generate theme-aware favicon.svg
  await generateFaviconSVG();
  
  console.log('\n✨ Icon generation complete!');
}

main().catch(console.error);

