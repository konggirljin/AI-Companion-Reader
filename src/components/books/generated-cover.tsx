'use client';
import { pickCoverStyle } from '@/lib/book-motifs';
import { MotifSVG } from './motifs';

export function GeneratedCover({ seed, title, tag }: { seed: string; title: string; tag?: string }) {
  const style = pickCoverStyle(seed);
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: style.bg, borderRadius: '2px 5px 5px 2px' }}
    >
      <MotifSVG type={style.motif} color={style.accentColor} />
      <div className="absolute inset-x-0 top-0 z-10 px-2 pt-3 text-center">
        <p
          className="break-words text-center font-bold uppercase leading-tight"
          style={{
            fontSize: 'clamp(6px, 1.6vw, 9px)',
            color: style.textColor,
            letterSpacing: '0.06em',
            textShadow: '0 1px 3px rgba(0,0,0,0.45)',
            hyphens: 'auto',
          }}
        >
          {title}
        </p>
        {tag ? (
          <p className="mt-1 opacity-70" style={{ fontSize: 'clamp(4px, 1.1vw, 6px)', color: style.textColor }}>
            {tag}
          </p>
        ) : null}
      </div>
    </div>
  );
}
