import React from "react";

interface Props {
  eyebrow?: string;
  title: string;
  center?: boolean;
  className?: string;
}

export default function SectionTitle({ eyebrow, title, center, className = "" }: Props) {
  return (
    <div className={[center ? "text-center" : "", className].join(" ")}> 
      {eyebrow && (
        <div className="text-sm tracking-widest uppercase text-brand-gold/90 mb-2">{eyebrow}</div>
      )}
      <h2 className="font-display text-3xl md:text-4xl leading-tight text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

