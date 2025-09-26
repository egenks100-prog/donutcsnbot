const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

// Bot konfigürasyon - Environment variables kullan
const BOT_CONFIG = {
    host: process.env.MC_HOST || 'donutsmp.net',
    port: process.env.MC_PORT || 25565,
    username: process.env.MC_USERNAME || 'lus',
    version: '1.20.1',
    auth: process.env.MC_AUTH || 'microsoft'
};

// Hassas bilgileri loglardan gizle
if (process.env.NODE_ENV === 'production') {
    console.log('📜 Production mode: Sensitive information hidden');
} else {
    console.log('📜 Development mode: Full logging enabled');
}

// Web sunucu kurulumu
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? 
            [process.env.FRONTEND_URL || "https://yourdomain.com"] : 
            ["http://localhost:3000", "http://127.0.0.1:3000", "file://"],
        methods: ["GET", "POST"]
    }
});

// Veri depolama
let activeTPA = new Map(); // Bekleyen TPA istekleri
let userSessions = new Map(); // Kullanıcı oturumları
let transactionLog = []; // Para transfer geçmişi
let userBalances = new Map(); // Kullanıcı bakiyeleri

// Bot oluştur
let bot;
let actualBotUsername = null; // Gerçek bot adını sakla

function createBot() {
    console.log('🤖 DonutSMP botunu başlatıyor...');
    console.log(`📋 Konfigürasyon:`);
    console.log(`   Host: ${BOT_CONFIG.host}:${BOT_CONFIG.port}`);
    console.log(`   Username: ${BOT_CONFIG.username}`);
    console.log(`   Auth: ${BOT_CONFIG.auth}`);
    console.log(`   Version: ${BOT_CONFIG.version}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    bot = mineflayer.createBot(BOT_CONFIG);

    // Bot bağlandığında
    bot.on('login', () => {
        actualBotUsername = bot.username; // Gerçek adını kaydet
        console.log(`✅ Bot başarıyla bağlandı!`);
        console.log(`📍 Sunucu: ${BOT_CONFIG.host}:${BOT_CONFIG.port}`);
        console.log(`👤 Gerçek Bot Adı: ${actualBotUsername}`);
        console.log(`🔑 Auth Türü: ${BOT_CONFIG.auth}`);
        
        // Eğer gerçek ad konfigürasyondakinden farklıysa uyar
        if (actualBotUsername !== BOT_CONFIG.username) {
            console.log(`⚠️  DİKKAT: Konfigürasyon adı (${BOT_CONFIG.username}) ile gerçek ad (${actualBotUsername}) farklı!`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // Bot spawn olduğunda
    bot.on('spawn', () => {
        console.log('🌍 Bot dünyaya spawn oldu');
        console.log(`🎮 Oyuncu: ${actualBotUsername}`);
        console.log(`📍 Pozisyon: ${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y.toFixed(1)}, ${bot.entity.position.z.toFixed(1)}`);
        console.log('📋 TPA ve para transferlerini dinlemeye başladı...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Web arayüzüne bot durumunu bildir
        io.emit('botStatus', { 
            status: 'connected',
            username: actualBotUsername, // Gerçek adı gönder
            configUsername: BOT_CONFIG.username, // Konfigürasyon adı da gönder
            server: BOT_CONFIG.host,
            auth: BOT_CONFIG.auth,
            position: {
                x: bot.entity.position.x,
                y: bot.entity.position.y,
                z: bot.entity.position.z
            }
        });
    });

    // Chat mesajlarını dinle
    bot.on('message', (message) => {
        const messageText = message.toString();
        console.log(`💬 Mesaj: ${messageText}`);
        
        // Para transferi mesajları
        checkMoneyTransfer(messageText);
        
        // TPA mesajları
        checkTPARequest(messageText);
        
        // Web arayüzüne mesajı gönder
        io.emit('chatMessage', {
            message: messageText,
            timestamp: new Date().toISOString(),
            type: 'general'
        });
    });

    // Bot bağlantı kesildiğinde
    bot.on('end', () => {
        console.log('❌ Bot bağlantısı kesildi');
        io.emit('botStatus', { status: 'disconnected' });
        
        // 5 saniye sonra yeniden bağlan
        setTimeout(() => {
            console.log('🔄 Yeniden bağlanmaya çalışıyor...');
            createBot();
        }, 5000);
    });

    // Hata durumlarında
    bot.on('error', (err) => {
        console.error('🚫 Bot hatası:', err);
        io.emit('botError', { error: err.message });
    });
}

// Para transferi kontrolü
function checkMoneyTransfer(message) {
    // Örnek para mesajı formatları:
    // "nzienicarefree18 paid you $1k."
    // "[SYSTEM] You received $500 from player123"
    
    const patterns = [
        /(\w+) paid you \$([0-9,kKmM.]+)/i,
        /(\w+) sent you a tip request/i,
        /You received \$([0-9,kKmM.]+) from (\w+)/i,
        /\[.*\] (\w+) -> You: \$([0-9,kKmM.]+)/i
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            const sender = match[1];
            const amount = match[2] || 'tip request';
            
            const transaction = {
                type: 'money_received',
                from: sender,
                amount: amount,
                message: message,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            };

            transactionLog.push(transaction);
            
            // Para miktarını sayıya çevir
            const numericAmount = parseMoneyAmount(amount);
            
            // Kullanıcının bakiyesini güncelle
            updateUserBalance(sender, numericAmount);
            
            console.log(`💰 PARA GELDİ:`);
            console.log(`   Gönderen: ${sender}`);
            console.log(`   Miktar: $${numericAmount}`);
            console.log(`   Zaman: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`   Mesaj: ${message}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // Web arayüzüne bildir
            io.emit('moneyReceived', {
                ...transaction,
                numericAmount: numericAmount,
                newBalance: getUserBalance(sender)
            });
            
            return true;
        }
    }
    return false;
}

// TPA isteği kontrolü
function checkTPARequest(message) {
    // Örnek TPA mesajları:
    // "nzienicarefree18 sent you a tpa request"
    // "[CLICK] or type /tpaccept nzienicarefree18"
    // "Click to accept TPA from player123"
    
    const patterns = [
        /(\w+) sent you a tpa request/i,
        /(\w+) has requested to teleport to you/i,
        /TPA request from (\w+)/i,
        /or type \/tpaccept (\w+)/i
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            const requester = match[1];
            
            const tpaRequest = {
                type: 'tpa_request',
                from: requester,
                message: message,
                timestamp: new Date().toISOString(),
                id: Date.now().toString(),
                status: 'pending'
            };

            // TPA isteğini kaydet
            activeTPA.set(requester, tpaRequest);
            
            console.log(`📞 TPA İSTEĞİ:`);
            console.log(`   Gönderen: ${requester}`);
            console.log(`   Zaman: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`   Mesaj: ${message}`);
            
            // Web sitesi oturumu kontrol et
            if (userSessions.has(requester)) {
                const userSession = userSessions.get(requester);
                console.log(`✅ User verified: ${requester}`);
                console.log(`   IP: ${userSession.ip}`);
                console.log(`   Login Time: ${userSession.loginTime}`);
                
                // TPA'yi otomatik kabul etme - sadece doğrulama yap
                tpaRequest.status = 'verified';
                userSession.verified = true;
                userSession.verifyTime = new Date().toISOString();
                
                // Web arayüzüne başarılı doğrulama bildir
                io.emit('userVerified', {
                    username: requester,
                    session: userSession,
                    tpa: tpaRequest
                });
                
                console.log(`🎯 TPA verification completed: ${requester}`);
            } else {
                console.log(`⚠️  User session not found: ${requester}`);
                tpaRequest.status = 'denied';
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // Web arayüzüne bildir
            io.emit('tpaRequest', tpaRequest);
            
            return true;
        }
    }
    return false;
}

