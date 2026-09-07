import React from 'react'

interface Props {
  eyebrow?: string
  title: string
  lead?: string
  center?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  as?: 'h1' | 'h2'
}

const sizeMap = {
  sm: 'text-[1.9rem] md:text-[2.4rem]',
  md: 'text-[2.3rem] md:text-[3rem]',
  lg: 'text-[2.6rem] md:text-[3.6rem]',
} as const

export default function SectionTitle({ eyebrow, title, lead, center, className = '', size = 'md', as = 'h2' }: Props) {
  const Tag = as
  return (
    <div className={[center ? 'text-center mx-auto' : '', 'max-w-3xl reveal', className].join(' ')}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <Tag className={sizeMap[size]}>{title}</Tag>
      {lead && <p className="mt-4 text-lg muted leading-relaxed max-w-2xl">{lead}</p>}
    </div>
  )
}
