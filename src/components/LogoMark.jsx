export default function LogoMark({ size = 36, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect x="35" y="35" width="530" height="530" fill="none" stroke={color} strokeWidth="10" />
      <circle cx="175" cy="175" r="30" fill="none" stroke={color} strokeWidth="15" />
      <circle cx="425" cy="175" r="30" fill="none" stroke={color} strokeWidth="15" />
      <circle cx="175" cy="425" r="30" fill="none" stroke={color} strokeWidth="15" />
      <circle cx="425" cy="425" r="30" fill="none" stroke={color} strokeWidth="15" />
    </svg>
  );
}
