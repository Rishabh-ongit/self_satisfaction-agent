export function requireObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('arguments must be an object.')
  }

  return value
}

export function allowOnlyKeys(argumentsObject, allowedKeys) {
  const unexpectedKey = Object.keys(argumentsObject).find(
    (key) => !allowedKeys.includes(key),
  )

  if (unexpectedKey) {
    throw new Error(`unexpected argument: ${unexpectedKey}.`)
  }
}

export function requireText(value, argumentName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${argumentName} must be a non-empty string.`)
  }

  return value.trim()
}

export function optionalText(value, argumentName) {
  if (value === undefined || value === null) return null
  return requireText(value, argumentName)
}

export function optionalBoolean(value, argumentName) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'boolean') {
    throw new Error(`${argumentName} must be true or false.`)
  }

  return value
}
