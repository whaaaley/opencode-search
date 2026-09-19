import type { Plugin } from '@opencode-ai/plugin'
import type * as Tool from '@opencode-ai/plugin/promise/tool'

type SendResultOptions = {
  context: Plugin.Context
  sessionID: Tool.ToolContext['sessionID']
  text: string
}

export const sendResult = async (options: SendResultOptions): Promise<void> => {
  await options.context.session.synthetic({
    sessionID: options.sessionID,
    text: options.text,
    description: 'Search results',
  })
}
