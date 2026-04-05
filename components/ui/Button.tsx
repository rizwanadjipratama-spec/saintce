"use client"

import clsx from "clsx"
import { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: "primary" | "ghost"
}

export default function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "saintce-button",
        variant === "ghost" && "saintce-button--ghost",
        className
      )}
    >
      {children}
    </button>
  )
}
