import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { CreditCard, Printer, ReceiptText } from 'lucide-react';
import ActiveSubscriptionWidget from '@/components/ActiveSubscriptionWidget';
import PlatformPlanCard from '@/components/PlatformPlanCard';
import CreditPackageCards from '@/components/CreditPackageCards';
import { getActiveSubscription, getUserById } from '@/lib/db';
import { getPlatformBillingState, isPlatformSubscriptionActive } from '@/lib/platform-billing';
import { sql } from '@vercel/postgres';

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [user, usagePlan] = await Promise.all([
    getUserById(session.user.id),
    getActiveSubscription(session.user.id),
  ]);

  if (!user) {
    redirect('/login');
  }

  const [platformState, printerRows] = await Promise.all([
    getPlatformBillingState(user.stripe_customer_id),
    sql<{ purchased: boolean }>`
      SELECT EXISTS(
        SELECT 1 FROM billing_events
        WHERE business_id = ${session.user.id}
          AND event_type = 'platform_subscription_started_with_printer'
      ) AS purchased
    `,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_42%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Faturalandırma
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Sabit sistem ücreti, şeffaf dakika kullanımı.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Kurulum ücretsizdir. Aylık aboneliği Stripe ile başlatın; gerçekleşen telefon kullanımı haftalık olarak ayrıca tahsil edilir.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <PlatformPlanCard
          status={platformState.status}
          printerPurchased={!!printerRows.rows[0]?.purchased}
          currentPeriodEnd={platformState.currentPeriodEnd}
        />

        {usagePlan ? (
          <section>
            <div className="mb-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Kullanım durumu</p>
              <h2 className="mt-2 text-2xl font-black">Aktif dakika hesabınız</h2>
            </div>
            <ActiveSubscriptionWidget />
          </section>
        ) : null}

        <section>
          <div className="mb-5 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">İsteğe bağlı toplu kontör</p>
            <h2 className="mt-2 text-3xl font-black">Daha çok kullanın, dakika fiyatını düşürün.</h2>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Standart 25p/dk kullanım devam eder. Düzenli sipariş alan işletmeler toplu kontör alarak 20p/dk’ya kadar daha düşük fiyattan kullanabilir.
            </p>
          </div>
          <CreditPackageCards
            variant="dashboard"
            purchaseEnabled={isPlatformSubscriptionActive(platformState.status)}
          />
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <InfoCard
            icon={<CreditCard className="h-5 w-5" />}
            title="£9.90 aylık"
            description="Asistan, yönetim paneli ve sistem bakımının sabit bedeli. Stripe tarafından her ay otomatik yenilenir."
          />
          <InfoCard
            icon={<ReceiptText className="h-5 w-5" />}
            title="25p’den başlayan kullanım"
            description="Paketsiz kullanım 25p/dk olarak haftalık tahsil edilir. Toplu kontör seçeneklerinde birim fiyat 20p/dk’ya kadar düşer."
          />
          <InfoCard
            icon={<Printer className="h-5 w-5" />}
            title="£199 yazıcı"
            description="Termal sipariş yazıcısı tek seferliktir; aylık ücrete tekrar eklenmez. Uyumlu yazıcınız varsa zorunlu değildir."
          />
        </section>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {icon}
      </div>
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}
