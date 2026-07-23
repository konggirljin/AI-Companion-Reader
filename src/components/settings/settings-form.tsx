'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
    toast.success(`Profile "${profileName.trim()}" saved`);
  };

  const removeProfile = (id: string) => {
    deleteApiProfile(id);
    setProfiles(listApiProfiles());
    if (activeProfileId === id) {
      setActiveProfileId(null);
      setActiveApiProfileId(null);
    }
    toast.success('Profile deleted');
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
      if (ids.length === 0) toast.info('No models available');
    } catch {
      toast.error('Failed to fetch models');
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
      toast.success('Connection works');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NETWORK_ERROR';
      const friendly =
        msg === 'CORS_NETWORK_ERROR' ? 'Connection blocked — the API may not support browser requests (CORS issue)'
        : msg === 'TIMEOUT' ? 'Timed out — check the base URL'
        : msg === 'API_ERROR_503' ? 'Service unavailable (503) — the API server is temporarily overloaded'
        : msg.startsWith('API_ERROR_') ? `Provider error (${msg.replace('API_ERROR_', '')})`
        : `Connection failed (${msg})`;
      toast.error(friendly);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>Any OpenAI-compatible API. Your key is stored only on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>API profiles</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-xs leading-none text-muted-foreground hover:border-muted-foreground hover:text-foreground" aria-label="How to get an API key">?</button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm" align="start">
                  <div className="space-y-2">
                    <p className="font-medium">How to get a free API key?</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                      <li>Go to <a href="https://build.nvidia.com/settings/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">build.nvidia.com/settings/api-keys</a></li>
                      <li>Create your NVIDIA account and generate an API key</li>
                      <li>Copy your API key</li>
                      <li>For Base URL, use: <code className="block rounded bg-muted px-1 py-0.5 mt-0.5">https://integrate.api.nvidia.com/v1</code></li>
                      <li>Paste your API key in the API Key field</li>
                      <li>Click the <RefreshCw className="inline h-3 w-3" /> button to fetch available models</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">Recommended: <code className="rounded bg-muted px-1">deepseek-ai/deepseek-v4-flash</code> (fast) or <code className="rounded bg-muted px-1">deepseek-ai/deepseek-v4-pro</code> / <code className="rounded bg-muted px-1">z-ai/glm-5.2</code> (higher quality).</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={activeProfileId ?? ''} onValueChange={(v) => v && selectProfile(v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Default (no profile)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default (no profile)</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setProfileName(''); setSaveDialogOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" />Save
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
            <Label htmlFor="s-base">Base URL</Label>
            <Input id="s-base" value={settings.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-key">API Key</Label>
            <Input id="s-key" type="password" value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-model">Model</Label>
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
                      <SelectItem value="__custom__">+ Custom model...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input id="s-model" className="flex-1" value={settings.model} onChange={(e) => update({ model: e.target.value })}
                  placeholder="gpt-4o-mini" />
              )}
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled={fetchingModels || !settings.apiKey || !settings.baseUrl}
                onClick={fetchModels} aria-label="Fetch models">
                <RefreshCw className={`h-4 w-4 ${fetchingModels ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-proxy">Proxy URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input id="s-proxy" value={settings.proxyUrl ?? ''} onChange={(e) => update({ proxyUrl: e.target.value })}
              placeholder="http://localhost:8787" />
            <p className="text-xs text-muted-foreground">
              Most community APIs block browser requests (CORS). Two options:
            </p>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
              <li>Local dev: run <code className="rounded bg-muted px-1">npm run proxy</code> in separate terminal, set this to <code className="rounded bg-muted px-1">http://localhost:8787</code></li>
              <li>Vercel deploy: set this to <code className="rounded bg-muted px-1">/api/proxy</code> (built-in, no extra process)</li>
            </ul>
          </div>
          <Button variant="outline" onClick={() => void testConnection()} disabled={testing || !settings.apiKey}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
          <p className="text-xs text-muted-foreground">Changes save automatically to this device.</p>
        </CardContent>
      </Card>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm space-y-4">
          <DialogHeader><DialogTitle>Save profile</DialogTitle></DialogHeader>
          <Input value={profileName} onChange={(e) => setProfileName(e.target.value)}
            placeholder="My OpenAI key" onKeyDown={(e) => e.key === 'Enter' && saveAsProfile()} />
          <DialogFooter><Button onClick={saveAsProfile}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
