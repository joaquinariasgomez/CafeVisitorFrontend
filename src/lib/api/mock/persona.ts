export const MOCK_PERSONAS = ['client', 'client-with-invites', 'org-member', 'org-admin'] as const
export type MockPersona = (typeof MOCK_PERSONAS)[number]

export const PERSONA_LABELS: Record<MockPersona, string> = {
  client: 'Client (no organization)',
  'client-with-invites': 'Client with pending invitations',
  'org-member': 'Organization member',
  'org-admin': 'Organization admin + owner',
}

const STORAGE_KEY = 'cv.mockPersona'

export function readPersona(): MockPersona {
  if (typeof window === 'undefined') return 'client'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return (MOCK_PERSONAS as readonly string[]).includes(stored ?? '') ? (stored as MockPersona) : 'client'
}

export function writePersona(persona: MockPersona) {
  window.localStorage.setItem(STORAGE_KEY, persona)
}
