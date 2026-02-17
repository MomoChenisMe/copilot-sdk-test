import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightbox } from '../../../src/components/shared/ImageLightbox';

describe('ImageLightbox', () => {
  const images = [
    { src: 'https://example.com/img1.jpg', alt: 'Image 1' },
    { src: 'https://example.com/img2.png', alt: 'Image 2' },
    { src: 'https://example.com/img3.webp', alt: 'Image 3' },
  ];

  const defaultProps = {
    images,
    currentIndex: 0,
    onClose: vi.fn(),
  };

  it('renders the lightbox overlay when open', () => {
    render(<ImageLightbox {...defaultProps} />);
    expect(screen.getByTestId('lightbox-overlay')).toBeTruthy();
  });

  it('displays the current image', () => {
    render(<ImageLightbox {...defaultProps} />);
    const img = screen.getByTestId('lightbox-image') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img1.jpg');
    expect(img.alt).toBe('Image 1');
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('lightbox-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when clicking the image itself', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('lightbox-image'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when pressing Escape', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to the next image when clicking next button', () => {
    render(<ImageLightbox {...defaultProps} />);
    fireEvent.click(screen.getByTestId('lightbox-next'));
    const img = screen.getByTestId('lightbox-image') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img2.png');
  });

  it('navigates to the previous image when clicking prev button', () => {
    render(<ImageLightbox {...defaultProps} currentIndex={1} />);
    fireEvent.click(screen.getByTestId('lightbox-prev'));
    const img = screen.getByTestId('lightbox-image') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img1.jpg');
  });

  it('wraps around to first image when pressing next on last image', () => {
    render(<ImageLightbox {...defaultProps} currentIndex={2} />);
    fireEvent.click(screen.getByTestId('lightbox-next'));
    const img = screen.getByTestId('lightbox-image') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img1.jpg');
  });

  it('hides navigation buttons when only one image', () => {
    render(<ImageLightbox images={[images[0]]} currentIndex={0} onClose={vi.fn()} />);
    expect(screen.queryByTestId('lightbox-prev')).toBeNull();
    expect(screen.queryByTestId('lightbox-next')).toBeNull();
  });

  it('shows image counter (e.g. "1 / 3")', () => {
    render(<ImageLightbox {...defaultProps} />);
    expect(screen.getByTestId('lightbox-counter').textContent).toBe('1 / 3');
  });

  it('has a close button', () => {
    const onClose = vi.fn();
    render(<ImageLightbox {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('lightbox-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has a download button', () => {
    render(<ImageLightbox {...defaultProps} />);
    const downloadBtn = screen.getByTestId('lightbox-download');
    expect(downloadBtn).toBeTruthy();
  });

  it('cycles zoom level when clicking zoom button', () => {
    render(<ImageLightbox {...defaultProps} />);
    const img = screen.getByTestId('lightbox-image');
    // Default: fit
    expect(img.className).toContain('max-h');
    // Click zoom once
    fireEvent.click(screen.getByTestId('lightbox-zoom'));
    // Should scale up
  });
});
