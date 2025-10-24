import * as fs from 'fs'
import * as path from 'path'

// CONSTANTS

const DEFAULT_CONFIG_FILENAME = '.chrome-geminirc.default.json'

const PROJECT_CONFIG_FILENAME = '.chrome-geminirc.json'

// TYPES

interface BaseConfig {
  interactive?: boolean
  maxSteps?: number
  model?: string
  requestDelayMs?: number
  schema?: string
  temperature?: number
  thinkingBudget?: number
}

export type PresetConfig = BaseConfig

export interface UserConfig extends BaseConfig {
  presets?: Record<string, PresetConfig>
}

export interface ResolvedConfig extends Required<Omit<BaseConfig, 'schema'>> {
  schema?: string
}

// CONFIG LOADERS

/**
 * Load configuration from a JSON file.
 */
function loadConfigFile(filePath: string): null | UserConfig {
  try {
    if (!fs.existsSync(filePath)) return null

    const content = fs.readFileSync(filePath, 'utf-8')
    const config = JSON.parse(content)

    return config
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null

    throw new Error(`Failed to load config from ${filePath}: ${(error as Error).message}`)
  }
}

/**
 * Load project configuration from .chrome-geminirc.json in current directory.
 */
export function loadProjectConfig(): null | UserConfig {
  const projectConfigPath = path.join(process.cwd(), PROJECT_CONFIG_FILENAME)

  return loadConfigFile(projectConfigPath)
}

/**
 * Load default configuration from .chrome-geminirc.default.json in the package directory.
 */
export function loadDefaultConfig(): UserConfig {
  const moduleDir = path.dirname(new URL(import.meta.url).pathname)
  const projectRoot = path.join(moduleDir, '..')
  const defaultConfigPath = path.join(projectRoot, DEFAULT_CONFIG_FILENAME)

  const config = loadConfigFile(defaultConfigPath)

  if (!config) {
    throw new Error(
      `Default configuration file not found at ${defaultConfigPath}. This is a critical error - the package may be corrupted.`
    )
  }

  return config
}

/**
 * Merge multiple configurations with later configs taking precedence.
 */
export function mergeConfigs(...configs: Array<null | UserConfig>): UserConfig {
  const merged: UserConfig = {}

  for (const config of configs) {
    if (!config) continue

    if (config.model !== undefined) merged.model = config.model
    if (config.maxSteps !== undefined) merged.maxSteps = config.maxSteps
    if (config.thinkingBudget !== undefined) merged.thinkingBudget = config.thinkingBudget
    if (config.interactive !== undefined) merged.interactive = config.interactive
    if (config.requestDelayMs !== undefined) merged.requestDelayMs = config.requestDelayMs
    if (config.temperature !== undefined) merged.temperature = config.temperature
    if (config.schema !== undefined) merged.schema = config.schema

    // Merge presets.
    if (config.presets) {
      if (!merged.presets) merged.presets = {}

      merged.presets = { ...merged.presets, ...config.presets }
    }
  }

  return merged
}

/**
 * Apply a preset configuration.
 */
export function applyPreset(config: UserConfig, presetName: string): UserConfig {
  if (!config.presets || !config.presets[presetName]) {
    throw new Error(
      `Preset "${presetName}" not found. Available presets: ${config.presets ? Object.keys(config.presets).join(', ') : 'none'}`
    )
  }

  const preset = config.presets[presetName]

  return mergeConfigs(config, preset)
}

/**
 * Resolve final configuration from all sources with proper precedence.
 */
export function resolveConfig(options: { cliConfig: UserConfig; presetName?: string }): ResolvedConfig {
  const { cliConfig, presetName } = options

  // Load configs: default < project < preset < CLI.
  const defaultConfig = loadDefaultConfig()
  const projectConfig = loadProjectConfig()

  // Merge: default < project < preset < CLI.
  let merged = mergeConfigs(defaultConfig, projectConfig)

  // Apply preset if specified.
  if (presetName) {
    try {
      merged = applyPreset(merged, presetName)
    } catch (error) {
      throw new Error(`Preset error: ${(error as Error).message}`)
    }
  }

  // CLI flags take highest precedence.
  merged = mergeConfigs(merged, cliConfig)

  // All values should now be defined from the default config.
  const resolved: ResolvedConfig = {
    interactive: merged.interactive!,
    maxSteps: merged.maxSteps!,
    model: merged.model!,
    requestDelayMs: merged.requestDelayMs!,
    schema: merged.schema,
    temperature: merged.temperature!,
    thinkingBudget: merged.thinkingBudget!
  }

  return resolved
}

/**
 * Get the path to the project config file.
 */
export function getProjectConfigPath(): string {
  return path.join(process.cwd(), PROJECT_CONFIG_FILENAME)
}
