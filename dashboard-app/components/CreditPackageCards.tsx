'use client';

import Link from 'next/link';
import { ArrowRight, Check, Loader2, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import {
  PAYG_RATE_PENCE,
  PLATFORM_MONTHLY_FEE_PENCE,
} from '@/lib/pricing';

type CreditPackageCardsProps = {
  variant?: 'landing' | 'dashboard';
  purchaseEnabled?: boolean;
};

type CheckoutResponse = { url?: string; error?: string };

const packages = [
  {
    minutes: 500,
    price: 115,
    rate: 23,
    saving: 10,
    title: 'Başlangıç',
    description: 'Telefon siparişi henüz düşük olan dükkânlar için.',
    popular: false,
  },
  {
    minutes: 1_000,
    price: 210,
    rate: 21,
    saving: 40,
    title: 'Yoğun',
    description: 'Düzenli telefon siparişi alan işletmeler için.',
    popular: true,
  },
  {
    minutes: 2_000,
    price: 400,
    rate: 20,
    saving: 100,
    title: 'Hacimli',
    description: 'En düşük dakika maliyetini isteyen yoğun dükkânlar için.',
    popular: false,
  },
] as const;

export default function CreditPackageCards({
  variant = 'landing',
  purchaseEnabled = false,
}: CreditPackageCardsProps) {
  const [loadingMinutes, setLoadingMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dashboard = variant === 'dashboard';

  async function buyPackage(minutes: number) {
    setLoadingMinutes(minutes);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.url) throw new Error(data.error || 'Ödeme sayfası açılamadı.');
      window.location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Ödeme sayfası açılamadı.');
      setLoadingMinutes(null);
    }
  }

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {packages.map((item) => {
          const loading = loadingMinutes === item.minutes;
          return (
            <article
              key={item.minutes}
              className={dashboard
                ? `relative flex flex-col rounded-[24px] border p-6 ${item.popular ? 'border-emerald-400 bg-emerald-50/70 shadow-[0_20px_55px_rgba(16,185,129,0.12)] dark:border-emerald-600 dark:bg-emerald-950/25' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`
                : `relative flex flex-col rounded-[26px] border p-6 ${item.popular ? 'border-[#087443] bg-[#f2fbf5] shadow-[0_22px_60px_rgba(8,116,67,0.13)]' : 'border-[#17231f]/12 bg-white'}`}
            >
              {item.popular ? (
                <span className={dashboard
                  ? 'absolute -top-3 right-5 rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white'
                  : 'absolute -top-3 right-5 rounded-full bg-[#087443] px-3 py-1 text-xs font-black text-white'}
                >
                  En çok tercih edilen
                </span>
              ) : null}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={dashboard ? 'text-sm font-bold text-slate-500 dark:text-slate-400' : 'text-sm font-bold text-[#17231f]/55'}>{item.title}</p>
                  <h3 className="mt-1 text-2xl font-black">{item.minutes.toLocaleString('tr-TR')} dakika</h3>
                </div>
                <span className={dashboard
                  ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ef] text-[#087443]'}
                >
                  <TrendingDown className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <strong className="text-4xl font-black">£{item.price}</strong>
                <span className={dashboard ? 'pb-1 text-sm text-slate-500 dark:text-slate-400' : 'pb-1 text-sm text-[#17231f]/55'}>tek seferlik</span>
              </div>

              <div className={dashboard
                ? 'mt-4 flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 text-sm dark:bg-slate-950/50'
                : 'mt-4 flex items-center justify-between rounded-xl bg-[#f7f3e9] px-4 py-3 text-sm'}
              >
                <span>Dakika fiyatı</span>
                <strong className={dashboard ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#087443]'}>{item.rate}p/dk</strong>
              </div>

              <p className={dashboard ? 'mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300' : 'mt-4 text-sm leading-6 text-[#17231f]/65'}>{item.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold">
                <Check className={dashboard ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-[#087443]'} />
                Standart 25p tarifeye göre £{item.saving} tasarruf
              </div>

              <div className="mt-auto pt-6">
                {dashboard ? (
                  purchaseEnabled ? (
                    <button
                      type="button"
                      onClick={() => buyPackage(item.minutes)}
                      disabled={loadingMinutes !== null}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-emerald-300"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {loading ? 'Açılıyor…' : 'Kontör satın al'}
                    </button>
                  ) : (
                    <a href="#platform-plan" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3.5 text-center font-bold transition hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:hover:text-emerald-300">
                      Önce aylık sistemi etkinleştir
                    </a>
                  )
                ) : (
                  <Link href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#17231f] px-4 py-3.5 font-black text-white transition hover:bg-[#087443]">
                    Bu tarifeyle başla <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>
      ) : null}

      <p className={dashboard ? 'mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400' : 'mt-5 text-center text-xs leading-5 text-[#17231f]/55'}>
        Toplu kontör isteğe bağlıdır. £{(PLATFORM_MONTHLY_FEE_PENCE / 100).toFixed(2)} aylık sistem bedeli ayrıca devam eder; kontörler bitene kadar geçerlidir.
      </p>
    </div>
  );
}
