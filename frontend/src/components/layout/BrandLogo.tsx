type BrandLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export function BrandLogo({
  size = 36,
  className = 'h-9 w-9 rounded-lg object-contain',
  alt = 'Ledger',
}: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
