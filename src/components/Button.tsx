import React from 'react'
import Link from 'next/link'

type CommonProps = {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

type LinkButtonProps = CommonProps & {
  as?: 'link'
  href: string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>

type NativeButtonProps = CommonProps & {
  as?: 'button'
  href?: never
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export type ButtonProps = LinkButtonProps | NativeButtonProps

/**
 * Przycisk w stylu atelier: wersaliki, szeroki tracking, ostre krawędzie.
 * primary = atrament (na noir: złoto), secondary/outline = obrys hairline.
 */
const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(({
  children,
  href,
  as = 'button',
  className = '',
  variant = 'primary',
  ...rest
}, ref) => {
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-outline'
  const classes = `btn ${variantClass} ${className}`

  if (as === 'link' && href) {
    return (
      <Link href={href} className={classes} ref={ref as React.Ref<HTMLAnchorElement>} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    )
  }
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
