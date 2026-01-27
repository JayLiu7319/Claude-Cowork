import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import type { BrandConfig } from '../types.js';

let cachedBrandId: string | null = null;
let cachedConfig: BrandConfig | null = null;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function getBrandId(): string {
  if (cachedBrandId) {
    return cachedBrandId;
  }

  // Priority 1: Read from .brand file (production builds)
  try {
    const brandFilePath = path.join(moduleDir, '../../../.brand');
    if (fs.existsSync(brandFilePath)) {
      cachedBrandId = fs.readFileSync(brandFilePath, 'utf-8').trim();
      console.log(`Brand ID loaded from .brand file: ${cachedBrandId}`);
      return cachedBrandId;
    }
  } catch {
    console.log('No .brand file found, checking environment variable');
  }

  // Priority 2: Read from environment variable (development)
  const envBrand = process.env.BRAND;
  if (envBrand) {
    cachedBrandId = envBrand;
    console.log(`Brand ID loaded from environment: ${cachedBrandId}`);
    return cachedBrandId;
  }

  // Priority 3: Default to business
  cachedBrandId = 'business';
  console.log(`Brand ID defaulted to: ${cachedBrandId}`);
  return cachedBrandId;
}

function getBrandsPath(): string {
  // Use app.getAppPath() to get the root of the application
  // In development: this is the project root (where package.json is)
  // In production: this is the app.asar or resources directory
  const rootPath = app.getAppPath();

  return path.join(rootPath, 'brands');
}

export function loadBrandConfig(): BrandConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const brandId = getBrandId();
  const brandsDir = getBrandsPath();
  const configPath = path.join(brandsDir, `${brandId}.json`);

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configContent);
    return cachedConfig!;
  } catch (error) {
    console.error(`Failed to load brand config for "${brandId}" from ${configPath}:`, error);
    // Fallback to business config
    const fallbackPath = path.join(brandsDir, 'business.json');
    try {
      const fallbackContent = fs.readFileSync(fallbackPath, 'utf-8');
      cachedConfig = JSON.parse(fallbackContent);
      return cachedConfig!;
    } catch (fallbackError) {
      console.error('Failed to load fallback brand config:', fallbackError);
      // Return a default config to prevent crash
      return getDefaultBrandConfig();
    }
  }
}

function getDefaultBrandConfig(): BrandConfig {
  return {
    id: 'business',
    name: 'agent-cowork',
    displayName: 'Agent Cowork',
    appTitle: 'Agent Cowork',
    subtitle: 'Your Intelligent Assistant',
    colors: {
      accent: '#D97757',
      accentHover: '#CC785C',
      accentLight: '#F5D0C5',
      accentSubtle: '#FDF4F1'
    },
    icons: {
      app: './app-icon.png',
      logo: './src/ui/assets/logo.png'
    }
  };
}

export { getBrandId };
