# DonutSMP Kumar Bot & Web Sitesi

DonutSMP sunucusu için geliştirilen kumar bot sistemi ve web arayüzü. Bot, TPA isteklerini ve para transferlerini dinler, web sitesi üzerinden IP korumalı kullanıcı doğrulaması sağlar.

## 🚀 Özellikler

### 🤖 Minecraft Bot
- DonutSMP sunucusuna otomatik bağlanma
- TPA isteklerini dinleme ve otomatik yanıtlama
- Para transferlerini izleme ve kaydetme
- Konsol üzerinden real-time bilgilendirme
- Otomatik yeniden bağlanma

### 🌐 Web Sitesi
- DonutFlip temalı modern tasarım
- IP korumalı kullanıcı girişi
- TPA ile doğrulama sistemi
- Real-time bot durumu takibi
- Para transfer geçmişi görüntüleme
- Responsive tasarım

### 🔒 Güvenlik Özellikleri
- IP tabanlı koruma (her IP'den sadece bir hesap)
- TPA ile kimlik doğrulama
- Oturum yönetimi ve güvenli çıkış
- LocalStorage ile oturum kalıcılığı

## 📁 Proje Yapısı

```
donut site/
├── bot/                    # Minecraft bot
│   ├── bot.js             # Ana bot dosyası
│   ├── package.json       # Bot bağımlılıkları
│   └── data.json          # Bot veri dosyası (otomatik oluşur)
├── web/                   # Web sitesi
│   └── public/           # Statik dosyalar
│       ├── index.html    # Ana HTML dosyası
│       ├── css/
│       │   └── style.css # Ana stil dosyası
│       └── js/
│           └── app.js    # Frontend JavaScript
├── shared/               # Paylaşılan dosyalar
└── README.md            # Bu dosya
```

## 🛠️ Kurulum

### Önkoşullar
- [Node.js](https://nodejs.org/) (v16 veya üzeri)
- NPM (Node.js ile birlikte gelir)
- DonutSMP sunucusu erişimi

### 1. Bağımlılıkları Yükle
```bash
cd "C:\Users\ege\Desktop\donut site\bot"
npm install
```

### 2. Bot Konfigürasyonu
`bot/bot.js` dosyasında bot ayarlarını yapılandırın:

```javascript
const BOT_CONFIG = {
    host: 'donutsmp.net',        # DonutSMP sunucu adresi
    port: 25565,                 # Sunucu portu
    username: 'your_username',   # Minecraft kullanıcı adınız
    version: '1.20.1',           # Minecraft versiyonu
    auth: 'microsoft'            # Microsoft hesabı için 'microsoft', cracked için 'offline'
};
```

**Önemli:** Bot gerçek kullanıcı adınızı otomatik algılayacak ve konsola yazdıracaktır. Konfigürasyondaki ad ile gerçek ad farklıysa uyarı verecektir.

### 3. Botu Başlat
```bash
cd "C:\Users\ege\Desktop\donut site\bot"
npm start
```

### 4. Web Sitesine Erişim
Bot başlatıldıktan sonra web sitesine erişim:
```
http://localhost:3001
```

### 5. Ayrı Mines Oyunu
Sadece Mines oyunu için:
```
http://localhost:3001/mines.html
```

## 🎮 Kullanım

### Kullanıcı Girişi
1. Web sitesine gidin (`http://localhost:3001`)
2. Minecraft sürümünüzü seçin (Java/Bedrock)
3. DonutSMP'deki kullanıcı adınızı girin
4. "Continue" butonuna tıklayın

### Doğrulama
1. DonutSMP sunucusuna bağlanın (`donutsmp.net`)
2. Chatde şu komutu yazın: `/tpa DonutFlipBot`
3. Bot TPA'yi otomatik kabul edecek
4. Web sitesinde otomatik olarak giriş yapılacak

### Dashboard
Doğrulama sonrası:
- Oturum bilgilerinizi görüntüleyebilirsiniz
- Bot durumunu takip edebilirsiniz
- Para transfer geçmişini görüntüleyebilirsiniz
- Real-time güncellemeler alabilirsiniz

## 🖥️ Bot Konsol Çıktıları

### Bot Başlangıcı
```
🤖 DonutSMP botunu başlatıyor...
📋 Konfigürasyon:
   Host: donutsmp.net:25565
   Username: your_username
   Auth: microsoft
   Version: 1.20.1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Bot başarıyla bağlandı!
📍 Sunucu: donutsmp.net:25565
👤 Gerçek Bot Adı: ActualUsername123
🔑 Auth Türü: microsoft
⚠️  DİKKAT: Konfigürasyon adı (your_username) ile gerçek ad (ActualUsername123) farklı!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 Bot dünyaya spawn oldu
🎮 Oyuncu: ActualUsername123
📍 Pozisyon: 125.3, 64.0, -89.7
📋 TPA ve para transferlerini dinlemeye başladı...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Para Transferi
```
💰 PARA GELDİ:
   Gönderen: oyuncu123
   Miktar: $1k
   Zaman: 26.09.2025 03:15:42
   Mesaj: oyuncu123 paid you $1k.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### TPA İsteği
```
📞 TPA İSTEĞİ:
   Gönderen: oyuncu123
   Zaman: 26.09.2025 03:16:05
   Mesaj: oyuncu123 sent you a tpa request
✅ Kullanıcı doğrulandı: oyuncu123
   IP: 192.168.1.100
   Giriş Zamanı: 26.09.2025 03:15:30
🎯 TPA kabul edildi: oyuncu123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Yeni Oturum
```
🆕 YENİ OTURUM:
   Kullanıcı: oyuncu123
   IP: 192.168.1.100
   Zaman: 26.09.2025 03:15:30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔧 API Endpoints

### POST `/api/login`
Kullanıcı girişi
```json
{
  "username": "oyuncu123",
  "ip": "192.168.1.100",
  "version": "java"
}
```

### GET `/api/session/:username`
Oturum durumu sorgulama

### GET `/api/bot/status`
Bot durum bilgisi

### GET `/api/transactions`
Para transfer geçmişi

### GET `/api/tpa`
Aktif TPA istekleri

## 🎨 Özelleştirme

### Bot Mesaj Formatları
`bot.js` dosyasında `checkMoneyTransfer` ve `checkTPARequest` fonksiyonlarındaki regex pattern'leri sunucunuzun mesaj formatına göre düzenleyebilirsiniz.

### Tasarım
`web/public/css/style.css` dosyasından site tasarımını özelleştirebilirsiniz. DonutFlip teması kullanılmaktadır.

### Bot Ayarları
`BOT_CONFIG` nesnesinden bot ayarlarını değiştirebilirsiniz.

## 🚨 Güvenlik Notları

- Bot sadece kayıtlı kullanıcılardan TPA kabul eder
- Her IP adresinden sadece bir hesap kullanılabilir
- Oturum verileri güvenli şekilde saklanır
- Bot otomatik olarak şüpheli istekleri reddeder

## 🐛 Sorun Giderme

### Bot Bağlanamıyor
- DonutSMP sunucusunun açık olduğundan emin olun
- Bot kullanıcı adının sunucuda mevcut olduğunu kontrol edin
- İnternet bağlantınızı kontrol edin

### Web Sitesi Açılmıyor
- Port 3001'in açık olduğundan emin olun
- Firewall ayarlarını kontrol edin
- `npm install` ile bağımlılıkları yeniden yükleyin

### TPA Kabul Edilmiyor
- Kullanıcı adını doğru yazdığınızdan emin olun (büyük/küçük harf duyarlı)
- Bot'un sunucuda aktif olduğunu kontrol edin
- Web sitesinde önce giriş yaptığınızdan emin olun

## 📝 Değişiklik Günlüğü

### v1.0.0
- İlk sürüm yayınlandı
- Temel bot fonksiyonları
- Web sitesi ve dashboard
- IP korumalı giriş sistemi
- TPA doğrulama sistemi

## 📞 Destek

Bu proje DonutSMP kumar sistemi için özel olarak geliştirilmiştir. Herhangi bir sorun yaşarsanız bot konsolunu kontrol edin ve hata mesajlarını paylaşın.

## 🎲 Kumar Özellikleri (Yakında)

Gelecek güncellemelerde eklenecek özellikler:
- Zar oyunu
- Rulet
- Coinflip
- Jackpot sistemi
- Bonus sistemi
- İstatistikler

---

**Not:** Bu sistem DonutSMP sunucusunda kumar oynayın yasal olduğu varsayılarak geliştirilmiştir. Sunucu kurallarına uygun şekilde kullanın.