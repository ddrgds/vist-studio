import React from 'react'
import type { Page } from '../App'

interface PipelineCTAProps {
  label: string
  targetPage: Page
  onNav: (page: Page) => void
  icon?: string
}

export function PipelineCTA({ label, targetPage, onNav, icon }: PipelineCTAProps) {
  return (
    <button
      onClick={() => onNav(targetPage)}
      className="w-full mt-4 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all group"
      style={{
        background: 'linear-gradient(135deg, rgba(240,104,72,.1), rgba(79,70,229,.1))',
        border: '1px solid rgba(240,104,72,.2)',
      }}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span className="text-[12px] font-medium" style={{ color: 'var(--joi-pink)' }}>
        {label}
      </span>
      <span className="text-[14px] ml-1 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--joi-pink)' }}>
        →
      </span>
    </button>
  )
}
