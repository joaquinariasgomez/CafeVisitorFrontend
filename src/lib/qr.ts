export const REGISTER_PATH_PREFIX = '/org/register/'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isQrToken(value: string) {
  return UUID_RE.test(value)
}

export function buildRegisterUrl(origin: string, qrToken: string) {
  return `${origin}${REGISTER_PATH_PREFIX}${encodeURIComponent(qrToken)}`
}

/** Accepts a full register URL (any origin) or a bare token. Returns the normalized token or null. */
export function parseScannedValue(text: string): string | null {
  const trimmed = text.trim()
  if (isQrToken(trimmed)) return trimmed.toLowerCase()
  try {
    const url = new URL(trimmed)
    const index = url.pathname.indexOf(REGISTER_PATH_PREFIX)
    if (index === -1) return null
    const token = decodeURIComponent(url.pathname.slice(index + REGISTER_PATH_PREFIX.length).split('/')[0] ?? '')
    return isQrToken(token) ? token.toLowerCase() : null
  } catch {
    return null
  }
}
