const paths = {
  dashboard: 'M3 13h4V3H3v10Zm6 8h4V3H9v18Zm6-6h4V3h-4v12Z',
  chart: 'M3 3v18h18M7 15l3-3 3 2 5-7M18 7h-4v4',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2',
  user: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  kanban: 'M4 4h6v16H4V4Zm10 0h6v10h-6V4Z',
  briefcase: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 5h18',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6',
  case: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm8 5h2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.13.38.51.66 1 .66H21a2 2 0 1 1 0 4h-.09c-.49 0-.87.28-1 .66Z',
  pencil: 'M16.86 3.49a2.1 2.1 0 0 1 2.97 2.97L8.7 17.59 4 19l1.41-4.7L16.86 3.49ZM15.5 5l3 3M4 21h16',
  power: 'M12 2v10M18.36 5.64a9 9 0 1 1-12.72 0',
  powerOff: 'M12 2v5M6.34 6.34a8 8 0 1 0 11.32 0M3 3l18 18',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  search: 'm21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  sun: 'M12 4V2M12 22v-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  money: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6',
  tag: 'M20 13 13 20 4 11V4h7l9 9ZM7.5 7.5h.01',
  mapPin: 'M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  mail: 'M4 5h16v14H4V5Zm0 2 8 6 8-6',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.15 10.8 19.8 19.8 0 0 1 .08 2.18 2 2 0 0 1 2.06 0h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.11L6 7.9a16 16 0 0 0 6.1 6.1l1.27-1.27a2 2 0 0 1 2.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92Z',
  idCard: 'M3 5h18v14H3V5Zm4 5h4M7 14h7M15 10h2M15 14h2',
  status: 'M9 12l2 2 4-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M18 6 6 18M6 6l12 12',
  arrowRight: 'M5 12h14M13 5l7 7-7 7',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  chevronRight: 'm9 18 6-6-6-6',
  check: 'M20 6 9 17l-5-5',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6',
  alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
  history: 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l3 2',
  activity: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a2 2 0 0 1-3.88 0l-2.35-8.36A2 2 0 0 0 8.48 12H6M2 12h2.48a2 2 0 0 1 1.93 1.46l2.35 8.36a2 2 0 0 0 3.88 0l2.35-8.36A2 2 0 0 1 15.52 12H18',
  archive: 'M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M3 3h18v5H3V3ZM10 12h4',
}

export function Icon({ name, className = 'h-4 w-4', strokeWidth = 2 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.dashboard} />
    </svg>
  )
}

export function IconBadge({ name, className = '', iconClassName = 'h-4 w-4' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-white/70 bg-gradient-to-br from-white via-gray-50 to-gray-200 text-gray-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_20px_rgba(15,23,42,0.12)] ring-1 ring-gray-200/80 dark:border-white/10 dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 dark:text-gray-100 dark:ring-white/10 ${className}`}
    >
      <Icon name={name} className={iconClassName} strokeWidth={2.15} />
    </span>
  )
}
