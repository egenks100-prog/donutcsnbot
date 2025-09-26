/**
 * DonutFlip Balance Manager
 * Sayfalar arası bakiye senkronizasyonu için
 */

class BalanceManager {
    constructor() {
        this.username = 'international374'; // Default username
        this.balance = 0.00;
        this.storageKey = 'donutflip_balance';
        this.usernameKey = 'donutflip_username';
        this.callbacks = [];
        
        // Storage değişikliklerini dinle
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.balance = parseFloat(e.newValue) || 0;
                this.notifyCallbacks();
            }
        });
        
        // Window focus olduğunda balance'ı kontrol et (throttle ile)
        let focusTimeout = null;
        window.addEventListener('focus', () => {
            if (focusTimeout) clearTimeout(focusTimeout);
            focusTimeout = setTimeout(() => {
                console.log('🔍 Window focus - balance kontrol ediliyor');
                const oldBalance = this.balance;
                this.loadBalance();
                if (Math.abs(oldBalance - this.balance) > 0.01) {
                    console.log('🔄 Focus balance değişti:', oldBalance, '->', this.balance);
                    this.notifyCallbacks();
                }
            }, 500);
        });
        
        // Sayfa yüklendiginde bakiyeyi al
        this.loadBalance();
        this.loadUsername();
        console.log('👤 BalanceManager initialized - Username:', this.username, 'Balance:', this.balance);
        
        // Her 10 saniyede bir balance'ı kontrol et (daha az agresif)
        setInterval(() => {
            const currentStored = localStorage.getItem(this.storageKey);
            const currentBalance = parseFloat(currentStored) || 0;
            if (Math.abs(currentBalance - this.balance) > 0.01) { // Daha büyük tolerance
                console.log('🔄 Balance sync:', this.balance, '->', currentBalance);
                this.balance = currentBalance;
                this.notifyCallbacks();
            }
        }, 10000);
    }
    
    /**
     * Bakiyeyi localStorage'dan yükle
     */
    loadBalance() {
        const stored = localStorage.getItem(this.storageKey);
        this.balance = parseFloat(stored) || 0.00; // Default 0 - server'dan yüklenecek
        console.log('💾 LocalStorage balance loaded:', this.balance);
        return this.balance;
    }
    
    /**
     * Kullanıcı adını localStorage'dan yükle
     */
    loadUsername() {
        const stored = localStorage.getItem(this.usernameKey);
        this.username = stored || 'international374';
        return this.username;
    }
    
    /**
     * Bakiyeyi kaydet
     */
    saveBalance() {
        localStorage.setItem(this.storageKey, this.balance.toString());
        this.notifyCallbacks();
        // Server sync kaldırıldı - withdrawal sonrası server zaten doğru balance'a sahip
    }
    
    /**
     * Kullanıcı adını kaydet
     */
    saveUsername(username) {
        this.username = username;
        localStorage.setItem(this.usernameKey, username);
    }
    
    /**
     * Mevcut bakiyeyi al
     */
    getBalance() {
        return this.balance;
    }
    
    /**
     * Kullanıcı adını al
     */
    getUsername() {
        return this.username;
    }
    
    /**
     * Bakiye güncelle
     */
    setBalance(amount) {
        this.balance = Math.max(0, parseFloat(amount) || 0);
        localStorage.setItem(this.storageKey, this.balance.toString());
        this.notifyCallbacks();
        // Server sync kaldırıldı - sadece gerektiğinde yapılacak
    }
    
    /**
     * Para ekle (Deposit)
     */
    addBalance(amount) {
        const addAmount = parseFloat(amount) || 0;
        if (addAmount > 0) {
            this.balance += addAmount;
            localStorage.setItem(this.storageKey, this.balance.toString());
            this.notifyCallbacks();
            console.log(`💰 Balance added: $${addAmount.toFixed(2)} | New Balance: $${this.balance.toFixed(2)}`);
            return true;
        }
        return false;
    }
    
    /**
     * Para çıkar (Withdraw/Bet)
     */
    subtractBalance(amount) {
        const subtractAmount = parseFloat(amount) || 0;
        if (subtractAmount > 0 && subtractAmount <= this.balance) {
            this.balance -= subtractAmount;
            localStorage.setItem(this.storageKey, this.balance.toString());
            this.notifyCallbacks();
            console.log(`💸 Balance subtracted: $${subtractAmount.toFixed(2)} | New Balance: $${this.balance.toFixed(2)}`);
            return true;
        }
        return false;
    }
    
    /**
     * Yeterli bakiye var mı kontrol et
     */
    hasBalance(amount) {
        return this.balance >= (parseFloat(amount) || 0);
    }
    
    /**
     * Bakiye değişim callback'i ekle
     */
    onBalanceChange(callback) {
        this.callbacks.push(callback);
        // Hemen mevcut bakiyeyi gönder
        callback(this.balance, this.username);
    }
    
    /**
     * Callback'leri bilgilendir
     */
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            callback(this.balance, this.username);
        });
    }
    
    /**
     * Server ile senkronize et
     */
    async syncWithServer() {
        // Eğer localhost değilse server sync'i yapma
        if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
            return;
        }
        
        try {
            const response = await fetch('/api/update-balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.username,
                    newBalance: this.balance
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log(`✅ Server synced: $${data.newBalance.toFixed(2)}`);
            }
        } catch (error) {
            console.log('ℹ️ Server sync skipped (offline mode)');
        }
    }
    
    /**
     * Server'dan bakiyeyi yükle
     */
    async loadFromServer() {
        // Eğer localhost değilse server'dan yükleme
        if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
            console.log('💰 Demo mode: Using local balance');
            return;
        }
        
        try {
            const response = await fetch(`/api/balance/${this.username}`);
            const data = await response.json();
            
            if (response.ok && data.balance !== undefined) {
                this.balance = data.balance || 0;
                this.saveBalance();
                console.log(`💰 Balance loaded from server: $${this.balance.toFixed(2)}`);
                return true;
            } else {
                console.log('⚠️ Server balance load failed, keeping local:', data);
                return false;
            }
        } catch (error) {
            console.log('ℹ️ Server not available, keeping local balance:', error.message);
            return false;
        }
    }
    
    /**
     * Deposit işlemi
     */
    async processDeposit() {
        try {
            const response = await fetch('/api/bot/status');
            const data = await response.json();
            const botName = data.username || 'eelhoed_pungent0';
            
            return {
                success: true,
                botName: botName,
                command: `/pay ${botName}`
            };
        } catch (error) {
            return {
                success: true,
                botName: 'eelhoed_pungent0',
                command: '/pay eelhoed_pungent0'
            };
        }
    }
    
    /**
     * Withdraw işlemi
     */
    async processWithdraw(amount) {
        const withdrawAmount = parseFloat(amount) || 0;
        const MAX_WITHDRAWAL = 100000000; // DonutSMP server limiti - 100 milyon
        
        console.log(`🔍 Starting withdrawal process: $${withdrawAmount.toFixed(2)}`);
        console.log(`   Username: ${this.username}`);
        console.log(`   Current Balance: $${this.balance.toFixed(2)}`);
        
        if (withdrawAmount <= 0) {
            console.log(`❌ Invalid amount: ${withdrawAmount}`);
            return { success: false, error: 'Invalid amount' };
        }
        
        if (withdrawAmount > MAX_WITHDRAWAL) {
            console.log(`❌ Amount exceeds maximum: $${withdrawAmount.toFixed(2)} > $${MAX_WITHDRAWAL.toFixed(2)}`);
            return { 
                success: false, 
                error: `Maximum withdrawal is $${MAX_WITHDRAWAL.toLocaleString()}. Please withdraw smaller amounts.` 
            };
        }
        
        if (!this.hasBalance(withdrawAmount)) {
            console.log(`❌ Insufficient balance: $${withdrawAmount.toFixed(2)} > $${this.balance.toFixed(2)}`);
            return { success: false, error: 'Insufficient balance' };
        }
        
        console.log(`🌐 Sending withdrawal request to server...`);
        
        try {
            const response = await fetch('/api/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.username,
                    amount: withdrawAmount
                })
            });
            
            console.log(`📞 Server response status: ${response.status}`);
            
            if (!response.ok) {
                console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.log(`   Error details: ${errorText}`);
                return { success: false, error: `Server error: ${response.status}` };
            }
            
            const data = await response.json();
            console.log(`📝 Server response:`, data);
            
            if (data.success) {
                console.log(`✅ Withdrawal successful: $${withdrawAmount.toFixed(2)}`);
                
                // Server'dan güncel balance'ı yükle
                if (data.newBalance !== undefined) {
                    console.log(`🔄 Updating balance from server: $${this.balance.toFixed(2)} -> $${data.newBalance.toFixed(2)}`);
                    this.balance = data.newBalance;
                    localStorage.setItem(this.storageKey, this.balance.toString());
                    this.notifyCallbacks();
                }
                
                return { 
                    success: true, 
                    message: `Withdrawal successful! $${withdrawAmount.toFixed(2)} sent to your Minecraft account.`
                };
            } else {
                console.log(`❌ Withdrawal failed: ${data.error}`);
                return { 
                    success: false, 
                    error: data.error || 'Withdrawal failed' 
                };
            }
        } catch (error) {
            console.log(`❌ Network error:`, error);
            return { 
                success: false, 
                error: `Network error: ${error.message}` 
            };
        }
    }
}

// Global instance oluştur
window.balanceManager = new BalanceManager();

// Global fonksiyonlar (geriye uyumluluk için)
window.addDeposit = function(amount) {
    return window.balanceManager.addBalance(amount);
};