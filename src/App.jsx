import { useEffect, useState } from 'react'

function JsonBlock({ value }) {
  return <pre>{JSON.stringify(value, null, 2)}</pre>
}

function App() {
  const [command, setCommand] = useState('')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [spotifyStatus, setSpotifyStatus] = useState(null)

  async function loadSpotifyStatus() {
    try {
      const response = await fetch('/api/auth/spotify/status')
      if (response.ok) setSpotifyStatus(await response.json())
    } catch {
      // The regular command error state will explain if the local API is unavailable.
    }
  }

  useEffect(() => {
    loadSpotifyStatus()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanCommand = command.trim()
    if (!cleanCommand) return

    setStatus('processing')
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cleanCommand }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'The API could not process this command.')

      setResult(data)
      setStatus('done')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('idle')
    }
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setError('')
      setStatus('listening')
    }
    recognition.onresult = (event) => {
      setCommand(event.results[0][0].transcript)
    }
    recognition.onerror = () => {
      setError('I could not transcribe that. Please try again or type your command.')
    }
    recognition.onend = () => setStatus('idle')
    recognition.start()
  }

  async function approveAction() {
    if (!result?.pendingAction) return

    setStatus('approving')
    setError('')
    try {
      const response = await fetch(`/api/actions/${result.pendingAction.id}/approve`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The action could not be approved.')

      setResult(data)
      setStatus('done')
      loadSpotifyStatus()
    } catch (requestError) {
      setError(requestError.message)
      setStatus('idle')
    }
  }

  return (
    <main className="app-shell">
      <p className="eyebrow">Local agent core</p>
      <h1>What should your assistant do?</h1>
      <p className="intro">
        Your local model chooses a tool. Mock tools run safely; real-world
        integrations will require approval.
      </p>

      <section className="connection-card">
        <p><strong>Spotify:</strong> {spotifyStatus?.connected ? 'connected' : 'not connected'}</p>
        {!spotifyStatus?.connected && (
          <button
            type="button"
            className="connect-button"
            disabled={spotifyStatus ? !spotifyStatus.configured : true}
            onClick={() => window.location.assign('/api/auth/spotify/start')}
          >
            {spotifyStatus?.configured ? 'Connect Spotify' : 'Add Spotify credentials first'}
          </button>
        )}
      </section>

      <form className="command-form" onSubmit={handleSubmit}>
        <label htmlFor="command">Your command</label>
        <div className="command-row">
          <input
            id="command"
            name="command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Example: Message Rahul that I'll reach in 10 minutes"
            autoComplete="off"
          />
          <button
            type="button"
            className="microphone-button"
            onClick={handleVoiceInput}
            disabled={status === 'listening'}
          >
            🎙️ <span>{status === 'listening' ? 'Listening…' : 'Speak'}</span>
          </button>
        </div>
        <button className="submit-button" type="submit" disabled={status === 'processing'}>
          {status === 'processing' ? 'Running agent…' : 'Run agent'}
        </button>
      </form>

      <section className="result" aria-live="polite">
        <p className="result-label">Agent trace</p>
        {result ? (
          <div className="agent-flow">
            <div className="flow-step">
              <p className="flow-label">1. User request</p>
              <p>{result.userRequest}</p>
            </div>
            <div className="flow-step">
              <p className="flow-label">2. Agent decision</p>
              <JsonBlock value={result.decision} />
              <p className="empty-command">Local model: {result.llm.model}</p>
            </div>
            <div className="flow-step">
              <p className="flow-label">3. Selected tool</p>
              <p><strong>{result.selectedTool.name}</strong> — {result.selectedTool.description}</p>
            </div>
            <div className="flow-step">
              <p className="flow-label">4. Validated arguments</p>
              <JsonBlock value={result.arguments} />
            </div>
            <div className="flow-step">
              <p className="flow-label">5. Tool result</p>
              <p>{result.execution.summary}</p>
              <JsonBlock value={result.execution} />
            </div>
            <p className="approval-note">Approval: {result.approval.message}</p>
            {result.pendingAction && (
              <button
                type="button"
                className="approve-button"
                onClick={approveAction}
                disabled={status === 'approving'}
              >
                {status === 'approving' ? 'Approving…' : 'Approve and execute once'}
              </button>
            )}
          </div>
        ) : (
          <p className="empty-command">Run a request to inspect the agent's decision and mock execution.</p>
        )}
      </section>

      {error && <p className="error-message" role="alert">{error}</p>}

      <p className="privacy-note">
        Typed commands go only to the local API running on your computer. No
        command is sent to WhatsApp, a cloud AI provider, or a database. Browser
        voice transcription may use your browser's speech service; we will
        replace that with local transcription in the privacy-focused version.
      </p>
    </main>
  )
}

export default App
