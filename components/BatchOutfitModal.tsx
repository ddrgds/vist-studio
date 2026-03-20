import { useState, useRef, useCallback } from 'react'
import { changeOutfit, uploadToFal } from '../services/toolEngines'
import { useGalleryStore } from '../stores/galleryStore'
import { useToast } from '../contexts/ToastContext'

interface BatchOutfitModalProps {
  imageUrls: string[]
  onClose: () => void
  onComplete: (results: string[]) => void
}

interface ProcessingResult {
  sourceUrl: string
  resultUrl: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export default function BatchOutfitModal({ imageUrls, onClose, onComplete }: BatchOutfitModalProps) {
  const addItems = useGalleryStore(s => s.addItems)
  const { addToast } = useToast()

  const [outfitDesc, setOutfitDesc] = useState('')
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null)
  const [results, setResults] = useState<ProcessingResult[]>(() =>
    imageUrls.map(url => ({ sourceUrl: url, resultUrl: null, status: 'pending' as const }))
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isDone, setIsDone] = useState(false)
  const abortRef = useRef(false)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  const totalCount = imageUrls.length
  const doneCount = results.filter(r => r.status === 'done').length
  const errorCount = results.filter(r => r.status === 'error').length

  const handleGarmentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setGarmentFile(file)
      setGarmentPreview(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) {
      setGarmentFile(file)
      setGarmentPreview(URL.createObjectURL(file))
    }
  }

  const uploadImageUrl = useCallback(async (url: string): Promise<string> => {
    // If already a hosted URL (not data: or blob:), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    // Convert data URL or blob URL to File, then upload to fal storage
    const resp = await fetch(url)
    const blob = await resp.blob()
    const file = new File([blob], 'image.png', { type: blob.type || 'image/png' })
    return await uploadToFal(file)
  }, [])

  const handleApply = async () => {
    if (!outfitDesc.trim()) {
      addToast('Describe the outfit first', 'error')
      return
    }

    setIsProcessing(true)
    abortRef.current = false

    // Process images sequentially
    for (let i = 0; i < imageUrls.length; i++) {
      if (abortRef.current) break

      setCurrentIndex(i)

      // Mark current as processing
      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'processing' as const } : r
      ))

      try {
        // Upload source image to get a hosted URL
        const hostedUrl = await uploadImageUrl(imageUrls[i])

        // Run outfit change
        const result = await changeOutfit(hostedUrl, outfitDesc.trim())

        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, resultUrl: result.url, status: 'done' as const } : r
        ))
      } catch (err: any) {
        console.error(`Outfit change failed for image ${i + 1}:`, err)
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error' as const, error: err?.message || 'Failed' } : r
        ))
      }
    }

    setIsProcessing(false)
    setCurrentIndex(-1)
    setIsDone(true)
  }

  const handleStop = () => {
    abortRef.current = true
  }

  const handleSaveAll = () => {
    const successResults = results.filter(r => r.status === 'done' && r.resultUrl)
    if (successResults.length === 0) {
      addToast('No results to save', 'info')
      return
    }

    const items = successResults.map(r => ({
      id: crypto.randomUUID(),
      url: r.resultUrl!,
      prompt: `Batch outfit: ${outfitDesc}`,
      model: 'batch-outfit',
      timestamp: Date.now(),
      type: 'edit' as const,
      tags: ['outfit', 'batch'],
    }))

    addItems(items)
    addToast(`${items.length} outfit${items.length > 1 ? 's' : ''} saved to gallery`, 'success')
    onComplete(successResults.map(r => r.resultUrl!))
  }

  const progressPercent = totalCount > 0
    ? Math.round(((doneCount + errorCount) / totalCount) * 100)
    : 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(8,7,12,0.92)', backdropFilter: 'blur(24px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(14,12,20,0.98), rgba(21,18,28,0.98))',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 60px rgba(255,107,157,0.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
              style={{ background: 'rgba(255,107,157,0.1)', color: '#FF6B9D' }}>
              {'\uD83D\uDC57'}
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--joi-text-1)' }}>
                Batch Outfit Change
              </h2>
              <p className="text-[10px]" style={{ color: 'var(--joi-text-3)' }}>
                {totalCount} image{totalCount !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--joi-text-3)' }}
          >
            {'\u2715'}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ maxHeight: 'calc(90vh - 140px)' }}>

          {/* Selected images strip */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
              style={{ color: 'var(--joi-text-3)' }}>
              Selected Photos
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {results.map((r, i) => (
                <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden"
                  style={{
                    border: r.status === 'processing'
                      ? '2px solid #FF6B9D'
                      : r.status === 'done'
                        ? '2px solid #50d8a0'
                        : r.status === 'error'
                          ? '2px solid #e05050'
                          : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <img
                    src={r.resultUrl || r.sourceUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {r.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: '#FF6B9D', borderTopColor: 'transparent' }} />
                    </div>
                  )}
                  {r.status === 'done' && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white"
                      style={{ background: '#50d8a0' }}>
                      {'\u2713'}
                    </div>
                  )}
                  {r.status === 'error' && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white"
                      style={{ background: '#e05050' }}>
                      {'!'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Outfit description */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
              style={{ color: 'var(--joi-text-3)' }}>
              Outfit Description
            </label>
            <input
              type="text"
              value={outfitDesc}
              onChange={e => setOutfitDesc(e.target.value)}
              placeholder="e.g. red evening gown with gold jewelry, black leather jacket with jeans..."
              disabled={isProcessing}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--joi-text-1)',
                opacity: isProcessing ? 0.5 : 1,
              }}
            />
          </div>

          {/* Optional garment reference */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
              style={{ color: 'var(--joi-text-3)' }}>
              Garment Reference <span className="normal-case font-normal">(optional)</span>
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:border-white/15"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px dashed ${garmentPreview ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
                opacity: isProcessing ? 0.5 : 1,
                pointerEvents: isProcessing ? 'none' : 'auto',
              }}
              onClick={() => garmentInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              {garmentPreview ? (
                <>
                  <img src={garmentPreview} alt="Garment" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate" style={{ color: 'var(--joi-text-2)' }}>
                      {garmentFile?.name || 'garment.png'}
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>Click to change</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setGarmentFile(null); setGarmentPreview(null) }}
                    className="text-[10px] px-2 py-1 rounded-lg transition-all"
                    style={{ background: 'rgba(255,60,60,0.1)', color: '#e05050' }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: 'rgba(167,139,250,0.08)', color: '#A78BFA' }}>
                    {'\uD83D\uDC55'}
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: 'var(--joi-text-2)' }}>
                      Upload a garment photo
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--joi-text-3)' }}>
                      Drop or click -- flat lay or worn
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={garmentInputRef}
              type="file"
              accept="image/*"
              onChange={handleGarmentFile}
              className="hidden"
            />
          </div>

          {/* Progress bar (when processing) */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: 'var(--joi-text-2)' }}>
                  Processing {currentIndex + 1}/{totalCount}...
                </span>
                <span className="text-[10px] font-mono" style={{ color: '#FF6B9D' }}>
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(3, progressPercent)}%`,
                    background: 'linear-gradient(90deg, #FF6B9D, #A78BFA)',
                    boxShadow: '0 0 10px rgba(255,107,157,0.4)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Results grid (when done) */}
          {isDone && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--joi-text-3)' }}>
                Results ({doneCount} success{errorCount > 0 ? `, ${errorCount} failed` : ''})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {results.map((r, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-square"
                    style={{
                      border: r.status === 'done'
                        ? '1px solid rgba(80,216,160,0.2)'
                        : '1px solid rgba(255,60,60,0.2)',
                    }}>
                    {r.status === 'done' && r.resultUrl ? (
                      <img src={r.resultUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2"
                        style={{ background: 'rgba(255,60,60,0.04)' }}>
                        <img src={r.sourceUrl} alt="" className="w-full h-full object-cover opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] px-2 py-1 rounded-lg"
                            style={{ background: 'rgba(255,60,60,0.15)', color: '#e05050' }}>
                            {r.error || 'Failed'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 flex items-center gap-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {!isDone ? (
            <>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--joi-text-2)',
                  opacity: isProcessing ? 0.4 : 1,
                }}
              >
                Cancel
              </button>
              <div className="flex-1" />
              {isProcessing ? (
                <button
                  onClick={handleStop}
                  className="px-5 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgba(255,60,60,0.1)',
                    border: '1px solid rgba(255,60,60,0.2)',
                    color: '#e05050',
                  }}
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={!outfitDesc.trim()}
                  className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: outfitDesc.trim()
                      ? 'linear-gradient(135deg, #FF6B9D, #A78BFA)'
                      : 'rgba(255,255,255,0.04)',
                    color: outfitDesc.trim() ? '#fff' : 'var(--joi-text-3)',
                    boxShadow: outfitDesc.trim() ? '0 4px 20px rgba(255,107,157,0.25)' : 'none',
                  }}
                >
                  Apply to All ({totalCount})
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--joi-text-2)',
                }}
              >
                Close
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSaveAll}
                disabled={doneCount === 0}
                className="px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02]"
                style={{
                  background: doneCount > 0
                    ? 'linear-gradient(135deg, #FF6B9D, #A78BFA)'
                    : 'rgba(255,255,255,0.04)',
                  color: doneCount > 0 ? '#fff' : 'var(--joi-text-3)',
                  boxShadow: doneCount > 0 ? '0 4px 20px rgba(255,107,157,0.25)' : 'none',
                }}
              >
                Save All to Gallery ({doneCount})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
