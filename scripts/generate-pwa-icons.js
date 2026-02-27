const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Leasefy logo SVG with indigo background for PWA icon
const createSvg = (size) => {
  const padding = Math.round(size * 0.15);
  const strokeWidth = Math.round(size * 0.08);
  const iconSize = size - padding * 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4F46E5"/>
        <stop offset="100%" style="stop-color:#7C3AED"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
    <g transform="translate(${padding}, ${padding})">
      <path
        d="M${iconSize * 0.1} ${iconSize * 0.85} L${iconSize * 0.5} ${iconSize * 0.4} L${iconSize * 0.85} ${iconSize * 0.7} V${iconSize * 0.1}"
        stroke="white"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </g>
  </svg>`;
};

async function generateIcons() {
  const outputDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Created icon-${size}x${size}.png`);
  }

  // Also create a favicon
  const faviconSvg = createSvg(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));
  console.log('✓ Created favicon.png');

  console.log('\nAll PWA icons generated successfully!');
}

generateIcons().catch(console.error);
