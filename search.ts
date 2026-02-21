import type { Plugin } from '@opencode-ai/plugin'
import { ddgSearchTool, googleSearchTool, webSearchTool } from './src/search.ts'
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
