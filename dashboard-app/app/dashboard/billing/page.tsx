import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import PricingSlider from '@/components/PricingSlider';
import PricingTiers from '@/components/PricingTiers';
import ActiveSubscriptionWidget from '@/components/ActiveSubscriptionWidget';
import { getActiveSubscription } from '@/lib/db';

export default async function BillingPage() {
    const session = await auth();

    if (!session || !session.user?.id) {
        redirect('/login');
    }

    const subscription = await getActiveSubscription(session.user.id);
    const hasActivePackage = subscription?.status === 'active';

    return (
        <>
            {/* Aurora Background */}
            <div className="aurora-bg">
                <div className="aurora-layer aurora-layer-1" />
                <div className="aurora-layer aurora-layer-2" />
                <div className="aurora-layer aurora-layer-3" />
                <div className="noise-overlay" />
            </div>

            <div className="relative min-h-screen">
                {/* Hero Section */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 grid-pattern opacity-50" />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
                        <div className="text-center animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/50 dark:border-amber-700/50 mb-6">
                                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    Billing & Plans
                                </span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                                <span className="gradient-text">Paket Yönetimi</span>
                            </h1>
                            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                                İhtiyacınıza en uygun dakika paketini seçin. Satın aldığınız dakikaları bitene kadar kullanın, süre sınırı olmadan esnekliğin tadını çıkarın.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    {/* Active Subscription */}
                    <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <ActiveSubscriptionWidget />
                    </div>

                    {hasActivePackage ? (
                        <div className="mb-16 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <div className="max-w-3xl mx-auto rounded-2xl border border-indigo-200/60 dark:border-indigo-700/60 bg-indigo-50/70 dark:bg-indigo-950/20 p-6 text-center">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Aktif paketiniz kullanimda
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Paketiniz bitmeye yaklastiginda veya yeni paketi planlamak istediginizde bu sayfada
                                    sonraki satin alim secenekleri tekrar gosterilecektir.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Pricing Tier Cards */}
                            <div className="mb-16 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                <PricingTiers />
                            </div>

                            {/* Interactive Slider */}
                            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                                <PricingSlider />
                            </div>
                        </>
                    )}

                    {/* Feature Cards */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCard
                            title="Dinamik Fiyatlandırma"
                            description="Sabit paketlere hapsolmayın. İhtiyacınız değiştikçe paketini anlık güncelleyin."
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            }
                            delay="400ms"
                        />
                        <FeatureCard
                            title="Stripe Güvencesi"
                            description="Tüm ödemeleriniz dünyaca güvenli Stripe altyapısı ile şifrelenmiş olarak gerçekleşir."
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            }
                            delay="500ms"
                        />
                        <FeatureCard
                            title="Sınırsız Ölçeklenebilirlik"
                            description="Aynı anda 100 çağrı gelse bile sisteminiz asla 'meşgul' tonu vermez."
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            }
                            delay="600ms"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

function FeatureCard({ title, description, icon, delay }: { title: string, description: string, icon: React.ReactNode, delay: string }) {
    return (
        <div className="gradient-border-card p-6 hover-lift aurora-glow opacity-0 animate-fade-in-up bg-gradient-to-br from-indigo-500/20 via-indigo-500/5 to-purple-500/20 border-indigo-200/50 dark:border-indigo-700/50" style={{ animationDelay: delay }}>
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
    );
}
