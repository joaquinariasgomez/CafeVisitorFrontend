'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

import type { Cafeteria, Organization } from '@/lib/api/types'
import { canManage as canManageRole } from '@/lib/roles'
import { useUserContext } from './use-user-context'

const STORAGE_KEY = 'cv.active'
const EVENT = 'cv:active-changed'

interface Stored {
  organizationId: string
  cafeteriaId: string | null
}

function parseStored(raw: string | null): Stored | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Stored>
    return typeof parsed.organizationId === 'string'
      ? { organizationId: parsed.organizationId, cafeteriaId: typeof parsed.cafeteriaId === 'string' ? parsed.cafeteriaId : null }
      : null
  } catch {
    return null
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT, callback)
  }
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY)
}

export function useActiveCafeteria() {
  const { data: context, isPending, isError, error, refetch } = useUserContext()
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const stored = useMemo(() => parseStored(raw), [raw])

  const organizations = useMemo(() => context?.organizations ?? [], [context])

  const resolved = useMemo<{ organization: Organization | undefined; cafeteria: Cafeteria | undefined }>(() => {
    if (organizations.length === 0) return { organization: undefined, cafeteria: undefined }
    const organization = organizations.find((o) => o.id === stored?.organizationId) ?? organizations[0]
    const cafeteria = organization.cafeterias.find((c) => c.id === stored?.cafeteriaId) ?? organization.cafeterias[0]
    return { organization, cafeteria }
  }, [organizations, stored])

  const setActive = useCallback((organizationId: string, cafeteriaId: string | null) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ organizationId, cafeteriaId } satisfies Stored))
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return {
    organizations,
    organization: resolved.organization,
    cafeteria: resolved.cafeteria,
    setActive,
    canManage: canManageRole(resolved.organization?.role),
    isReady: !isPending && !isError,
    isPending,
    isError,
    error,
    refetch,
  }
}

export type ActiveCafeteria = ReturnType<typeof useActiveCafeteria>
