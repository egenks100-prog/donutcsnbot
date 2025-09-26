# 🔒 DonutFlip Güvenlik Rehberi

## ✅ Düzeltilen Güvenlik Açıkları

### 1. **CORS Wildcard Problemi**
- ❌ Önceki: `origin: "*"` - Herkese açık
- ✅ Şimdi: Sadece belirlenen domain'lere izin

### 2. **Rate Limiting**
- ✅ Dakikada max 100 request limiti eklendi
- ✅ IP bazlı rate limiting

### 3. **Input Validation**
- ✅ Username: Sadece `a-zA-Z0-9_` karakterler, 3-16 uzunluk
- ✅ Amount: Sadece pozitif sayılar, max 1B limit
- ✅ Command injection korunması

### 4. **Session Management**
- ✅ IP kontrolü - session IP'si ile request IP'si eşleşmeli
- ✅ Session expire - 24 saat sonra otomatik sürer
- ✅ Withdrawal ve balance update için session zorunlu

### 5. **Sensitive Data Protection**
- ✅ Debug endpoint'ler production'da kapalı
- ✅ Bot config bilgileri gizlendi
- ✅ Transaction logs sadece development'da görünür

### 6. **File System Security**
- ✅ Dot files gizlendi (.env, .git vb)
- ✅ Security headers eklendi
- ✅ Absolute path kullanımı

## 🚀 Production Deployment

### Environment Variables (.env dosyası oluştur):
```bash
NODE_ENV=production
MC_HOST=donutsmp.net
MC_PORT=25565
MC_USERNAME=your_bot_username
MC_AUTH=microsoft
PORT=3001
```

### SSL/TLS Kurulumu:
```bash
# Nginx reverse proxy önerisi
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Firewall Ayarları:
```bash
# Sadece gerekli portları aç
ufw allow 22    # SSH
ufw allow 443   # HTTPS
ufw deny 3001   # Direct access engellemek için
```

## ⚠️ Hala Dikkat Edilmesi Gerekenler

### 1. **Database Kullan**
- Şu anda JSON dosyada veri saklıyor
- Production için PostgreSQL/MongoDB öner

### 2. **Backup Sistemi**
- Balance verilerini düzenli yedekle
- `data.json` dosyasını güvenli yerde sakla

### 3. **Monitoring**
- Log monitoring sistemi kur
- Suspicious activity detection

### 4. **Bot Account Security**
- Bot hesabını güvenli tut
- 2FA aktif et
- Regular olarak şifreyi değiştir

## 🛡️ Ek Güvenlik Önerileri

### Client-Side Validation
- Browser console'dan balance manipülasyonu mümkün değil
- Server-side validation her zaman geçerli

### Network Security
- DDoS korunması için Cloudflare kullan
- Rate limiting + IP blocking

### Regular Updates
- Node.js ve dependencies'leri güncel tut
- `npm audit` düzenli çalıştır

## 📋 Production Checklist

- [ ] Environment variables ayarlandı
- [ ] SSL sertifikası kuruldu
- [ ] Firewall konfigürasyonu yapıldı
- [ ] Database backup sistemi kuruldu
- [ ] Monitoring sistemi aktif
- [ ] Bot hesabı güvenli
- [ ] Domain CORS listesine eklendi
- [ ] Log monitoring aktif

## 🚨 Acil Durum Planı

### Suspicious Activity Detected:
1. Bot'u hemen durdur
2. Database backup'ı al
3. Log dosyalarını incele
4. Affected user'ları bilgilendir
5. Güvenlik açığını patch'le

### Balance Discrepancy:
1. Tüm withdrawal'ları durdur
2. Server vs client balance'ları karşılaştır
3. Transaction log'ları incele
4. Manual olarak düzelt
5. Sistemi tekrar başlat

Bu güvenlik önlemleri ile siteniz canlı ortamda güvenli çalışabilir! 🎯