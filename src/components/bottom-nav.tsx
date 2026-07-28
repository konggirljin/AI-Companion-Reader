'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Fingerprint, BookMarked, CircleUser } from 'lucide-react';
import { useLang } from '@/lib/lang-context';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const ITEMS = [
    { href: '/journey', label: t('nav.journey'), icon: Compass },
    { href: '/persona', label: t('nav.persona'), icon: Fingerprint },
    { href: '/', label: t('nav.library'), icon: BookMarked },
    { href: '/profile', label: t('nav.profile'), icon: CircleUser },
  ] as const;
  if (pathname.startsWith('/read')) return null;
  return (
    <nav
      className="sticky bottom-0 z-40 flex shrink-0 items-end justify-around border-t border-border/60 bg-background/95 backdrop-blur"
      style={{
        paddingTop: 10,
        paddingBottom: 'max(1.4rem, env(safe-area-inset-bottom, 1.4rem))',
      }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex min-w-[64px] flex-col items-center gap-1 transition-colors"
            aria-current={active ? 'page' : undefined}
          >
            <span
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                padding: active ? '7px 20px' : '8px',
                borderRadius: 22,
                background: active ? 'hsl(var(--secondary))' : 'transparent',
                color: active ? 'hsl(var(--secondary-foreground))' : '#6A5030',
              }}
            >
              <Icon size={20} strokeWidth={2} />
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: active ? 'hsl(var(--secondary-foreground))' : '#6A5030' }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