// Para miktarını parse et (1k = 1000, 1m = 1000000) - DÜZELTİLMİŞ
function parseMoneyAmount(amountStr) {
    if (!amountStr || typeof amountStr !== 'string') return 0;
    
    // Sadece gereksiz karakterleri temizle, noktayı koru
    let cleanAmount = amountStr.replace(/[,$\s]/g, ''); // Nokta sİLME!
    
    // Sonundaki nokta varsa kaldır ("1.2K." -> "1.2K")
    if (cleanAmount.endsWith('.')) {
        cleanAmount = cleanAmount.slice(0, -1);
    }
    
    console.log(`🔍 Para parse ediliyor: "${amountStr}" -> "${cleanAmount}"`);
    
    // k, m, b gibi kısaltmaları işle
    const multipliers = {
        'k': 1000,
        'K': 1000,
        'm': 1000000,
        'M': 1000000,
        'b': 1000000000,
        'B': 1000000000
    };
    
    // K, M, B harfini ara (sondan başla)
    for (let i = cleanAmount.length - 1; i >= 0; i--) {
        const char = cleanAmount[i];
        if (multipliers[char]) {
            const baseAmount = parseFloat(cleanAmount.slice(0, i)) || 0;
            const result = baseAmount * multipliers[char];
            console.log(`💰 ${baseAmount} ${char} = $${result}`);
            return result;
        }
    }
    
    const result = parseFloat(cleanAmount) || 0;
    console.log(`💰 Parse edilen miktar: $${result}`);
    return result;
}

