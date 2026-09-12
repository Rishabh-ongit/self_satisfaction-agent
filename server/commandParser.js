function extractRecipient(command) {
  const match = command.match(/(?:send|message|reply to)\s+([a-z][a-z '-]*)/i)

  if (!match) return null

  return match[1]
    .replace(/\s+(a|the|my)\s+(text|message|voice note).*$/i, '')
    .trim()
}

function extractDraft(command) {
  const match = command.match(/(?:saying|say|that)\s+(.+)/i)
  return match ? match[1].trim() : null
}

export function understandCommand(command) {
  const normalizedCommand = command.toLowerCase()
  const messageType = /voice note|voice message|audio message/.test(
    normalizedCommand,
  )
    ? 'voice_note'
    : 'text'

  return {
    action: 'send_message',
    messageType,
    recipient: extractRecipient(command),
    draft: extractDraft(command),
    confidence: 'low',
  }
}
