import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCache, fileAt } from './src/cache.ts'
import { createSetup } from './src/plugin.ts'
import { safeAsync } from './src/safe.ts'
import { V1_MESSAGE } from './src/v1-message.ts'

// Under OpenCode 1 this package is absent or exports no Plugin.define.
// A dynamic import makes that catchable, so the failure can be a message instead of a stack trace.
const { data: plugin, error } = await safeAsync(() => import('@opencode/plugin'))

if (error || typeof plugin.Plugin?.define !== 'function') {
  throw new Error(V1_MESSAGE, { cause: error ?? new Error('Plugin.define is not exported') })
}

const cache = createCache({ file: fileAt(join(dirname(fileURLToPath(import.meta.url)), '.cache')), now: Date.now })

export default plugin.Plugin.define({
  id: 'opencode-search',
  setup: createSetup({ fetch, cache }),
})
