import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { BrandConfig } from '../types.js';

const BRAND_ENV = process.env.BRAND || 'business';

let cachedConfig: BrandConfig | null = null;

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

  const brandsDir = getBrandsPath();
  const configPath = path.join(brandsDir, `${BRAND_ENV}.json`);

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configContent);
    return cachedConfig!;
  } catch (error) {
    console.error(`Failed to load brand config for "${BRAND_ENV}" from ${configPath}:`, error);
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

export function getBrandId(): string {
  return BRAND_ENV;
}
