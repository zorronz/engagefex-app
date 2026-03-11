import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, Trash2, Star, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  bonus_credits: number;
  price_inr: number;
  price_usd: number;
  is_active: boolean;
  sort_order: number;
}

interface SubPlan {
  id: string;
  name: string;
  monthly_credits: number;
  price_inr: number;
  price_usd: number;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

interface WelcomeOffer {
  id: string;
  is_enabled: boolean;
  offer_credits: number;
  offer_price_inr: number;
  offer_price_usd: number;
  subscription_discount_pct: number;
}

export default function AdminPricing() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [offer, setOffer] = useState<WelcomeOffer | null>(null);
  const [tab, setTab] = useState<'packs' | 'plans' | 'offer'>('packs');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, s, o] = await Promise.all([
        supabase.from('credit_packs').select('*').order('sort_order'),
        supabase.from('subscription_plans').select('*').order('sort_order'),
        supabase.from('welcome_offer_settings').select('*').limit(1).single(),
      ]);
      if (p.data) setPacks(p.data.map(x => ({ ...x, price_inr: Number(x.price_inr), price_usd: Number(x.price_usd) })));
      if (s.data) setPlans(s.data.map(x => ({
        ...x,
        price_inr: Number(x.price_inr),
        price_usd: Number(x.price_usd),
        features: Array.isArray(x.features) ? x.features as string[] : [],
      })));
      if (o.data) setOffer({ ...o.data, offer_price_inr: Number(o.data.offer_price_inr), offer_price_usd: Number(o.data.offer_price_usd) });
      setLoading(false);
    })();
  }, []);

  /* ─── Credit Pack CRUD ─── */
  const savePack = async (pack: CreditPack) => {
    setSaving(true);
    const { id, ...rest } = pack;
    await supabase.from('credit_packs').update(rest).eq('id', id);
    toast.success('Credit pack saved');
    setSaving(false);
  };

  const addPack = async () => {
    const { data } = await supabase.from('credit_packs').insert({
      name: 'New Pack', credits: 100, bonus_credits: 0, price_inr: 99, price_usd: 1.99, sort_order: packs.length + 1,
    }).select().single();
    if (data) setPacks(p => [...p, { ...data, price_inr: Number(data.price_inr), price_usd: Number(data.price_usd) }]);
  };

  const deletePack = async (id: string) => {
    await supabase.from('credit_packs').delete().eq('id', id);
    setPacks(p => p.filter(x => x.id !== id));
  };

  /* ─── Subscription Plan CRUD ─── */
  const savePlan = async (plan: SubPlan) => {
    setSaving(true);
    const { id, ...rest } = plan;
    await supabase.from('subscription_plans').update({ ...rest, features: rest.features }).eq('id', id);
    toast.success('Subscription plan saved');
    setSaving(false);
  };

  const addPlan = async () => {
    const { data } = await supabase.from('subscription_plans').insert({
      name: 'New Plan', monthly_credits: 500, price_inr: 199, price_usd: 2.99,
      features: ['500 credits/month'], sort_order: plans.length + 1,
    }).select().single();
    if (data) setPlans(p => [...p, {
      ...data,
      price_inr: Number(data.price_inr),
      price_usd: Number(data.price_usd),
      features: Array.isArray(data.features) ? data.features as string[] : [],
    }]);
  };

  const deletePlan = async (id: string) => {
    await supabase.from('subscription_plans').delete().eq('id', id);
    setPlans(p => p.filter(x => x.id !== id));
  };

  /* ─── Welcome Offer save ─── */
  const saveOffer = async () => {
    if (!offer) return;
    setSaving(true);
    await supabase.from('welcome_offer_settings').update(offer).eq('id', offer.id);
    toast.success('Welcome offer updated');
    setSaving(false);
  };

  const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) => (
    <div>
      <label className="label-caps block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/60" />
    </div>
  );

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING PRICING...</p>;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border">
        {([['packs', 'Credit Packs'], ['plans', 'Subscription Plans'], ['offer', 'Welcome Offer']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── CREDIT PACKS ─── */}
      {tab === 'packs' && (
        <div className="space-y-3">
          {packs.map(pack => (
            <div key={pack.id} className="bg-surface border border-border rounded p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="NAME" value={pack.name} onChange={v => setPacks(p => p.map(x => x.id === pack.id ? { ...x, name: v } : x))} />
                <Field label="CREDITS" type="number" value={pack.credits} onChange={v => setPacks(p => p.map(x => x.id === pack.id ? { ...x, credits: Number(v) } : x))} />
                <Field label="BONUS CREDITS" type="number" value={pack.bonus_credits} onChange={v => setPacks(p => p.map(x => x.id === pack.id ? { ...x, bonus_credits: Number(v) } : x))} />
                <Field label="PRICE (₹ INR)" type="number" value={pack.price_inr} onChange={v => setPacks(p => p.map(x => x.id === pack.id ? { ...x, price_inr: Number(v) } : x))} />
                <Field label="PRICE ($ USD)" type="number" value={pack.price_usd} onChange={v => setPacks(p => p.map(x => x.id === pack.id ? { ...x, price_usd: Number(v) } : x))} />
                <div className="flex items-end gap-2">
                  <button onClick={() => savePack(pack)} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50">
                    <Save className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => deletePack(pack.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-spend/10 border border-spend/20 text-spend rounded text-xs font-medium hover:bg-spend/20">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addPack} className="flex items-center gap-2 px-4 py-2 bg-surface border border-dashed border-border rounded text-xs text-foreground-muted hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
            <Plus className="w-3.5 h-3.5" /> Add Credit Pack
          </button>
        </div>
      )}

      {/* ─── SUBSCRIPTION PLANS ─── */}
      {tab === 'plans' && (
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-surface border rounded p-4 space-y-3 ${plan.is_popular ? 'border-primary/40' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                {plan.is_popular && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                <span className="text-xs font-medium text-foreground">{plan.name}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="NAME" value={plan.name} onChange={v => setPlans(p => p.map(x => x.id === plan.id ? { ...x, name: v } : x))} />
                <Field label="MONTHLY CREDITS" type="number" value={plan.monthly_credits} onChange={v => setPlans(p => p.map(x => x.id === plan.id ? { ...x, monthly_credits: Number(v) } : x))} />
                <Field label="PRICE (₹ INR)/mo" type="number" value={plan.price_inr} onChange={v => setPlans(p => p.map(x => x.id === plan.id ? { ...x, price_inr: Number(v) } : x))} />
                <Field label="PRICE ($ USD)/mo" type="number" value={plan.price_usd} onChange={v => setPlans(p => p.map(x => x.id === plan.id ? { ...x, price_usd: Number(v) } : x))} />
                <div className="flex items-center gap-3 col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={plan.is_popular} onChange={e => setPlans(p => p.map(x => x.id === plan.id ? { ...x, is_popular: e.target.checked } : x))} />
                    <span className="text-xs text-foreground-muted">Mark as Popular</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={plan.is_active} onChange={e => setPlans(p => p.map(x => x.id === plan.id ? { ...x, is_active: e.target.checked } : x))} />
                    <span className="text-xs text-foreground-muted">Active</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="label-caps block mb-1">FEATURES (one per line)</label>
                <textarea value={plan.features.join('\n')} rows={4}
                  onChange={e => setPlans(p => p.map(x => x.id === plan.id ? { ...x, features: e.target.value.split('\n') } : x))}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/60 resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => savePlan(plan)} disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  <Save className="w-3 h-3" /> Save
                </button>
                <button onClick={() => deletePlan(plan.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-spend/10 border border-spend/20 text-spend rounded text-xs font-medium hover:bg-spend/20">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addPlan} className="flex items-center gap-2 px-4 py-2 bg-surface border border-dashed border-border rounded text-xs text-foreground-muted hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>
      )}

      {/* ─── WELCOME OFFER ─── */}
      {tab === 'offer' && offer && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-surface border border-border rounded p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-foreground">Welcome Offer Settings</span>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={offer.is_enabled} onChange={e => setOffer(o => o ? { ...o, is_enabled: e.target.checked } : o)} />
              <span className="text-xs text-foreground">Enable welcome offer for new signups</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="OFFER CREDITS" type="number" value={offer.offer_credits} onChange={v => setOffer(o => o ? { ...o, offer_credits: Number(v) } : o)} />
              <Field label="OFFER PRICE (₹ INR)" type="number" value={offer.offer_price_inr} onChange={v => setOffer(o => o ? { ...o, offer_price_inr: Number(v) } : o)} />
              <Field label="OFFER PRICE ($ USD)" type="number" value={offer.offer_price_usd} onChange={v => setOffer(o => o ? { ...o, offer_price_usd: Number(v) } : o)} />
              <Field label="SUB DISCOUNT (%)" type="number" value={offer.subscription_discount_pct} onChange={v => setOffer(o => o ? { ...o, subscription_discount_pct: Number(v) } : o)} />
            </div>
            <div className="bg-surface-elevated rounded p-3 text-xs text-foreground-muted">
              <strong className="text-foreground">Preview:</strong> New users see "{offer.offer_credits} credits for ₹{offer.offer_price_inr}" OR "{offer.subscription_discount_pct}% off first subscription"
            </div>
            <button onClick={saveOffer} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save Offer Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
