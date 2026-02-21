import type { Plugin } from '@opencode-ai/plugin'
import { bskySearchTool, ddgSearchTool, googleSearchTool, standardSearchTool, webSearchTool } from './src/search.ts'

const plugin: Plugin = async () => {
  return {
    tool: {
      'web-search': webSearchTool,
      'google-search': googleSearchTool,
      'ddg-search': ddgSearchTool,
      'bsky-search': bskySearchTool,
      'standard-search': standardSearchTool,
    },
  }
}

export default plugin
