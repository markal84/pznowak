import React, { ElementType, ComponentPropsWithoutRef } from "react";

type MaxKey = "lg" | "xl" | "2xl" | "7xl";

type Props<T extends ElementType = 'div'> = {
  as?: T;
  max?: MaxKey;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const maxMap = {
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  "7xl": "max-w-7xl",
};

export default function Container<T extends ElementType = 'div'>({ as, max = "2xl", className = "", ...rest }: Props<T>) {
  const Comp = (as || "div") as ElementType;
  const maxClass = maxMap[max as MaxKey] || maxMap["2xl"];
  const classes = ["mx-auto px-4", maxClass, className].filter(Boolean).join(" ");
  return <Comp className={classes} {...(rest as ComponentPropsWithoutRef<T>)} />;
}
