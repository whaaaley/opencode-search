import type { PluginInput } from '@opencode-ai/plugin'

type Client = PluginInput['client']

type SendResultOptions = {
  client: Client
  sessionID: string
  text: string
}

export const sendResult = async (options: SendResultOptions): Promise<void> => {
  const { client, sessionID, text } = options

  await client.session.prompt({
    path: { id: sessionID },
    body: {
      noReply: true,
      parts: [{
        type: 'text',
        text,
        ignored: true,
      }],
    },
  })
}
