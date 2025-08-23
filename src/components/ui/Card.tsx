import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ hover = true, className = "", ...rest }: Props) {
  return (
    <div
      className={[
        "bg-white dark:bg-gray-900 rounded-[8px] shadow-sm",
        hover ? "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md" : "",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

