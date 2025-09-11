import React from 'react'
import Link from 'next/link'

type CommonProps = {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary'
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
 * Uniwersalny przycisk zgodny ze stylem strony głównej.
 * variant="primary" = ciemny (domyślny jak na stronie głównej),
 * variant="secondary" = jasny (np. do formularza kontaktowego)
 */
const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(({ 
  children,
  href,
  as = 'button',
  className = '',
  variant = 'primary',
  ...rest
}, ref) => {
  const base =
    'inline-flex items-center justify-center transition-colors duration-300 rounded-[8px] font-bold px-6 py-2 text-base shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60';
  const variants = {
    primary:
      'bg-neutral-900 text-white hover:bg-neutral-800 hover:text-brand-gold-soft dark:bg-white dark:text-neutral-900 dark:hover:bg-gray-200',
    secondary:
      'bg-white text-neutral-900 hover:text-brand-gold-soft hover:bg-gray-100 dark:bg-neutral-900 dark:text-white dark:hover:text-brand-gold-soft dark:hover:bg-gray-800',
  }
  const classes = `${base} ${variants[variant]} ${className}`

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
