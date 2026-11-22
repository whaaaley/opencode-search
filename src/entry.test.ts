import { describe, expect, it } from 'vite-plus/test'
import plugin from '../search.ts'

describe('plugin entry', () => {
  it('defines the opencode-search plugin under OpenCode 2', { meta: { steps: 0 } }, () => {
    expect(plugin).toMatchObject({ id: 'opencode-search' })
  })
})
