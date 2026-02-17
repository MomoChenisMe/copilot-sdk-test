import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn } from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  onClose: () => void;
}

const ZOOM_LEVELS = ['fit', '150', '200'] as const;

export function ImageLightbox({ images, currentIndex: initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(0); // index into ZOOM_LEVELS

  const current = images[index];

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const cycleZoom = useCallback(() => {
    setZoomLevel((prev) => (prev + 1) % ZOOM_LEVELS.length);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          if (images.length > 1) goNext();
          break;
        case 'ArrowLeft':
          if (images.length > 1) goPrev();
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev, images.length]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const zoomClass = ZOOM_LEVELS[zoomLevel] === 'fit'
    ? 'max-h-[85vh] max-w-[90vw] object-contain'
    : ZOOM_LEVELS[zoomLevel] === '150'
      ? 'scale-150 origin-center'
      : 'scale-200 origin-center';

  return (
    <div
      data-testid="lightbox-overlay"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Top bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span data-testid="lightbox-counter" className="text-white/70 text-sm">
          {index + 1} / {images.length}
        </span>
        <button
          data-testid="lightbox-zoom"
          onClick={cycleZoom}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Zoom"
        >
          <ZoomIn size={18} />
        </button>
        <a
          data-testid="lightbox-download"
          href={current.src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Download"
        >
          <Download size={18} />
        </a>
        <button
          data-testid="lightbox-close"
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            data-testid="lightbox-prev"
            onClick={goPrev}
            className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            data-testid="lightbox-next"
            onClick={goNext}
            className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Image */}
      <img
        data-testid="lightbox-image"
        src={current.src}
        alt={current.alt || ''}
        className={`select-none transition-transform duration-200 ${zoomClass}`}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}
