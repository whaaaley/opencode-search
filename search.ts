import type { Plugin } from '@opencode-ai/plugin'
import {
  createBskySearchTool,
  createDdgSearchTool,
  createGoogleSearchTool,
  createStandardSearchTool,
  createWebSearchTool,
} from './src/search.ts'

const plugin: Plugin = async (ctx) => {
  const { client } = ctx

  return {
    tool: {
      'web-search': createWebSearchTool(client),
      'google-search': createGoogleSearchTool(client),
      'ddg-search': createDdgSearchTool(client),
      'bsky-search': createBskySearchTool(client),
      'standard-search': createStandardSearchTool(client),
    },
  }
}

export default plugin
