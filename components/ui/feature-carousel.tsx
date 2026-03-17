import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
interface HeroCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle: string;
  images: { src: string; alt: string }[];
  onCtaClick?: () => void;
  ctaLabel?: string;
}

// --- 3D CAROUSEL HERO ---
export const HeroCarousel = React.forwardRef<HTMLDivElement, HeroCarouselProps>(
  ({ title, subtitle, images, onCtaClick, ctaLabel = 'Start Creating Now', className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(images.length / 2));

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = () => {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    React.useEffect(() => {
      const timer = setInterval(handleNext, 4000);
      return () => clearInterval(timer);
    }, [handleNext]);

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden p-4',
          className
        )}
        style={{ background: '#08070C', color: '#F0EAF4' }}
        {...props}
      >
        {/* Background glows */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute rounded-full"
            style={{
              bottom: '10%', left: '-10%', width: '500px', height: '500px',
              background: 'radial-gradient(circle, rgba(255,107,157,0.15), transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: '-5%', right: '-10%', width: '500px', height: '500px',
              background: 'radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        {/* Content */}
        <div className="z-10 flex w-full flex-col items-center text-center space-y-8 md:space-y-12 max-w-[1200px]">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter max-w-4xl leading-[1.05]">
              {title}
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl" style={{ color: '#A09299' }}>
              {subtitle}
            </p>
          </div>

          {/* CTA */}
          {onCtaClick && (
            <button
              onClick={onCtaClick}
              className="rounded-full text-lg font-bold transition-all duration-200 hover:scale-105"
              style={{
                background: '#FF6B9D',
                color: '#08070C',
                padding: '0 32px',
                height: '56px',
                boxShadow: '0 0 20px rgba(255,107,157,0.5)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {ctaLabel}
            </button>
          )}

          {/* 3D Carousel */}
          <div className="relative w-full h-[380px] md:h-[480px] flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1000px' }}>
              {images.map((image, index) => {
                const offset = index - currentIndex;
                const total = images.length;
                let pos = (offset + total) % total;
                if (pos > Math.floor(total / 2)) {
                  pos = pos - total;
                }

                const isCenter = pos === 0;
                const isAdjacent = Math.abs(pos) === 1;

                return (
                  <div
                    key={index}
                    className="absolute transition-all duration-500 ease-in-out flex items-center justify-center"
                    style={{
                      width: 'clamp(200px, 25vw, 280px)',
                      height: 'clamp(320px, 45vw, 480px)',
                      transform: `
                        translateX(${pos * 50}%)
                        scale(${isCenter ? 1 : isAdjacent ? 0.82 : 0.65})
                        rotateY(${pos * -12}deg)
                      `,
                      zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                      opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                      filter: isCenter ? 'none' : 'blur(4px)',
                      visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                    }}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="object-cover w-full h-full rounded-3xl shadow-2xl"
                      style={{
                        border: isCenter ? '2px solid rgba(255,107,157,0.3)' : '2px solid rgba(255,255,255,0.06)',
                        boxShadow: isCenter
                          ? '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(255,107,157,0.15)'
                          : '0 15px 40px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Nav buttons */}
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 z-20 rounded-full w-10 h-10 flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: 'rgba(8,7,12,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F0EAF4',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 z-20 rounded-full w-10 h-10 flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: 'rgba(8,7,12,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F0EAF4',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Dots */}
          <div className="flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentIndex ? '24px' : '8px',
                  height: '8px',
                  background: i === currentIndex ? '#FF6B9D' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

HeroCarousel.displayName = 'HeroCarousel';
