import React from "react";

interface Props {
  eyebrow?: string;
  title: string;
  center?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'text-3xl md:text-4xl',
  md: 'text-4xl md:text-5xl',
  lg: 'text-5xl md:text-6xl',
} as const

export default function SectionTitle({ eyebrow, title, center, className = "", size = 'md' }: Props) {
  return (
    <div className={[center ? "text-center" : "", className].join(" ")}>
      {eyebrow && (
        <div className={["eyebrow mb-4", center ? "" : "eyebrow--rule"].join(" ")}>{eyebrow}</div>
      )}
      <h2 className={["display-title", sizeMap[size]].join(' ')}>{title}</h2>
    </div>
  );
}
