import type { Plugin } from '@opencode-ai/plugin'
import {
  createBskySearchTool,
  createDdgSearchTool,
  createStandardSearchTool,
  createWikiSearchTool,
} from './src/search.ts'

const plugin: Plugin = async (ctx) => {
  const { client } = ctx

  return {
    tool: {
      'ddg-search': createDdgSearchTool(client),
      'bsky-search': createBskySearchTool(client),
      'standard-search': createStandardSearchTool(client),
      'wiki-search': createWikiSearchTool(client),
    },
  }
}

export default plugin
