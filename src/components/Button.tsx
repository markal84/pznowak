import React from 'react'
import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'outline' | 'light'
type Size = 'md' | 'lg'

type CommonProps = {
  children: React.ReactNode
  className?: string
  variant?: Variant
  size?: Size
}

type LinkButtonProps = CommonProps & { as: 'link'; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>
type NativeButtonProps = CommonProps & { as?: 'button'; href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>

export type ButtonProps = LinkButtonProps | NativeButtonProps

const base =
  'inline-flex items-center justify-center gap-2 rounded font-semibold tracking-wide whitespace-nowrap transition-[background-color,color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

const sizes: Record<Size, string> = {
  md: 'h-12 px-6 text-[15px]',
  lg: 'h-14 px-8 text-base',
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-ivory hover:bg-graphite-2 shadow-md',
  secondary: 'bg-gold text-ivory hover:bg-[#8f651a] shadow-md',
  outline: 'bg-transparent text-ink border border-line-strong hover:border-gold hover:text-gold',
  light: 'bg-ivory text-ink hover:bg-white shadow-md',
}

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ children, href, as = 'button', className = '', variant = 'primary', size = 'md', ...rest }, ref) => {
    const classes = [base, sizes[size], variants[variant], className].filter(Boolean).join(' ')
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
  },
)
Button.displayName = 'Button'
export default Button
