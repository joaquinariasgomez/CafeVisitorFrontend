'use client'

import { createContext, useContext } from 'react'

const SessionEmailContext = createContext<string | null>(null)

/** The email claim of the signed-in session. When present, the backend only accepts this email. */
export function SessionEmailProvider({ email, children }: { email: string | null; children: React.ReactNode }) {
  return <SessionEmailContext.Provider value={email}>{children}</SessionEmailContext.Provider>
}

export function useSessionEmail() {
  return useContext(SessionEmailContext)
}
