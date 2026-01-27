#!/usr/bin/env tsx
/**
 * Automated plugin setup script
 *
 * This script ensures claude-scientific-skills plugin is available
 * for the bio-research brand build.
 *
 * Features:
 * - Checks if claude-scientific-skills exists
 * - Clones from GitHub if missing
 * - Updates existing clone if --update flag is passed
 * - Validates plugin structure
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PLUGIN_REPO_URL = 'https://github.com/K-Dense-AI/claude-scientific-skills.git';
const PLUGIN_NAME = 'claude-scientific-skills';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PLUGINS_DIR = path.join(PROJECT_ROOT, 'resources', 'builtin-plugins');
const PLUGIN_PATH = path.join(PLUGINS_DIR, PLUGIN_NAME);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update');
const skipVerify = args.includes('--skip-verify');
const quiet = args.includes('--quiet');

// Environment variables
const SKIP_SETUP = process.env.SKIP_PLUGIN_SETUP === '1';
const FORCE_UPDATE = process.env.FORCE_PLUGIN_UPDATE === '1';

function log(message: string) {
  if (!quiet) {
    console.log(`[setup-plugins] ${message}`);
  }
}

function error(message: string) {
  console.error(`[setup-plugins] ERROR: ${message}`);
}

function checkGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function pluginExists(): boolean {
  return fs.existsSync(PLUGIN_PATH) && fs.statSync(PLUGIN_PATH).isDirectory();
}

function clonePlugin(): boolean {
  try {
    log(`Cloning ${PLUGIN_NAME} from ${PLUGIN_REPO_URL}...`);

    // Ensure plugins directory exists
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }

    // Clone the repository
    execSync(`git clone --depth 1 ${PLUGIN_REPO_URL} ${PLUGIN_PATH}`, {
      stdio: quiet ? 'ignore' : 'inherit'
    });

    log(`Successfully cloned ${PLUGIN_NAME}`);
    return true;
  } catch (err) {
    error(`Failed to clone plugin: ${err}`);
    error(`\nTo manually clone, run:\n  cd ${PLUGINS_DIR}\n  git clone ${PLUGIN_REPO_URL}`);
    return false;
  }
}

function updatePlugin(): boolean {
  try {
    log(`Updating ${PLUGIN_NAME}...`);

    execSync('git pull origin main', {
      cwd: PLUGIN_PATH,
      stdio: quiet ? 'ignore' : 'inherit'
    });

    log(`Successfully updated ${PLUGIN_NAME}`);
    return true;
  } catch (err) {
    error(`Failed to update plugin: ${err}`);
    return false;
  }
}

function verifyPlugin(): boolean {
  // Check for .claude-plugin directory
  const pluginConfigDir = path.join(PLUGIN_PATH, '.claude-plugin');
  if (!fs.existsSync(pluginConfigDir)) {
    error(`Plugin validation failed: .claude-plugin directory not found in ${PLUGIN_NAME}`);
    return false;
  }

  // Check for marketplace.json (this plugin uses marketplace.json not plugin.json)
  const marketplaceJson = path.join(pluginConfigDir, 'marketplace.json');
  if (!fs.existsSync(marketplaceJson)) {
    error(`Plugin validation failed: marketplace.json not found in ${PLUGIN_NAME}`);
    return false;
  }

  // Check for scientific-skills directory
  const skillsDir = path.join(PLUGIN_PATH, 'scientific-skills');
  if (!fs.existsSync(skillsDir)) {
    error(`Plugin validation failed: scientific-skills directory not found in ${PLUGIN_NAME}`);
    return false;
  }

  log(`Plugin validation successful for ${PLUGIN_NAME}`);
  return true;
}

async function main() {
  // Check if setup should be skipped
  if (SKIP_SETUP) {
    log('Skipping plugin setup (SKIP_PLUGIN_SETUP=1)');
    process.exit(0);
  }

  // Check if git is installed
  if (!checkGitInstalled()) {
    error('Git is not installed. Please install Git to continue.');
    error('Visit https://git-scm.com/downloads for installation instructions.');
    process.exit(1);
  }

  // Check if plugin already exists
  const exists = pluginExists();

  if (exists) {
    log(`${PLUGIN_NAME} already exists`);

    // Update if requested
    if (shouldUpdate || FORCE_UPDATE) {
      if (!updatePlugin()) {
        process.exit(1);
      }
    } else {
      log('Use --update to update existing plugin');
    }
  } else {
    // Clone the plugin
    log(`${PLUGIN_NAME} not found, cloning...`);
    if (!clonePlugin()) {
      process.exit(1);
    }
  }

  // Verify plugin structure unless skipped
  if (!skipVerify) {
    if (!verifyPlugin()) {
      error('Plugin verification failed. The plugin may not work correctly.');
      error('You can skip verification with --skip-verify flag.');
      // Don't exit with error code - just warn
      log('Continuing despite verification failure...');
    }
  }

  log('Plugin setup complete!');
}

main().catch((err) => {
  error(`Unexpected error: ${err}`);
  process.exit(1);
});
