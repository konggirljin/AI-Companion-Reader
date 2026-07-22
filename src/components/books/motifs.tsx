import type { MotifType } from '@/lib/book-motifs';

export function MotifSVG({ type, color }: { type: MotifType; color: string }) {
  const c = color;

  const motifs: Record<MotifType, React.ReactNode> = {
    "leaf": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40,116 L40,28" strokeWidth="0.9" fillOpacity="0" strokeOpacity="0.65" />
        <path d="M40,28 Q17,55 17,78 Q17,106 40,116 Q63,106 63,78 Q63,55 40,28Z" fillOpacity="0.18" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M40,70 Q27,57 21,44" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.45" />
        <path d="M40,84 Q53,71 59,58" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.45" />
        <path d="M40,97 Q29,89 24,79" strokeWidth="0.55" fillOpacity="0" strokeOpacity="0.38" />
      </g>
    ),
    "arch-branch": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20,120 L20,52 Q20,20 40,20 Q60,20 60,52 L60,120" fillOpacity="0" strokeWidth="1" strokeOpacity="0.45" />
        <line x1="40" y1="96" x2="40" y2="58" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M40,74 Q27,60 18,47" strokeWidth="0.75" fillOpacity="0" strokeOpacity="0.5" />
        <path d="M40,74 Q53,60 62,47" strokeWidth="0.75" fillOpacity="0" strokeOpacity="0.5" />
        <path d="M26,65 Q19,55 14,43" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.35" />
        <path d="M54,65 Q61,55 66,43" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.35" />
        <circle cx="20" cy="48" r="1.8" fillOpacity="0.45" strokeOpacity="0" />
        <circle cx="60" cy="48" r="1.8" fillOpacity="0.45" strokeOpacity="0" />
      </g>
    ),
    "arch-tree": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14,120 L14,56 Q14,22 40,22 Q66,22 66,56 L66,120" fillOpacity="0" strokeWidth="0.9" strokeOpacity="0.42" />
        <line x1="40" y1="120" x2="40" y2="70" strokeWidth="1.2" strokeOpacity="0.48" />
        <path d="M40,70 Q24,55 16,36 L28,44 Q33,60 40,70Z" fillOpacity="0.28" strokeOpacity="0" />
        <path d="M40,70 Q56,55 64,36 L52,44 Q47,60 40,70Z" fillOpacity="0.28" strokeOpacity="0" />
        <path d="M40,58 Q26,43 20,26 L32,34 Q36,50 40,58Z" fillOpacity="0.22" strokeOpacity="0" />
        <path d="M40,58 Q54,43 60,26 L48,34 Q44,50 40,58Z" fillOpacity="0.22" strokeOpacity="0" />
      </g>
    ),
    "large-leaf": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40,118 Q7,86 11,50 Q17,20 40,16 Q63,20 69,50 Q73,86 40,118Z" fillOpacity="0.18" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="40" y1="16" x2="40" y2="118" strokeWidth="0.9" strokeOpacity="0.6" />
        <path d="M40,50 Q23,36 16,22" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.42" />
        <path d="M40,64 Q57,50 64,36" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.42" />
        <path d="M40,78 Q24,67 19,55" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.38" />
        <path d="M40,90 Q56,80 61,68" strokeWidth="0.55" fillOpacity="0" strokeOpacity="0.36" />
        <path d="M40,101 Q27,93 23,83" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
      </g>
    ),
    "waves": (
      <g stroke={c} fill="none" strokeLinecap="round">
        <path d="M4,46 Q22,34 40,46 Q58,58 76,46" strokeWidth="0.8" strokeOpacity="0.55" />
        <path d="M4,58 Q22,46 40,58 Q58,70 76,58" strokeWidth="0.8" strokeOpacity="0.55" />
        <path d="M4,70 Q22,58 40,70 Q58,82 76,70" strokeWidth="0.8" strokeOpacity="0.5" />
        <path d="M4,82 Q22,70 40,82 Q58,94 76,82" strokeWidth="0.75" strokeOpacity="0.45" />
        <path d="M4,94 Q22,82 40,94 Q58,106 76,94" strokeWidth="0.7" strokeOpacity="0.4" />
        <path d="M4,106 Q22,94 40,106 Q58,118 76,106" strokeWidth="0.6" strokeOpacity="0.3" />
      </g>
    ),
    "abstract": (
      <g stroke={c} fill={c} strokeLinecap="round">
        <path d="M8,96 Q8,46 40,46 Q72,46 72,96" fillOpacity="0" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d="M18,96 Q18,60 40,60 Q62,60 62,96" fillOpacity="0.14" strokeWidth="0.75" strokeOpacity="0.4" />
        <path d="M8,96 Q40,82 72,96" fillOpacity="0" strokeWidth="0.6" strokeOpacity="0.4" />
        <path d="M11,82 Q40,70 69,82" fillOpacity="0" strokeWidth="0.5" strokeOpacity="0.35" />
        <path d="M16,68 Q40,58 64,68" fillOpacity="0" strokeWidth="0.5" strokeOpacity="0.3" />
        <path d="M22,56 Q40,46 58,56" fillOpacity="0" strokeWidth="0.45" strokeOpacity="0.25" />
      </g>
    ),
    "forest": (
      <g fill={c} stroke={c} strokeLinecap="round">
        <path d="M0,120 L14,74 L22,90 L40,50 L58,90 L66,74 L80,120Z" fillOpacity="0.24" strokeOpacity="0" />
        <path d="M40,50 L30,66 L50,66Z" fillOpacity="0.16" strokeOpacity="0" />
        <circle cx="15" cy="36" r="1.3" fillOpacity="0.65" strokeOpacity="0" />
        <circle cx="62" cy="26" r="1.0" fillOpacity="0.55" strokeOpacity="0" />
        <circle cx="70" cy="44" r="0.9" fillOpacity="0.45" strokeOpacity="0" />
        <circle cx="8" cy="55" r="0.8" fillOpacity="0.4" strokeOpacity="0" />
        <circle cx="72" cy="32" r="0.7" fillOpacity="0.35" strokeOpacity="0" />
      </g>
    ),
    "sunset": (
      <g stroke={c} fill={c} strokeLinecap="round">
        <line x1="0" y1="80" x2="80" y2="80" strokeWidth="0.6" strokeOpacity="0.5" />
        <path d="M22,80 Q22,50 40,50 Q58,50 58,80" fillOpacity="0.24" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M0,120 L18,80 L34,100 L50,76 L66,94 L80,80 L80,120Z" fillOpacity="0.2" strokeOpacity="0" />
        <path d="M37,80 C35,92 33,104 32,120" strokeWidth="1.5" fillOpacity="0" strokeOpacity="0.48" />
        <path d="M43,80 C45,92 47,104 48,120" strokeWidth="1.5" fillOpacity="0" strokeOpacity="0.48" />
        <path d="M40,50 L24,36" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
        <path d="M40,50 L56,36" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
        <path d="M40,50 L40,32" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
      </g>
    ),
    "moon": (
      <g fill={c} stroke={c} strokeLinecap="round">
        <path
          d="M42,38 Q64,54 60,78 Q56,102 40,102 Q20,102 16,78 Q12,54 34,38 Q27,50 29,68 Q31,90 44,91 Q57,91 61,72 Q65,50 42,38Z"
          fillOpacity="0.42" strokeOpacity="0"
        />
        <path
          d="M42,38 Q64,54 60,78 Q56,102 40,102 Q20,102 16,78 Q12,54 34,38 Q27,50 29,68 Q31,90 44,91 Q57,91 61,72 Q65,50 42,38Z"
          fillOpacity="0" strokeWidth="0.8" strokeOpacity="0.5"
        />
        <circle cx="18" cy="54" r="1.6" fillOpacity="0.72" strokeOpacity="0" />
        <circle cx="64" cy="46" r="1.2" fillOpacity="0.62" strokeOpacity="0" />
        <circle cx="70" cy="72" r="1.0" fillOpacity="0.52" strokeOpacity="0" />
        <circle cx="13" cy="80" r="0.9" fillOpacity="0.48" strokeOpacity="0" />
        <circle cx="24" cy="34" r="0.8" fillOpacity="0.4" strokeOpacity="0" />
      </g>
    ),
    "botanical-circle": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="68" r="32" fillOpacity="0" strokeWidth="0.9" strokeOpacity="0.42" />
        <line x1="40" y1="100" x2="40" y2="118" strokeWidth="1.1" strokeOpacity="0.48" />
        <path d="M40,100 Q24,86 22,73 Q33,78 40,100Z" fillOpacity="0.32" strokeOpacity="0" />
        <path d="M40,100 Q56,86 58,73 Q47,78 40,100Z" fillOpacity="0.32" strokeOpacity="0" />
        <path d="M40,36 Q28,28 26,18 Q35,22 40,36Z" fillOpacity="0.28" strokeOpacity="0" />
        <path d="M40,36 Q52,28 54,18 Q45,22 40,36Z" fillOpacity="0.28" strokeOpacity="0" />
        <line x1="40" y1="18" x2="40" y2="36" strokeWidth="0.85" strokeOpacity="0.42" />
      </g>
    ),
  };

  return (
    <svg
      viewBox="0 0 80 120"
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {motifs[type]}
    </svg>
  );
}

