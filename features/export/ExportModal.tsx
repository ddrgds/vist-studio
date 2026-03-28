import React, { useState } from 'react';
import { exportForFormat } from '../../utils/smartExport';

interface ExportModalProps {
  imageUrl: string;
  onClose: () => void;
}

interface Preset {
  id: string;
  icon: string;
  label: string;
  dimensions: string;
  ratio: string;
  formatKey: string;
}

const presets: Preset[] = [
  { id: 'instagram-post', icon: '\uD83D\uDCF8', label: 'Instagram Post', dimensions: '1080 x 1350', ratio: '4:5', formatKey: 'ig-post' },
  { id: 'instagram-story', icon: '\uD83D\uDCF1', label: 'Instagram Story', dimensions: '1080 x 1920', ratio: '9:16', formatKey: 'ig-story' },
  { id: 'tiktok-reel', icon: '\uD83C\uDFAC', label: 'TikTok / Reel', dimensions: '1080 x 1920', ratio: '9:16', formatKey: 'tiktok' },
  { id: 'youtube-thumb', icon: '\uD83D\uDDA5\uFE0F', label: 'YouTube Thumbnail', dimensions: '1280 x 720', ratio: '16:9', formatKey: 'youtube' },
  { id: 'twitter-x', icon: '\uD83D\uDC26', label: 'Twitter / X', dimensions: '1600 x 900', ratio: '16:9', formatKey: 'twitter' },
  { id: 'square', icon: '\uD83D\uDCD0', label: 'Square', dimensions: '1080 x 1080', ratio: '1:1', formatKey: 'square' },
  { id: 'original', icon: '\uD83D\uDCBE', label: 'Original', dimensions: 'Full resolution', ratio: 'as-is', formatKey: 'original' },
];

const ExportModal: React.FC<ExportModalProps> = ({ imageUrl, onClose }) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (preset: Preset) => {
    setExporting(preset.id);
    try {
      const blob = await exportForFormat(imageUrl, preset.formatKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vist-${preset.formatKey}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(8,7,12,0.95)',
        backdropFilter: 'blur(20px)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 32,
          maxWidth: 900,
          width: '90vw',
          maxHeight: '85vh',
          padding: 32,
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.04)',
            color: '#A898B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 18,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
            e.currentTarget.style.color = '#6366F1';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#A898B8';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}
        >
          ✕
        </button>

        {/* Image preview */}
        <div
          style={{
            flex: '0 0 340px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h2 style={{ color: '#F0EAF4', fontSize: 20, fontWeight: 600, margin: 0 }}>
            Export Image
          </h2>
          <p style={{ color: '#685880', fontSize: 13, margin: 0 }}>
            Choose a format optimized for your platform
          </p>
          <div
            style={{
              marginTop: 8,
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <img
              src={imageUrl}
              alt="Export preview"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 400,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Presets grid */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
            paddingTop: 44,
          }}
        >
          {presets.map((preset) => {
            const isActive = exporting === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleExport(preset)}
                disabled={exporting !== null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.04)',
                  background: isActive
                    ? 'rgba(99,102,241,0.10)'
                    : 'rgba(255,255,255,0.02)',
                  cursor: exporting ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: exporting && !isActive ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!exporting) {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  }
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{preset.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#F0EAF4', fontSize: 14, fontWeight: 500 }}>
                    {preset.label}
                  </div>
                  <div style={{ color: '#685880', fontSize: 12, marginTop: 2 }}>
                    {preset.dimensions}
                    {preset.ratio !== 'as-is' && (
                      <span style={{ color: '#A898B8', marginLeft: 8 }}>({preset.ratio})</span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    color: '#685880',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isActive ? (
                    <span style={{ color: '#6366F1' }}>Exporting...</span>
                  ) : (
                    <span style={{ color: '#A898B8', fontSize: 16 }}>↓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
