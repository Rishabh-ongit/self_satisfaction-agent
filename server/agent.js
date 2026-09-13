import { canExecute, getApprovalState } from './approval.js'
import { decideToolCall } from './llm.js'
import { getTool } from './tools/index.js'

function makeValidationError(message) {
  const error = new Error(message)
  error.status = 422
  return error
}

export async function runAgent(userRequest) {
  const { decision, model } = await decideToolCall(userRequest)
  const tool = getTool(decision.tool)

  if (!tool) throw makeValidationError(`Unknown tool: ${decision.tool}`)

  let validatedArguments
  try {
    validatedArguments = tool.validate(decision.arguments)
  } catch (error) {
    throw makeValidationError(`Invalid arguments for ${tool.name}: ${error.message}`)
  }

  const approval = getApprovalState(tool)
  const execution = canExecute(approval)
    ? await tool.execute(validatedArguments)
    : {
        status: 'awaiting_approval',
        summary: 'The tool was not executed because user approval is required.',
        data: validatedArguments,
      }

  return {
    userRequest,
    llm: { provider: 'ollama', model },
    decision,
    selectedTool: { name: tool.name, description: tool.description },
    arguments: validatedArguments,
    approval,
    execution,
  }
}

export async function executeApprovedTool(toolName, argumentsObject) {
  const tool = getTool(toolName)
  if (!tool) throw makeValidationError(`Unknown tool: ${toolName}`)

  let validatedArguments
  try {
    validatedArguments = tool.validate(argumentsObject)
  } catch (error) {
    throw makeValidationError(`Invalid arguments for ${tool.name}: ${error.message}`)
  }

  return tool.execute(validatedArguments)
}
