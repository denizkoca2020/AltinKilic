# Altın Kılıç

iPad'de tarayıcıdan oynanan, Hollow Knight esintili 2D piksel-art aksiyon/platform oyunu.
[Phaser 3.90](https://phaser.io) ile yazıldı. Derleme aracı gerekmez.

## Çalıştırma
- **iPad:** GitHub Pages'te yayınlayıp Safari'den açın. "Paylaş → Ana Ekrana Ekle" ile tam ekran oynanır.
- **Bilgisayar:** klasörde `python3 -m http.server` çalıştırıp `http://localhost:8000` adresini açın.

## Kontroller
| Eylem  | iPad (ekran tuşu) | Klavye |
|--------|------------------|--------|
| Yürü   | ◀ ▶              | ← → / A D |
| Zıpla  | ZIPLA (basılı tutunca daha yükseğe) | Space / ↑ / W |
| Kılıç  | KILIÇ            | X / J |
| Kalkan | KALKAN (basılı tut) | C / K |
| Atıl   | ATIL (havada da bir kez) | Z / L / Shift |
| Etkileşim | Bank / kapı / tüccar yanında beliren tuş | E / ↓ |

## Düşmanlar
| Düşman | Davranış | Can | Altın |
|--------|----------|-----|-------|
| Kabukböcek | Platformda gidip gelir, kenarda döner | 2 | 3 |
| Gölge Sinek | Havada süzülür, yaklaşınca kovalar | 3 | 4 |
| Kabuk Muhafız | Görünce turuncu parlayıp hazırlanır, sonra hücum eder | 4 | 6 |

Canınız 5 altın miğfer. Düşmana değmek ya da çukura düşmek 1 can götürür. Kalkan önden gelen saldırıyı engeller.
Canınız biterse bölüm baştan başlar; toplanan altın tarayıcıda saklanır.

## Dünya
- **Unutulmuş Mağara:** antrenman kuklaları, ilk düşmanlar; sonunda Altın Salon'a açılan büyük taş kapı.
- **Altın Salon:** dinlenme bankı, Yaşlı Tüccar, güçlü düşmanlar ve boss arenası.
- **Dinlenme bankı:** canları doldurur, kayıt noktasıdır; ölünce son oturulan bankta doğulur.

## Boss: Kabuk Kral
Arenaya girince parmaklıklar kapanır. Hücum eder (duvara çarpınca sersemler) ya da üstünüze sıçrayıp
yere vurur ve iki yana şok dalgası yollar. Canı yarıya inince öfkelenir: daha hızlıdır ve tavandan kaya düşürür.
Yenince arkadaki altın sunağın ödülü alınabilir.

## Yaşlı Tüccar
| Eşya | Etki | Fiyat |
|------|------|-------|
| Keskin Kılıç (2 seviye) | Kılıç hasarı +1, kılıç izi büyür | 60 / 150 |
| Altın Miğfer (2 seviye) | En yüksek can +1 (en fazla 7) | 45 / 110 |
| Can İksiri | Canları doldurur | 15 |

## Ses
Tüm efektler ve müzik Web Audio ile kodla üretilir (ses dosyası yoktur). Sağ üstteki tuşla kapatılabilir.

Adres parametreleri: `?debug` (fizik kutuları), `?touch` (masaüstünde ekran tuşlarını göster), `?skip` (başlangıç ekranını atla).

## Bölüm kontrolü
Harita değiştirdikten sonra her düşmana ve nesneye zıplayarak ulaşılabildiğini kontrol edin:
```
node tools/check-levels.js
```

## Klasör yapısı
```
index.html, style.css, manifest.webmanifest
lib/phaser.min.js          Phaser 3.90 (yerel kopya, MIT lisansı)
js/art/                    Kodla üretilen piksel sanat (savaşçı, zemin, arka plan, efektler)
js/level.js                Bölüm haritaları (Mağara, Altın Salon)
js/audio.js                Ses efektleri ve müzik (Web Audio)
js/ui/Shop.js              Tüccar dükkânı
js/input.js                Klavye + ortak giriş durumu
js/ui/TouchControls.js     Çoklu dokunmatik ekran tuşları
js/objects/                Savaşçı, kukla, düşmanlar, altın, Kabuk Kral
js/save.js                 Kayıt: altın, yükseltmeler, kayıt noktası, boss (localStorage)
js/scenes/                 Açılış ve oyun sahneleri, boss arenası
js/fx.js                   Parçacık ve görsel efektler
```
