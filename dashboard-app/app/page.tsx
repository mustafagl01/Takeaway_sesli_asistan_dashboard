import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChefHat,
  CirclePoundSterling,
  Headphones,
  MessageSquareText,
  Phone,
  Printer,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import LandingUsageCalculator from '@/components/LandingUsageCalculator';
import CreditPackageCards from '@/components/CreditPackageCards';
import {
  PAYG_RATE_PENCE,
  PLATFORM_MONTHLY_FEE_PENCE,
  PRINTER_ONE_TIME_FEE_PENCE,
} from '@/lib/pricing';

const monthlyPrice = (PLATFORM_MONTHLY_FEE_PENCE / 100).toFixed(2);
const printerPrice = (PRINTER_ONE_TIME_FEE_PENCE / 100).toFixed(0);

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f3e9] text-[#17231f] selection:bg-[#ffb547] selection:text-[#17231f]">
      <header className="relative z-40 border-b border-[#17231f]/10 bg-[#f7f3e9]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="AloSipariş ana sayfa">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#17231f] text-[#ffb547]">
              <Phone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none">AloSipariş</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#17231f]/55">by MGL Systems</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex" aria-label="Ana menü">
            <a href="#nasil-calisir" className="transition hover:text-[#087443]">Nasıl çalışır?</a>
            <a href="#ozellikler" className="transition hover:text-[#087443]">Neleri yapar?</a>
            <a href="#fiyat" className="transition hover:text-[#087443]">Fiyat</a>
            <a href="#sorular" className="transition hover:text-[#087443]">Sorular</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold transition hover:bg-[#17231f]/5 sm:inline-flex">
              Giriş yap
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#17231f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#087443]">
              Demo hesabı aç <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,181,71,0.25),transparent_28%),radial-gradient(circle_at_14%_14%,rgba(8,116,67,0.12),transparent_24%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-28 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#087443]/20 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#087443]">
                <Sparkles className="h-4 w-4" /> UK takeaway’leri için telefon asistanı
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Siparişi alır.<br />Doğrular.<br /><span className="text-[#087443]">Yazıcıdan çıkarır.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#17231f]/70 sm:text-xl">
                Müşteriniz normal şekilde konuşur. Asistan menünüzü bilir, eksik seçimleri doğru sırada sorar, siparişi tekrar okuyup onaylatır ve mutfağa iletir.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#087443] px-6 py-4 font-black text-white shadow-[0_16px_35px_rgba(8,116,67,0.22)] transition hover:-translate-y-0.5 hover:bg-[#075f38]">
                  Dükkânım için dene <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#fiyat" className="inline-flex items-center justify-center rounded-2xl border border-[#17231f]/15 bg-white/60 px-6 py-4 font-black transition hover:bg-white">
                  Fiyatı hesapla
                </a>
              </div>

              <div className="mt-9 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
                <MiniPrice label="Kurulum" value="£0" />
                <MiniPrice label="Aylık" value={`£${monthlyPrice}`} />
                <MiniPrice label="Kullanım" value={`${PAYG_RATE_PENCE}p/dk`} />
                <MiniPrice label="Yazıcı" value={`£${printerPrice}`} />
              </div>
            </div>

            <HeroOrderFlow />
          </div>
        </section>

        <section id="nasil-calisir" className="border-y border-[#17231f]/10 bg-[#17231f] py-20 text-white lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9ee7bd]">Basit olması avantaj</p>
                <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Bir personel siparişi nasıl alıyorsa, aynı akış.</h2>
                <p className="mt-5 max-w-lg leading-7 text-white/65">Gereksiz uzun konuşma yok. Her ürün için yalnızca gerekli seçenekler sorulur; bilinmeyen veya riskli durumda tahmin yapılmaz.</p>
              </div>
              <ol className="grid gap-4 sm:grid-cols-3">
                <FlowStep number="01" icon={<Headphones />} title="Telefonu açar" text="Doğal bir karşılama yapar ve müşterinin ne istediğini dinler." />
                <FlowStep number="02" icon={<MessageSquareText />} title="Eksikleri tamamlar" text="Boyut, sos, salata, içecek ve teslimat bilgilerini gerektiği yerde sorar." />
                <FlowStep number="03" icon={<Printer />} title="Onaylatıp gönderir" text="Siparişi ve toplamı tekrar okur; onaydan sonra fişi yazıcıya yollar." />
              </ol>
            </div>
          </div>
        </section>

        <section id="ozellikler" className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087443]">Siparişin kritik noktaları</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Hızlı konuşur; kontrolü atlamaz.</h2>
              <p className="mt-5 text-lg leading-8 text-[#17231f]/65">Amaç sohbet etmek değil, doğru siparişi mümkün olan en kısa doğal konuşmayla tamamlamaktır.</p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Feature icon={<ChefHat />} title="Menünüze göre konuşur" text="Ürün adları, varyasyonlar, fiyatlar ve ürünle birlikte sorulması gereken seçimler işletmenize özel tanımlanır." />
              <Feature icon={<SlidersHorizontal />} title="Soruları doğru sıraya koyar" text="Önce ana ürünü netleştirir; sos, salata ve içecek gibi soruları yalnızca uygun olduğunda sorar." />
              <Feature icon={<CheckCircle2 />} title="Son kez tekrar okur" text="Ürünler, adetler, özel notlar ve sipariş türü müşteriye özetlenir; açık onay gelmeden gönderilmez." />
              <Feature icon={<ReceiptText />} title="Mutfak için temiz fiş" text="Onaylanan sipariş anlaşılır bir düzende termal yazıcıya iletilir; personelin tekrar yazması gerekmez." />
              <Feature icon={<ShieldCheck />} title="Fiyatı sistem hesaplar" text="Müşterinin söylediği toplam kabul edilmez. Fiyat, tanımlı menü ve seçilen ekstralardan hesaplanır." />
              <Feature icon={<CirclePoundSterling />} title="Kullandığınız kadar" text={`Paket almak zorunda değilsiniz: standart kullanım ${PAYG_RATE_PENCE}p/dk. Düzenli kullanımda toplu kontörle birim fiyat 20p/dk’ya kadar düşer.`} />
            </div>
          </div>
        </section>

        <section className="bg-[#e9dfca] py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087443]">Doğal konuşma örneği</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Liste okumaz. Önce basitçe sorar.</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#17231f]/65">“All salad, no salad, custom salad?” diye seçenekleri müşterinin üzerine dökmez. “Yanına salata ister misiniz?” der; müşteri seçenekleri sorarsa açıklar.</p>
              <ul className="mt-7 space-y-3 text-sm font-semibold">
                {['Müşteri kısa cevap verirse konuşmayı uzatmaz', 'Ürün adlarının farklı telaffuzlarını tanıyacak kelimeler eklenir', 'Anlamadığında tahmin etmek yerine kısa bir doğrulama sorar'].map((item) => (
                  <li key={item} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#087443]" />{item}</li>
                ))}
              </ul>
            </div>
            <ConversationCard />
          </div>
        </section>

        <section id="fiyat" className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="lg:sticky lg:top-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087443]">Sade başlangıç, hacim indirimi</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Az kullanırken 25p. Çok kullanırken 20p’ye kadar düşer.</h2>
                <p className="mt-5 text-lg leading-8 text-[#17231f]/65">Kurulum ücreti yok. İsterseniz paket almadan kullandığınız kadar ödeyin; siparişler arttığında toplu kontörle dakika fiyatınızı düşürün.</p>

                <div className="mt-8 rounded-[26px] border border-[#17231f]/12 bg-white p-6 shadow-sm">
                  <div className="flex items-baseline gap-2"><strong className="text-5xl font-black">£{monthlyPrice}</strong><span className="text-[#17231f]/55">/ ay</span></div>
                  <p className="mt-2 text-sm text-[#17231f]/60">+ {PAYG_RATE_PENCE}p / konuşma dakikası</p>
                  <div className="my-6 h-px bg-[#17231f]/10" />
                  <div className="flex items-center justify-between gap-4"><span className="font-bold">Termal yazıcı</span><strong className="text-xl">£{printerPrice}</strong></div>
                  <p className="mt-2 text-xs leading-5 text-[#17231f]/55">Tek seferlik. Uyumlu yazıcınız varsa zorunlu değildir.</p>
                  <div className="mt-6 rounded-xl bg-[#eaf7ef] p-4 text-sm font-bold text-[#075f38]">Kurulum ücreti: £0</div>
                </div>
              </div>
              <LandingUsageCalculator />
            </div>

            <div className="mt-16 border-t border-[#17231f]/10 pt-12">
              <div className="mb-8 max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087443]">İsteğe bağlı toplu kontör</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Daha çok kullanan, dakikayı daha ucuza alır.</h3>
                <p className="mt-4 leading-7 text-[#17231f]/65">Kontör almak zorunlu değil. Ancak kullanımınız düzenliyse 500, 1.000 veya 2.000 dakikalık seçeneklerle standart tarifeye göre tasarruf edebilirsiniz.</p>
              </div>
              <CreditPackageCards />
            </div>
          </div>
        </section>

        <section id="sorular" className="border-t border-[#17231f]/10 bg-white/45 py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.65fr_1.35fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087443]">Kısa cevaplar</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">Başlamadan önce merak edilenler.</h2>
            </div>
            <div className="divide-y divide-[#17231f]/10 border-y border-[#17231f]/10">
              <Faq question="Mevcut telefon numaram değişir mi?" answer="Çoğu kurulumda mevcut numara yönlendirilerek korunabilir. Numaranın sağlayıcısına göre yönlendirme veya taşıma yöntemi kurulum sırasında belirlenir." />
              <Faq question="Asistan menüyü yanlış anlarsa ne olur?" answer="Ürün adları ve telaffuz varyasyonları işletmeye özel eklenir. Emin olmadığı noktada sipariş uydurmak yerine müşteriden kısa bir tekrar ister; sonunda tüm siparişi yeniden okuyup onaylatır." />
              <Faq question="Fiyat veya menü değişince ne yapacağım?" answer="Menü ve fiyatlar yönetim tarafında güncellenir. Asistan ve sipariş hesabı aynı tanımlı veriyi kullanacak şekilde yapılandırılır." />
              <Faq question="Dakika ücreti nasıl hesaplanır?" answer={`Paket almadan standart kullanım ${PAYG_RATE_PENCE}p/dk üzerinden haftalık tahsil edilir. İsterseniz 500 dakikayı 23p/dk, 1.000 dakikayı 21p/dk veya 2.000 dakikayı 20p/dk birim fiyatla önceden alabilirsiniz. Toplu kontörler bitene kadar geçerlidir.`} />
              <Faq question="Yazıcı almak zorunlu mu?" answer="Siparişi otomatik fiş olarak almak istiyorsanız uyumlu bir termal yazıcı gerekir. Uyumlu yazıcınız zaten varsa yeni yazıcı satın almak zorunda değilsiniz." />
            </div>
          </div>
        </section>

        <section className="px-5 py-20 lg:px-8 lg:py-24">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[34px] bg-[#087443] px-6 py-12 text-white shadow-[0_30px_80px_rgba(8,116,67,0.25)] sm:px-12 lg:py-16">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[50px] border-white/8" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b9f2cf]">Menünüzle deneyin</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Bir müşteriniz aramış gibi test edin.</h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">Menünüzü birlikte tanımlayalım; ürün adlarını, sorulacak seçimleri ve yazıcı çıktısını gerçek sipariş akışında kontrol edin.</p>
              </div>
              <Link href="/signup" className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#ffb547] px-6 py-4 font-black text-[#17231f] transition hover:-translate-y-0.5 hover:bg-[#ffc368]">
                Demo hesabı oluştur <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#17231f]/10 px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#17231f]/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MGL Systems · AloSipariş</p>
          <div className="flex gap-5"><Link href="/login">Müşteri girişi</Link><Link href="/signup">Demo hesabı</Link></div>
        </div>
      </footer>
    </div>
  );
}

