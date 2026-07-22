import type { Plugin } from '@opencode-ai/plugin/v2'

type SessionID = Parameters<Plugin.Context['session']['synthetic']>[0]['sessionID']

type SendResultOptions = {
  context: Plugin.Context
  sessionID: string
  text: string
}

export const sendResult = async (options: SendResultOptions): Promise<void> => {
  await options.context.session.synthetic({
    sessionID: options.sessionID as SessionID,
    text: options.text,
    description: 'Search results',
  })
}
