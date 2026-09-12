import express from 'express'
import { understandCommand } from './commandParser.js'

const app = express()
const port = 3001

app.use(express.json())

app.post('/api/commands', (request, response) => {
  const { command } = request.body

  if (typeof command !== 'string' || !command.trim()) {
    return response.status(400).json({ error: 'A non-empty command is required.' })
  }

  const cleanCommand = command.trim()
  const intent = understandCommand(cleanCommand)

  return response.json({
    receivedCommand: cleanCommand,
    intent,
    requiresApproval: true,
    note: 'No message has been sent. This is a local prototype response.',
  })
})

app.listen(port, () => {
  console.log(`Local API listening at http://localhost:${port}`)
})