// Kullanıcı bakiyesini güncelle
function updateUserBalance(username, amount) {
    const currentBalance = userBalances.get(username) || 0;
    const newBalance = currentBalance + amount;
    
    // Sadece büyük değişiklikler için log
    if (Math.abs(amount) >= 1000) {
        console.log(`📈 BALANCE UPDATE: ${username} -> $${currentBalance.toFixed(2)} ${amount >= 0 ? '+' : ''}$${amount.toFixed(2)} = $${newBalance.toFixed(2)}`);
    }
    
    userBalances.set(username, newBalance);
    
    // Veriyi kaydet
    saveDataToFile();
    
    return newBalance;
}

// Kullanıcı bakiyesini al
function getUserBalance(username) {
    const balance = userBalances.get(username) || 0;
    return balance;
}

// Tüm kullanıcı bakiyelerini al
function getAllUserBalances() {
    return Object.fromEntries(userBalances);
}

// Veriyi dosyaya kaydet
function saveDataToFile() {
    const data = {
        sessions: Array.from(userSessions.entries()),
        transactions: transactionLog,
        tpa: Array.from(activeTPA.entries()),
        balances: Array.from(userBalances.entries())
    };
    
    try {
        fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('😱 Veri kaydetme hatası:', error);
    }
}

// Veriyi dosyadan yükle
function loadDataFromFile() {
    try {
        const dataPath = path.join(__dirname, 'data.json');
        if (fs.existsSync(dataPath)) {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            // Balances'ları yükle
            if (data.balances && Array.isArray(data.balances)) {
                userBalances = new Map(data.balances);
                console.log(`💾 ${data.balances.length} user balance loaded`);
                console.log('💰 Loaded balances:', Object.fromEntries(userBalances));
            }
            
            // Sessions'ları yükle (isteğe bağlı)
            if (data.sessions && Array.isArray(data.sessions)) {
                userSessions = new Map(data.sessions);
                console.log(`📋 ${data.sessions.length} user sessions loaded`);
            }
            
            // Transactions'ları yükle
            if (data.transactions && Array.isArray(data.transactions)) {
                transactionLog = data.transactions;
                console.log(`📝 ${data.transactions.length} transactions loaded`);
            }
            
            console.log('✅ Data successfully loaded from file');
        } else {
            console.log('ℹ️ No existing data file found, starting fresh');
        }
    } catch (error) {
        console.error('😱 Veri yükleme hatası:', error);
    }
}

// Rate limiting ve güvenlik middleware
const rateLimit = {}; // Basit rate limiting

function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimit[ip]) {
        rateLimit[ip] = { count: 1, resetTime: now + 60000 }; // 1 dakika
    } else if (now > rateLimit[ip].resetTime) {
        rateLimit[ip] = { count: 1, resetTime: now + 60000 };
    } else {
        rateLimit[ip].count++;
        if (rateLimit[ip].count > 100) { // Dakikada max 100 request
            return res.status(429).json({ error: 'Too many requests' });
        }
    }
    next();
}

