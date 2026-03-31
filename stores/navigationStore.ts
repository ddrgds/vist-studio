import { create } from 'zustand'
import type { Page } from '../App'

interface NavigationState {
  pendingImage: string | null
  pendingFile: File | null
  pendingSource: 'gallery' | 'character' | null
  pendingTarget: Page | null
  selectFor: 'studio' | 'editor' | null // gallery selection mode — returns image to this page
  _timeoutId: ReturnType<typeof setTimeout> | null

  navigateToEditor: (image: string, file?: File) => void
  navigateToSession: (image: string) => void
  navigateToUpload: (image: string) => void
  openGalleryForSelection: (returnTo: 'studio' | 'editor') => void
  selectFromGallery: (image: string) => void
  consume: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  pendingImage: null,
  pendingFile: null,
  pendingSource: null,
  pendingTarget: null,
  selectFor: null,
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
    set({ pendingImage: image, pendingFile: null, pendingSource: 'gallery', pendingTarget: 'studio', _timeoutId: tid })
  },

  navigateToUpload: (image) => {
    const prev = get()._timeoutId
    if (prev) clearTimeout(prev)
    const tid = setTimeout(() => get().consume(), 10000)
    set({ pendingImage: image, pendingFile: null, pendingSource: 'gallery', pendingTarget: 'create', _timeoutId: tid })
  },

  openGalleryForSelection: (returnTo) => {
    set({ selectFor: returnTo })
  },

  selectFromGallery: (image) => {
    const returnTo = get().selectFor
    if (!returnTo) return
    set({ selectFor: null, pendingImage: image, pendingTarget: returnTo === 'editor' ? 'editor' : 'studio', pendingSource: 'gallery' })
  },

  consume: () => {
    const tid = get()._timeoutId
    if (tid) clearTimeout(tid)
    set({ pendingImage: null, pendingFile: null, pendingSource: null, pendingTarget: null, selectFor: null, _timeoutId: null })
  },
}))
