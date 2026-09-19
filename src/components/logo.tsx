import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  variant?: "dark" | "light";
  width?: number;
  height?: number;
  className?: string;
};

export default function Logo({
  variant = "dark",
  width = 120,
  height = 32,
  className,
}: LogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt="Kassa"
      width={width}
      height={height}
      unoptimized
      priority
      style={{ width: "auto", height }}
    />
  );

  return (
    <Link href="/" aria-label="Kassa home" className={className}>
      {variant === "light" ? (
        <span className="inline-block rounded-md bg-white px-3 py-2">
          {image}
        </span>
      ) : (
        image
      )}
    </Link>
  );
}