import React from "react";

type MaxKey = "lg" | "xl" | "2xl" | "7xl";

type AsProp<T extends React.ElementType> = {
  as?: T;
  max?: MaxKey;
};

type Props<T extends React.ElementType = 'div'> = AsProp<T> & Omit<React.ComponentPropsWithoutRef<T>, 'as'>;

const maxMap = {
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  "7xl": "max-w-7xl",
};

export default function Container<T extends React.ElementType = 'div'>({ as, max = "2xl", className = "", ...rest }: Props<T>) {
  const Comp = (as || "div") as React.ElementType;
  const maxClass = maxMap[max as MaxKey] || maxMap["2xl"];
  const classes = ["mx-auto px-4", maxClass, className].join(" ");
  return React.createElement(Comp, { className: classes, ...rest } as React.ComponentPropsWithoutRef<T>);
}
