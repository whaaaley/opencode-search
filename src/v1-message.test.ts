import { describe, expect, it } from 'vite-plus/test'
import { V1_MESSAGE } from './v1-message.ts'

describe('V1_MESSAGE', () => {
  it('names the version to pin', { meta: { steps: 0 } }, () => {
    expect(V1_MESSAGE).toContain('opencode-search@0.0.9')
  })

  it('offers the upgrade path as well as the pin', { meta: { steps: 0 } }, () => {
    expect(V1_MESSAGE).toContain('OpenCode 2')
    expect(V1_MESSAGE).toContain('https://opencode.ai/v2/docs')
  })

  it('says the v1 release is final, so pinning is not a temporary workaround', { meta: { steps: 0 } }, () => {
    expect(V1_MESSAGE).toContain('will not be updated')
  })
})
