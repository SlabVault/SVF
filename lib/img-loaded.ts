import { useCallback, useState } from "react";

export function isImageAlreadyLoaded(img: HTMLImageElement | null): boolean {
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Tracks img load/error; handles cache + hydration races where onLoad is missed. */
export function useLoadedImage() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node && isImageAlreadyLoaded(node)) {
      setLoaded(true);
      setError(false);
    }
  }, []);

  return {
    imgRef,
    loaded,
    error,
    onLoad: () => {
      setLoaded(true);
      setError(false);
    },
    onError: () => {
      setError(true);
      setLoaded(false);
    },
  };
}
