import React from "react";

interface Props {
  eyebrow?: string;
  title: string;
  center?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
} as const

export default function SectionTitle({ eyebrow, title, center, className = "", size = 'md' }: Props) {
  return (
    <div className={[center ? "text-center" : "", className].join(" ")}> 
      {eyebrow && (
        <div className="text-sm tracking-widest uppercase text-brand-gold/90 mb-2">{eyebrow}</div>
      )}
      <h2 className={["font-display leading-tight text-gray-900 dark:text-white", sizeMap[size]].join(' ')}>{title}</h2>
    </div>
  );
}
