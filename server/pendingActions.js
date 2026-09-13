import { randomUUID } from 'node:crypto'

const pendingActions = new Map()
const actionLifetimeMs = 5 * 60 * 1000

function removeExpiredActions() {
  const now = Date.now()
  for (const [id, action] of pendingActions) {
    if (action.expiresAt <= now) pendingActions.delete(id)
  }
}

export function savePendingAction(agentResult) {
  removeExpiredActions()

  const id = randomUUID()
  const expiresAt = Date.now() + actionLifetimeMs
  pendingActions.set(id, { agentResult, expiresAt })

  return { id, expiresAt }
}

export function takePendingAction(id) {
  removeExpiredActions()
  const pendingAction = pendingActions.get(id)
  if (!pendingAction) return null

  pendingActions.delete(id)
  return pendingAction.agentResult
}
