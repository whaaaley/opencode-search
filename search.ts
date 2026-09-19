import { createSearchTools } from './src/search.ts'
import { safeAsync } from './src/safe.ts'
import { V1_MESSAGE } from './src/v1-message.ts'

// The OpenCode 2 plugin API is the package root. It lived at '@opencode-ai/plugin/v2' during the
// preview and moved to the root before release, with '/v1' becoming the legacy subpath.
// OpenCode 1 ships a package whose root is the v1 API and has no Plugin.define, so the failure
// there is a missing export rather than a missing module. Importing dynamically makes both cases
// catchable, which turns a cryptic error into instructions.
const { data: plugin, error } = await safeAsync(() => import('@opencode-ai/plugin'))

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
