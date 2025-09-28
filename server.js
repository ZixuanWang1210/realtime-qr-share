const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const path = require('path');

const app = express();

// 创建HTTP和HTTPS服务器
let server, httpsServer, io;

// 检查SSL证书是否存在
const sslPath = path.join(__dirname, 'ssl');
const keyPath = path.join(sslPath, 'key.pem');
const certPath = path.join(sslPath, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  // HTTPS服务器
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  httpsServer = https.createServer(httpsOptions, app);
  io = socketIo(httpsServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  console.log('HTTPS服务器已配置');
} else {
  console.log('未找到SSL证书，使用HTTP服务器');
}

// HTTP服务器（始终创建，用于重定向或备用）
server = http.createServer(app);
if (!io) {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
}

app.use(express.static(path.join(__dirname, 'public')));

let currentQRData = {
  content: '',
  timestamp: null,
  scannerCount: 0
};

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('join-as-scanner', () => {
    socket.join('scanners');
    currentQRData.scannerCount++;
    console.log('扫码者加入:', socket.id);
    io.emit('scanner-count', currentQRData.scannerCount);
  });

  socket.on('join-as-viewer', () => {
    socket.join('viewers');
    console.log('观看者加入:', socket.id);
    if (currentQRData.content) {
      socket.emit('qr-update', currentQRData);
    }
  });

  socket.on('qr-scanned', (data) => {
    console.log('接收到二维码数据:', data);
    currentQRData = {
      content: data.content,
      timestamp: new Date(),
      scannerCount: currentQRData.scannerCount
    };

    io.to('viewers').emit('qr-update', currentQRData);
  });

  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    if (socket.rooms.has('scanners')) {
      currentQRData.scannerCount = Math.max(0, currentQRData.scannerCount - 1);
      io.emit('scanner-count', currentQRData.scannerCount);
    }
  });
});

const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// 启动服务器
if (httpsServer) {
  // 启动HTTPS服务器
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS服务器运行在端口 ${HTTPS_PORT}`);
    console.log(`🔒 HTTPS访问地址: https://localhost:${HTTPS_PORT}`);
  });

  // HTTP服务器重定向到HTTPS
  const redirectApp = express();
  redirectApp.use((req, res) => {
    res.redirect(`https://${req.get('host').split(':')[0]}:${HTTPS_PORT}${req.url}`);
  });

  const redirectServer = http.createServer(redirectApp);
  redirectServer.listen(PORT, () => {
    console.log(`↗️  HTTP重定向服务器运行在端口 ${PORT}`);
    console.log(`↗️  访问 http://localhost:${PORT} 将自动重定向到HTTPS`);
  });
} else {
  // 只启动HTTP服务器
  server.listen(PORT, () => {
    console.log(`⚠️  HTTP服务器运行在端口 ${PORT}`);
    console.log(`⚠️  访问地址: http://localhost:${PORT}`);
    console.log(`⚠️  注意：摄像头功能需要HTTPS，请配置SSL证书`);
  });
}