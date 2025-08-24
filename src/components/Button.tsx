import React from 'react'
import Link from 'next/link'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  href?: string
  as?: 'button' | 'link'
  className?: string
  variant?: 'primary' | 'secondary'
}

/**
 * Uniwersalny przycisk zgodny ze stylem strony głównej.
 * variant="primary" = ciemny (domyślny jak na stronie głównej),
 * variant="secondary" = jasny (np. do formularza kontaktowego)
 */
const Button: React.FC<ButtonProps> = ({
  children,
  href,
  as = 'button',
  className = '',
  variant = 'primary',
  ...rest
}) => {
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
      <Link href={href} className={classes} {...(rest as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}

export default Button
