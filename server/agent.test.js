import assert from 'node:assert/strict'
import test from 'node:test'
import { runAgent } from './agent.js'

test('agent validates a model-selected Spotify tool and waits for approval', async (context) => {
  const originalFetch = global.fetch
  const decision = {
    tool: 'spotify_control',
    arguments: { action: 'play', query: 'Arctic Monkeys' },
  }

  global.fetch = async (url) => {
    if (url.endsWith('/api/tags')) {
      return new Response(JSON.stringify({ models: [{ name: 'qwen3:14b' }] }))
    }

    return new Response(
      JSON.stringify({ message: { content: JSON.stringify(decision) } }),
    )
  }
  context.after(() => {
    global.fetch = originalFetch
  })

  const result = await runAgent('Play Arctic Monkeys')

  assert.equal(result.selectedTool.name, 'spotify_control')
  assert.deepEqual(result.arguments, {
    action: 'play',
    query: 'Arctic Monkeys',
  })
  assert.equal(result.execution.status, 'awaiting_approval')
})

test('agent rejects invalid arguments proposed by the model', async (context) => {
  const originalFetch = global.fetch
  const decision = {
    tool: 'whatsapp_call',
    arguments: { recipient: 'Rahul', call_type: 'telephone' },
  }

  global.fetch = async (url) => {
    if (url.endsWith('/api/tags')) {
      return new Response(JSON.stringify({ models: [{ name: 'qwen3:14b' }] }))
    }

    return new Response(
      JSON.stringify({ message: { content: JSON.stringify(decision) } }),
    )
  }
  context.after(() => {
    global.fetch = originalFetch
  })

  await assert.rejects(
    () => runAgent('Call Rahul'),
    { message: /call_type must be voice or video/ },
  )
})
