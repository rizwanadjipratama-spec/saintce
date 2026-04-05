/**
 * CONTAINER
 * Ultra clean layout wrapper
 * - Consistent max width (1400px)
 * - Editorial side padding
 * - Fully responsive
 */

interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export default function Container({
  children,
  className = "",
}: ContainerProps) {
  return (
    <div
      className={`
        w-full
        max-w-[1400px]
        mx-auto
        px-6
        md:px-10
        lg:px-12
        ${className}
      `}
    >
      {children}
    </div>
  )
}