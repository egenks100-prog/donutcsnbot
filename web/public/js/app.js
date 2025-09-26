// Global değişkenler
let socket;
let currentUser = null;
let currentSession = null;
let verificationInterval = null;

// Sayfa yüklendikten sonra başlat
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Uygulamayı başlat
function initializeApp() {
    console.log('🚀 DonutFlip uygulaması başlatılıyor...');
    
    // Socket.IO bağlantısı kur
    initializeSocket();
    
    // Event listener'ları kur
    setupEventListeners();
    
    // Deposit listener'ları kur
    setupDepositListeners();
    
    // Sayfa yenilendiğinde oturum kontrol et
    checkExistingSession();
    
    console.log('✅ Uygulama başlatıldı');
}

// Sidebar navigation kurulumu
function setupSidebarNavigation() {
    // Tüm nav itemlara click listener ekle
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const gameType = this.dataset.game;
            const pageType = this.dataset.page;
            
            if (gameType) {
                switchGame(gameType);
            } else if (pageType) {
                switchPage(pageType);
            }
        });
    });
}

// Oyun değiştir
function switchGame(gameType) {
    // Active nav item'ı güncelle
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[data-game="${gameType}"]`).classList.add('active');
    
    // Game section'ları gizle/göster
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetGame = document.getElementById(`${gameType}Game`);
    if (targetGame) {
        targetGame.classList.add('active');
        
        // Page title'ı güncelle
        const pageTitle = document.querySelector('.page-title');
        switch(gameType) {
            case 'mines':
                pageTitle.textContent = 'Mines';
                // Mines oyununu başlat
                if (typeof initializeMines === 'function') {
                    setTimeout(initializeMines, 100);
                }
                break;
            case 'crash':
                pageTitle.textContent = 'Crash';
                break;
            case 'roulette':
                pageTitle.textContent = 'Roulette';
                break;
            case 'coinflip':
                pageTitle.textContent = 'Coinflip';
                break;
        }
    }
}

// Sayfa değiştir
function switchPage(pageType) {
    // Bu fonksiyon profil, geçmiş gibi sayfalar için kullanılacak
    console.log(`Switching to page: ${pageType}`);
}

// Socket.IO bağlantısını kur
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('🔗 Socket bağlantısı kuruldu:', socket.id);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Socket bağlantısı kesildi');
        updateBotStatus('disconnected');
    });
    
    // Bot durum güncellemeleri
    socket.on('botStatus', (data) => {
        console.log('🤖 Bot durumu:', data);
        updateBotStatus(data.status, data);
    });
    
    // Kullanıcı doğrulandı
    socket.on('userVerified', (data) => {
        console.log('✅ Kullanıcı doğrulandı:', data);
        if (data.username === currentUser) {
            showNotification('Doğrulama başarılı! Giriş yapılıyor...', 'success');
            setTimeout(() => {
                showDashboard();
            }, 2000);
        }
    });
    
    // TPA isteği alındı
    socket.on('tpaRequest', (data) => {
        console.log('📞 TPA isteği:', data);
        if (data.from === currentUser) {
            updateVerificationStatus('TPA isteği alındı, doğrulanıyor...');
        }
    });
    
    // Para alındı
    socket.on('moneyReceived', (data) => {
        console.log('💰 Para alındı:', data);
        
        // Kullanıcının bakiyesini güncelle
        if (data.from === currentUser) {
            updateUserBalanceDisplay(data.newBalance);
            showNotification(`Deposit successful! +$${data.numericAmount.toFixed(2)}`, 'success');
            
            // Mines oyunundaki bakiyeyi de güncelle
            if (typeof minesGame !== 'undefined') {
                minesGame.userBalance = data.newBalance;
                updateMinesUserBalance();
            }
        }
        
        addActivityLog(data);
    });
    
    // Chat mesajı
    socket.on('chatMessage', (data) => {
        console.log('💬 Chat:', data.message);
    });
    
    socket.on('botError', (data) => {
        console.error('🚫 Bot hatası:', data.error);
        showNotification('Bot hatası: ' + data.error, 'error');
    });
}

// Event listener'ları kur
function setupEventListeners() {
    // Version selector
    document.querySelectorAll('.version').forEach(version => {
        version.addEventListener('click', function() {
            document.querySelectorAll('.version').forEach(v => v.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Login formu
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
    
    // Verification sayfası butonları
    document.getElementById('backBtn').addEventListener('click', () => {
        showPage('loginPage');
        clearVerificationInterval();
    });
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        checkBotStatus();
    });
    
    // Dashboard logout butonu
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Sidebar navigation
    setupSidebarNavigation();
}

// Login işlemi
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const selectedVersion = document.querySelector('.version.active').dataset.version;
    
    if (!username) {
        showError('Kullanıcı adı gerekli!');
        return;
    }
    
    // Loading durumu
    const submitBtn = document.querySelector('.continue-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Kontrol Ediliyor...';
    submitBtn.disabled = true;
    
    try {
        // IP adresini al
        const userIP = await getUserIP();
        
        // Sunucuya login isteği gönder
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                ip: userIP,
                version: selectedVersion
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = username;
            currentSession = data.session;
            
            // Local storage'a kaydet
            localStorage.setItem('donutflip_user', username);
            localStorage.setItem('donutflip_session', JSON.stringify(data.session));
            
            showNotification(data.message, 'info');
            showVerificationPage();
            
        } else {
            showError(data.error || 'Giriş yapılamadı');
        }
        
    } catch (error) {
        console.error('Login hatası:', error);
        showError('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// IP adresini al
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('IP alınamadı:', error);
        return 'unknown';
    }
}

// Mevcut oturum kontrol et
function checkExistingSession() {
    const savedUser = localStorage.getItem('donutflip_user');
    const savedSession = localStorage.getItem('donutflip_session');
    
    if (savedUser && savedSession) {
        try {
            currentUser = savedUser;
            currentSession = JSON.parse(savedSession);
            
            // Oturum durumunu kontrol et
            checkSessionStatus(savedUser);
            
        } catch (error) {
            console.error('Oturum yüklenemedi:', error);
            clearSession();
        }
    }
}

// Oturum durumunu kontrol et
async function checkSessionStatus(username) {
    try {
        const response = await fetch(`/api/session/${username}`);
        const data = await response.json();
        
        if (data.session && data.session.verified) {
            showDashboard();
        } else {
            showVerificationPage();
        }
        
    } catch (error) {
        console.error('Oturum kontrol hatası:', error);
        clearSession();
    }
}

// Verification sayfasını göster
function showVerificationPage() {
    showPage('verificationPage');
    
    // Bot durumunu kontrol ederek gerçek bot adını al
    checkBotStatus().then(() => {
        updateTPACommand();
    });
    
    // Periyodik olarak doğrulama durumunu kontrol et
    startVerificationCheck();
}

// TPA komutunu güncelle
function updateTPACommand() {
    const botStatusElement = document.getElementById('botStatus');
    const actualBotName = botStatusElement.dataset.actualBotName || 'DonutFlipBot';
    const tpaCommandElement = document.getElementById('tpaCommand');
    
    if (tpaCommandElement) {
        tpaCommandElement.textContent = `/tpa ${actualBotName}`;
        console.log(`🤖 TPA komutu güncellendi: /tpa ${actualBotName}`);
    }
}

// Verification durumunu kontrol etmeye başla
function startVerificationCheck() {
    clearVerificationInterval();
    
    verificationInterval = setInterval(async () => {
        if (currentUser) {
            try {
                const response = await fetch(`/api/session/${currentUser}`);
                const data = await response.json();
                
                if (data.session && data.session.verified) {
                    clearVerificationInterval();
                    showNotification('Doğrulama tamamlandı! Giriş yapılıyor...', 'success');
                    setTimeout(() => {
                        showDashboard();
                    }, 2000);
                }
                
            } catch (error) {
                console.error('Verification kontrol hatası:', error);
            }
        }
    }, 3000); // 3 saniyede bir kontrol et
}

// Verification interval'ını temizle
function clearVerificationInterval() {
    if (verificationInterval) {
        clearInterval(verificationInterval);
        verificationInterval = null;
    }
}

// Dashboard'ı göster
async function showDashboard() {
    clearVerificationInterval();
    showPage('dashboardPage');
    
    // Kullanıcı bilgilerini güncelle
    const welcomeElements = document.querySelectorAll('#welcomeUser');
    welcomeElements.forEach(element => {
        element.textContent = `Welcome, ${currentUser}!`;
    });
    
    // Kullanıcının bakiyesini yükle
    await loadUserBalance(currentUser);
    
    // User balance'ı başlat (eski sistem yedeği)
    updateUserBalance();
    
    // Mines oyununu başlat
    setTimeout(() => {
        initializeMines();
    }, 100);
}

// Kullanıcı balance'ı güncelle
function updateUserBalance() {
    const balanceElements = document.querySelectorAll('#userBalance');
    const balance = minesGame ? minesGame.userBalance.toFixed(2) : '100.00';
    balanceElements.forEach(element => {
        element.textContent = balance;
    });
}

// Dashboard bot bilgilerini güncelle
async function updateDashboardBotInfo() {
    try {
        const response = await fetch('/api/bot/status');
        const data = await response.json();
        
        const connectionStatus = data.connected ? 'Connected' : 'Disconnected';
        const actualBotName = data.username || 'Unknown';
        const configBotName = data.configUsername;
        
        // Bot bağlantı durumunu göster
        let connectionText = connectionStatus;
        if (data.connected) {
            connectionText += ` (${actualBotName})`;
            if (configBotName && actualBotName !== configBotName) {
                connectionText += ` [Config: ${configBotName}]`;
            }
            if (data.auth) {
                connectionText += ` - ${data.auth}`;
            }
        }
        
        document.getElementById('botConnection').textContent = connectionText;
        document.getElementById('botServer').textContent = data.server || '-';
        document.getElementById('activeSessions').textContent = data.activeSessions || '0';
        
        console.log(`📊 Dashboard bot bilgileri güncellendi:`, {
            connected: data.connected,
            actualName: actualBotName,
            configName: configBotName,
            auth: data.auth,
            server: data.server,
            activeSessions: data.activeSessions
        });
        
    } catch (error) {
        console.error('Bot durumu alınamadı:', error);
    }
}

// Activity log'u yükle
async function loadActivityLog() {
    try {
        const response = await fetch('/api/transactions');
        const data = await response.json();
        
        const activityLog = document.getElementById('activityLog');
        activityLog.innerHTML = '';
        
        if (data.transactions && data.transactions.length > 0) {
            data.transactions.slice(-10).reverse().forEach(transaction => {
                addActivityLogItem(transaction);
            });
        } else {
            activityLog.innerHTML = '<p style="color: #666; text-align: center;">Henüz aktivite yok</p>';
        }
        
    } catch (error) {
        console.error('Activity log yüklenemedi:', error);
    }
}

// Activity log'a item ekle
function addActivityLogItem(transaction) {
    const activityLog = document.getElementById('activityLog');
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.cssText = `
        padding: 12px;
        margin: 8px 0;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        border-left: 4px solid #4facfe;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="font-weight: 500; color: #ffffff; margin-bottom: 4px;">
            💰 ${transaction.from} → ${transaction.amount}
        </div>
        <div style="font-size: 12px; color: #b4b4b4;">
            ${new Date(transaction.timestamp).toLocaleString('tr-TR')}
        </div>
    `;
    
    const time = document.createElement('div');
    time.style.cssText = 'font-size: 12px; color: #4facfe;';
    time.textContent = new Date(transaction.timestamp).toLocaleTimeString('tr-TR');
    
    item.appendChild(content);
    item.appendChild(time);
    
    // En üste ekle
    if (activityLog.firstChild) {
        activityLog.insertBefore(item, activityLog.firstChild);
    } else {
        activityLog.appendChild(item);
    }
    
    // Maksimum 10 item göster
    while (activityLog.children.length > 10) {
        activityLog.removeChild(activityLog.lastChild);
    }
}

// Activity log'a yeni item ekle
function addActivityLog(transaction) {
    if (document.getElementById('dashboardPage').classList.contains('active')) {
        addActivityLogItem(transaction);
    }
}

// Bot durumunu kontrol et
async function checkBotStatus() {
    try {
        const response = await fetch('/api/bot/status');
        const data = await response.json();
        
        updateBotStatus(data.connected ? 'connected' : 'disconnected', data);
        
        return data; // Data'yı return et
        
    } catch (error) {
        console.error('Bot durumu kontrol edilemedi:', error);
        updateBotStatus('disconnected');
        return null;
    }
}

// Bot durumunu güncelle
function updateBotStatus(status, data = {}) {
    const botStatus = document.getElementById('botStatus');
    const statusText = botStatus.querySelector('.status-text');
    
    botStatus.className = `status ${status}`;
    
    if (status === 'connected') {
        const actualName = data.username || 'Bot';
        const configName = data.configUsername;
        
        // Gerçek bot adını data attribute olarak sakla
        botStatus.dataset.actualBotName = actualName;
        
        let statusMessage = `Bot Status: Connected (${actualName})`;
        if (configName && actualName !== configName) {
            statusMessage += ` [Config: ${configName}]`;
        }
        
        statusText.textContent = statusMessage;
        
        // Auth bilgisini de göster
        if (data.auth) {
            statusText.textContent += ` - Auth: ${data.auth}`;
        }
        
        console.log(`🤖 Bot durumu güncellendi:`, {
            status: 'connected',
            actualName: actualName,
            configName: configName,
            auth: data.auth,
            server: data.server
        });
        
        // TPA komutunu güncelle
        updateTPACommand();
    } else {
        statusText.textContent = 'Bot Status: Disconnected';
        botStatus.dataset.actualBotName = '';
    }
}

// Verification durumunu güncelle
function updateVerificationStatus(message) {
    const statusElement = document.getElementById('verificationStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Çıkış yap
function logout() {
    clearSession();
    clearVerificationInterval();
    showPage('loginPage');
    showNotification('Çıkış yapıldı', 'info');
}

// Oturumu temizle
function clearSession() {
    currentUser = null;
    currentSession = null;
    localStorage.removeItem('donutflip_user');
    localStorage.removeItem('donutflip_session');
}

// Sayfa göster
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
}

// Hata mesajı göster
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

// Show notification (silent - no popups)
function showNotification(message, type = 'info') {
    // Only console log - no annoying popups
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // No more alert popups!
}

// Kullanıcı bakiyesi gösterimini güncelle
function updateUserBalanceDisplay(balance) {
    const balanceElements = document.querySelectorAll('#userBalance');
    balanceElements.forEach(element => {
        element.textContent = balance.toFixed(2);
    });
    console.log(`💰 Bakiye güncellendi: $${balance.toFixed(2)}`);
}

// Kullanıcı bakiyesini sunucudan yükle
async function loadUserBalance(username) {
    if (!username) return;
    
    try {
        const response = await fetch(`/api/balance/${username}`);
        const data = await response.json();
        
        updateUserBalanceDisplay(data.balance);
        
        // Mines oyunundaki bakiyeyi de güncelle
        if (typeof minesGame !== 'undefined') {
            minesGame.userBalance = data.balance;
        }
        
        console.log(`📄 ${username} bakiyesi yüklendi: $${data.balance.toFixed(2)}`);
        return data.balance;
    } catch (error) {
        console.error('Bakiye yüklenemedi:', error);
        return 0;
    }
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debug: Global değişkenleri konsola logla
window.debugDonutFlip = function() {
    console.log('🔍 DonutFlip Debug Info:');
    console.log('Current User:', currentUser);
    console.log('Current Session:', currentSession);
    console.log('Socket Connected:', socket && socket.connected);
    console.log('Active Page:', document.querySelector('.page.active').id);
};

// ============= MINES OYUNU =============

// Mines oyun durumu
let minesGame = {
    active: false,
    gameId: null,
    gridSize: 25,
    mineCount: 3,
    betAmount: 0,
    currentMultiplier: 0,
    gemsFound: 0,
    minePositions: [],
    revealedTiles: [],
    userBalance: 0.00
};

// Mines event listener'larını kur
function setupMinesEventListeners() {
            // Tab butonları - sadece Manuel modu
            // Otomatik mod kaldırıldı, sadece Manuel var
    
    // Bet amount butonları
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const multiplier = parseFloat(this.dataset.multiplier);
            const currentBet = parseFloat(document.getElementById('betAmount').value) || 0;
            const newBet = currentBet * multiplier;
            document.getElementById('betAmount').value = Math.min(newBet, minesGame.userBalance).toFixed(2);
            updateMinesInfo();
        });
    });
    
            // Grid size sabit 25 (5x5) - event listener gerek yok
    
    // Mine count değişimi
    document.getElementById('mineCount').addEventListener('change', function() {
        minesGame.mineCount = parseInt(this.value);
        updateMinesInfo();
    });
    
    // Bet amount değişimi - sadece blur olduğunda kontrol et
    document.getElementById('betAmount').addEventListener('blur', function() {
        let amount = parseFloat(this.value) || 0;
        amount = Math.min(amount, minesGame.userBalance);
        amount = Math.max(amount, 0); // Negatif olmamasın
        this.value = amount.toFixed(2);
        updateMinesInfo();
    });
    
    // Input sırasında sadece multiplier info güncelle
    document.getElementById('betAmount').addEventListener('input', function() {
        updateMinesInfo();
    });
    
    // Play butonu
    document.getElementById('playMines').addEventListener('click', startMinesGame);
    
    // Cashout butonu
    document.getElementById('cashoutBtn').addEventListener('click', cashoutMines);
}

// Mines grid'i oluştur (sabit 5x5)
function createMinesGrid() {
    const grid = document.getElementById('minesGrid');
    
    // Grid sınıfını sabit 5x5 yap
    grid.className = 'mines-grid grid-5x5';
    grid.innerHTML = '';
    
    // 25 tile oluştur (5x5)
    for (let i = 0; i < 25; i++) {
        const tile = document.createElement('div');
        tile.className = 'grid-tile';
        tile.dataset.index = i;
        tile.addEventListener('click', () => revealTile(i));
        grid.appendChild(tile);
    }
    
    // Grid size'ı 25'e sabitler
    minesGame.gridSize = 25;
}

// Mines oyununu başlat
        function startMinesGame() {
            const betAmount = parseFloat(document.getElementById('betAmount').value) || 0;
            
            if (betAmount <= 0) {
                console.log('Invalid bet amount');
                return;
            }
            
            if (betAmount > minesGame.userBalance) {
                console.log('Insufficient balance');
                return;
            }
            
            if (minesGame.active) {
                console.log('Game already in progress');
                return;
            }
    
    // Oyunu başlat
    minesGame.active = true;
    minesGame.gameId = Date.now().toString();
    minesGame.betAmount = betAmount;
    minesGame.currentMultiplier = 0;
    minesGame.gemsFound = 0;
    minesGame.revealedTiles = [];
    minesGame.userBalance -= betAmount;
    
    // Mayınları yerleştir
    placeMines();
    
    // UI'ı güncelle
    updateMinesUI();
    updateMinesUserBalance();
    
    syncBalanceWithBot(); // Bahis yapıldıkça bakiyeyi senkronize et
    showNotification(`Game started! Bet: $${betAmount.toFixed(2)}`, 'success');
}

// Mayınları yerleştir
function placeMines() {
    minesGame.minePositions = [];
    const positions = new Set();
    
    while (positions.size < minesGame.mineCount) {
        const pos = Math.floor(Math.random() * minesGame.gridSize);
        positions.add(pos);
    }
    
    minesGame.minePositions = Array.from(positions);
    console.log('💣 Mayınlar yerleştirildi:', minesGame.minePositions);
}

// Tile'ı aç
        function revealTile(index) {
            if (!minesGame.active) {
                console.log('Start the game first!');
                return;
            }
    
    if (minesGame.revealedTiles.includes(index)) {
        return; // Zaten açılmış
    }
    
    const tile = document.querySelector(`[data-index="${index}"]`);
    minesGame.revealedTiles.push(index);
    tile.classList.add('revealed');
    
    if (minesGame.minePositions.includes(index)) {
        // Mayına bastı!
        tile.classList.add('mine');
        tile.textContent = '💣';
        
        // Tüm mayınları göster
        minesGame.minePositions.forEach(mineIndex => {
            const mineTile = document.querySelector(`[data-index="${mineIndex}"]`);
            mineTile.classList.add('mine', 'revealed');
            mineTile.textContent = '💣';
        });
        
        // Oyunu bitir
        endGame(false);
        
    } else {
        // Gem buldu!
        tile.classList.add('gem');
        tile.textContent = '💎';
        minesGame.gemsFound++;
        
        // Çarpanı hesapla
        calculateMultiplier();
        updateMinesUI();
        
        // Kazanma kontrolü
        const totalSafeTiles = minesGame.gridSize - minesGame.mineCount;
        if (minesGame.gemsFound >= totalSafeTiles) {
            endGame(true);
        }
    }
}

// Çarpan hesapla
function calculateMultiplier() {
    const safeTiles = minesGame.gridSize - minesGame.mineCount;
    const remaining = safeTiles - minesGame.gemsFound;
    
    if (remaining <= 0) {
        minesGame.currentMultiplier = 0;
        return;
    }
    
    // Gerçekçi mines multiplier algoritması
    let multiplier = 1;
    
    // Her açılan safe tile için çarpanı artır
    for (let i = 0; i < minesGame.gemsFound; i++) {
        const remainingTiles = minesGame.gridSize - i;
        const remainingSafe = safeTiles - i;
        const risk = remainingTiles / remainingSafe;
        multiplier *= risk;
    }
    
    minesGame.currentMultiplier = Math.max(multiplier, 1);
    
    // Next multiplier hesapla (bir sonraki güvenli tile için)
    if (minesGame.gemsFound < safeTiles) {
        const nextRemainingTiles = minesGame.gridSize - minesGame.revealedTiles.length;
        const nextRemainingSafe = safeTiles - minesGame.gemsFound;
        const nextRisk = nextRemainingTiles / nextRemainingSafe;
        const nextMultiplier = minesGame.currentMultiplier * nextRisk;
        
        // UI'ı güncelle
        document.getElementById('nextMultiplier').textContent = nextMultiplier.toFixed(2) + 'x';
    } else {
        document.getElementById('nextMultiplier').textContent = minesGame.currentMultiplier.toFixed(2) + 'x';
    }
}

// Para çek
function cashoutMines() {
    if (!minesGame.active || minesGame.gemsFound === 0) {
        return;
    }
    
    const winAmount = minesGame.betAmount * minesGame.currentMultiplier;
    minesGame.userBalance += winAmount;
    
    // Oyun geçmişine ekle
    addGameToHistory({
        bet: minesGame.betAmount,
        win: winAmount,
        multiplier: minesGame.currentMultiplier,
        gems: minesGame.gemsFound,
        result: 'cashout'
    });
    
    endGame(true);
    syncBalanceWithBot(); // Bakiyeyi senkronize et
    showNotification(`Success! You won $${winAmount.toFixed(2)}!`, 'success');
}

// Oyunu bitir
function endGame(won) {
    minesGame.active = false;
    
    // Tüm tile'ları devre dışı bırak
    document.querySelectorAll('.grid-tile').forEach(tile => {
        tile.classList.add('disabled');
    });
    
    // UI'ı güncelle
    updateMinesUI();
    updateMinesUserBalance();
    
    if (!won) {
        // Oyun geçmişine ekle
        addGameToHistory({
            bet: minesGame.betAmount,
            win: 0,
            multiplier: 0,
            gems: minesGame.gemsFound,
            result: 'mine'
        });
        
        syncBalanceWithBot(); // Bakiyeyi senkronize et
        showNotification(`Game over! You lost $${minesGame.betAmount.toFixed(2)}.`, 'error');
    }
    
    // 3 saniye sonra grid'i sıfırla
    setTimeout(() => {
        resetMinesGame();
    }, 3000);
}

// Oyunu sıfırla
function resetMinesGame() {
    minesGame.active = false;
    minesGame.gameId = null;
    minesGame.currentMultiplier = 0;
    minesGame.gemsFound = 0;
    minesGame.revealedTiles = [];
    minesGame.minePositions = [];
    
    createMinesGrid();
    updateMinesUI();
    updateMinesInfo();
}

// Mines UI'ını güncelle
function updateMinesUI() {
    // Game stats
    document.getElementById('gemsFound').textContent = minesGame.gemsFound;
    document.getElementById('currentMultiplier').textContent = minesGame.currentMultiplier.toFixed(2) + 'x';
    
    // Play button
    const playBtn = document.getElementById('playMines');
    if (minesGame.active) {
        playBtn.textContent = 'Game in Progress';
        playBtn.disabled = true;
    } else {
        playBtn.textContent = 'Play';
        playBtn.disabled = false;
    }
    
    // Cashout button
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (minesGame.active && minesGame.gemsFound > 0) {
        const winAmount = minesGame.betAmount * minesGame.currentMultiplier;
        cashoutBtn.textContent = `Cashout $${winAmount.toFixed(2)}`;
        cashoutBtn.disabled = false;
    } else {
        cashoutBtn.textContent = 'Cashout $0.00';
        cashoutBtn.disabled = true;
    }
}

// Mines info güncelle
function updateMinesInfo() {
    const betAmount = parseFloat(document.getElementById('betAmount').value) || 0;
    const safeTiles = minesGame.gridSize - minesGame.mineCount;
    
    // İlk click için multiplier hesapla
    let firstClickMultiplier = minesGame.gridSize / safeTiles;
    
    document.getElementById('nextMultiplier').textContent = firstClickMultiplier.toFixed(2) + 'x';
    document.getElementById('payoutAmount').textContent = (betAmount * firstClickMultiplier).toFixed(2);
}

// Kullanıcı bakiyesini güncelle (mines için)
function updateMinesUserBalance() {
    const balanceElements = document.querySelectorAll('#userBalance');
    balanceElements.forEach(element => {
        element.textContent = minesGame.userBalance.toFixed(2);
    });
}

// Oyun geçmişine ekle
function addGameToHistory(game) {
    const historyContainer = document.getElementById('gameHistory');
    
    // "No games" mesajını kaldır
    const noHistory = historyContainer.querySelector('.no-history');
    if (noHistory) {
        noHistory.remove();
    }
    
    const record = document.createElement('div');
    record.className = `game-record ${game.win > game.bet ? 'win' : 'loss'}`;
    
    const info = document.createElement('div');
    info.className = 'record-info';
    info.innerHTML = `
        <div class="record-bet">Bet: $${game.bet.toFixed(2)} | ${game.gems} gems</div>
        <div class="record-result">${game.result === 'mine' ? 'Hit mine' : game.result === 'cashout' ? 'Cashed out' : 'Max win'}</div>
    `;
    
    const payout = document.createElement('div');
    payout.className = `record-payout ${game.win > game.bet ? 'profit' : 'loss'}`;
    const profit = game.win - game.bet;
    payout.textContent = `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`;
    
    record.appendChild(info);
    record.appendChild(payout);
    
    // En üste ekle
    historyContainer.insertBefore(record, historyContainer.firstChild);
    
    // Maksimum 10 kayıt tut
    while (historyContainer.children.length > 10) {
        historyContainer.removeChild(historyContainer.lastChild);
    }
}

// Mines oyununu başlat (sayfa yüklendiğinde)
function initializeMines() {
    setupMinesEventListeners();
    createMinesGrid();
    updateMinesUserBalance();
    updateMinesInfo();
    
    console.log('💎 Mines oyunu hazır!');
}

// Deposit event listener'ları kur
function setupDepositListeners() {
    const depositBtn = document.getElementById('depositBtn');
    const depositModal = document.getElementById('depositModal');
    const closeModal = document.getElementById('closeModal');
    
    if (depositBtn && depositModal && closeModal) {
        // Bot adını al ve güncelle
        updateBotName();
        
        // Deposit butonuna tıklama
        depositBtn.addEventListener('click', function() {
            updateBotName(); // Her açışta bot adını güncelle
            depositModal.style.display = 'flex';
        });
        
        // Withdraw butonuna tıklama
        const withdrawBtn = document.getElementById('withdrawBtn');
        const withdrawModal = document.getElementById('withdrawModal');
        const closeWithdrawModal = document.getElementById('closeWithdrawModal');
        const confirmWithdraw = document.getElementById('confirmWithdraw');
        
        if (withdrawBtn && withdrawModal) {
            withdrawBtn.addEventListener('click', function() {
                const currentBalance = minesGame ? minesGame.userBalance : 0;
                document.getElementById('withdrawBalance').textContent = currentBalance.toFixed(2);
                document.getElementById('withdrawAmount').value = '';
                withdrawModal.style.display = 'flex';
            });
            
            confirmWithdraw.addEventListener('click', function() {
                const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
                
                if (amount <= 0) {
                    alert('Please enter a valid amount!');
                    return;
                }
                
                const currentBalance = minesGame ? minesGame.userBalance : 0;
                if (amount > currentBalance) {
                    alert('Insufficient balance!');
                    return;
                }
                
                // Withdraw işlemini başlat
                processWithdraw(amount);
                withdrawModal.style.display = 'none';
            });
            
            closeWithdrawModal.addEventListener('click', function() {
                withdrawModal.style.display = 'none';
            });
            
            // Modal dışına tıklayınca kapat
            withdrawModal.addEventListener('click', function(e) {
                if (e.target === withdrawModal) {
                    withdrawModal.style.display = 'none';
                }
            });
        }
        
        // Modal'ı kapatma
        closeModal.addEventListener('click', function() {
            depositModal.style.display = 'none';
        });
        
        // Modal dışına tıklayınca kapatma
        depositModal.addEventListener('click', function(e) {
            if (e.target === depositModal) {
                depositModal.style.display = 'none';
            }
        });
        
        // ESC tuşu ile kapatma
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (depositModal.style.display === 'flex') {
                    depositModal.style.display = 'none';
                }
                const withdrawModal = document.getElementById('withdrawModal');
                if (withdrawModal && withdrawModal.style.display === 'flex') {
                    withdrawModal.style.display = 'none';
                }
            }
        });
    }
}

// Bot adını güncelle
function updateBotName() {
    fetch('/api/bot/status')
        .then(response => response.json())
        .then(data => {
            const botName = data.username || 'eelhoed_pungent0';
            const depositInstruction = document.getElementById('depositInstruction');
            if (depositInstruction) {
                depositInstruction.textContent = `/pay ${botName}`;
            }
        })
        .catch(error => {
            console.log('Bot adı alınamadı, varsayılan kullanılıyor');
            const depositInstruction = document.getElementById('depositInstruction');
            if (depositInstruction) {
                depositInstruction.textContent = '/pay eelhoed_pungent0';
            }
        });
}

// Deposit fonksiyonu (bot entegrasyonu için)
function addDeposit(amount) {
    if (amount > 0) {
        minesGame.userBalance += amount;
        updateMinesUserBalance();
        console.log(`💰 Deposit added: $${amount.toFixed(2)}`);
        showNotification(`Deposit successful! +$${amount.toFixed(2)}`, 'success');
        return true;
    }
    return false;
}

// Withdraw işlemini gerçekleştir
function processWithdraw(amount) {
    // Kullanıcı bakiyesinden düş
    if (minesGame) {
        minesGame.userBalance -= amount;
        updateMinesUserBalance();
    }
    
    // Sunucuya withdraw isteği gönder
    fetch('/api/withdraw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser || 'international374', // Gerçek kullanıcı adı
            amount: amount
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`Withdrawal successful! $${amount.toFixed(2)} sent to your Minecraft account.`, 'success');
        } else {
            // Eğer hata varsa parayı geri ver
            if (minesGame) {
                minesGame.userBalance += amount;
                updateMinesUserBalance();
            }
            showNotification('Withdrawal failed: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Withdraw hatası:', error);
        // Hata durumunda parayı geri ver
        if (minesGame) {
            minesGame.userBalance += amount;
            updateMinesUserBalance();
        }
        showNotification('Withdrawal failed: Network error', 'error');
    });
    
    console.log(`💸 Withdraw request: $${amount.toFixed(2)}`);
}

// Bakiyeyi bot ile senkronize et
function syncBalanceWithBot() {
    if (!currentUser) return;
    
    fetch('/api/update-balance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: currentUser,
            newBalance: minesGame ? minesGame.userBalance : 0
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`✅ Bakiye senkronize edildi: $${data.newBalance.toFixed(2)}`);
        } else {
            console.error('Bakiye senkronizasyonu hatası:', data.error);
        }
    })
    .catch(error => {
        console.error('Bakiye senkronizasyonu bağlantı hatası:', error);
    });
}

// Global deposit fonksiyonu (dışarıdan erişim için)
window.addDeposit = addDeposit;
