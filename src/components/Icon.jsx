const paths = {
  home: <><path d="M3 10.5 10 4l7 6.5"/><path d="M5 9.5V18h10V9.5M8 18v-5h4v5"/></>,
  search: <><circle cx="9" cy="9" r="5.5"/><path d="m13 13 4 4"/></>,
  branches: <><circle cx="6" cy="5" r="2"/><circle cx="14" cy="10" r="2"/><circle cx="6" cy="15" r="2"/><path d="M8 5h2a4 4 0 0 1 4 4M8 15h2a4 4 0 0 0 4-4"/></>,
  queue: <><path d="M4 5h12M4 10h8M4 15h5"/><path d="m13 14 2 2 3-4"/></>,
  bookmark: <path d="M6 3.5h8a1 1 0 0 1 1 1V18l-5-3-5 3V4.5a1 1 0 0 1 1-1Z"/>,
  note: <><path d="M5 3.5h10v13H5z"/><path d="M8 7h4M8 10h4M8 13h3"/></>,
  chart: <><path d="M4 17V9M10 17V4M16 17v-6"/><path d="M2.5 17.5h15"/></>,
  menu: <path d="M3 5h14M3 10h14M3 15h14"/>,
  close: <path d="m5 5 10 10M15 5 5 15"/>,
  sun: <><circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4"/></>,
  moon: <path d="M16.5 13.5A7 7 0 0 1 6.5 3.7 7 7 0 1 0 16.5 13.5Z"/>,
  command: <path d="M7 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H5a2 2 0 1 0 2 2Z"/>,
  external: <><path d="M10 4h6v6M16 4l-7 7"/><path d="M14 11v5H4V6h5"/></>,
  check: <path d="m4 10 4 4 8-9"/>,
  star: <path d="m10 3 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2L5.8 16l.8-4.7L3.2 8l4.7-.7L10 3Z"/>,
  plus: <path d="M10 4v12M4 10h12"/>,
  up: <path d="m5 12 5-5 5 5"/>,
  down: <path d="m5 8 5 5 5-5"/>,
  right: <path d="m8 5 5 5-5 5"/>,
  arrowRight: <path d="M3 10h14M12 5l5 5-5 5"/>,
  library: <><path d="M4 4h4v13H4zM8 5h4v12H8zM13 4l3-.8 2.5 12.5-3 .8z"/></>,
  target: <><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><path d="M10 1v3M19 10h-3"/></>,
  alert: <><path d="M10 2.5 18 17H2L10 2.5Z"/><path d="M10 7v4M10 14.5v.1"/></>,
}

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={`app-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name] ?? paths.library}
    </svg>
  )
}
