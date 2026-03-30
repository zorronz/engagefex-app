import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Eye, Save, Globe, Image as ImageIcon, Palette, CreditCard, ToggleLeft, ToggleRight, MessageCircle, Code2, Play, RefreshCw } from 'lucide-react';

interface Setting { key: string; value: string | null }

const GATEWAY_KEYS = ['razorpay_enabled', 'stripe_enabled', 'paypal_enabled'];
const BRANDING_KEYS = ['platform_name', 'logo_url', 'favicon_url'];

export default function AdminPlatformSettings() {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'branding' | 'gateways' | 'support' | 'tracking' | 'video'>('branding');
  const [forcingVideo, setForcingVideo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((s: Setting) => { map[s.key] = s.value; });
      // Seed gateway keys if not present
      for (const k of GATEWAY_KEYS) { if (!(k in map)) map[k] = 'false'; }
      setSettings(map);
      setDraft(Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v ?? ''])));
      if (map.logo_url) setLogoPreview(map.logo_url);
    })();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    const { data: existing } = await supabase.from('platform_settings').select('id').eq('key', key).maybeSingle();
    if (existing) {
      await supabase.from('platform_settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('platform_settings').insert({ key, value });
    }
    setSettings(s => ({ ...s, [key]: value }));
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('platform-assets').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('platform-assets').getPublicUrl(path);
      const key = type === 'logo' ? 'logo_url' : 'favicon_url';
      setDraft(d => ({ ...d, [key]: publicUrl }));
      if (type === 'logo') setLogoPreview(publicUrl);
      await saveSetting(key, publicUrl);
    }
    setUploading(false);
  };

  const toggleGateway = (key: string) => {
    const current = settings[key] === 'true';
    const newVal = current ? 'false' : 'true';
    setSettings(s => ({ ...s, [key]: newVal }));
    setDraft(d => ({ ...d, [key]: newVal }));
    saveSetting(key, newVal);
  };

  const GatewayCard = ({ gkey, label, desc, color }: { gkey: string; label: string; desc: string; color: string }) => {
    const enabled = settings[gkey] === 'true';
    return (
      <div className={`bg-surface border rounded p-5 flex items-start justify-between gap-4 transition-colors ${enabled ? 'border-primary/30' : 'border-border'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm ${color}`}>{label}</span>
            <span className={`label-caps px-1.5 py-0.5 rounded ${enabled ? 'bg-earn/10 text-earn' : 'bg-surface-elevated text-foreground-dim'}`}>
              {enabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <p className="text-xs text-foreground-muted">{desc}</p>
        </div>
        <button onClick={() => toggleGateway(gkey)} className="flex-shrink-0 mt-0.5">
          {enabled
            ? <ToggleRight className="w-8 h-8 text-primary" />
            : <ToggleLeft className="w-8 h-8 text-foreground-dim" />}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Tab switcher */}
      <div className="flex gap-0.5 border-b border-border">
      {([['branding', Globe, 'Branding'], ['gateways', CreditCard, 'Payment Integrations'], ['support', MessageCircle, 'Support Widget'], ['tracking', Code2, 'Tracking Scripts']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key as 'branding' | 'gateways' | 'support' | 'tracking')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ─── BRANDING ─── */}
      {tab === 'branding' && (
        <div className="space-y-5">
          {/* Platform Name */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><Globe className="w-3.5 h-3.5" />PLATFORM NAME</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.platform_name ?? ''}
                onChange={e => setDraft(d => ({ ...d, platform_name: e.target.value }))}
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              />
              <button
                onClick={() => saveSetting('platform_name', draft.platform_name ?? '')}
                disabled={saving === 'platform_name'}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saved === 'platform_name' ? 'Saved!' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-foreground-muted">This name appears in the nav, login page, and footer.</p>
          </div>

          {/* Logo Upload */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" />PLATFORM LOGO</p>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-surface-elevated border border-border rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                  : <Eye className="w-6 h-6 text-foreground-dim" />}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded text-xs font-medium hover:border-primary/50 transition-colors disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </button>
                <p className="text-xs text-foreground-muted">PNG or SVG recommended. Min 200×200px.</p>
                {settings.logo_url && (
                  <p className="text-[10px] text-earn font-mono truncate">✓ {settings.logo_url.split('/').pop()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Favicon Upload */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><Palette className="w-3.5 h-3.5" />FAVICON</p>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-surface-elevated border border-border rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                {settings.favicon_url
                  ? <img src={settings.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                  : <span className="text-foreground-dim text-xl">🔲</span>}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={faviconRef} type="file" accept="image/*,.ico" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'favicon')} />
                <button onClick={() => faviconRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded text-xs font-medium hover:border-primary/50 transition-colors disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload Favicon'}
                </button>
                <p className="text-xs text-foreground-muted">ICO or PNG. Recommended 32×32px.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT GATEWAYS ─── */}
      {tab === 'gateways' && (
        <div className="space-y-3">
          <p className="text-xs text-foreground-muted">Enable payment gateways available to users. API keys are configured via secure server secrets.</p>
          <GatewayCard gkey="razorpay_enabled" label="Razorpay" desc="Indian payments — UPI, NetBanking, Cards. Best for users paying in INR." color="text-blue-400" />
          <GatewayCard gkey="stripe_enabled" label="Stripe" desc="International card payments — Visa, Mastercard, Amex. Supports USD and 135+ currencies." color="text-purple-400" />
          <GatewayCard gkey="paypal_enabled" label="PayPal" desc="Global digital wallet payments. Trusted by 400M+ users worldwide." color="text-yellow-400" />
          <div className="bg-surface-elevated border border-border-subtle rounded p-3">
            <p className="text-xs text-foreground-muted">
              <span className="text-foreground font-medium">Note:</span> Razorpay API credentials are managed in Lovable Cloud secrets. Stripe and PayPal integrations can be enabled here for future payment processing support.
            </p>
          </div>
        </div>
      )}

      {/* ─── SUPPORT WIDGET ─── */}
      {tab === 'support' && (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5" />SUPPORT WIDGET SCRIPT</p>
            <p className="text-xs text-foreground-muted">
              Paste the widget script tag from Tawk.to, Crisp, Intercom, or any chat platform.
              It will be injected automatically for all logged-in users.
            </p>
            <textarea
              rows={6}
              value={draft.support_widget_script ?? ''}
              onChange={e => setDraft(d => ({ ...d, support_widget_script: e.target.value }))}
              placeholder={`<!-- Example: Tawk.to script -->\n<script type="text/javascript">\nvar Tawk_API=Tawk_API||{};\n...\n</script>`}
              className="w-full bg-background border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveSetting('support_widget_script', draft.support_widget_script ?? '')}
                disabled={saving === 'support_widget_script'}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saved === 'support_widget_script' ? 'Saved!' : 'Save Script'}
              </button>
              {settings.support_widget_script && (
                <button
                  onClick={() => { setDraft(d => ({ ...d, support_widget_script: '' })); saveSetting('support_widget_script', ''); }}
                  className="px-3 py-2 bg-spend/10 border border-spend/20 text-spend rounded text-xs font-medium hover:bg-spend/20 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {settings.support_widget_script && (
              <p className="text-xs text-earn font-mono">✓ Widget script is configured and active</p>
            )}
          </div>
          <div className="bg-surface-elevated border border-border-subtle rounded p-3">
            <p className="text-xs text-foreground-muted">
              <span className="text-foreground font-medium">How it works:</span> The script is stored securely and injected once when users load the dashboard. Users can access support via the sidebar → Support page.
            </p>
          </div>
        </div>
      )}
      {/* ─── TRACKING SCRIPTS ─── */}
      {tab === 'tracking' && (
        <div className="space-y-5">
          {/* Google Analytics */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><Code2 className="w-3.5 h-3.5" />GOOGLE ANALYTICS ID</p>
            <p className="text-xs text-foreground-muted">Your GA4 Measurement ID (e.g. G-XXXXXXXXXX). Leave blank to disable.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.ga_id ?? ''}
                onChange={e => setDraft(d => ({ ...d, ga_id: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60"
              />
              <button
                onClick={() => saveSetting('ga_id', draft.ga_id ?? '')}
                disabled={saving === 'ga_id'}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saved === 'ga_id' ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* Facebook Pixel */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><Code2 className="w-3.5 h-3.5" />FACEBOOK PIXEL ID</p>
            <p className="text-xs text-foreground-muted">Your Meta Pixel ID (numeric). Leave blank to disable.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.fb_pixel_id ?? ''}
                onChange={e => setDraft(d => ({ ...d, fb_pixel_id: e.target.value }))}
                placeholder="1234567890123456"
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60"
              />
              <button
                onClick={() => saveSetting('fb_pixel_id', draft.fb_pixel_id ?? '')}
                disabled={saving === 'fb_pixel_id'}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saved === 'fb_pixel_id' ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* Custom Head Script */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><Code2 className="w-3.5 h-3.5" />CUSTOM HEAD SCRIPT</p>
            <p className="text-xs text-foreground-muted">Scripts injected inside the <code className="bg-surface-elevated px-1 rounded">&lt;head&gt;</code> tag. Useful for tag managers or custom tracking.</p>
            <textarea
              rows={5}
              value={draft.custom_head_script ?? ''}
              onChange={e => setDraft(d => ({ ...d, custom_head_script: e.target.value }))}
              placeholder={`<script>\n  // Custom head script\n</script>`}
              className="w-full bg-background border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveSetting('custom_head_script', draft.custom_head_script ?? '')}
                disabled={saving === 'custom_head_script'}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saved === 'custom_head_script' ? 'Saved!' : 'Save Script'}
              </button>
              {settings.custom_head_script && (
                <span className="text-xs text-earn font-mono">✓ Active</span>
              )}
            </div>
          </div>

          {/* Custom Body Script */}
          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <p className="label-caps flex items-center gap-2"><Code2 className="w-3.5 h-3.5" />CUSTOM BODY SCRIPT</p>
            <p className="text-xs text-foreground-muted">Scripts injected before the closing <code className="bg-surface-elevated px-1 rounded">&lt;/body&gt;</code> tag.</p>
            <textarea
              rows={5}
              value={draft.custom_body_script ?? ''}
              onChange={e => setDraft(d => ({ ...d, custom_body_script: e.target.value }))}
              placeholder={`<script>\n  // Custom body script\n</script>`}
              className="w-full bg-background border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveSetting('custom_body_script', draft.custom_body_script ?? '')}
                disabled={saving === 'custom_body_script'}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {saved === 'custom_body_script' ? 'Saved!' : 'Save Script'}
              </button>
              {settings.custom_body_script && (
                <span className="text-xs text-earn font-mono">✓ Active</span>
              )}
            </div>
          </div>

          <div className="bg-surface-elevated border border-border-subtle rounded p-3">
            <p className="text-xs text-foreground-muted">
              <span className="text-foreground font-medium">How it works:</span> Scripts are injected once when the application loads. Changes take effect on the next page load. Only non-empty values are injected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
