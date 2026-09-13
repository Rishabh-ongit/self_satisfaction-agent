import assert from 'node:assert/strict'
import test from 'node:test'
import { canExecute, getApprovalState } from './approval.js'

test('mock tools can execute without a real approval flow', () => {
  const approval = getApprovalState({ isMock: true, requiresApproval: true })

  assert.equal(approval.state, 'not_required_for_mock')
  assert.equal(canExecute(approval), true)
})

test('real approval-required tools are blocked before execution', () => {
  const approval = getApprovalState({ isMock: false, requiresApproval: true })

  assert.equal(approval.state, 'awaiting_user_approval')
  assert.equal(canExecute(approval), false)
})
