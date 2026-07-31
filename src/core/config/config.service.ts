import fs from 'fs';
import path from 'path';

import type { GritchConfig } from './config.types';

const GRITCH_CONFIG_FILENAME = 'gritch.config.json';
const LEGACY_GITWISE_CONFIG_FILENAME = 'gitwise.config.json';

export const defaultConfig: GritchConfig = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  maxTokens: 1024,
  reviewThreshold: 7,
  conventionalCommits: true,
};


/**
 * Resolve model using the precedence:
 * 1. process.env.GRITCH_MODEL (non-empty after trimming)
 * 2. model from the resolved config object
 * 3. default model from defaultConfig
 */
function resolveModel(config: GritchConfig): string {
  const envModel = process.env.GRITCH_MODEL?.trim();
  if (envModel) {
    return envModel;
  }
  return config.model;
}

export function loadConfig(): GritchConfig {
  const gritchConfigPath = path.join(process.cwd(), GRITCH_CONFIG_FILENAME);
  const legacyConfigPath = path.join(process.cwd(), LEGACY_GITWISE_CONFIG_FILENAME);

  const configPath = fs.existsSync(gritchConfigPath) ? gritchConfigPath : legacyConfigPath;
  const isLegacyUsed = !fs.existsSync(gritchConfigPath) && fs.existsSync(legacyConfigPath);

  if (isLegacyUsed) {
    console.warn(
      'DEPRECATION WARNING: Using gitwise.config.json is deprecated. Please rename it to gritch.config.json. '
      + 'Support for gitwise.config.json will be removed in a future release.'
    );
  }

  let config: GritchConfig;

  if (!fs.existsSync(configPath)) {
    config = defaultConfig;
  } else {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<GritchConfig>;
      config = { ...defaultConfig, ...parsed };
    } catch {
      const attemptedName = configPath.endsWith(LEGACY_GITWISE_CONFIG_FILENAME)
        ? LEGACY_GITWISE_CONFIG_FILENAME
        : GRITCH_CONFIG_FILENAME;
      console.warn(`Could not load ${attemptedName}, using defaults`);
      config = defaultConfig;
    }
  }

  return { ...config, model: resolveModel(config) };
}