// Input validation middleware
function validateInput(req, res, next) {
    if (req.body) {
        // Username validation
        if (req.body.username && !/^[a-zA-Z0-9_]{3,16}$/.test(req.body.username)) {
            return res.status(400).json({ error: 'Invalid username format' });
        }
        
        // Amount validation
        if (req.body.amount !== undefined) {
            const amount = parseFloat(req.body.amount);
            if (isNaN(amount) || amount < 0 || amount > 1000000000) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
        }
    }
    next();
}

// Web API endpoints
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(rateLimitMiddleware);
app.use(validateInput);
// Güvenli static file serving
const staticPath = path.join(__dirname, '../web/public');
app.use(express.static(staticPath, {
    dotfiles: 'deny', // .env gibi dosyaları gizle
    index: ['index.html'],
    setHeaders: (res, path) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
    }
}));

// Kullanıcı oturumu oluştur
app.post('/api/login', (req, res) => {
    const { username, ip } = req.body;
    
    if (!username || !ip) {
        return res.status(400).json({ error: 'Username ve IP gerekli' });
    }
    
    // IP koruması kontrol et
    const existingSession = Array.from(userSessions.values()).find(session => 
        session.ip === ip && session.username !== username
    );
    
    if (existingSession) {
        return res.status(403).json({ 
            error: 'Bu IP adresi zaten başka bir hesap tarafından kullanılıyor',
            existingUser: existingSession.username
        });
    }
    
    const session = {
        username: username,
        ip: ip,
        loginTime: new Date().toISOString(),
        verified: false,
        sessionId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    userSessions.set(username, session);
    
    console.log(`🆕 YENİ OTURUM:`);
    console.log(`   Kullanıcı: ${username}`);
    console.log(`   IP: ${ip}`);
    console.log(`   Zaman: ${new Date().toLocaleString('tr-TR')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Gerçek bot adını kullan, yoksa konfigürasyon adını kullan
    const botNameForTPA = actualBotUsername || BOT_CONFIG.username;
    
    res.json({
        success: true,
        session: session,
        message: `DonutSMP sunucusuna gir ve bota TPA at: /tpa ${botNameForTPA}`,
        botInfo: {
            actualName: actualBotUsername,
            configName: BOT_CONFIG.username,
            server: BOT_CONFIG.host,
            auth: BOT_CONFIG.auth
        }
    });
});

// Oturum durumu kontrol et
app.get('/api/session/:username', (req, res) => {
    const username = req.params.username;
    const session = userSessions.get(username);
    
    if (!session) {
        return res.status(404).json({ error: 'Oturum bulunamadı' });
    }
    
    res.json({ session });
});

// Tüm oturumları getir (IP tabanlı otomatik giriş için)
app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(userSessions.values());
    res.json({ 
        sessions: sessions,
        count: sessions.length
    });
});

// Aktif TPA istekleri
app.get('/api/tpa', (req, res) => {
    res.json({ 
        activeTPA: Array.from(activeTPA.entries()).map(([user, tpa]) => ({ user, tpa }))
    });
});

// Para transferi geçmişi - SADECE ADMIN İÇİN
app.get('/api/transactions', (req, res) => {
    // Production'da bu endpoint'i kapat
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json({ transactions: transactionLog });
});

// Kullanıcı bakiyesi al
app.get('/api/balance/:username', (req, res) => {
    const username = req.params.username;
    const balance = getUserBalance(username);
    
    res.json({
        username: username,
        balance: balance
    });
});

// Tüm bakiyeleri al - SADECE ADMIN İÇİN
app.get('/api/balances', (req, res) => {
    // Production'da bu endpoint'i kapat
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json({ balances: getAllUserBalances() });
});

// Debug endpoint - SADECE DEVELOPMENT İÇİN
app.get('/api/debug/balance/:username', (req, res) => {
    // Production'da bu endpoint'i kapat
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    
    const username = req.params.username;
    const balance = getUserBalance(username);
    
    res.json({
        username: username,
        balance: balance,
        hasUser: userBalances.has(username)
    });
});

// Session validation function
function validateSession(username, req) {
    const session = userSessions.get(username);
    if (!session) {
        return { valid: false, error: 'No active session found' };
    }
    
    // IP kontrolü
    const requestIP = req.ip || req.connection.remoteAddress;
    if (session.ip !== requestIP) {
        return { valid: false, error: 'IP address mismatch' };
    }
    
    // Session expire check (24 saat)
    const sessionAge = Date.now() - new Date(session.loginTime).getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) {
        return { valid: false, error: 'Session expired' };
    }
    
    return { valid: true };
}

// Withdraw işlemi
app.post('/api/withdraw', (req, res) => {
    const { username, amount } = req.body;
    
    // Session validation
    const sessionCheck = validateSession(username, req);
    if (!sessionCheck.valid) {
        console.log(`❌ Withdrawal blocked: ${sessionCheck.error}`);
        return res.status(401).json({ 
            success: false, 
            error: sessionCheck.error 
        });
    }
    
    console.log(`🔍 WITHDRAW REQUEST:`);
    console.log(`   Username: ${username}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Amount Type: ${typeof amount}`);
    console.log(`   Amount Fixed: ${amount.toFixed(0)}`);
    
    if (!username || !amount || amount <= 0) {
        console.log(`❌ Invalid request parameters`);
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid username or amount' 
        });
    }
    
    // Maksimum çekim limiti kontrolü (DonutSMP server limiti)
    const MAX_WITHDRAWAL = 100000000; // 100 milyon maksimum
    if (amount > MAX_WITHDRAWAL) {
        console.log(`❌ Amount exceeds maximum withdrawal limit: $${amount.toFixed(2)} > $${MAX_WITHDRAWAL.toFixed(2)}`);
        return res.status(400).json({ 
            success: false, 
            error: `Maximum withdrawal amount is $${MAX_WITHDRAWAL.toLocaleString()}. Please withdraw in smaller amounts.` 
        });
    }
    
    const currentBalance = getUserBalance(username);
    console.log(`💰 Balance Check:`);
    console.log(`   Current Balance: $${currentBalance.toFixed(2)}`);
    console.log(`   Requested Amount: $${amount.toFixed(2)}`);
    console.log(`   Has Sufficient Balance: ${amount <= currentBalance}`);
    
    if (amount > currentBalance) {
        console.log(`❌ Insufficient balance - rejecting withdrawal`);
        return res.status(400).json({ 
            success: false, 
            error: 'Insufficient balance' 
        });
    }
    
    // Bot Minecraft'ta para gönder
    if (bot && bot.player) {
        try {
            // Command injection korunması
            const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
            const sanitizedAmount = Math.floor(Math.abs(amount)); // Sadece pozitif tamsayı
            
            if (sanitizedUsername !== username) {
                console.log(`❌ Command injection attempt blocked: ${username}`);
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid username characters' 
                });
            }
            
            if (sanitizedAmount !== amount || sanitizedAmount <= 0) {
                console.log(`❌ Invalid amount blocked: ${amount}`);
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid amount' 
                });
            }
            
            const payCommand = `/pay ${sanitizedUsername} ${sanitizedAmount}`;
            console.log(`🎮 Minecraft Command:`);
            console.log(`   Command: ${payCommand}`);
            console.log(`   Command Length: ${payCommand.length}`);
            console.log(`   Bot Connected: ${bot && bot.player ? 'Yes' : 'No'}`);
            console.log(`   Bot Username: ${bot.username || 'Unknown'}`);
            
            bot.chat(payCommand);
            
            // Kullanıcı bakiyesinden düş
            updateUserBalance(username, -amount);
            
            console.log(`💸 WITHDRAW SUCCESS:`);
            console.log(`   Kullanıcı: ${username}`);
            console.log(`   Miktar: $${amount.toFixed(2)}`);
            console.log(`   Komut: ${payCommand}`);
            console.log(`   Yeni Bakiye: $${getUserBalance(username).toFixed(2)}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            res.json({ 
                success: true, 
                message: `$${amount.toFixed(2)} sent to ${username}`,
                newBalance: getUserBalance(username)
            });
            
        } catch (error) {
            console.error('😱 Withdraw hatası:', error);
            console.error('😱 Stack trace:', error.stack);
            res.status(500).json({ 
                success: false, 
                error: 'Bot command failed' 
            });
        }
    } else {
        console.log(`❌ Bot not connected`);
        res.status(503).json({ 
            success: false, 
            error: 'Bot is not connected' 
        });
    }
});

