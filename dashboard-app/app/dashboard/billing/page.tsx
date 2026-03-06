import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import PricingSlider from '@/components/PricingSlider';
import PricingTiers from '@/components/PricingTiers';
import ActiveSubscriptionWidget from '@/components/ActiveSubscriptionWidget';

export default async function BillingPage() {
    const session = await auth();

    if (!session || !session.user?.id) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                        Paket Yönetimi ve Ödeme
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        İhtiyacınıza en uygun dakikayı seçin. Sadece kullandığınız kadar öder,
                        fazladan personel maliyetinden kurtulursunuz.
                    </p>
                </div>

                <div className="mb-12">
                    <ActiveSubscriptionWidget />
                </div>

                {/* Pricing Tier Cards — at-a-glance comparison */}
                <div className="mb-16">
                    <PricingTiers />
                </div>

                {/* Interactive Slider — fine-tune exact minutes */}
                <div className="mt-8">
                    <PricingSlider />
                </div>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        title="Dinamik Fiyatlandırma"
                        description="Sabit paketlere hapsolmayın. İhtiyacınız değiştikçe paketini anlık güncelleyin."
                        index={1}
                    />
                    <FeatureCard
                        title="Stripe Güvencesi"
                        description="Tüm ödemeleriniz dünyaca güvenli Stripe altyapısı ile şifrelenmiş olarak gerçekleşir."
                        index={2}
                    />
                    <FeatureCard
                        title="Sınırsız Ölçeklenebilirlik"
                        description="Aynı anda 100 çağrı gelse bile sisteminiz asla 'meşgul' tonu vermez."
                        index={3}
                    />
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ title, description, index }: { title: string, description: string, index: number }) {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold mb-4">
                {index}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
    );
}
