import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const tokenPath = path.join(
  process.cwd(),
  'data',
  'private',
  'spotify-token.json',
)
const pendingAuthorizationStates = new Set()

function getConfig() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri:
      process.env.SPOTIFY_REDIRECT_URI ??
      'http://127.0.0.1:3001/api/auth/spotify/callback',
  }
}

function requireConfig() {
  const config = getConfig()
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Spotify is not configured. Add credentials to your local .env file.')
  }

  return config
}

async function readToken() {
  try {
    return JSON.parse(await readFile(tokenPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw new Error('Could not read the local Spotify token file.')
  }
}

async function writeToken(token) {
  await mkdir(path.dirname(tokenPath), { recursive: true })
  await writeFile(tokenPath, JSON.stringify(token, null, 2), 'utf8')
}

function basicAuthorizationHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
}

async function requestToken(parameters) {
  const { clientId, clientSecret } = requireConfig()
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuthorizationHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(parameters),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Spotify authorization failed: ${data.error_description ?? data.error}`)
  }

  return data
}

async function getAccessToken() {
  const token = await readToken()
  if (!token) {
    throw new Error('Spotify is not connected. Connect your account before approving this action.')
  }

  if (token.expires_at > Date.now() + 60_000) return token.access_token

  if (!token.refresh_token) {
    throw new Error('Spotify needs to be connected again because no refresh token is available.')
  }

  const refreshedToken = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  })
  const nextToken = {
    ...token,
    ...refreshedToken,
    refresh_token: refreshedToken.refresh_token ?? token.refresh_token,
    expires_at: Date.now() + refreshedToken.expires_in * 1000,
  }
  await writeToken(nextToken)
  return nextToken.access_token
}

async function spotifyRequest(method, pathName, body) {
  const accessToken = await getAccessToken()
  const response = await fetch(`https://api.spotify.com/v1${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (response.ok) return response.status === 204 ? null : response.json()

  let message = 'Spotify rejected the request.'
  try {
    const errorBody = await response.json()
    message = errorBody.error?.message ?? message
  } catch {
    // The fallback message is sufficient when Spotify does not return JSON.
  }

  if (response.status === 404) {
    message = 'No active Spotify device was found. Open Spotify on a device, then try again.'
  }
  throw new Error(`Spotify error ${response.status}: ${message}`)
}

async function findFirstTrack(query) {
  const parameters = new URLSearchParams({ q: query, type: 'track', limit: '1' })
  const result = await spotifyRequest('GET', `/search?${parameters}`)
  const track = result.tracks?.items?.[0]

  if (!track) throw new Error(`Spotify could not find a track for “${query}”.`)

  return {
    name: track.name,
    artist: track.artists?.map((artist) => artist.name).join(', ') ?? 'Unknown artist',
    uri: track.uri,
  }
}

export function getSpotifyConnectionStatus() {
  const { clientId, clientSecret } = getConfig()
  return readToken().then((token) => ({
    configured: Boolean(clientId && clientSecret),
    connected: Boolean(token),
  }))
}

export function beginSpotifyAuthorization() {
  const { clientId, redirectUri } = requireConfig()
  const state = randomUUID()
  pendingAuthorizationStates.add(state)

  const parameters = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    scope: 'user-modify-playback-state',
  })

  return `https://accounts.spotify.com/authorize?${parameters}`
}

export async function finishSpotifyAuthorization({ code, state }) {
  if (!state || !pendingAuthorizationStates.delete(state)) {
    throw new Error('Spotify authorization state did not match. Please try connecting again.')
  }

  const { redirectUri } = requireConfig()
  const token = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  await writeToken({
    ...token,
    expires_at: Date.now() + token.expires_in * 1000,
  })
}

export async function executeSpotifyPlayback({ action, query }) {
  if (action === 'play') {
    const track = query ? await findFirstTrack(query) : null
    await spotifyRequest('PUT', '/me/player/play', track ? { uris: [track.uri] } : undefined)

    return {
      summary: track
        ? `Started “${track.name}” by ${track.artist}.`
        : 'Resumed Spotify playback.',
      track,
    }
  }

  if (action === 'pause') {
    await spotifyRequest('PUT', '/me/player/pause')
    return { summary: 'Paused Spotify playback.' }
  }

  if (action === 'skip') {
    await spotifyRequest('POST', '/me/player/next')
    return { summary: 'Skipped to the next Spotify track.' }
  }

  throw new Error(`Unsupported Spotify action: ${action}`)
}
