import { Caveat } from "next/font/google";

const caveat = Caveat({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

interface HeroTextProps {
  className?: string;
  headlineStart?: string;
  highlightPhrase?: string;
  headlineEnd?: string;
  supportStart?: string;
  supportEmphasis?: string;
}

export function HeroText({
  className = "",
  headlineStart = "Le meilleur espace pour",
  highlightPhrase = "une plateforme",
  headlineEnd = "de formation continue",
  supportStart = "Simple, efficace, et",
  supportEmphasis = "abordable !",
}: HeroTextProps) {
  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <h1
        className={`heading-display ${caveat.className} text-[clamp(2.3rem,7.2vw,5.6rem)] leading-[0.96] tracking-[-0.01em] text-slate-900 dark:text-white`}
      >
        <span className="block">{headlineStart}</span>
        <span className="block mt-1">
          <span className="relative inline-block px-4 py-1.5 sm:px-5 sm:py-2">
            {/* Two imperfect brush layers for an organic highlight look */}
            <span
              aria-hidden
              className="absolute left-0 right-0 top-[53%] h-[60%] -translate-y-1/2 rounded-[14px] bg-amber-400/95 -rotate-[1.8deg]"
            />
            <span
              aria-hidden
              className="absolute left-1 right-2 top-[58%] h-[56%] -translate-y-1/2 rounded-[15px] bg-amber-300/85 rotate-[1.2deg]"
            />
            <span className="relative z-10">{highlightPhrase}</span>
          </span>
        </span>
        <span className="block">{headlineEnd}</span>
      </h1>

      {(supportStart || supportEmphasis) && (
        <p
          className={`${caveat.className} text-[clamp(1.7rem,4.6vw,3.3rem)] leading-[1.05] text-slate-900 dark:text-slate-100`}
        >
          <span>{supportStart} </span>
          <span className="relative inline-block px-1.5">
            <span className="relative z-10">{supportEmphasis}</span>
            <span
              aria-hidden
              className="absolute left-0 right-0 bottom-[8%] h-[0.28em] rounded-full bg-sky-300/80 -rotate-[1.4deg]"
            />
            <span
              aria-hidden
              className="absolute left-[8%] right-[5%] bottom-[4%] h-[0.18em] rounded-full bg-sky-200/75 rotate-[0.9deg]"
            />
          </span>
        </p>
      )}
    </div>
  );
}
