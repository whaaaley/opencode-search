// Lazy env access
// Only throws when actually used, not at import time
export const env = {
  get GOOGLE_SEARCH_API_KEY(): string {
    const val = process.env.GOOGLE_SEARCH_API_KEY

    if (!val) {
      throw new Error('GOOGLE_SEARCH_API_KEY environment variable is not set')
    }

    return val
  },
  get GOOGLE_SEARCH_ENGINE_ID(): string {
    const val = process.env.GOOGLE_SEARCH_ENGINE_ID

    if (!val) {
      throw new Error('GOOGLE_SEARCH_ENGINE_ID environment variable is not set')
    }

    return val
  },
}
