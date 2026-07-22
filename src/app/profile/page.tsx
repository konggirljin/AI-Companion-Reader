'use client';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemPromptEditor } from '@/components/settings/system-prompt-editor';

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <header className="flex items-end justify-between px-4 pb-4 pt-6">
        <div>
          <h1 className="text-[22px] font-extrabold leading-none" style={{ color: 'hsl(var(--foreground))' }}>
            Profile
          </h1>
          <p className="mt-0.5 text-xs font-medium" style={{ color: '#8A6038' }}>
            App and provider settings
          </p>
        </div>
        <span className="text-xs text-muted-foreground">v0.1.0</span>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <SettingsForm />
        <SystemPromptEditor />
      </div>
    </div>
  );
}
