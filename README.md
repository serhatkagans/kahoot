# GençTek Kahoot

Kahoot tarzı canlı bilgi yarışması. GençTek Terimler Sözlüğü'ndeki canlı yarışmadan ayrılmış, sözlüğe bağlı olmayan, kendi soru oluşturucusu olan bağımsız uygulamadır. Sorular terim havuzundan üretilmez; öğretmen hazırlar.

## Bölümler

| Adres | Ne yapar |
|---|---|
| `/` | **Oyuna katıl** (kahoot.it gibi): öğrenci 6 haneli PIN'i yazar ya da `/?pin=482913` bağlantısıyla / kare kodla gelir, takma ad (2–15 karakter) ve avatar seçer. |
| `/kahootlar` | **Kahootlarım**: soru setleri. Başlat, düzenle, kopyala, `.json` olarak indir, sil; indirilen dosyayı içe aktar. |
| `/duzenle?id=…` | **Oluşturucu**: solda soru listesi (sırala, çoğalt, sil), ortada soru metni, görsel ve şıklar, sağda soru türü, süre ve puan. Değişiklikler 1,5 saniyede kendiliğinden kaydedilir (Ctrl+S hemen kaydeder). |
| `/sun?id=…` | **Oyunu sun**: oyun adı, soruları/şıkları karıştırma seçenekleri; "Oyunu aç" ile PIN, kare kod ve bekleme salonu açılır. Ekranı tahtaya yansıtın. |
| `/odev-ver?id=…` | **Ödev ver**: bitiş tarihi, süre ve karıştırma seçenekleriyle bireysel ödev oluşturur; PIN, bağlantı ve kare kod üretir. |
| `/raporlar` | **Raporlar**: geçmiş canlı oyunları ve ödevleri; öğrenci ve soru ayrıntılarını, başarı oranlarını ve CSV dışa aktarmayı gösterir. |

### Soru türleri

| Tür | Açıklama |
|---|---|
| Test | 2–4 şık; tek seçim ya da **çoklu seçim** (oyuncu bütün doğruları seçip gönderir). Tek seçimde birden çok şık doğru işaretlenebilir; herhangi biri doğru sayılır. |
| Doğru / Yanlış | İki sabit şık (Doğru mavi ◆, Yanlış kırmızı ▲). |
| Cevabı yaz | Oyuncu yazar (en çok 20 karakter); 1–4 kabul edilen yazım. Büyük/küçük harf, Türkçe harf, boşluk ve işaret farkı yok sayılır. |
| Sıralama | 2–4 öğe doğru sırayla yazılır, oyunda karışık gösterilir; oyuncu şıklara sırayla dokunur. |
| Anket | Doğru cevap ve puan yok; yalnızca dağılım gösterilir, seriyi bozmaz. |
| Kelime bulutu | Kısa yanıtları tekrar sayılarına göre büyüyen ortak bir bulutta gösterir. |
| Açık uçlu | 250 karaktere kadar yanıt toplar; öğretmen rapor merkezinde doğru/yanlış değerlendirir. |
| Sayısal kaydırıcı | Belirlenen aralıkta sayısal tahmin alır; doğru değer ve kabul payına göre puanlar. |
| Nokta işaretleme | Oyuncu görsel üzerinde bir noktaya dokunur; belirlenen doğru alan içindeyse puan alır. |
| Ölçek | Belirlenen sayısal ölçekte görüş toplar ve dağılımı gösterir. |
| Beyin fırtınası | Fikirleri toplar; sonuç ekranında oyuncuların diğer fikirlere oy vermesini sağlar. |

Her soruda süre (5 sn – 4 dk), puan (standart 1000, çift 2000, puansız) ve isteğe bağlı görsel (PNG/JPG/GIF/WEBP, en çok 3 MB) vardır. Eksikli sorular uyarıyla işaretlenir ve oyunda atlanır.

**Toplu ekle**: Excel'den Kahoot şablonu satırları (*Soru · Cevap 1–4 · Süre · Doğru cevap numarası*, sekmeyle ayrılmış) ya da metin blokları yapıştırılabilir:

```
1. MVP'nin amacı hangisidir?
Seçenekler: Hızlı geri bildirim, Kusursuz ürün, Borç almak
Doğru Cevap: Hızlı geri bildirim
```

