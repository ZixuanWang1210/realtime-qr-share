# 📱 实时二维码分享系统

一个专为课堂签到设计的实时二维码分享应用，支持现场扫码和远程观看。

## ✨ 功能特点

### 🏠 扫码端（在教室）
- 📷 **自动启动摄像头**：页面加载后自动尝试启动
- 🔍 **智能扫描区域**：70%中心区域扫描，提高识别成功率
- 🔄 **前后摄像头切换**：支持多摄像头设备
- 📏 **流畅变焦控制**：滑轮变焦，防抖优化
- ✅ **一键签到**：扫描成功后直接打开链接
- 📱 **移动端优化**：完全适配手机浏览器
- 📋 **实时日志**：记录扫描历史和操作状态

### 📱 观看端（不在教室）
- 📺 **实时同步显示**：即时查看扫描到的二维码
- 🔗 **一键跳转链接**：直接打开二维码链接
- 📋 **复制内容**：快速复制二维码文本
- 🌐 **多端支持**：支持多个观看者同时连接

### 🔒 技术特性
- **HTTPS支持**：符合现代浏览器安全要求
- **WebSocket实时通信**：毫秒级数据传输
- **响应式设计**：完美适配各种设备
- **微信浏览器兼容**：支持微信内置浏览器

## 🚀 快速开始

### 环境要求
- Node.js 14.0+
- 现代浏览器（Chrome/Firefox/Safari/Edge）
- HTTPS环境（摄像头访问必需）

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/ZixuanWang1210/realtime-qr-share.git
cd realtime-qr-share
```

2. **安装依赖**
```bash
npm install
```

3. **启动服务器**
```bash
npm start
```

4. **访问应用**
- HTTPS地址（推荐）：https://localhost:3443
- HTTP重定向：http://localhost:3001

## 📖 使用指南

### 在教室的同学：
1. 访问主页，点击 **"我在教室"**
2. 允许摄像头权限
3. 将二维码对准扫描框（70%大屏幕区域）
4. 使用底部滑轮调整焦距
5. 扫描成功后点击 **"✅ 签到"** 按钮
6. 点击 **"📋 分享"** 复制观看地址给其他同学

### 不在教室的同学：
1. 访问主页，点击 **"我不在教室"**
2. 实时查看二维码内容
3. 点击 **"🔗 打开链接"** 或 **"📋 复制内容"**

## 🛠️ 项目结构

```
qr-server/
├── server.js              # Express服务器 + Socket.io
├── package.json           # 项目配置和依赖
├── ssl/                   # SSL证书目录
│   ├── cert.pem          # 自签名证书
│   └── key.pem           # 私钥文件
└── public/               # 静态资源
    ├── index.html        # 主页（角色选择）
    ├── scanner.html      # 扫码页面
    ├── viewer.html       # 观看页面
    ├── css/
    │   └── style.css     # 样式文件
    └── js/
        ├── scanner.js    # 扫码功能脚本
        └── viewer.js     # 观看功能脚本
```

## ⚙️ 配置说明

### SSL证书
项目使用自签名SSL证书以支持HTTPS访问。如需部署到生产环境，请替换为有效的SSL证书。

### 端口配置
- HTTPS端口：3443
- HTTP重定向端口：3001

可在 `server.js` 中修改端口配置。

## 🔧 开发指南

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 访问应用
open https://localhost:3443
```

### 添加新功能
1. 前端功能：修改 `public/` 目录下的文件
2. 后端功能：修改 `server.js`
3. 样式调整：编辑 `public/css/style.css`

## 📱 移动端适配

### 微信浏览器支持
- 自动启动摄像头
- 触摸手势变焦
- 完整功能支持

### 响应式特性
- 移动端优先设计
- 底部工具栏布局
- 大按钮触控优化

## 🔒 安全说明

### 摄像头权限
- 现代浏览器要求HTTPS环境访问摄像头
- 首次访问需要用户授权摄像头权限
- 支持权限被拒绝后的重试机制

### 网络安全
- 使用WebSocket加密传输
- 支持HTTPS强制重定向
- 无用户数据存储

## 🐛 故障排除

### 常见问题

**摄像头无法启动**
- 确保使用HTTPS访问：https://localhost:3443
- 检查浏览器摄像头权限设置
- 尝试刷新页面重新授权

**连接服务器失败**
- 确认服务器正在运行：`npm start`
- 检查端口是否被占用
- 尝试重启服务器

**扫描识别率低**
- 调整变焦滑轮优化焦距
- 确保二维码清晰可见
- 尝试切换前后摄像头
- 调整光线环境

**移动端显示异常**
- 清除浏览器缓存
- 确保使用现代浏览器
- 检查网络连接状态

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [jsQR](https://github.com/cozmo/jsQR) - 高性能JavaScript QR码识别库
- [Socket.io](https://socket.io/) - 实时WebSocket通信
- [Express.js](https://expressjs.com/) - 轻量级Web服务器框架

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/ZixuanWang1210/realtime-qr-share/issues)
- 邮箱：zixuan.wang1210@gmail.com

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！