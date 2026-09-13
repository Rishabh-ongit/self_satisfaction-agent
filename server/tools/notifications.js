import {
  allowOnlyKeys,
  optionalBoolean,
  optionalText,
  requireObject,
} from './validation.js'

export const readNotificationsTool = {
  name: 'read_notifications',
  description: 'Read notifications, optionally narrowed by a text filter or unread status.',
  argumentGuide: '{ "filter": "optional text" | null, "unread_only": true | false | null }',
  requiresApproval: true,
  isMock: true,
  validate(argumentsObject) {
    const argumentsValue = requireObject(argumentsObject)
    allowOnlyKeys(argumentsValue, ['filter', 'unread_only'])

    return {
      filter: optionalText(argumentsValue.filter, 'filter'),
      unread_only: optionalBoolean(argumentsValue.unread_only, 'unread_only'),
    }
  },
  async execute(argumentsValue) {
    return {
      status: 'mock_completed',
      summary: 'Mock notification read completed. No notifications were accessed.',
      data: argumentsValue,
      notifications: [],
    }
  },
}
