interface LogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export function Logo({ size = 32, showWordmark = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Direction B : lentille / losange arrondi */}
        <path
          d="M16 3C16 3 27 10 27 16C27 22 16 29 16 29C16 29 5 22 5 16C5 10 16 3 16 3Z"
          fill="var(--color-accent-default)"
          stroke="none"
        />
        <path
          d="M16 9C16 9 22 12.5 22 16C22 19.5 16 23 16 23C16 23 10 19.5 10 16C10 12.5 16 9 16 9Z"
          fill="var(--color-accent-text)"
          opacity="0.9"
        />
        <circle
          cx="16"
          cy="16"
          r="3"
          fill="var(--color-accent-default)"
        />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "17px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
          }}
        >
          Clearvio
        </span>
      )}
    </div>
  )
}
