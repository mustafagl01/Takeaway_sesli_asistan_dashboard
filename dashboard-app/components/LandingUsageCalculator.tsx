'use client';

import { useMemo, useState } from 'react';
import {
  calculateBestMonthlyUsageInPennies,
  PLATFORM_MONTHLY_FEE_PENCE,
  PRINTER_ONE_TIME_FEE_PENCE,
} from '@/lib/pricing';

function pounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function LandingUsageCalculator() {
  const [minutes, setMinutes] = useState(300);
  const best = useMemo(() => calculateBestMonthlyUsageInPennies(minutes), [minutes]);
  const usagePence = best.usagePence;
  const monthlyPence = PLATFORM_MONTHLY_FEE_PENCE + usagePence;
  const usageLabel = best.packageMinutes
    ? `${best.packageMinutes.toLocaleString('tr-TR')} dk kontör${best.overageMinutes > 0 ? ` + ${best.overageMinutes} dk PAYG` : ''}`
    : `${minutes} dk PAYG`;

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
        max="1500"
        step="25"
        value={minutes}
        onChange={(event) => setMinutes(Number(event.target.value))}
        className="mt-4 w-full accent-[#ffb547]"
      />
      <div className="mt-2 flex justify-between text-xs text-white/40">
        <span>0 dk</span><span>750 dk</span><span>1.500 dk</span>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <PriceCell label="Sabit sistem" value={pounds(PLATFORM_MONTHLY_FEE_PENCE)} />
        <PriceCell label={usageLabel} value={pounds(usagePence)} />
        <PriceCell label="Tahmini aylık" value={pounds(monthlyPence)} emphasis />
      </div>
      <p className="mt-5 text-xs leading-5 text-white/55">
        Bu bir tahmindir. Gerçek fatura, gerçekleşen konuşma süresine göre hesaplanır; kullanılmayan dakika için ödeme yapılmaz.
      </p>
    </div>
  );
}

function PriceCell({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-[#ffb547] bg-[#ffb547] text-[#12221d]' : 'border-white/10 bg-white/5'}`}>
      <p className={`text-xs ${emphasis ? 'text-[#12221d]/65' : 'text-white/50'}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
