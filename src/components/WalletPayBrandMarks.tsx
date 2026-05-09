/** Apple Pay + Google Pay marks above Stripe Payment Element (decorative). */

export function WalletPayBrandMarks() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-start gap-3" aria-label="Apple Pay and Google Pay">
      <ApplePayMark />
      <GooglePayMark />
    </div>
  )
}

function ApplePayMark() {
  return (
    <svg width={152} height={44} viewBox="0 0 152 44" className="shrink-0" role="img" aria-hidden>
      <title>Apple Pay</title>
      <rect width="152" height="44" rx="10" fill="#000" />
      {/* Apple glyph (standard compact path) */}
      <g transform="translate(11 8) scale(1.02)">
        <path
          fill="#fff"
          d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.76 4.09-.03.07-.43 1.54-1.49 3.02M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
        />
      </g>
      <text
        x="104"
        y="29"
        fill="#fff"
        fontSize="18"
        fontWeight="600"
        fontFamily="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      >
        Pay
      </text>
    </svg>
  )
}

function GooglePayMark() {
  return (
    <svg width={174} height={44} viewBox="0 0 174 44" className="shrink-0" role="img" aria-hidden>
      <title>Google Pay</title>
      <rect width="174" height="44" rx="10" fill="#fff" stroke="#dadce0" />
      {/* Multicolor Google G (classic 48px paths, scaled / translated) */}
      <g transform="translate(13 11) scale(22/48)">
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303C33.653 31.557 29.087 34 24 34c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.157 7.957 3.035l6.849-6.849C34.047 8.097 29.279 6 24 6 13.954 6 6 13.954 6 24s8.954 18 18 18c9.074 0 16.596-7.086 17.986-15.957L43.611 20.083z"
        />
        <path
          fill="#FF3D00"
          d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.157 7.957 3.036l6.849-6.849C34.046 8.097 29.278 6 24 6c-6.682 0-12.344 4.337-15.694 10.691z"
        />
        <path fill="#4CAF50" d="M24 42c5.164 0 9.867-1.976 13.397-5.219l-6.223-5.274C29.217 34.086 26.716 36 24 36c-5.227 0-9.682-3.519-11.348-8.347l-6.531 5.066C9.674 41.056 16.454 42 24 42z" />
        <path
          fill="#1976D2"
          d="M43.611 24.087c-.15-1.05-.387-2.086-.734-3.086H24v8h11.069c-.38 2.086-1.434 4.069-3.069 5.594l-.003-.002 6.223 5.274C43.086 41.086 43.611 32.957 43.611 24.087z"
        />
      </g>
      <text
        x="52"
        y="29"
        fill="#5f6368"
        fontSize="16"
        fontWeight="600"
        fontFamily="Roboto,system-ui,sans-serif"
        letterSpacing="-0.02em"
      >
        Google
      </text>
      <text x="117" y="29" fill="#202124" fontSize="18" fontWeight="600" fontFamily="Roboto,system-ui,sans-serif">
        Pay
      </text>
    </svg>
  )
}
