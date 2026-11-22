import type { Plugin } from '@opencode/plugin'
import type { Deps } from './deps.ts'
import { createSearchTools } from './search.ts'

export const createSetup = (deps: Deps) => {
  return async (context: Plugin.Context): Promise<void> => {
    await context.tool.transform((tools) => {
      for (const definition of createSearchTools(context, deps)) tools.add(definition)
    })
  }
}
