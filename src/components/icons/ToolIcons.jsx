const common = { fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function KoboIcon() {
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

export function OdkIcon() {
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M12 3 3 8l9 5 9-5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

export function JotformIcon() {
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 4v16" />
    </svg>
  );
}

export function GoogleFormsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m9 13 1.5 1.5L14 11" />
    </svg>
  );
}
