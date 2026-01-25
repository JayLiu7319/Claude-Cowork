const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const iconPath = process.argv[2] || path.join(process.cwd(), "app-icon.png");
const minSize = 512;

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.error(`[icon-check] File not found: ${iconPath}`);
    process.exit(1);
  }

  try {
    const image = sharp(iconPath);
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width < minSize || height < minSize) {
      console.error(
        `[icon-check] Icon too small: ${width}x${height}. Requires at least ${minSize}x${minSize}.`
      );
      process.exit(1);
    }

    console.log(`[icon-check] OK: ${width}x${height} (${iconPath})`);
  } catch (error) {
    console.error(`[icon-check] Failed to read image: ${error}`);
    process.exit(1);
  }
}

main();
