'use strict';
// sw.js — Görev 6 (mobil-g6-brief.md): kabuk-cache (offline shell). Kabukta sır YOK; bu dosya
// hiçbir token/anahtar taşımaz (mobil-global.md). Offline ilkesi: dış CDN/font YOK, tek istisna
// api.github.com (veri senkronu) — o istisna da bu SW'nin İÇİNDE DEĞİL: aşağıdaki fetch
// handler'ı yalnız SAME-ORIGIN isteklere devreye girer, api.github.com (ve her çapraz-origin
// istek) bu SW'ye hiç uğramadan doğrudan ağa gider.

// CACHE_ADI: 'SURUM' yer tutucudur — yayinla.js her yayın koşusunda bu literal'i
// 'beyin-mobil-<ISO tarih+saat>' ile DEĞİŞTİRİR (yalnız YAYIN kopyasında; geliştirme
// kopyasında yer tutucu aynen kalır — dev'de SW zaten localhost'ta önemsiz). Bayt-düzeyinde
// değişen bu satır sayesinde tarayıcı her yayında sw.js'in DEĞİŞTİĞİNİ görür, yeniden
// yükler/kurar; activate handler'ı (aşağıda) eski isimli cache'leri temizler.
const CACHE_ADI = 'beyin-mobil-20260813T174749';
// Yayında (GitHub Pages) beyin-mobil.html → index.html adıyla kopyalanır (Görev 7 yayinla.js);
// geliştirmede ise dosya doğrudan beyin-mobil.html adıyla açılır. İkisi de kabuğa dahil: './' ve
// './index.html' yayın bağlamını, './beyin-mobil.html' geliştirme/doğrudan-dosya bağlamını
// kapsar. Hangi bağlamda hangi dosyanın GERÇEKTEN var olduğu değişir (biri diğerinde 404 verir);
// cache.addAll TÜMÜNÜN var olmasını gerektirir ve TEK birinin eksikliği tüm install'ı FAIL
// ettirir, bu yüzden aşağıda dosya başına cache.add + hata yutma kullanılır (eksik olan
// bağlamda ilgili dosya sessizce atlanır, install yine de başarıyla tamamlanır).
const KABUK_DOSYALARI = ['./', './index.html', './beyin-mobil.html', './manifest.json', './ikon-192.png', './ikon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI)
      .then((cache) => Promise.all(KABUK_DOSYALARI.map((yol) => cache.add(yol).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((ad) => ad !== CACHE_ADI).map((ad) => caches.delete(ad))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const istek = event.request;
  // Yalnız GET — POST/PUT (GitHub yazmaları dahil) bu SW'den asla geçmez, doğrudan ağa gider.
  if (istek.method !== 'GET') return;
  const url = new URL(istek.url);
  // Yalnız SAME-ORIGIN — api.github.com (ve başka her çapraz-origin istek) burada ELE ALINMAZ,
  // tarayıcı normal ağ akışına bırakılır (event.respondWith çağrılmaz).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(istek).then((onbellekYaniti) => {
      if (onbellekYaniti) return onbellekYaniti;
      return fetch(istek).then((agYaniti) => {
        if (agYaniti && agYaniti.ok) {
          const kopya = agYaniti.clone();
          caches.open(CACHE_ADI).then((cache) => cache.put(istek, kopya));
        }
        return agYaniti;
      });
    })
  );
});
