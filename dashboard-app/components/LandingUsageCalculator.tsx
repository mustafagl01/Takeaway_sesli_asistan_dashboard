'use client';

import { useMemo, useState } from 'react';
import {
  calculateBestMonthlyUsageInPennies,
  MAX_PACKAGE_MINUTES,
  PLATFORM_MONTHLY_FEE_PENCE,
  PRINTER_ONE_TIME_FEE_PENCE,
} from '@/lib/pricing';

function pounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

// Mirrors the rate bands in lib/pricing.ts.
const TIER_BANDS = [
  { upTo: 200, rate: 25, label: '0-200 dk' },
  { upTo: 500, rate: 23, label: '201-500 dk' },
  { upTo: 1_000, rate: 21, label: '501-1.000 dk' },
  { upTo: MAX_PACKAGE_MINUTES, rate: 20, label: '1.001-2.000 dk' },
];

export default function LandingUsageCalculator() {
  const [minutes, setMinutes] = useState(300);
  const best = useMemo(() => calculateBestMonthlyUsageInPennies(minutes), [minutes]);
  const monthlyPence = PLATFORM_MONTHLY_FEE_PENCE + best.usagePence;

  return (
    <div className="rounded-[28px] bg-[#12221d] p-6 text-white shadow-[0_30px_80px_rgba(18,34,29,0.24)] sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9ee7bd]">Maliyet hesaplayıcı</p>
          <h3 className="mt-2 text-2xl font-black">Dükkânınız ne kadar kullanır?</h3>
        </div>
        <p className="text-sm text-white/60">Yazıcı ilk ay ayrıca {pounds(PRINTER_ONE_TIME_FEE_PENCE)}</p>
      </div>

      <label htmlFor="landing-minutes" className="mt-8 block text-sm text-white/70">
        Aylık tahmini konuşma: <strong className="text-white">{minutes} dakika</strong>
      </label>
      <input
        id="landing-minutes"
        type="range"
        min="0"
        max={MAX_PACKAGE_MINUTES}
        step="25"
        value={minutes}
        onChange={(event) => setMinutes(Number(event.target.value))}
        className="mt-4 w-full accent-[#ffb547]"
      />
      <div className="mt-2 flex justify-between text-xs text-white/40">
        <span>0 dk</span>
        <span>{MAX_PACKAGE_MINUTES.toLocaleString('tr-TR')} dk</span>
      </div>

      <div className="mt-8 rounded-2xl border border-[#ffb547] bg-[#ffb547] p-5 text-[#12221d]">
        <p className="text-sm font-bold text-[#12221d]/65">Tahmini aylık toplam</p>
        <p className="mt-1 text-4xl font-black">{pounds(monthlyPence)}</p>
        <p className="mt-3 text-sm font-semibold text-[#12221d]/70">
          £{(PLATFORM_MONTHLY_FEE_PENCE / 100).toFixed(2)} sistem + {minutes.toLocaleString('tr-TR')} dk × {best.ratePence}p
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm font-bold text-white/80">Dakika fiyatı kullanıma göre düşer</p>
        <ul className="mt-3 space-y-1.5">
          {TIER_BANDS.map((band) => {
            const active = best.ratePence === band.rate;
            return (
              <li
                key={band.upTo}
                className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                  active ? 'bg-[#ffb547] font-bold text-[#12221d]' : 'text-white/55'
                }`}
              >
                <span>{band.label}</span>
                <span className="font-bold">{band.rate}p / dk</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-5 text-xs leading-5 text-white/55">
        Bu bir tahmindir. Gerçek fatura, gerçekleşen konuşma süresine göre hesaplanır; kullanılmayan dakika için ödeme yapılmaz.
      </p>
    </div>
  );
}
