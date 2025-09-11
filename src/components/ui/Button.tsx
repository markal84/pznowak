"use client";
import React from "react";

type Variant = "primary" | "secondary" | "tertiary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60 disabled:cursor-not-allowed rounded";

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-lg",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gold text-white hover:brightness-95 dark:text-gray-900",
  secondary:
    "bg-neutral-900 text-white hover:brightness-110 dark:bg-brand-gold dark:text-gray-900",
  tertiary:
    "bg-transparent text-brand-gold hover:bg-brand-gold-light border border-brand-gold/30",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  ...props
}: ButtonProps) {
  const width = fullWidth ? "w-full" : "";
  const radius = "rounded-[8px]"; // enforce 8px regardless of global tokens
  return (
    <button
      className={[base, sizes[size], variants[variant], width, radius, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

