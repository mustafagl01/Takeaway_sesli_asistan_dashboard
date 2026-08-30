'use client';

import { useMemo, useState } from 'react';
import { Check, CreditCard, Printer, ShieldCheck } from 'lucide-react';
import {
  PAYG_RATE_PENCE,
  PLATFORM_MONTHLY_FEE_PENCE,
  PRINTER_ONE_TIME_FEE_PENCE,
} from '@/lib/pricing';

interface PlatformPlanCardProps {
  status?: string | null;
  printerPurchased?: boolean;
  currentPeriodEnd?: string | null;
}

type CheckoutResponse = { url?: string; error?: string };

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function isActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

function hasManageableSubscription(status: string | null | undefined): boolean {
  return !!status && !['inactive', 'canceled', 'incomplete_expired'].includes(status);
}

export default function PlatformPlanCard({
  status,
  printerPurchased = false,
  currentPeriodEnd,
}: PlatformPlanCardProps) {
  const active = isActive(status);
  const manageable = hasManageableSubscription(status);
  const [includePrinter, setIncludePrinter] = useState(!printerPurchased);
  const [minutes, setMinutes] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedMonthlyPence = useMemo(
    () => PLATFORM_MONTHLY_FEE_PENCE + minutes * PAYG_RATE_PENCE,
    [minutes]
  );

  async function openCheckout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/platform-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includePrinter }),
      });
      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.url) throw new Error(data.error || 'Odeme sayfasi acilamadi.');
      window.location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Odeme sayfasi acilamadi.');
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.url) throw new Error(data.error || 'Fatura portali acilamadi.');
      window.location.href = data.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Fatura portali acilamadi.');
      setLoading(false);
    }
  }

  return (
    <section id="platform-plan" className="scroll-mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 sm:p-9">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {active ? 'Sistem aktif' : manageable ? 'Ödeme kontrolü gerekli' : 'Tek sade plan'}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Kurulum ücreti £0</span>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              {formatPounds(PLATFORM_MONTHLY_FEE_PENCE)}
            </span>
            <span className="pb-1.5 text-slate-500 dark:text-slate-400">/ ay</span>
          </div>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Telefon hattı entegrasyonu, sipariş asistanı, panel ve sistem bakımı. Standart kullanım {PAYG_RATE_PENCE}p/dk; isterseniz toplu kontörle 20p/dk’ya kadar düşer.
          </p>

          <ul className="mt-7 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200">
            {[
              'Menünüze göre özel kurulum',
              'Siparişi tekrar okuyup onaylama',
              'Yazıcıya otomatik sipariş fişi',
              'Kullanımı panelden takip etme',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {!printerPurchased && !manageable ? (
            <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <input
                type="checkbox"
                checked={includePrinter}
                onChange={(event) => setIncludePrinter(event.target.checked)}
                className="mt-1 h-4 w-4 accent-amber-600"
              />
              <span>
                <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Printer className="h-4 w-4" /> Termal yazıcı ekle — {formatPounds(PRINTER_ONE_TIME_FEE_PENCE)}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Tek seferlik ücret. Zaten uyumlu yazıcınız varsa işareti kaldırabilirsiniz.
                </span>
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={manageable ? openPortal : openCheckout}
            disabled={loading}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-emerald-300"
          >
            {manageable ? <CreditCard className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            {loading ? 'Açılıyor…' : manageable ? 'Faturaları ve kartı yönet' : 'Güvenli ödeme sayfasına geç'}
          </button>

          {active && currentPeriodEnd ? (
            <p className="mt-3 text-xs text-slate-500">
              Mevcut fatura dönemi: {new Date(currentPeriodEnd).toLocaleDateString('en-GB')}
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-slate-950 p-6 text-white sm:p-9 lg:border-l lg:border-t-0 dark:border-slate-700">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Aylık maliyet örneği</p>
          <label htmlFor="usage-estimate" className="mt-6 block text-sm text-slate-300">
            Tahmini konuşma: <strong className="text-white">{minutes} dakika</strong>
          </label>
          <input
            id="usage-estimate"
            type="range"
            min="0"
            max="1500"
            step="25"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="mt-4 w-full accent-emerald-400"
          />

          <div className="mt-7 space-y-3 border-y border-white/10 py-6 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Sistem</span><span>{formatPounds(PLATFORM_MONTHLY_FEE_PENCE)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">{minutes} dk × {PAYG_RATE_PENCE}p</span><span>{formatPounds(minutes * PAYG_RATE_PENCE)}</span></div>
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <span className="text-sm text-slate-400">Tahmini aylık toplam</span>
            <strong className="text-3xl">{formatPounds(estimatedMonthlyPence)}</strong>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            Yazıcı yalnızca ilk ödemede eklenir. Bu örnek standart 25p/dk kullanımı gösterir; toplu kontör alırsanız birim fiyat daha düşer.
          </p>
        </div>
      </div>
    </section>
  );
}