Şıklar ayrı satırlarda da olabilir (`A) …`); cevap harf, numara ya da şıkkın kendisi olabilir, birden çok doğru virgülle ayrılır. Doğru/Yanlış şıklı sorular Doğru/Yanlış, şıksız ama cevaplı sorular "Cevabı yaz" olur. Sözlük klasöründeki *Kahoot_Kopyala_Yapistir_25_Soru* belgesinin metni bu biçimdedir.

### Canlı oyun

Akış: bekleme salonu → soru (önce 4 saniye tek başına, sonra şıklar ve süre) → doğru cevap ve dağılım → ara skor tablosu (en çok yükselen, en hızlı doğru, seridekiler) → … → podyum ve konfeti.

- **Puan** (Kahoot'taki gibi): doğru cevap, sorunun puanının hıza göre yarısı ile tamamı arası (standartta 500–1000); ardışık her doğru için +100 seri bonusu (en çok +500).
- Öğretmen bir ada dokunarak oyuncuyu çıkarır, **girişi kilitler**, süreyi erken bitirir, oyunu istediği anda podyuma taşır.
- **Takım modu**nda oyuncular dört takımdan birini seçebilir veya dengeli biçimde otomatik dağıtılır; takım skorları ve takım podyumu gösterilir.
- Oyuncu her sorudan sonra doğru/yanlış, kazandığı puan, sırası ve "X seni N puanla geçiyor" bilgisini görür.
- Oyun sonunda **rapor** (Excel'de açılan `.csv`): her oyuncunun sırası, puanı, doğru sayısı ve her sorudaki cevabı, puanı, süresi.
- Sesler (salon müziği, düşünme ritmi, geri sayım, doğru/yanlış, fanfar) ses dosyası olmadan üretilir; "Ses açık/kapalı" ve tam ekran düğmeleri vardır.
- Sayfa yenilenirse oyun kaldığı yerden sürer (öğretmen: aynı tarayıcı; öğrenci: aynı cihaz).

### Bireysel ödev ve raporlar

Öğretmen kütüphanedeki bir kahootu bitiş tarihli ödev olarak paylaşabilir. Öğrenci PIN, bağlantı veya kare kodla katılır; öğretmen beklemeden soruları kendi hızında çözer ve aynı cihazdan kaldığı yerden devam eder. İstenirse soru süreleri etkinleştirilebilir. Ödevler ve öğrenci ilerlemeleri `DATA_DIR/odevler/` altında kalıcı saklanır.

Tamamlanan canlı oyunlar otomatik olarak `DATA_DIR/raporlar/` altında arşivlenir. Rapor merkezinde katılımcılar, tamamlanma durumu, ortalama başarı, zor sorular, cevap dağılımları ve desteğe ihtiyaç duyabilecek öğrenciler görülebilir; ayrıntılı sonuç CSV olarak indirilebilir.

Hazır gelenler: **Tekno Girişimcilik** (sözlükteki 25 soruluk yarışma: 10 Doğru/Yanlış, 15 test) ve **Örnek: Bütün soru türleri**. İlk açılışta bir kez yazılır; silinirse geri gelmez.

## Çalıştırma

Node 22.13+ gerekir. Uygulama **3002** portunda açılır (Kelimeden Hayale 3000'de, Terimler Sözlüğü 3001'de; üçü aynı anda çalışabilir). Windows'ta `baslat.bat` paketleri kurar, derler ve sunucuyu açar; `durdur.bat` kapatır.

```bash
npm install
npm run dev        # http://localhost:3002
```

Yayın için `npm run build` ve `npm start`. Öğrenciler aynı ağdan bilgisayarın IP adresiyle bağlanır (ör. `http://192.168.1.20:3002`). Oyunlar sunucu belleğinde tutulur: tek Node süreci gerekir; sunucu yeniden başlarsa süren oyun kapanır (soru setleri dosyada kalır).

`.env.local`:

- `KAHOOT_PASSWORD`: doluysa kütüphane, düzenleyici ve oyun açma şifre ister (öğrenciler şifresiz katılır). Boşsa herkes kahoot hazırlayabilir.
- `DATA_DIR`: veri klasörü (varsayılan `./data`): `kahootlar/<kimlik>.json` ve `gorseller/`.
- `BASE_PATH`: alt adreste yayın (ör. `/kahoot`); değişince yeniden derleyin.

Denetimler:

```bash
npx tsc --noEmit
npm run lint
npm test
```
