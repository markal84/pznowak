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
    'inline-block transition-colors duration-300 rounded-sm font-bold px-6 py-2 text-base shadow-lg';
  const variants = {
    primary:
      'bg-gray-800 text-white hover:text-[#BFA181] hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200',
    secondary: 
      'border-2 border-brand-gold text-brand-gold hover:bg-brand-gold/10 dark:hover:bg-gray-800',
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
