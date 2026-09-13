// A small policy boundary inspired by privacy-first agent designs: decide
// whether execution is allowed before the tool's execute() function is called.
// This is our own implementation; it does not depend on another project.
export function getApprovalState(tool) {
  if (tool.isMock) {
    return {
      required: true,
      state: 'not_required_for_mock',
      message:
        'This mock tool is safe to run locally. A real integration would wait for your approval.',
    }
  }

  if (tool.requiresApproval) {
    return {
      required: true,
      state: 'awaiting_user_approval',
      message: 'Approval is required before this real-world action can run.',
    }
  }

  return {
    required: false,
    state: 'not_required',
    message: 'This tool does not require approval.',
  }
}

export function canExecute(approval) {
  return [
    'not_required_for_mock',
    'not_required',
    'approved',
  ].includes(approval.state)
}
