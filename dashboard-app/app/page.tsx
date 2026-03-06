import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, PhoneCall, Clock, CheckCircle, TrendingUp, Mic, ChefHat, Volume2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="aurora-bg">
        <div className="aurora-layer aurora-layer-1"></div>
        <div className="aurora-layer aurora-layer-2"></div>
        <div className="aurora-layer aurora-layer-3"></div>
        <div className="noise-overlay"></div>
      </div>
      <div className="absolute inset-0 grid-pattern z-0 opacity-50"></div>

      {/* Navbar */}
      <nav className="relative z-50 w-full px-6 py-4 flex justify-between items-center glass-card border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center icon-glow">
            <Volume2 className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
            AloSipariş Yapay Zeka
          </span>
        </div>
        <div>
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center gap-2"
          >
            Müşteri Girişi (Dashboard)
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Text */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-indigo-500/30 text-indigo-300 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              İngiltere'deki Paket Servisler İçin Özel Üretildi
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Telefonlara <br />
              <span className="gradient-text">Yapay Zeka</span> Baksın, <br />
              Siz Kebabı Pişirin!
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed max-w-xl">
              Cuma-Cumartesi akşamları telefonlar susmuyor, siparişler karışıyor ve eleman yetiştiremiyor musunuz? Kusursuz İngilizcesiyle müşterilerinizden sipariş alan, menünüzü bilen sanal asistanınızla tanışın.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="#features"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_50px_rgba(99,102,241,0.6)] hover:-translate-y-1 flex items-center gap-2"
              >
                Nasıl Çalışır?
              </Link>

              <Link
                href="/login"
                className="px-8 py-4 rounded-xl glass-card hover:bg-white/10 text-white font-bold text-lg transition-all duration-300 hover:-translate-y-1"
              >
                Yönetim Paneline Git
              </Link>
            </div>

            <div className="flex items-center gap-4 pt-6 opacity-80">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">UK</div>
                <div className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-purple-500 flex items-center justify-center text-xs font-bold text-white">AI</div>
                <div className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-emerald-500 flex items-center justify-center flex-col leading-none text-white">
                  <span className="text-[10px]">%</span>
                  <span className="text-[12px] font-bold">100</span>
                </div>
              </div>
              <p className="text-sm text-slate-400">Şimdiden Onlarca Dükkan Kullanıyor <br />(Sıfır Kaçan Müşteri)</p>
            </div>
          </div>

          {/* Right Image/Illustration Area */}
          <div className="relative animate-scale-in animate-delay-200">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full"></div>
            <div className="gradient-border-card p-2 aurora-glow hover-lift">
              <div className="relative rounded-xl overflow-hidden aspect-square md:aspect-[4/3] bg-slate-900 border border-white/10 flex items-center justify-center">
                {/* Fallback pattern while image generates, but we'll try to load hero.png */}
                <Image
                  src="/images/hero.png"
                  alt="AI Voice Assistant taking orders"
                  width={800} height={600}
                  className="object-cover w-full h-full relative z-10"
                />

                {/* Fallback container if image fails to load */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-900 to-indigo-950 -z-10">
                  <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/50 icon-glow animate-pulse">
                    <Mic className="w-12 h-12 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Telefonda Akıcı İngilizce</h3>
                  <p className="text-indigo-200">Siparişleri anında ekrana ve yazıcıya gönderir.</p>
                </div>

                {/* Floating Elements on top of the image */}
                <div className="absolute top-6 right-6 glass-card px-4 py-3 rounded-xl flex items-center gap-3 animate-float slideInRight border-emerald-500/30">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">Yeni Sipariş</p>
                    <p className="text-sm font-bold text-white">Large Doner Kebab - £9.50</p>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 glass-card px-4 py-3 rounded-xl flex items-center gap-3 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">Aktif Çağrı</p>
                    <p className="text-sm font-bold text-white">"Yes, I want garlic mayo..."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 border-t border-white/5 bg-slate-900/50 backdrop-blur-sm py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Bir Eleman Maaşının Çok Altına,<br /><span className="gradient-text">Kusursuz Hizmet</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              "Eleman gelmedi, telefonlara kim bakacak, İngilizcesi iyi değil yanlış anladı, fiyatı eksik hesapladı" derdine kalıcı çözüm.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock />}
              title="7/24 Kesintisiz Çalışır"
              description="Hasta olmaz, yorulmaz, izin günü yoktur. Her telefona aynı nezaket ve enerjiyle 'Hello, welcome to our takeaway' diyerek açar."
              color="from-blue-500/20 to-cyan-500/20"
              borderColor="border-cyan-500/30"
              iconColor="text-cyan-400"
            />
            <FeatureCard
              icon={<ChefHat />}
              title="Siz Sadece Yemeğe Odaklanın"
              description="Aldığı siparişi saniyeler içinde doğrudan yönetim panelinize (veya desteklenen termal yazıcınıza) gönderir. Yanlış sipariş dönemi bitti."
              color="from-purple-500/20 to-pink-500/20"
              borderColor="border-purple-500/30"
              iconColor="text-purple-400"
            />
            <FeatureCard
              icon={<TrendingUp />}
              title="Ciro Kaybını Önler"
              description="Aynı anda birden fazla çağrı altyapısı kurulabilir. Meşgul çalan telefonlar yüzünden rakip dükkana giden müşterileri kurtarır."
              color="from-emerald-500/20 to-teal-500/20"
              borderColor="border-emerald-500/30"
              iconColor="text-emerald-400"
            />
          </div>
        </div>
      </section>

      {/* Footer / CTA block */}
      <footer className="relative z-10 border-t border-white/10 py-12 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <div className="glass-card p-10 rounded-2xl border border-indigo-500/30 aurora-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 -z-10"></div>
            <h2 className="text-3xl font-bold mb-4 text-white">Müşteriniz Olalım Dükkanınızı Büyütelim</h2>
            <p className="text-slate-300 mb-8">
              Sistemi incelemek ve kendi dükkanınıza özel yapılandırma seçeneklerini görmek için giriş yapın.
            </p>
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl bg-white text-indigo-900 font-bold text-lg hover:bg-slate-100 transition-all inline-block hover-lift"
            >
              Hemen Panele Giriş Yap
            </Link>
          </div>

          <p className="text-slate-500 mt-12 text-sm">
            © {new Date().getFullYear()} UK Takeaway AI Assistant. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, borderColor, iconColor }: any) {
  return (
    <div className={`glass-card p-8 rounded-2xl border ${borderColor} hover-lift transition-all duration-300 relative overflow-hidden group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className="relative z-10">
        <div className={`w-14 h-14 rounded-xl glass-card flex items-center justify-center border border-white/10 mb-6 ${iconColor} icon-glow`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
