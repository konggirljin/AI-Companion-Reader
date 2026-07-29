'use client';
import { useLang } from '@/lib/lang-context';
import { Quote, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface CompanionStatData {
  name: string;
  avatar?: string;       // data URL or remote URL
  calls: number;        // # of comments in range
  quote: string | null; // a representative comment excerpt
  bookTitle?: string;   // book context of the quote
}

export function CompanionStat({
  data,
  rangeLabel,
}: {
  data: CompanionStatData | null;
  rangeLabel: string;
}) {
  const { t } = useLang();
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
        {t('journey.topCompanion')}
      </h2>

      {!data ? (
        <div className="mt-4 rounded-md bg-secondary/20 px-3 py-6 text-center text-xs text-muted-foreground">
          {t('journey.noCompanionRange', { range: rangeLabel.toLowerCase() })}
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              {data.avatar ? <AvatarImage src={data.avatar} alt={data.name} /> : null}
              <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary">
                {data.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>
                {data.name}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <MessageCircle className="h-3 w-3" />
                {t('journey.callsRange', { count: data.calls, range: rangeLabel })}
              </div>
            </div>
          </div>

          {data.quote ? (
            <div className="mt-3 rounded-lg bg-secondary/30 p-3">
              <div className="flex gap-2">
                <Quote className="h-4 w-4 shrink-0 text-primary/70" />
                <p className="text-sm leading-snug text-secondary-foreground">
                  &ldquo;{data.quote}&rdquo;
                </p>
              </div>
              {data.bookTitle ? (
                <div className="mt-1.5 text-right text-[11px] text-muted-foreground">
                  {t('journey.onBook', { book: data.bookTitle })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}