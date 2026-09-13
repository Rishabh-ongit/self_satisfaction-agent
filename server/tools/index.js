import { readNotificationsTool } from './notifications.js'
import { sendMessageTool } from './sendMessage.js'
import { spotifyControlTool } from './spotify.js'
import { whatsappCallTool } from './whatsappCall.js'

const tools = [
  sendMessageTool,
  whatsappCallTool,
  spotifyControlTool,
  readNotificationsTool,
]

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]))

export function getTool(toolName) {
  return toolsByName.get(toolName)
}

export function getToolNames() {
  return tools.map((tool) => tool.name)
}

export function formatToolsForPrompt() {
  return tools
    .map(
      (tool) =>
        `${tool.name}: ${tool.description}\nArguments: ${tool.argumentGuide}`,
    )
    .join('\n\n')
}
