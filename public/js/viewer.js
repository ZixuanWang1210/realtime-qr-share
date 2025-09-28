class QRViewer {
    constructor() {
        this.socket = io();
        this.totalScans = 0;
        this.sessionStartTime = Date.now();
        this.currentQRData = null;
        this.qrHistory = [];

        this.initializeElements();
        this.initializeSocket();
        this.startSessionTimer();
    }

    initializeElements() {
        this.connectionDot = document.getElementById('connectionDot');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.scannerCount = document.getElementById('scannerCount');
        this.qrDisplay = document.getElementById('qrDisplay');
        this.qrInfo = document.getElementById('qrInfo');
        this.contentDisplay = document.getElementById('contentDisplay');
        this.scanTime = document.getElementById('scanTime');
        this.contentType = document.getElementById('contentType');
        this.contentLength = document.getElementById('contentLength');
        this.copyBtn = document.getElementById('copyBtn');
        this.openBtn = document.getElementById('openBtn');
        this.totalScansEl = document.getElementById('totalScans');
        this.sessionTimeEl = document.getElementById('sessionTime');
        this.lastUpdateEl = document.getElementById('lastUpdate');
        this.qrLogEl = document.getElementById('qrLog');

        this.bindEvents();
    }

    bindEvents() {
        this.copyBtn.addEventListener('click', () => this.copyContent());
        this.openBtn.addEventListener('click', () => this.openLink());
    }

    initializeSocket() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus('connected', '已连接');
            this.socket.emit('join-as-viewer');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus('error', '连接断开');
        });

        this.socket.on('connect_error', () => {
            this.updateConnectionStatus('error', '连接失败');
        });

        this.socket.on('qr-update', (data) => {
            this.displayQRCode(data);
        });

        this.socket.on('scanner-count', (count) => {
            this.scannerCount.textContent = count;
        });
    }

    updateConnectionStatus(type, message) {
        this.connectionStatus.textContent = message;
        this.connectionDot.className = `status-dot ${type}`;
    }

    displayQRCode(data) {
        this.currentQRData = data;
        this.totalScans++;

        this.qrHistory.push(data);
        if (this.qrHistory.length > 10) {
            this.qrHistory.shift();
        }

        this.qrDisplay.style.display = 'none';
        this.qrInfo.style.display = 'block';

        this.contentDisplay.textContent = data.content;
        this.scanTime.textContent = new Date(data.timestamp).toLocaleString();
        this.contentLength.textContent = `${data.content.length} 字符`;

        const contentType = this.detectContentType(data.content);
        this.contentType.textContent = contentType.label;

        this.openBtn.style.display = contentType.isUrl ? 'inline-block' : 'none';

        this.updateStats();
        this.updateQRLog('接收二维码: ' + data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''));
        this.showNotification('新的二维码内容已更新');
    }

    detectContentType(content) {
        const urlRegex = /^(https?:\/\/|www\.)/i;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;

        if (urlRegex.test(content)) {
            return { label: 'URL链接', isUrl: true };
        } else if (emailRegex.test(content)) {
            return { label: '邮箱地址', isUrl: false };
        } else if (phoneRegex.test(content)) {
            return { label: '电话号码', isUrl: false };
        } else if (content.includes('\n') || content.length > 100) {
            return { label: '长文本', isUrl: false };
        } else {
            return { label: '普通文本', isUrl: false };
        }
    }

    async copyContent() {
        if (!this.currentQRData) return;

        try {
            await navigator.clipboard.writeText(this.currentQRData.content);
            this.updateQRLog('内容已复制: ' + this.currentQRData.content.substring(0, 30) + '...');
            this.showNotification('内容已复制到剪贴板');
            this.copyBtn.textContent = '✅ 已复制';
            setTimeout(() => {
                this.copyBtn.textContent = '📋 复制内容';
            }, 2000);
        } catch (error) {
            console.error('复制失败:', error);
            this.updateQRLog('复制失败: ' + error.message);
            this.showNotification('复制失败，请手动选择文本');
        }
    }

    openLink() {
        if (!this.currentQRData) return;

        let url = this.currentQRData.content;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        this.updateQRLog('打开链接: ' + url);
        window.open(url, '_blank');
        this.showNotification('正在打开链接...');
    }

    updateStats() {
        this.totalScansEl.textContent = this.totalScans;
        this.lastUpdateEl.textContent = new Date().toLocaleTimeString();
    }

    updateQRLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;

        this.qrLogEl.appendChild(logEntry);
        this.qrLogEl.scrollTop = this.qrLogEl.scrollHeight;

        if (this.qrLogEl.children.length > 20) {
            this.qrLogEl.removeChild(this.qrLogEl.firstChild);
        }
    }

    startSessionTimer() {
        setInterval(() => {
            const elapsed = Date.now() - this.sessionStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.sessionTimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    showNotification(message) {
        if (Notification.permission === 'granted') {
            new Notification('二维码分享', {
                body: message,
                icon: '/favicon.ico'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('二维码分享', {
                        body: message,
                        icon: '/favicon.ico'
                    });
                }
            });
        }

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const viewer = new QRViewer();

    window.addEventListener('beforeunload', () => {
        viewer.destroy();
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        setTimeout(() => {
            Notification.requestPermission();
        }, 5000);
    }
});