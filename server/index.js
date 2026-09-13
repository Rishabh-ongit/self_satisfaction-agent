import express from 'express'
import { executeApprovedTool, runAgent } from './agent.js'
import {
  beginSpotifyAuthorization,
  finishSpotifyAuthorization,
  getSpotifyConnectionStatus,
} from './connectors/spotify/spotifyClient.js'
import { savePendingAction, takePendingAction } from './pendingActions.js'

const app = express()
const port = 3001

app.use(express.json())

app.get('/api/auth/spotify/status', async (_request, response) => {
  response.json(await getSpotifyConnectionStatus())
})

app.get('/api/auth/spotify/start', (_request, response) => {
  try {
    response.redirect(beginSpotifyAuthorization())
  } catch (error) {
    response.status(400).send(error.message)
  }
})

app.get('/api/auth/spotify/callback', async (request, response) => {
  if (request.query.error) {
    return response.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}?spotify=denied`)
  }

  try {
    await finishSpotifyAuthorization({
      code: request.query.code,
      state: request.query.state,
    })
    return response.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}?spotify=connected`)
  } catch (error) {
    return response.status(400).send(error.message)
  }
})

app.post('/api/commands', async (request, response) => {
  const { command } = request.body

  if (typeof command !== 'string' || !command.trim()) {
    return response.status(400).json({ error: 'A non-empty command is required.' })
  }

  const cleanCommand = command.trim()
  let agentResult
  try {
    agentResult = await runAgent(cleanCommand)
  } catch (error) {
    return response.status(error.status ?? 500).json({ error: error.message })
  }

  if (agentResult.execution.status === 'awaiting_approval') {
    const pendingAction = savePendingAction(agentResult)
    return response.json({ ...agentResult, pendingAction })
  }

  return response.json(agentResult)
})

app.post('/api/actions/:id/approve', async (request, response) => {
  const pendingAction = takePendingAction(request.params.id)
  if (!pendingAction) {
    return response.status(404).json({ error: 'This action was not found or has expired.' })
  }

  try {
    const execution = await executeApprovedTool(
      pendingAction.selectedTool.name,
      pendingAction.arguments,
    )
    return response.json({
      ...pendingAction,
      approval: {
        required: true,
        state: 'approved',
        message: 'You approved this action. The tool was executed once.',
      },
      execution,
      pendingAction: null,
    })
  } catch (error) {
    return response.status(error.status ?? 502).json({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Local API listening at http://localhost:${port}`)
})
