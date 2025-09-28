class QRScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.socket = io();
        this.stream = null;
        this.scanning = false;
        this.cameraStarted = false;
        this.currentZoom = 1;
        this.maxZoom = 3;
        this.minZoom = 0.5;
        this.currentDeviceId = null;
        this.devices = [];
        this.lastScanTime = 0;
        this.scanCooldown = 1000;
        this.qrHistory = [];
        this.zoomTimeout = null;

        this.initializeElements();
        this.bindEvents();
        this.initializeSocket();
        this.setupCameraButton();
    }

    initializeElements() {
        this.statusDot = document.getElementById('statusDot');
        this.scannerStatus = document.getElementById('scannerStatus');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.scanContent = document.getElementById('scanContent');
        this.scanTime = document.getElementById('scanTime');
        this.scanResult = document.getElementById('scanResult');
        this.zoomSlider = document.getElementById('zoomSlider');
        this.startCameraBtn = document.getElementById('startCamera');
        this.switchCameraBtn = document.getElementById('switchCamera');
        this.checkInBtn = document.getElementById('checkInBtn');
        this.copyUrlBtn = document.getElementById('copyUrl');
        this.currentQRContent = null;
        this.logContainer = document.getElementById('logContainer');
    }

    bindEvents() {
        this.zoomSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.currentZoom = value;
            this.zoomLevel.textContent = `${value.toFixed(1)}x`;

            // 使用防抖来减少卡顿
            if (this.zoomTimeout) {
                clearTimeout(this.zoomTimeout);
            }
            this.zoomTimeout = setTimeout(() => {
                this.applyZoom(value);
            }, 100);
        });

        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.checkInBtn.addEventListener('click', () => this.checkIn());
        this.copyUrlBtn.addEventListener('click', () => this.copyCurrentUrl());

        this.video.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.video.addEventListener('touchmove', this.handleTouchMove.bind(this));
    }

    initializeSocket() {
        this.socket.on('connect', () => {
            this.updateStatus('connected', '已连接到服务器');
            this.updateQRLog('🌐 已连接到服务器');
            this.socket.emit('join-as-scanner');
        });

        this.socket.on('disconnect', () => {
            this.updateStatus('error', '与服务器断开连接');
            this.updateQRLog('⚠️ 与服务器断开连接');
        });

        this.socket.on('connect_error', () => {
            this.updateStatus('error', '连接服务器失败');
            this.updateQRLog('❌ 连接服务器失败');
        });
    }

    setupCameraButton() {
        this.updateStatus('waiting', '点击启动摄像头');
        this.startCameraBtn.style.display = 'block';
    }

    async startCamera() {
        if (this.cameraStarted) return;

        try {
            this.updateStatus('loading', '启动摄像头...');
            this.updateQRLog('🎥 正在启动摄像头...');
            this.startCameraBtn.textContent = '启动中...';
            this.startCameraBtn.disabled = true;

            await this.initializeCamera();
            this.cameraStarted = true;

            // 清除错误提示
            this.clearToasts();

            this.updateStatus('scanning', '正在扫描...');
            this.updateQRLog('✅ 摄像头启动成功，开始扫描二维码');
            this.startScanning();
            this.video.play();

            // 显示其他控件
            this.switchCameraBtn.style.display = 'inline-block';
            this.startCameraBtn.style.display = 'none';

            // 获取摄像头列表用于切换
            await this.loadCameraDevices();

        } catch (error) {
            console.error('摄像头启动失败:', error);
            this.updateStatus('error', `摄像头启动失败: ${error.message}`);
            this.updateQRLog(`❌ 摄像头启动失败: ${error.message}`);
            this.startCameraBtn.textContent = '🎥 重试';
            this.startCameraBtn.disabled = false;
            this.showErrorMessage(error.message);
        }
    }

    async loadCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(device => device.kind === 'videoinput');

            if (this.devices.length > 1) {
                this.switchCameraBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.warn('无法获取摄像头列表:', error);
        }
    }

    async switchCamera() {
        if (this.devices.length <= 1) return;

        const currentIndex = this.devices.findIndex(device => device.deviceId === this.currentDeviceId);
        const nextIndex = (currentIndex + 1) % this.devices.length;
        this.currentDeviceId = this.devices[nextIndex].deviceId;

        try {
            this.updateStatus('loading', '切换摄像头...');
            this.updateQRLog('🔄 正在切换摄像头...');
            await this.initializeCamera();
            this.updateStatus('scanning', '正在扫描...');
            this.updateQRLog('✅ 摄像头切换成功');
        } catch (error) {
            console.error('摄像头切换失败:', error);
            this.updateStatus('error', '切换失败');
            this.updateQRLog(`❌ 摄像头切换失败: ${error.message}`);
        }
    }

    setZoom(value) {
        this.currentZoom = value;
        this.zoomLevel.textContent = `${value.toFixed(1)}x`;
        this.zoomSlider.value = value;
    }

    async applyZoom(value) {
        if (!this.stream) return;

        const track = this.stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();

        if (capabilities.zoom) {
            try {
                await track.applyConstraints({
                    advanced: [{ zoom: value }]
                });
            } catch (error) {
                console.error('缩放失败:', error);
            }
        }
    }

    checkIn() {
        if (this.currentQRContent) {
            let url = this.currentQRContent;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            this.updateQRLog(`✅ 正在打开签到页面: ${url.substring(0, 30)}...`);
            window.open(url, '_blank');
            this.showSuccessMessage('正在打开签到页面...');
        }
    }

    showErrorMessage(message) {
        this.showToast('❌ ' + message, 'error');
    }

    showSuccessMessage(message) {
        this.showToast('✅ ' + message, 'success');
    }

    async initializeCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: this.currentDeviceId ? undefined : 'environment',
                deviceId: this.currentDeviceId ? { exact: this.currentDeviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;

        const track = this.stream.getVideoTracks()[0];
        if (track) {
            const capabilities = track.getCapabilities();
            if (capabilities.zoom) {
                this.maxZoom = capabilities.zoom.max || 3;
                this.minZoom = capabilities.zoom.min || 0.5;
            }
        }

        this.updateZoomDisplay();
    }

    startScanning() {
        this.scanning = true;
        this.scanFrame();
    }

    scanFrame() {
        if (!this.scanning || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this.scanFrame());
            return;
        }

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.context.drawImage(this.video, 0, 0);

        // 扩大扫描区域到画面中心70%
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scanWidth = this.canvas.width * 0.7;
        const scanHeight = this.canvas.height * 0.7;
        const startX = centerX - scanWidth / 2;
        const startY = centerY - scanHeight / 2;

        const imageData = this.context.getImageData(startX, startY, scanWidth, scanHeight);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && Date.now() - this.lastScanTime > this.scanCooldown) {
            this.onQRCodeDetected(code.data);
            this.lastScanTime = Date.now();
        }

        requestAnimationFrame(() => this.scanFrame());
    }

    onQRCodeDetected(content) {
        console.log('检测到二维码:', content);

        const scanData = {
            content: content,
            timestamp: new Date().toISOString()
        };

        this.currentQRContent = content;
        this.qrHistory.push(scanData);
        if (this.qrHistory.length > 10) {
            this.qrHistory.shift();
        }

        // 记录到日志
        this.updateQRLog(`🔍 检测到二维码: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);

        this.socket.emit('qr-scanned', scanData);
        this.displayLastScan(content);
        this.updateStatus('success', '扫描成功！');

        // 显示签到按钮
        this.checkInBtn.style.display = 'inline-block';

        setTimeout(() => {
            if (this.scanning) {
                this.updateStatus('scanning', '正在扫描...');
            }
        }, 2000);
    }

    displayLastScan(content) {
        this.scanContent.textContent = content;
        this.scanTime.textContent = new Date().toLocaleString();
        this.scanResult.style.display = 'block';
    }

    updateZoomDisplay() {
        this.zoomLevel.textContent = `${this.currentZoom.toFixed(1)}x`;
        this.zoomSlider.value = this.currentZoom;
    }

    copyCurrentUrl() {
        const currentUrl = window.location.origin + window.location.pathname.replace('scanner.html', 'viewer.html');

        if (navigator.clipboard) {
            navigator.clipboard.writeText(currentUrl).then(() => {
                this.updateQRLog(`📋 观看地址已复制: ${currentUrl}`);
                this.showSuccessMessage('观看地址已复制');
            }).catch(err => {
                console.error('复制失败:', err);
                this.fallbackCopyUrl(currentUrl);
            });
        } else {
            this.fallbackCopyUrl(currentUrl);
        }
    }

    fallbackCopyUrl(url) {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.updateQRLog(`📋 观看地址已复制: ${url}`);
            this.showSuccessMessage('观看地址已复制');
        } catch (err) {
            console.error('复制失败:', err);
            this.updateQRLog(`❌ 复制失败: ${err.message}`);
            this.showErrorMessage('复制失败');
        }
        document.body.removeChild(textArea);
    }

    handleTouchStart(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            this.lastTouchDistance = this.getTouchDistance(event.touches);
        }
    }

    handleTouchMove(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            const currentDistance = this.getTouchDistance(event.touches);
            const deltaScale = currentDistance / this.lastTouchDistance;

            if (Math.abs(deltaScale - 1) > 0.1) {
                const zoomDelta = (deltaScale - 1) * 0.5;
                const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom + zoomDelta));
                this.setZoom(newZoom);
                this.applyZoom(newZoom);
                this.lastTouchDistance = currentDistance;
            }
        }
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    updateStatus(type, message) {
        this.scannerStatus.textContent = message;
        this.statusDot.className = `status-dot ${type}`;
    }

    showToast(message, type = 'info') {
        // 清除现有的toast
        this.clearToasts();

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    updateQRLog(message) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;

        this.logContainer.appendChild(logEntry);

        // 保持最多20条日志
        const entries = this.logContainer.querySelectorAll('.log-entry');
        if (entries.length > 20) {
            this.logContainer.removeChild(entries[0]);
        }

        // 自动滚动到底部
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    clearToasts() {
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });
    }

    destroy() {
        this.scanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const scanner = new QRScanner();

    window.addEventListener('beforeunload', () => {
        scanner.destroy();
    });
});