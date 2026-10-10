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

## Düşmanlar
| Düşman | Davranış | Can | Altın |
|--------|----------|-----|-------|
| Kabukböcek | Platformda gidip gelir, kenarda döner | 2 | 3 |
| Gölge Sinek | Havada süzülür, yaklaşınca kovalar | 3 | 4 |
| Kabuk Muhafız | Görünce turuncu parlayıp hazırlanır, sonra hücum eder | 4 | 6 |

Canınız 5 altın miğfer. Düşmana değmek ya da çukura düşmek 1 can götürür. Kalkan önden gelen saldırıyı engeller.
Canınız biterse bölüm baştan başlar; toplanan altın tarayıcıda saklanır.

Adres parametreleri: `?debug` (fizik kutuları), `?touch` (masaüstünde ekran tuşlarını göster), `?skip` (başlangıç ekranını atla).

## Klasör yapısı
```
index.html, style.css, manifest.webmanifest
lib/phaser.min.js          Phaser 3.90 (yerel kopya, MIT lisansı)
js/art/                    Kodla üretilen piksel sanat (savaşçı, zemin, arka plan, efektler)
js/level.js                Bölüm haritası
js/input.js                Klavye + ortak giriş durumu
js/ui/TouchControls.js     Çoklu dokunmatik ekran tuşları
js/objects/                Savaşçı, antrenman kuklası, düşmanlar ve altın
js/save.js                 Altın kaydı (localStorage)
js/scenes/                 Açılış ve oyun sahneleri
js/fx.js                   Parçacık ve görsel efektler
```
