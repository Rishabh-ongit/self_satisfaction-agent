import {
  allowOnlyKeys,
  optionalText,
  requireObject,
  requireText,
} from './validation.js'
import { executeSpotifyPlayback } from '../connectors/spotify/spotifyClient.js'

export const spotifyControlTool = {
  name: 'spotify_control',
  description: 'Control playback: play something, pause, or skip the current song.',
  argumentGuide: '{ "action": "play" | "pause" | "skip", "query": "optional search" | null }',
  requiresApproval: true,
  isMock: false,
  validate(argumentsObject) {
    const argumentsValue = requireObject(argumentsObject)
    allowOnlyKeys(argumentsValue, ['action', 'query'])

    const action = requireText(argumentsValue.action, 'action').toLowerCase()
    if (!['play', 'pause', 'skip'].includes(action)) {
      throw new Error('action must be play, pause, or skip.')
    }

    return {
      action,
      query: optionalText(argumentsValue.query, 'query'),
    }
  },
  async execute(argumentsValue) {
    const result = await executeSpotifyPlayback(argumentsValue)

    return {
      status: 'completed',
      summary: result.summary,
      data: argumentsValue,
      spotify: result,
    }
  },
}
