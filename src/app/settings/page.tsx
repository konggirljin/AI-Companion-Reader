'use client';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemPromptEditor } from '@/components/settings/system-prompt-editor';

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm />
      <SystemPromptEditor />
    </div>
  );
}