export function VaseDecoration() {
  return (
    <div className="flex-1 relative flex items-end justify-center" style={{ aspectRatio: "2/3" }}>
      <svg viewBox="0 0 60 120" className="w-4/5 h-4/5" xmlns="http://www.w3.org/2000/svg">
        <path d="M18,118 L15,72 Q13,54 18,44 Q24,34 30,32 Q36,34 42,44 Q47,54 45,72 L42,118Z"
          fill="#8B6030" fillOpacity="0.65" stroke="rgba(180,130,70,0.4)" strokeWidth="0.8" />
        <path d="M16,80 Q30,77 44,80" fill="none" stroke="rgba(200,155,80,0.28)" strokeWidth="0.6" />
        <path d="M15,92 Q30,89 45,92" fill="none" stroke="rgba(200,155,80,0.22)" strokeWidth="0.6" />
        <path d="M22,44 Q30,38 38,44" fill="none" stroke="rgba(200,155,80,0.3)" strokeWidth="0.7" />
        <path d="M30,32 Q20,22 14,8" fill="none" stroke="rgba(155,100,48,0.9)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M30,32 Q40,18 44,4" fill="none" stroke="rgba(155,100,48,0.9)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M20,20 Q13,14 10,18" fill="none" stroke="rgba(155,100,48,0.75)" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M40,16 Q47,11 50,15" fill="none" stroke="rgba(155,100,48,0.75)" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M17,12 Q12,8 10,12" fill="none" stroke="rgba(155,100,48,0.6)" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M14,8 Q9,3 7,7 Q10,11 14,8Z" fill="rgba(130,90,40,0.75)" />
        <path d="M44,4 Q49,0 51,4 Q48,7 44,4Z" fill="rgba(130,90,40,0.75)" />
        <path d="M10,18 Q5,15 6,12 Q9,14 10,18Z" fill="rgba(130,90,40,0.65)" />
        <path d="M50,15 Q55,12 54,16 Q51,17 50,15Z" fill="rgba(130,90,40,0.65)" />
      </svg>
    </div>
  );
}
