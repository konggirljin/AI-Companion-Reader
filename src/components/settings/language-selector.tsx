'use client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/lib/lang-context';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
] as const;

export function LanguageSelector() {
  const { lang, setLang, t } = useLang();
  const langName = LANGUAGE_OPTIONS.find((o) => o.value === lang)?.label ?? 'English';

  const handleChange = (value: string) => {
    setLang(value as 'en' | 'zh-TW');
    const label = LANGUAGE_OPTIONS.find((o) => o.value === value)?.label ?? value;
    toast.success(t('language.confirm').replace('{lang}', label));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('language.title')}</CardTitle>
        <CardDescription>{t('language.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={lang} onValueChange={handleChange}>
          <SelectTrigger className="w-full">
            <SelectValue>{langName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
