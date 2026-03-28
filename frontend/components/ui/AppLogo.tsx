import Image from "next/image";

interface AppLogoProps {
  size?: "sm" | "md";
  alt?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 rounded-lg",
  md: "w-10 h-10 rounded-xl",
};

const imageSizes = {
  sm: 24,
  md: 30,
};

export function AppLogo({ size = "md", alt = "Forminy logo" }: AppLogoProps) {
  return (
    <div className={`${sizeClasses[size]} bg-white border border-border/60 shadow-sm flex items-center justify-center overflow-hidden`}>
      <Image
        src="/radess.png"
        alt={alt}
        width={imageSizes[size]}
        height={imageSizes[size]}
        className="object-contain"
        priority
      />
    </div>
  );
}
