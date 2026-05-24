type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Above-the-fold hero images should load eagerly. */
  priority?: boolean;
  /** Optional hint for image decoding behavior. */
  decoding?: "sync" | "async" | "auto";
};

export function SlabImage({
  src,
  alt,
  className,
  priority = false,
  decoding = "async",
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic Vollector/Arweave URLs
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className ?? ""}`.trim()}
      loading={priority ? "eager" : "lazy"}
      decoding={decoding}
      referrerPolicy="no-referrer"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
