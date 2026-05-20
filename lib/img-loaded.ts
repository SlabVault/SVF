import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export function isImageAlreadyLoaded(img: HTMLImageElement | null): boolean {
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Tracks img load/error; handles cache + hydration races where onLoad is missed. */
export function useLoadedImage(src: string) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  const syncFromImg = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    if (isImageAlreadyLoaded(img)) {
      setLoaded(true);
      setError(false);
    }
  }, []);

  useLayoutEffect(() => {
    syncFromImg();
  }, [src, syncFromImg]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const onLoad = () => {
      setLoaded(true);
      setError(false);
    };
    const onError = () => {
      setError(true);
      setLoaded(false);
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    syncFromImg();

    const poll = window.setInterval(syncFromImg, 200);
    const stopPoll = window.setTimeout(() => window.clearInterval(poll), 30_000);

    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
    };
  }, [src, syncFromImg]);

  const setImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node) syncFromImg();
    },
    [syncFromImg],
  );

  return {
    imgRef: setImgRef,
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
