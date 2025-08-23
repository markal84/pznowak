import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  as?: keyof JSX.IntrinsicElements;
  max?: "lg" | "xl" | "2xl" | "7xl";
}

const maxMap = {
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  "7xl": "max-w-7xl",
};

export default function Container({ as = "div", max = "2xl", className = "", ...rest }: Props) {
  const Comp: any = as;
  const maxClass = maxMap[max] || maxMap["2xl"];
  return <Comp className={["mx-auto px-4", maxClass, className].join(" ")} {...(rest as any)} />;
}

