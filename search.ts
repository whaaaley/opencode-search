import { createSearchTools } from './src/search.ts'
import { safeAsync } from './src/safe.ts'
import { V1_MESSAGE } from './src/v1-message.ts'

// OpenCode 2 plugins import from '@opencode/plugin'. The preview shipped under a different name
// entirely, '@opencode-ai/plugin', whose '/v2' subpath this plugin was first written against; that
// scope is now the v1 line and is not what the OpenCode 2 binary loads.
// Under OpenCode 1 the package resolves but exports no Plugin.define, so the failure is a missing
// export rather than a missing module. Importing dynamically catches both, which turns a cryptic
// error into instructions.
const { data: plugin, error } = await safeAsync(() => import('@opencode/plugin'))

if (error || typeof plugin.Plugin?.define !== 'function') {
  throw new Error(V1_MESSAGE, { cause: error ?? new Error('Plugin.define is not exported') })
}

export default plugin.Plugin.define({
  id: 'whaaaley.search',
  setup: async (ctx) => {
    await ctx.tool.transform((tools) => {
      for (const definition of createSearchTools(ctx)) {
        tools.add(definition)
      }
    })
  },
})
