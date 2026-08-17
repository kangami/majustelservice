const paths = {
  laptop: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20M6 20l1-4h10l1 4" />
    </>
  ),
  mouse: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <path d="M12 7v4" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2" y="7" width="20" height="12" rx="2" />
      <path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01M7 15h10" />
    </>
  ),
  dock: (
    <>
      <rect x="2" y="9" width="20" height="7" rx="2" />
      <path d="M6 12.5h.01M10 12.5h.01M14 12.5h4M8 5v4M16 5v4" />
    </>
  ),
  bag: (
    <>
      <rect x="4" y="7" width="16" height="14" rx="3" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2M4 12h16" />
    </>
  ),
  ssd: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 10h8M8 14h5M4 9h-2M4 15h-2M22 9h-2M22 15h-2" />
    </>
  ),
  ram: (
    <>
      <rect x="2" y="8" width="20" height="8" rx="1" />
      <path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 11h2M11 11h2M16 11h2" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c0-3-1.5-5-4-5s-3 3-1 4.5S12 12 12 10zM14 12c3 0 5-1.5 5-4s-3-3-4.5-1S14 12 14 12zM12 14c0 3 1.5 5 4 5s3-3 1-4.5S12 12 12 14zM10 12c-3 0-5 1.5-5 4s3 3 4.5 1S10 12 10 12z" />
    </>
  ),
  charger: (
    <>
      <rect x="6" y="8" width="12" height="13" rx="3" />
      <path d="M10 8V3M14 8V3M12 12v5M10 15h4" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  webcam: (
    <>
      <circle cx="12" cy="10" r="7" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 20l4-3 4 3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  screen: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20M7 8l4 4M13 6l4 4" />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  os: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M6 6h.01M9 6h.01" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 11h10L20 8H6.2" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z" />
    </>
  ),
  truck: (
    <>
      <rect x="1" y="6" width="13" height="10" rx="1" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  star: (
    <path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9L12 3z" />
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  grip: (
    <>
      <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function Icon({ name, size = 24, strokeWidth = 1.8, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.laptop}
    </svg>
  )
}
