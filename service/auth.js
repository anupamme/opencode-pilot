import { randomBytes, timingSafeEqual } from 'crypto'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'

export const DEFAULT_AUTH_TOKEN_PATH = join(homedir(), '.config', 'opencode', 'pilot', 'server.token')

export function readAuthToken(tokenPath = DEFAULT_AUTH_TOKEN_PATH) {
  try {
    const token = readFileSync(tokenPath, 'utf8').trim()
    return token || null
  } catch {
    return null
  }
}

export function getOrCreateAuthToken(tokenPath = DEFAULT_AUTH_TOKEN_PATH) {
  mkdirSync(dirname(tokenPath), { recursive: true, mode: 0o700 })

  const existingToken = readAuthToken(tokenPath)
  if (existingToken) {
    chmodSync(tokenPath, 0o600)
    return existingToken
  }

  const token = randomBytes(32).toString('hex')
  try {
    writeFileSync(tokenPath, token, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    return token
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }

    const concurrentToken = readAuthToken(tokenPath)
    if (!concurrentToken) {
      throw new Error(`Could not read authentication token at ${tokenPath}`)
    }
    chmodSync(tokenPath, 0o600)
    return concurrentToken
  }
}

export function createAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function isValidAuthToken(providedToken, expectedToken) {
  if (!providedToken || !expectedToken) {
    return false
  }

  const provided = Buffer.from(providedToken)
  const expected = Buffer.from(expectedToken)
  if (provided.length !== expected.length) {
    return false
  }

  return timingSafeEqual(provided, expected)
}
