import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

type Config = Record<string, unknown>

const CONFIG_NAME = 'opencode-search.json'

const readJson = (path: string): Config | undefined => {
  if (!existsSync(path)) {
    return undefined
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as Config
  } catch {
    return undefined
  }
}

let cached: Config | undefined

export const loadConfig = (): Config => {
  if (cached) {
    return cached
  }

  const globalPath = join(homedir(), '.config', 'opencode', CONFIG_NAME)
  const projectPath = join(process.cwd(), '.opencode', CONFIG_NAME)

  const globalConfig = readJson(globalPath)
  const projectConfig = readJson(projectPath)

  if (!globalConfig && !projectConfig) {
    cached = {}
    return cached
  }

  if (!globalConfig) {
    cached = projectConfig!
    return cached
  }

  if (!projectConfig) {
    cached = globalConfig
    return cached
  }

  cached = { ...globalConfig, ...projectConfig }
  return cached
}
