import type { PluginInput } from '@opencode-ai/plugin'

type Client = PluginInput['client']

type SendResultOptions = {
  client: Client
  sessionID: string
  text: string
}

export const sendResult = async (options: SendResultOptions): Promise<void> => {
  await options.client.session.prompt({
    path: { id: options.sessionID },
    body: {
      noReply: true,
      parts: [{
        type: 'text',
        text: options.text,
        ignored: true,
      }],
    },
  })
}
