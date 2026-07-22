import { Plugin } from '@opencode-ai/plugin/v2'
import { createSearchTools } from './src/search.ts'

export default Plugin.define({
  id: 'whaaaley.search',
  setup: async (ctx) => {
    await ctx.tool.transform((tools) => {
      for (const definition of createSearchTools(ctx)) {
        tools.add(definition)
      }
    })
  },
})
