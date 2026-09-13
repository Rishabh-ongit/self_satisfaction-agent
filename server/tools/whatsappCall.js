import {
  allowOnlyKeys,
  requireObject,
  requireText,
} from './validation.js'

export const whatsappCallTool = {
  name: 'whatsapp_call',
  description: 'Prepare a WhatsApp voice or video call.',
  argumentGuide: '{ "recipient": "name", "call_type": "voice" | "video" }',
  requiresApproval: true,
  isMock: true,
  validate(argumentsObject) {
    const argumentsValue = requireObject(argumentsObject)
    allowOnlyKeys(argumentsValue, ['recipient', 'call_type'])

    const callType = requireText(argumentsValue.call_type, 'call_type').toLowerCase()
    if (!['voice', 'video'].includes(callType)) {
      throw new Error('call_type must be voice or video.')
    }

    return {
      recipient: requireText(argumentsValue.recipient, 'recipient'),
      call_type: callType,
    }
  },
  async execute(argumentsValue) {
    return {
      status: 'mock_completed',
      summary: `Mock WhatsApp ${argumentsValue.call_type} call prepared for ${argumentsValue.recipient}.`,
      data: argumentsValue,
    }
  },
}
