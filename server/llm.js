import { formatToolsForPrompt, getToolNames } from './tools/index.js'

const ollamaBaseUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434'

const toolDecisionSchema = {
  type: 'object',
  properties: {
    tool: { type: 'string', enum: getToolNames() },
    arguments: { type: 'object' },
  },
  required: ['tool', 'arguments'],
  additionalProperties: false,
}

function makeLlmError(message) {
  const error = new Error(`Local LLM unavailable: ${message}`)
  error.status = 503
  return error
}

async function resolveModelName() {
  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL

  let response
  try {
    response = await fetch(`${ollamaBaseUrl}/api/tags`)
  } catch {
    throw makeLlmError('start Ollama, then try again.')
  }

  if (!response.ok) throw makeLlmError('could not list installed models.')

  const { models = [] } = await response.json()
  const model =
    models.find(({ name }) => /qwen.*14b/i.test(name)) ??
    models.find(({ name }) => /qwen/i.test(name))

  if (!model) throw makeLlmError('no Qwen model was found.')

  return model.name
}

function validateDecision(decision) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    throw makeLlmError('the model returned an invalid tool decision.')
  }

  if (!getToolNames().includes(decision.tool)) {
    const error = new Error('The model selected an unknown tool.')
    error.status = 422
    throw error
  }

  if (
    !decision.arguments ||
    typeof decision.arguments !== 'object' ||
    Array.isArray(decision.arguments)
  ) {
    const error = new Error('The model returned invalid tool arguments.')
    error.status = 422
    throw error
  }

  return { tool: decision.tool, arguments: decision.arguments }
}

export async function decideToolCall(userRequest) {
  const model = await resolveModelName()
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: toolDecisionSchema,
      options: { temperature: 0 },
      messages: [
        {
          role: 'system',
          content: `You are a local personal-assistant tool selector. Choose exactly one available tool for the user's request. Return only JSON matching the supplied schema. Do not claim an action was completed. Do not invent names, messages, or search queries; use the user's words.\n\nAvailable tools:\n${formatToolsForPrompt()}`,
        },
        { role: 'user', content: userRequest },
      ],
    }),
  })

  if (!response.ok) throw makeLlmError(`Ollama returned HTTP ${response.status}.`)

  const payload = await response.json()

  try {
    return {
      decision: validateDecision(JSON.parse(payload.message.content)),
      model,
    }
  } catch (error) {
    if (error.status) throw error
    throw makeLlmError('the model did not return valid JSON.')
  }
}
