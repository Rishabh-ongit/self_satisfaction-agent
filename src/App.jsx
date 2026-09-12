import { useState } from 'react'

function App() {
  const [command, setCommand] = useState('')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanCommand = command.trim()
    if (!cleanCommand) return

    setStatus('processing')
    setError('')

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

  return (
    <main className="app-shell">
      <p className="eyebrow">Personal prototype</p>
      <h1>What would you like to communicate?</h1>
      <p className="intro">
        Type or speak a command. We will interpret it locally and ask for
        approval before any future sending step.
      </p>

      <form className="command-form" onSubmit={handleSubmit}>
        <label htmlFor="command">Your command</label>
        <div className="command-row">
          <input
            id="command"
            name="command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Example: Send Rahul a message saying I will call tonight"
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
          {status === 'processing' ? 'Understanding…' : 'Understand command'}
        </button>
      </form>

      <section className="result" aria-live="polite">
        <p className="result-label">Proposed action</p>
        {result ? (
          <div className="action-details">
            <p><strong>Action:</strong> send a {result.intent.messageType === 'voice_note' ? 'voice note' : 'text message'}</p>
            <p><strong>To:</strong> {result.intent.recipient || 'not recognized yet'}</p>
            <p><strong>Draft:</strong> {result.intent.draft || 'not recognized yet'}</p>
            <p className="empty-command">{result.note}</p>
          </div>
        ) : (
          <p className="empty-command">Submit a command to see its proposed action.</p>
        )}
      </section>

      {error && <p className="error-message" role="alert">{error}</p>}

      <p className="privacy-note">
        Typed commands go only to the local API running on your computer. No
        command is sent to WhatsApp, an AI provider, or a database. Browser
        voice transcription may use your browser's speech service; we will
        replace that with local transcription in the privacy-focused version.
      </p>
    </main>
  )
}

export default App