function MiniPrice({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold text-[#17231f]/45">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function HeroOrderFlow() {
  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      <div className="absolute -inset-8 rounded-full bg-[#087443]/8 blur-3xl" />
      <div className="relative rounded-[32px] border border-[#17231f]/12 bg-[#fffdf8] p-4 shadow-[0_35px_90px_rgba(23,35,31,0.16)] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#17231f]/10 pb-4">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf7ef] text-[#087443]"><Phone className="h-5 w-5" /></span><div><p className="font-black">Incoming order</p><p className="text-xs text-[#17231f]/45">01:42 · AI assistant</p></div></div>
          <span className="flex items-center gap-2 rounded-full bg-[#eaf7ef] px-3 py-1.5 text-xs font-bold text-[#087443]"><span className="h-2 w-2 rounded-full bg-[#0a9e59]" />Listening</span>
        </div>

        <div className="grid gap-4 py-5 sm:grid-cols-[1fr_0.92fr]">
          <div className="space-y-3">
            <ChatBubble assistant text="What can I get for you?" />
            <ChatBubble text="One large chicken shish, please." />
            <ChatBubble assistant text="Would you like salad and sauce with that?" />
            <ChatBubble text="All salad, garlic sauce. And a Coke." />
          </div>
          <div className="relative rotate-[1.5deg] rounded-sm bg-white px-5 pb-6 pt-5 font-mono text-[11px] leading-5 shadow-[0_14px_35px_rgba(23,35,31,0.13)]">
            <div className="absolute inset-x-0 -bottom-2 h-3 bg-[linear-gradient(135deg,transparent_6px,white_0)_0_0/12px_12px_repeat-x]" />
            <div className="text-center"><strong className="text-sm">NEW ORDER #1048</strong><br /><span>COLLECTION · 18:42</span></div>
            <div className="my-3 border-t border-dashed border-black/30" />
            <p><strong>1 × LARGE CHICKEN SHISH</strong></p><p>+ All salad</p><p>+ Garlic sauce</p><p><strong>1 × COCA-COLA</strong></p>
            <div className="my-3 border-t border-dashed border-black/30" />
            <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>£14.50</span></div>
            <div className="mt-4 flex items-center justify-center gap-2 rounded bg-[#eaf7ef] py-2 font-sans font-bold text-[#087443]"><CheckCircle2 className="h-4 w-4" />Customer confirmed</div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-[#17231f] px-4 py-3 text-sm text-white"><span className="flex items-center gap-2"><Printer className="h-4 w-4 text-[#ffb547]" />Kitchen printer</span><strong className="text-[#9ee7bd]">Printed</strong></div>
      </div>
    </div>
  );
}

function ChatBubble({ text, assistant = false }: { text: string; assistant?: boolean }) {
  return <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${assistant ? 'rounded-tl-sm bg-[#eaf7ef] text-[#075f38]' : 'ml-auto rounded-tr-sm bg-[#17231f] text-white'}`}>{text}</div>;
}

function FlowStep({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <li className="rounded-[24px] border border-white/10 bg-white/5 p-6"><div className="flex items-center justify-between"><span className="text-[#9ee7bd] [&>svg]:h-6 [&>svg]:w-6">{icon}</span><span className="font-mono text-xs text-white/30">{number}</span></div><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-white/60">{text}</p></li>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-[24px] border border-[#17231f]/10 bg-white/65 p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_45px_rgba(23,35,31,0.08)]"><div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#17231f] text-[#ffb547] [&>svg]:h-5 [&>svg]:w-5">{icon}</div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-[#17231f]/60">{text}</p></article>;
}

function ConversationCard() {
  return <div className="rounded-[30px] border border-[#17231f]/10 bg-[#fffdf8] p-5 shadow-[0_25px_65px_rgba(23,35,31,0.1)] sm:p-7"><div className="flex items-center gap-3 border-b border-[#17231f]/10 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17231f] text-[#ffb547]"><Headphones className="h-5 w-5" /></span><div><p className="font-black">Kebab House</p><p className="text-xs text-[#17231f]/45">Order assistant</p></div></div><div className="mt-6 space-y-4"><ChatBubble assistant text="Would you like salad with that?" /><ChatBubble text="What salads do you have?" /><ChatBubble assistant text="We have lettuce, onion, tomato, cucumber, red cabbage and pickled chilli. You can choose any of them, or have all salad." /><ChatBubble text="All salad, please." /><ChatBubble assistant text="Of course. Would you like a drink with your order?" /></div></div>;
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return <details className="group py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black"><span>{question}</span><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#17231f]/15 text-lg font-normal transition group-open:rotate-45">+</span></summary><p className="max-w-3xl pt-4 text-sm leading-7 text-[#17231f]/60">{answer}</p></details>;
}
