/**
 * SECTION WRAPPER
 * Premium vertical spacing system
 * - Consistent editorial rhythm
 * - Optional divider
 * - Optional subtle background
 * - Accepts native <section> props (id, style, aria, etc)
 */

import clsx from "clsx"
import { HTMLAttributes } from "react"

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  noBorder?: boolean
  subtleBg?: boolean
}

export default function Section({
  children,
  noBorder = false,
  subtleBg = false,
  className,
  ...rest
}: SectionProps) {
  return (
    <section
      {...rest}
      className={clsx(
        "py-[10rem]",
        !noBorder && "border-t border-white/[0.06]",
        subtleBg && "bg-white/[0.012]",
        className
      )}
    >
      {children}
    </section>
  )
}