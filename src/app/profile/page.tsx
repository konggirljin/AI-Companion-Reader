'use client';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemPromptEditor } from '@/components/settings/system-prompt-editor';
import { LanguageSelector } from '@/components/settings/language-selector';
import { UserPersonaSection } from '@/components/profile/user-persona-section';
import { useLang } from '@/lib/lang-context';

export default function ProfilePage() {
  const { t } = useLang();
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="flex items-end justify-between px-4 pb-4 pt-6">
        <div>
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
            {t('profile.title')}
          </h1>
          <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
            {t('profile.subtitle')}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">v0.1.0</span>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <UserPersonaSection />
        <SettingsForm />
        <LanguageSelector />
        <SystemPromptEditor />
      </div>
    </div>
  );
}
