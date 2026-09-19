import { createSearchTools } from './src/search.ts'
import { safeAsync } from './src/safe.ts'
import { V1_MESSAGE } from './src/v1-message.ts'

// Under OpenCode 1 this package is absent or exports no Plugin.define.
// A dynamic import makes that catchable, so the failure can be a message instead of a stack trace.
const { data: plugin, error } = await safeAsync(() => import('@opencode/plugin'))

if (error || typeof plugin.Plugin?.define !== 'function') {
  throw new Error(V1_MESSAGE, { cause: error ?? new Error('Plugin.define is not exported') })
}

export default plugin.Plugin.define({
  id: 'opencode-search',
  setup: async (ctx) => {
    await ctx.tool.transform((tools) => {
      for (const definition of createSearchTools(ctx)) {
        tools.add(definition)
      }
    })
  },
})
