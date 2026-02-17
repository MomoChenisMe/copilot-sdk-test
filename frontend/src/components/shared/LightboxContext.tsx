import { createContext, useContext, useState, useCallback } from 'react';
import { ImageLightbox } from './ImageLightbox';
import type { LightboxImage } from './ImageLightbox';

interface LightboxContextValue {
  openLightbox: (images: LightboxImage[], startIndex?: number) => void;
}

const LightboxContext = createContext<LightboxContextValue>({
  openLightbox: () => {},
});

export function useLightbox() {
  return useContext(LightboxContext);
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const openLightbox = useCallback((images: LightboxImage[], startIndex = 0) => {
    setState({ images, index: startIndex });
  }, []);

  const closeLightbox = useCallback(() => {
    setState(null);
  }, []);

  return (
    <LightboxContext.Provider value={{ openLightbox }}>
      {children}
      {state && (
        <ImageLightbox
          images={state.images}
          currentIndex={state.index}
          onClose={closeLightbox}
        />
      )}
    </LightboxContext.Provider>
  );
}
