# 🎙️ MGL Systems: Dakika Takip & PAYG Faturalandırma Sistemi

Bu döküman, UK Takeaway Sesli Asistan projesi kapsamında geliştirilen saniye hassasiyetli dakika takip ve otomatik faturalandırma sisteminin teknik rehberidir.

## ✅ Tamamlanan Özellikler (Neler Yaptık?)

### 1. Saniye Hassasiyetli Takip (Fair Billing)
*   **Adil Hesaplama:** Paket içi ve Pay-As-You-Go (PAYG) kullanımları saniyesi saniyesine hesaplanır. (Ör: 42 saniye konuşulursa sadece 0.7 dk düşülür).
*   **Webhook Entegrasyonu:** Retell'den gelen `call_ended` sinyaliyle anlık düşüş sağlanır.

### 2. Akıllı Abonelik & PAYG Geçişi
*   **Dakika Paketleri:** Stripe üzerinden satın alınan dakikalar otomatik olarak veritabanına yüklenir.
*   **Otomatik PAYG:** Paket dakikaları bittiğinde sistem aramayı kesmez, saniyeliği 20p olan PAYG modeline otomatik geçer.
*   **Düşük Bakiye Uyarıları:** Paket %20 ve %10 seviyelerine gerilediğinde sistem otomatik uyarı üretir.

### 3. Yönetim Paneli (Admin & Customer Dashboard)
*   **Canlı İzleme:** Kalan dakikalar, toplam aramalar ve abonelik durumu görsel barlar ile takip edilir.
*   **Admin Araçları:** Admin paneli üzerinden manuel dakika ekleme ve müşteri yönetimi imkanı.

### 4. Teknik Altyapı
*   **Vercel Cloud:** Uygulama Vercel üzerinde 7/24 canlıda koşuyor.
*   **Neon Postgres SQL:** Tüm veriler güvenli ve hızlı SQL veritabanında saklanıyor.
*   **Haftalık Faturalandırma:** Her Pazar gece yarısı çalışan Cron Job, PAYG kullananların borçlarını otomatik hesaplıyor.

---

## 🚀 Çalıştırma & Aktif Etme Adımları

Şu an sistem kurulu, işte sistemi gerçek bir dükkana bağlamak için yapman gerekenler:

1.  **Dashboard Kaydı:** `mglsystems.uk` üzerinden dükkan yetkilisi adına login ol.
2.  **Veritabanı Ayarı:** Neon DB içindeki `users` tablosunda o kullanıcıyı bul ve `retell_api_key` ile `retell_agent_id` bilgilerini gir.
3.  **Webhook Bağlantısı:** Veritabanındaki `retell_webhook_token` sütunundaki şifreyi al ve aşağıdaki linki Retell Agent sayfasındaki **Post-call Webhook URL** kısmına yapıştır:
    `https://www.mglsystems.uk/api/retell/webhook/BURAYA_TOKEN_GELECEK`

### n8n lookup webhook kullanan agentlar

Eğer Retell agent'in webhook'u doğrudan dashboard'a değil de n8n'deki customer lookup workflow'una bağlıysa, `call_ended` olayı n8n tarafından dashboard'a forward edilmelidir.

1. `call_inbound` olayı n8n workflow'unda normal şekilde cevaplanır.
2. `call_ended` olayı `https://www.mglsystems.uk/api/retell/webhook` adresine POST edilir.
3. Forward edilen istekte `x-mgl-forward-secret` header'i gönderilir.
4. Dashboard bu header'i önce `RETELL_FORWARD_SECRET`, yoksa `CRON_SECRET` ile doğrular.
5. Müşteri profilinde doğru `retell_agent_id` kayıtlı olmadan dashboard kullanıcıyı eşleştiremez.

---

## 🔮 Gelecek Önerileri & Yol Haritası (Neler Yapılabilir?)

### 1. Otomatik SMS/WhatsApp Bildirimleri (n8n Önerilir)
*   **Neden n8n?**: Twilio bilgilerini koda gömmek yerine n8n kullanmak daha güvenli ve esnektir. Yarın WhatsApp'a geçmek isterseniz kodu değiştirmeden n8n'den yapabilirsiniz.
*   **Veri Akışı**: Sistem artık n8n'e `phone` bilgisini de gönderiyor. n8n workflow'unuzda gelen bu numarayı Twilio "To" kısmına bağlamanız yeterli.

### 2. Manuel/Otomatik Geçiş Butonu
*   Müşteri dashboard'una "Paketim bitince PAYG'a geç / Geçme" anahtarı eklenerek yasal sorumluluğun müşteriye bırakılması.

### 3. Stripe Bank Transfer Sistemi
*   Stripe komisyonlarını düşürmek için kart ödemesi yerine "Bank Transfer" (Direct Debit) üzerinden otomatik bakiye yükleme sisteminin her müşteriye tanımlanması.

### 4. Gelişmiş Çağrı Analizi
*   Hangi siparişten ne kadar "Tahmini Kar" elde edildiğinin dashboard üzerinde saniye maliyeti ile karşılaştırılarak gösterilmesi.

### 5. Multi-User (Dükkan İçi Yetki)
*   Dükkan sahibinin çalışanlarına (Manager, Staff) kısıtlı yetkiyle dashboard erişimi vermesi.

---

**Teknik Durum:** ✅ SİSTEM CANLI VE TEST EDİLDİ.
**Son Güncelleme:** 12 Mart 2026

---

## 🛠️ Teknik Referans (Gelecek Agentlar İçin Notlar)

Yeni bir müşteri (dükkan) eklendiğinde veya sistemde hata ayıklarken şu detaylara dikkat edilmelidir:

1.  **Veritabanı Şeması:** 
    *   `users` tablosu: `retell_api_key`, `retell_agent_id` ve `retell_webhook_token` (UUID) sütunlarını içerir.
    *   `subscriptions` tablosu: Müşterinin dakikalarını (`total_minutes`, `used_minutes`) ve PAYG durumunu tutar.
    *   `calls` tablosu: Retell'den gelen her aramayı saniye cinsinden kaydeder.

2.  **Kritik Dosyalar:**
    *   `lib/retell-webhook.ts`: Webhook trafiğini karşılayan, imza doğrulayan ve hesaplama yapan "beyin" kısmıdır.
    *   `app/api/retell/webhook/[token]/route.ts`: Retell'in vurduğu endpoint.
    *   `app/api/billing/cron/payg-billing/route.ts`: Haftalık fatura kesen Cron Job.

3.  **Yeni Müşteri Kurulum Protokolü:**
    *   Müşteri `users` tablosuna eklendiğinde ona otomatik bir `retell_webhook_token` atanır.
    *   Müşterinin kendi Retell Workspace'indeki API Key ve Agent ID veritabanına girilmelidir.
    *   Dashboard üzerinden en az bir aktif paket (subscription) tanımlanmalıdır (`active` statüsünde).
