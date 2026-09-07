import React, { ElementType, ComponentPropsWithoutRef } from 'react'

type Props<T extends ElementType = 'div'> = {
  as?: T
  className?: string
  narrow?: boolean
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>

export default function Container<T extends ElementType = 'div'>({ as, className = '', narrow, ...rest }: Props<T>) {
  const Comp = (as || 'div') as ElementType
  return <Comp className={['container-x', narrow ? 'max-w-4xl' : '', className].filter(Boolean).join(' ')} {...(rest as ComponentPropsWithoutRef<T>)} />
}
