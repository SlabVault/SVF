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
  const { imgRef, loaded, error, onLoad, onError } = useLoadedImage();

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-vault-deep/50 ${className}`}>
        <span className="text-sm text-muted">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-vault-deep/50">
          <div className="h-8 w-8 animate-pulse rounded-full bg-vault-violet/30" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from JSON */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
}

export function SlabImage(props: Props) {
  return <SlabImageInner key={props.src} {...props} />;
}
