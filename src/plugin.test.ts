import type { Plugin } from '@opencode/plugin'
import { describe, expect, it } from 'vite-plus/test'
import { createCache } from './cache.ts'
import { createSetup } from './plugin.ts'

type Added = { name: string }

// The setup reads only `tool.transform` from the context, so a stand-in carries just that.
// Applying after a turn of the event loop shows whether the setup waited for the transform.
const contextCollecting = (added: Added[]): Plugin.Context =>
  ({
    tool: {
      transform: async (apply: (tools: { add: (definition: Added) => void }) => void) => {
        await new Promise((resolve) => setTimeout(resolve, 0))
        apply({ add: (definition) => added.push(definition) })
      },
    },
  }) as unknown as Plugin.Context

describe('createSetup', () => {
  it('adds every search tool', { meta: { steps: 1 } }, async () => {
    const added: Added[] = []
    const cache = createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

    await createSetup({ fetch: async () => new Response(''), cache })(contextCollecting(added))

    expect(added.map((definition) => definition.name)).toEqual(['aws_docs_search', 'bsky_search', 'firecrawl_search', 'gnews_search', 'mdn_search', 'rfc_search', 'w3c_search', 'whatwg_search', 'wiki_search'])
  })
})
