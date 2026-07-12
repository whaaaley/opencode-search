import type { PluginInput } from '@opencode-ai/plugin'
import { createPlugin } from './src/search.ts'

// Current OpenCode passes configured plugin options as the second argument.
// Keeping this as a function also preserves compatibility with legacy loaders.
const plugin = (input: PluginInput, options?: unknown) => createPlugin(input, options)

export default plugin