// Bakiye güncelleme (web sitesinden)
app.post('/api/update-balance', (req, res) => {
    const { username, newBalance } = req.body;
    
    // Session validation
    const sessionCheck = validateSession(username, req);
    if (!sessionCheck.valid) {
        console.log(`❌ Balance update blocked: ${sessionCheck.error}`);
        return res.status(401).json({ 
            success: false, 
            error: sessionCheck.error 
        });
    }
    
    console.log(`🔍 UPDATE-BALANCE REQUEST:`);
    console.log(`   Username: ${username}`);
    console.log(`   New Balance: ${newBalance}`);
    console.log(`   Request IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`   User Agent: ${req.get('User-Agent') || 'Unknown'}`);
    
    if (!username || newBalance === undefined || newBalance < 0) {
        console.log(`❌ Invalid update-balance request`);
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid username or balance' 
        });
    }
    
    const currentBalance = getUserBalance(username);
    console.log(`🔄 Balance change: $${currentBalance.toFixed(2)} -> $${newBalance.toFixed(2)}`);
    
    // Kullanıcı bakiyesini güncelle
    userBalances.set(username, newBalance);
    
    console.log(`💰 BAKİYE GÜNCELLEME (Web):`);
    console.log(`   Kullanıcı: ${username}`);
    console.log(`   Yeni Bakiye: $${newBalance.toFixed(2)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Veriyi kaydet
    saveDataToFile();
    
    res.json({ 
        success: true, 
        newBalance: newBalance
    });
});

// Bot durumu - Sadece gerekli bilgiler
app.get('/api/bot/status', (req, res) => {
    res.json({
        connected: bot && bot.player,
        username: actualBotUsername, // Sadece bot adı
        // Hassas bilgileri kaldırıldı: auth, server, position
    });
});

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
    console.log(`🔗 Web arayüzü bağlandı: ${socket.id}`);
    
    // Mevcut durumu gönder
    socket.emit('botStatus', {
        status: bot && bot.player ? 'connected' : 'disconnected',
        username: actualBotUsername, // Gerçek bot adı
        configUsername: BOT_CONFIG.username, // Konfigürasyon adı
        server: BOT_CONFIG.host,
        auth: BOT_CONFIG.auth
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Web arayüzü bağlantısı kesildi: ${socket.id}`);
    });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🌐 Web sunucu başlatıldı: http://localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Veriyi yükle
loadDataFromFile();

// Botu başlat
createBot();

// Temizlik için veri kaydetme
process.on('SIGINT', () => {
    console.log('\n🔄 Bot kapatılıyor...');
    
    // Veriyi dosyaya kaydet
    saveDataToFile();
    console.log('💾 Veri kaydedildi');
    
    process.exit(0);
});

// Başlangıçta veri yükle
try {
    const savedData = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
    const data = JSON.parse(savedData);
    
    if (data.sessions) {
        userSessions = new Map(data.sessions);
        console.log(`📂 ${userSessions.size} oturum yüklendi`);
    }
    
    if (data.transactions) {
        transactionLog = data.transactions;
        console.log(`📂 ${transactionLog.length} işlem geçmişi yüklendi`);
    }
    
    if (data.tpa) {
        activeTPA = new Map(data.tpa);
        console.log(`📂 ${activeTPA.size} TPA isteği yüklendi`);
    }
    
    if (data.balances) {
        userBalances = new Map(data.balances);
        console.log(`💰 ${userBalances.size} kullanıcı bakiyesi yüklendi`);
    }
} catch (error) {
    console.log('📂 Veri dosyası bulunamadı, yeni başlangıç yapılıyor');
}
