# Character Sheet Generation + Consistency References

## Summary

After creating a character, users can optionally generate character sheets (face angles, body angles, expressions) using NB2 or NB2+Grok (hyper-realistic). These sheets are saved as reference images on the character and automatically used by Director/PhotoSession for facial consistency.

## Data Model

Add `referenceSheets` to `SavedCharacter` in `characterStore.ts`:

```typescript
referenceSheets?: {
  face?: string      // blob URL or Supabase Storage URL — 4-angle face sheet
  body?: string      // blob URL or Supabase Storage URL — 4-angle body sheet
  expressions?: string  // blob URL or Supabase Storage URL — 9-expression sheet
}
```

Stored as blobs in IndexedDB (local) and Supabase Storage (cloud), same pattern as `modelImageBlobs`.

## UI — Post-Save Step in UploadCharacter

After the character is saved (end of current wizard), a new section appears:

### Layout
- Section title: "Character Sheet" with subtitle "Generate consistency references for better results"
- 3 checkboxes (all pre-selected by default):
  - Face Angles (4 views: front, right profile, left profile, three-quarter)
  - Body Angles (4 views: front, half turn, side, back)
  - Expressions (9 expressions in 3x3 grid)
- Quality toggle: **Standard** (NB2 only) / **Hyper-Realistic** (NB2 + Grok enhance)
- Credit cost display updates dynamically based on selection
- "Generate Sheet" button (joi-btn-solid)
- "Skip" text link below
- Progress indicator during generation
- Preview thumbnails of generated sheets with per-sheet "Regenerate" button

### Behavior
- Checkboxes control which sheets to generate
- Quality toggle changes cost and generation pipeline
- Generate triggers sequential generation (face → body → expressions)
- Each completed sheet shows as thumbnail preview
- Regenerate re-runs just that one sheet
- Skip saves character without sheets
- After generation completes, character is updated with referenceSheets

## Generation Pipeline

### Standard Quality (NB2)
1. Upload character's best model image to fal storage
2. Call Gemini NB2 with `ANGLE_PROMPTS[mode]` + character image as reference
3. Save resulting image as the sheet

### Hyper-Realistic Quality (NB2 + Grok)
1. Generate with NB2 (same as standard)
2. Pass NB2 result to Grok Imagine edit with `ANGLE_GROK_ENHANCE_PROMPTS[mode]`
3. Save the Grok-enhanced result as the sheet

### Engine Mapping
- Standard: `gemini:nb2` (Gemini Flash with image generation)
- Hyper-Realistic: `gemini:nb2` → `replicate:grok` (sequential)
- Prompts already exist in `services/toolEngines.ts`: `ANGLE_PROMPTS`, `ANGLE_GROK_ENHANCE_PROMPTS`

## Automatic Consumption in Director/PhotoSession

When a character with `referenceSheets` is selected:

### Director
- `referenceSheets.face` and `referenceSheets.body` are added to `modelImages` in the generation params
- No UI change — happens transparently in `handleGenerate()`

### PhotoSession
- Same approach — sheets are injected into the generation params as reference images
- Improves consistency across all generated photos

### Fallback
- If character has no `referenceSheets`, behavior is unchanged (uses `modelImageBlobs` as before)
- Sheets supplement, don't replace, existing model images

## Credit Costs

| Sheet | Standard (NB2) | Hyper-Realistic (NB2+Grok) |
|-------|---------------|---------------------------|
| Face Angles | 8cr | 16cr |
| Body Angles | 8cr | 16cr |
| Expressions | 8cr | 16cr |
| **All 3** | **24cr** | **48cr** |

## Files to Modify

| File | Change |
|------|--------|
| `stores/characterStore.ts` | Add `referenceSheets` to `SavedCharacter` interface |
| `pages/UploadCharacter.tsx` | Add post-save character sheet section |
| `pages/Director.tsx` | Inject `referenceSheets` into generation params |
| `pages/PhotoSession.tsx` | Inject `referenceSheets` into generation params |
| `services/characterStorageService.ts` | Handle saving/loading sheet blobs |
| `services/supabaseCharacterService.ts` | Handle cloud storage of sheets |
