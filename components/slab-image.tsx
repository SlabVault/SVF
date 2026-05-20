"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function SlabImage({ src, alt, className }: Props) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-vault-deep/50 ${className}`}>
        <span className="text-sm text-muted">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-vault-deep/50">
          <div className="h-8 w-8 animate-pulse rounded-full bg-vault-violet/30" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from JSON */}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${imageLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
}
