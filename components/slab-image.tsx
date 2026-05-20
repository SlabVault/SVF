"use client";

import { useLoadedImage } from "@/lib/img-loaded";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Above-the-fold hero images should load eagerly. */
  priority?: boolean;
};

function SlabImageInner({ src, alt, className, priority = false }: Props) {
  const { imgRef, loaded, error, onLoad, onError } = useLoadedImage(src);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-vault-deep/50 ${className}`}>
        <span className="text-sm text-muted">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Vollector/Arweave URLs */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={onLoad}
        onError={onError}
      />
      {!loaded && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-vault-deep/50"
          aria-hidden
        >
          <div className="h-8 w-8 animate-pulse rounded-full bg-vault-violet/30" />
        </div>
      )}
    </div>
  );
}

export function SlabImage(props: Props) {
  return <SlabImageInner key={props.src} {...props} />;
}
