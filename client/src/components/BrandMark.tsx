import type { HTMLAttributes } from "react";

const TRADEFLOW_LOGO_URL = "/manus-storage/tradeflow-logo-master_6392e913.png";

type BrandMarkProps = HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  tone?: "light" | "dark";
};

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

export function BrandMark({ size = "md", showWordmark = true, tone = "dark", className = "", ...props }: BrandMarkProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} {...props}>
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] ${sizeClasses[size]} ${tone === "dark" ? "bg-[#0b1220]" : "bg-white"}`}>
        <img
          src={TRADEFLOW_LOGO_URL}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain p-1"
        />
      </span>
      {showWordmark ? (
        <span className={`font-display text-[1.05rem] font-semibold tracking-[-0.03em] ${tone === "dark" ? "text-[#0b1220]" : "text-white"}`}>
          Trade<span className={tone === "dark" ? "text-[#0f9f92]" : "text-[#49ded0]"}>Flow</span>
        </span>
      ) : null}
    </div>
  );
}

export { TRADEFLOW_LOGO_URL };
