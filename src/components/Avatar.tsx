import type { Character } from '../config/characters.ts';

/** Simple illustrated avatar for an original, fictional character. */
export function Avatar({ character, size = 72 }: { character: Character; size?: number }) {
  const c = character;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${c.name}, ${c.role}`}
    >
      <circle
        cx="40"
        cy="40"
        r="39"
        fill={c.color}
        opacity="0.2"
        stroke={c.color}
        strokeWidth="2"
      />
      <path d="M14 78c2-16 12-24 26-24s24 8 26 24z" fill={c.color} />
      <path d="M33 54h14l-7 9z" fill="#eef2fb" />
      <circle cx="40" cy="36" r="15" fill={c.skin} />
      <path d={`M25 34c0-12 7-17 15-17s15 5 15 17c-3-6-8-8-15-8s-12 2-15 8z`} fill={c.hair} />
      <circle cx="34" cy="38" r="1.8" fill="#111" />
      <circle cx="46" cy="38" r="1.8" fill="#111" />
      <path d="M35 44q5 4 10 0" stroke="#111" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {c.accessory === 'headset' && (
        <>
          <path d="M24 36c0-12 7-19 16-19s16 7 16 19" stroke="#222" strokeWidth="3" fill="none" />
          <rect x="21" y="33" width="6" height="9" rx="2" fill="#222" />
          <path d="M24 42q2 8 10 8" stroke="#222" strokeWidth="2" fill="none" />
          <circle cx="35" cy="50" r="2" fill="#222" />
        </>
      )}
      {c.accessory === 'goggles' && (
        <>
          <rect x="26" y="22" width="28" height="7" rx="3.5" fill="#333" />
          <circle cx="34" cy="25.5" r="3" fill="#7cc0ff" />
          <circle cx="46" cy="25.5" r="3" fill="#7cc0ff" />
        </>
      )}
      {c.accessory === 'glasses' && (
        <>
          <circle cx="34" cy="38" r="4.5" fill="none" stroke="#222" strokeWidth="1.5" />
          <circle cx="46" cy="38" r="4.5" fill="none" stroke="#222" strokeWidth="1.5" />
          <line x1="38.5" y1="38" x2="41.5" y2="38" stroke="#222" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
