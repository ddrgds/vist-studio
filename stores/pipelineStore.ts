import { create } from 'zustand'
import type { Page } from '../App'

interface PipelineState {
  characterId: string | null
  heroShotUrl: string | null
  heroShotFile: File | null
  editedHeroUrl: string | null
  editedHeroFile: File | null
  lastEngine: string | null
  lastSoulStyleId: string | null
  suggestedNext: Page | null
}

interface PipelineActions {
  setCharacter: (id: string) => void
  setHeroShot: (url: string, file?: File) => void
  setEditedHero: (url: string, file?: File) => void
  setLastEngine: (engine: string, soulStyleId?: string) => void
  setSuggestedNext: (page: Page | null) => void
  clear: () => void
}

export const usePipelineStore = create<PipelineState & PipelineActions>((set) => ({
  characterId: null,
  heroShotUrl: null,
  heroShotFile: null,
  editedHeroUrl: null,
  editedHeroFile: null,
  lastEngine: null,
  lastSoulStyleId: null,
  suggestedNext: null,

  setCharacter: (id) => set({ characterId: id, heroShotUrl: null, heroShotFile: null, editedHeroUrl: null, editedHeroFile: null, suggestedNext: 'director' }),
  setHeroShot: (url, file) => set({ heroShotUrl: url, heroShotFile: file ?? null, suggestedNext: 'editor' }),
  setEditedHero: (url, file) => set({ editedHeroUrl: url, editedHeroFile: file ?? null, suggestedNext: 'session' }),
  setLastEngine: (engine, soulStyleId) => set({ lastEngine: engine, lastSoulStyleId: soulStyleId ?? null }),
  setSuggestedNext: (page) => set({ suggestedNext: page }),
  clear: () => set({ characterId: null, heroShotUrl: null, heroShotFile: null, editedHeroUrl: null, editedHeroFile: null, lastEngine: null, lastSoulStyleId: null, suggestedNext: null }),
}))
