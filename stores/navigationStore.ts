import { create } from 'zustand'
import type { Page } from '../App'

interface NavigationState {
  pendingImage: string | null
  pendingFile: File | null
  pendingSource: 'gallery' | 'character' | null
  pendingTarget: Page | null
  _timeoutId: ReturnType<typeof setTimeout> | null

  navigateToEditor: (image: string, file?: File) => void
  navigateToSession: (image: string) => void
  navigateToUpload: (image: string) => void
  consume: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  pendingImage: null,
  pendingFile: null,
  pendingSource: null,
  pendingTarget: null,
  _timeoutId: null,

  navigateToEditor: (image, file) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: file ?? null, pendingSource: 'gallery', pendingTarget: 'editor', _timeoutId: tid })
  },

  navigateToSession: (image) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: null, pendingSource: 'gallery', pendingTarget: 'session', _timeoutId: tid })
  },

  navigateToUpload: (image) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: null, pendingSource: 'gallery', pendingTarget: 'upload', _timeoutId: tid })
  },

  consume: () => {
    const tid = get()._timeoutId
    if (tid) clearTimeout(tid)
    set({ pendingImage: null, pendingFile: null, pendingSource: null, pendingTarget: null, _timeoutId: null })
  },
}))
