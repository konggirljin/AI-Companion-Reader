'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLang } from '@/lib/lang-context';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ApiProfile, Settings } from '@/lib/types';
import { getSettings, saveSettings } from '@/lib/storage/settings';
import { listApiProfiles, saveApiProfile, deleteApiProfile, getActiveApiProfileId, setActiveApiProfileId } from '@/lib/storage/api-profiles';
import { callChat } from '@/lib/ai';

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [testing, setTesting] = useState(false);
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => getActiveApiProfileId());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const profileLoadedRef = useRef(false);
  const [models, setModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(true);
  const { t } = useLang();

  useEffect(() => {
    setProfiles(listApiProfiles());
    const activeId = getActiveApiProfileId();
    if (activeId && !profileLoadedRef.current) {
      const p = listApiProfiles().find((x) => x.id === activeId);
      if (p) {
        setSettings((prev) => {
          const next = { ...prev, baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.model };
          saveSettings(next);
          return next;
        });
        profileLoadedRef.current = true;
      }
    }
  }, []);

  const selectProfile = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    setActiveProfileId(id);
    setActiveApiProfileId(id);
    const next = { ...settings, baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.model };
    setSettings(next);
    saveSettings(next);
  };

  const saveAsProfile = () => {
    if (!profileName.trim()) return;
    saveApiProfile({ name: profileName.trim(), baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model });
    setProfiles(listApiProfiles());
    setSaveDialogOpen(false);
    setProfileName('');
    toast.success(t('settings.profileSaved') + ': ' + profileName.trim());
  };

  const removeProfile = (id: string) => {
    deleteApiProfile(id);
    setProfiles(listApiProfiles());
    if (activeProfileId === id) {
      setActiveProfileId(null);
      setActiveApiProfileId(null);
    }
    toast.success(t('settings.profileDeleted'));
  };

  const fetchModels = async () => {
    setFetchingModels(true);
    try {
      const targetUrl = `${settings.baseUrl.replace(/\/+$/, '')}/models`;
      const proxyBase = settings.proxyUrl?.trim().replace(/\/+$/, '');
      const url = proxyBase ? `${proxyBase}?url=${encodeURIComponent(targetUrl)}` : targetUrl;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${settings.apiKey}` },
      });
      if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
      const data = await res.json() as { data?: { id: string }[] };
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean).sort();
      setModels(ids);
      setUseCustomModel(false);
      if (ids.length === 0) toast.info(t('settings.noModels'));
    } catch {
      toast.error(t('settings.fetchFailed'));
    } finally {
      setFetchingModels(false);
    }
  };

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await callChat(settings, [{ role: 'user', content: 'Reply with the word: ok' }]);
      toast.success(t('settings.connectionWorks'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NETWORK_ERROR';
      const friendly =
        msg === 'CORS_NETWORK_ERROR' ? t('settings.error.cors')
        : msg === 'TIMEOUT' ? t('settings.error.timeout')
        : msg === 'API_ERROR_503' ? t('settings.error.overloaded')
        : msg.startsWith('API_ERROR_') ? t('settings.error.provider', { msg: msg.replace('API_ERROR_', '') })
        : t('settings.error.failed', { msg });
      toast.error(friendly);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.aiProvider')}</CardTitle>
          <CardDescription>{t('settings.aiProviderDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>{t('settings.apiProfiles')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-xs leading-none text-muted-foreground hover:border-muted-foreground hover:text-foreground" aria-label={t('settings.howToGetKey')}>?</button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm" align="start">
                  <div className="space-y-2">
                    <p className="font-medium">{t('settings.keyGuide.title')}</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                      <li>{t('settings.keyGuide.step1', { url: 'https://build.nvidia.com/settings/api-keys' })}</li>
                      <li>{t('settings.keyGuide.step2')}</li>
                      <li>{t('settings.keyGuide.step3')}</li>
                      <li>{t('settings.keyGuide.step4')}</li>
                      <li>{t('settings.keyGuide.step5')}</li>
                      <li>{t('settings.keyGuide.step6')}</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">{t('settings.keyGuide.recommendation', { models: 'deepseek-ai/deepseek-v4-flash, deepseek-ai/deepseek-v4-pro, z-ai/glm-5.2' })}</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={activeProfileId ?? ''} onValueChange={(v) => v && selectProfile(v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t('settings.defaultProfile')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('settings.useNoProfile')}</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setProfileName(''); setSaveDialogOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" />{t('common.save')}
              </Button>
            </div>
            {profiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profiles.map((p) => (
                  <span key={p.id} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    {p.name}
                    <button onClick={() => removeProfile(p.id)} className="hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-base">{t('settings.baseUrl')}</Label>
            <Input id="s-base" value={settings.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-key">{t('settings.apiKey')}</Label>
            <Input id="s-key" type="password" value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-model">{t('settings.model')}</Label>
            <div className="flex gap-2">
              {models.length > 0 && !useCustomModel ? (
                <div className="flex-1">
                  <Select value={settings.model} onValueChange={(v) => {
                    if (v === '__custom__') { setUseCustomModel(true); return; }
                    update({ model: v });
                  }}>
                    <SelectTrigger id="s-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">{t('settings.customModel')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input id="s-model" className="flex-1" value={settings.model} onChange={(e) => update({ model: e.target.value })}
                  placeholder="gpt-4o-mini" />
              )}
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled={fetchingModels || !settings.apiKey || !settings.baseUrl}
                onClick={fetchModels} aria-label={t('settings.fetchModels')}>
                <RefreshCw className={`h-4 w-4 ${fetchingModels ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-proxy">{t('settings.proxyUrl')}</Label>
            <Input id="s-proxy" value={settings.proxyUrl ?? ''} onChange={(e) => update({ proxyUrl: e.target.value })}
              placeholder="http://localhost:8787" />
            <p className="text-xs text-muted-foreground">
              {t('settings.proxyHelp')}
            </p>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
              <li>{t('settings.proxyLocal', { cmd: 'npm run proxy', url: 'http://localhost:8787' })}</li>
              <li>{t('settings.proxyVercel', { url: '/api/proxy' })}</li>
            </ul>
          </div>
          <Button variant="outline" onClick={() => void testConnection()} disabled={testing || !settings.apiKey}>
            {testing ? t('settings.testing') : t('settings.testConnection')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('settings.autoSave')}</p>
        </CardContent>
      </Card>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm space-y-4">
          <DialogHeader><DialogTitle>{t('settings.saveProfile')}</DialogTitle></DialogHeader>
          <Input value={profileName} onChange={(e) => setProfileName(e.target.value)}
            placeholder={t('settings.profileName')} onKeyDown={(e) => e.key === 'Enter' && saveAsProfile()} />
          <DialogFooter><Button onClick={saveAsProfile}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
