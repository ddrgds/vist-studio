import React from 'react'

interface LumaSpinProps {
  label?: string
  size?: number
}

export const LumaSpin: React.FC<LumaSpinProps> = ({ label, size = 48 }) => {
  const half = Math.round(size / 2)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <span
          className="absolute rounded-[50px]"
          style={{
            animation: 'loaderAnim 2.5s infinite',
            boxShadow: 'inset 0 0 0 3px currentColor',
            color: 'var(--joi-text-3, #999)',
          }}
        />
        <span
          className="absolute rounded-[50px]"
          style={{
            animation: 'loaderAnim 2.5s infinite',
            animationDelay: '-1.25s',
            boxShadow: 'inset 0 0 0 3px currentColor',
            color: 'var(--joi-text-3, #999)',
          }}
        />
        <style>{`
          @keyframes loaderAnim {
            0%     { inset: 0 ${half}px ${half}px 0; }
            12.5%  { inset: 0 ${half}px 0 0; }
            25%    { inset: ${half}px ${half}px 0 0; }
            37.5%  { inset: ${half}px 0 0 0; }
            50%    { inset: ${half}px 0 0 ${half}px; }
            62.5%  { inset: 0 0 0 ${half}px; }
            75%    { inset: 0 0 ${half}px ${half}px; }
            87.5%  { inset: 0 0 ${half}px 0; }
            100%   { inset: 0 ${half}px ${half}px 0; }
          }
        `}</style>
      </div>
      {label && (
        <span className="text-[12px] font-medium animate-pulse" style={{ color: 'var(--joi-text-3, #999)' }}>
          {label}
        </span>
      )}
    </div>
  )
}

export default LumaSpin
