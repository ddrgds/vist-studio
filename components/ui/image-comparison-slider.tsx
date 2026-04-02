import * as React from 'react'

interface ImageComparisonSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  leftImage: string
  rightImage: string
  altLeft?: string
  altRight?: string
  initialPosition?: number
}

export const ImageComparison = React.forwardRef<HTMLDivElement, ImageComparisonSliderProps>(
  ({ className, leftImage, rightImage, altLeft = 'Original', altRight = 'Resultado', initialPosition = 50, ...props }, ref) => {
    const [sliderPosition, setSliderPosition] = React.useState(initialPosition)
    const [isDragging, setIsDragging] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const handleMove = (clientX: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      let newPosition = (x / rect.width) * 100
      newPosition = Math.max(0, Math.min(100, newPosition))
      setSliderPosition(newPosition)
    }

    const handleMouseMove = (e: MouseEvent) => { if (isDragging) handleMove(e.clientX) }
    const handleTouchMove = (e: TouchEvent) => { if (isDragging) handleMove(e.touches[0].clientX) }
    const handleInteractionStart = () => setIsDragging(true)
    const handleInteractionEnd = () => setIsDragging(false)

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('touchmove', handleTouchMove)
        document.addEventListener('mouseup', handleInteractionEnd)
        document.addEventListener('touchend', handleInteractionEnd)
        document.body.style.cursor = 'ew-resize'
      } else {
        document.body.style.cursor = ''
      }
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('mouseup', handleInteractionEnd)
        document.removeEventListener('touchend', handleInteractionEnd)
        document.body.style.cursor = ''
      }
    }, [isDragging])

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none group ${className || ''}`}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        {...props}
      >
        {/* Right image (bottom layer — resultado) */}
        <img src={rightImage} alt={altRight} className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />

        {/* Left image (top layer, clipped — original) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}>
          <img src={leftImage} alt={altLeft} className="w-full h-full object-contain" draggable={false} />
        </div>

        {/* Divider line */}
        <div className="absolute top-0 h-full" style={{ left: `calc(${sliderPosition}% - 1px)`, width: 2, background: 'rgba(255,255,255,0.7)' }} />

        {/* Handle */}
        <div className="absolute top-0 h-full cursor-ew-resize" style={{ left: `calc(${sliderPosition}% - 18px)`, width: 36 }}>
          <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-10 w-10 flex items-center justify-center rounded-full shadow-xl backdrop-blur-md transition-all duration-200 ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}
            style={{ background: 'rgba(255,255,255,0.85)' }}
            role="slider" aria-valuenow={sliderPosition} aria-valuemin={0} aria-valuemax={100} aria-orientation="horizontal" aria-label="Desliza para comparar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-mono pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>ORIGINAL</div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-mono pointer-events-none" style={{ background: '#1A1A1A', color: 'white' }}>RESULTADO</div>
      </div>
    )
  }
)

ImageComparison.displayName = 'ImageComparison'
