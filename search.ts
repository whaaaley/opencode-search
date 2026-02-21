import type { Plugin } from '@opencode-ai/plugin'
import { webSearchTool, googleSearchTool, ddgSearchTool } from './src/search.ts'

// deno-lint-ignore require-await
const plugin: Plugin = async () => {
  return {
    tool: {
      'web-search': webSearchTool,
      'google-search': googleSearchTool,
      'ddg-search': ddgSearchTool,
    },
  }
}

export default plugin
