import type { Plugin } from '@opencode-ai/plugin'
import {
  createBskySearchTool,
  createDdgSearchTool,
  createMdnSearchTool,
  createStandardSearchTool,
  createWikiSearchTool,
} from './src/search.ts'

const plugin: Plugin = async ({ client }) => {
  return {
    tool: {
      'bsky-search': createBskySearchTool(client),
      'ddg-search': createDdgSearchTool(client),
      'mdn-search': createMdnSearchTool(client),
      'standard-search': createStandardSearchTool(client),
      'wiki-search': createWikiSearchTool(client),
    },
  }
}

export default plugin
