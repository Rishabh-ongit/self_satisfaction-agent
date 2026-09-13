import {
  allowOnlyKeys,
  requireObject,
  requireText,
} from './validation.js'

export const sendMessageTool = {
  name: 'send_message',
  description: 'Prepare a text message or voice note for a supported platform.',
  argumentGuide:
    '{ "platform": "whatsapp", "recipient": "name", "message": "content", "message_type": "text" | "voice_note" }',
  requiresApproval: true,
  isMock: true,
  validate(argumentsObject) {
    const argumentsValue = requireObject(argumentsObject)
    allowOnlyKeys(argumentsValue, [
      'platform',
      'recipient',
      'message',
      'message_type',
    ])

    const platform = requireText(argumentsValue.platform, 'platform').toLowerCase()
    const messageType = requireText(argumentsValue.message_type, 'message_type').toLowerCase()

    if (platform !== 'whatsapp') throw new Error('platform must be whatsapp.')
    if (!['text', 'voice_note'].includes(messageType)) {
      throw new Error('message_type must be text or voice_note.')
    }

    return {
      platform,
      recipient: requireText(argumentsValue.recipient, 'recipient'),
      message: requireText(argumentsValue.message, 'message'),
      message_type: messageType,
    }
  },
  async execute(argumentsValue) {
    return {
      status: 'mock_completed',
      summary: `Mock ${argumentsValue.message_type} prepared for ${argumentsValue.recipient} on ${argumentsValue.platform}.`,
      data: argumentsValue,
    }
  },
}
