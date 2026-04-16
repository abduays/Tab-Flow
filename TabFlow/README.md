# 🌊 TabFlow - Smart Tab Manager

**AI-powered tab suspension with audio detection, smart whitelisting, and productivity analytics.**

Optimized for both Chrome Web Store and Firefox Add-ons.

## ✨ Key Features

### What Makes TabFlow Different:

1. **🧠 AI Smart Suspension** - Learns your browsing habits and adjusts suspension timing dynamically
2. **🎵 Audio Protection** - Never interrupts music, videos, or calls (critical differentiator!)
3. **📊 Privacy-First Analytics** - Local-only productivity tracking, no data leaves your browser
4. **🛡️ Smart Whitelist** - Protect important domains from suspension
5. **⚡ Real-time Dashboard** - See memory savings and tab stats instantly
6. **🔒 100% Local Processing** - No cloud, no tracking, no accounts

## 🚀 Installation

### Development Mode:

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `TabFlow` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` in the `TabFlow` folder

## 📁 Project Structure

```
TabFlow/
├── manifest.json          # Extension manifest (MV3 + Firefox compatible)
├── background.js          # Service worker with smart suspension logic
├── popup.html             # Main UI
├── popup.js               # Popup interactivity
├── popup.css              # Modern dark theme styles
├── privacy-policy.html    # Required for store submission
├── icons/                 # Extension icons (add PNGs here)
└── README.md              # This file
```

## 🔧 Configuration

Edit settings directly in the popup:
- Toggle AI Smart Suspension
- Enable/disable Audio Protection
- Manage productivity tracking
- Add/remove protected domains

## 🏆 Competitive Advantages

| Feature | TabFlow | Others |
|---------|---------|--------|
| Audio Detection | ✅ Yes | ❌ Rare |
| AI Learning | ✅ Yes | ❌ No |
| Local Analytics | ✅ Yes | ⚠️ Some cloud |
| Whitelist UI | ✅ Built-in | ⚠️ Hidden |
| Cross-browser | ✅ Chrome+Firefox | ⚠️ Often single |
| Privacy-focused | ✅ 100% local | ⚠️ Varies |

## 📦 Publishing Checklist

### Chrome Web Store:
- [ ] Add 5 icon sizes (16, 32, 48, 96, 128px)
- [ ] Create screenshots (1280x800 recommended)
- [ ] Write compelling description (<132 chars for short)
- [ ] Complete Data Safety section
- [ ] Link to privacy policy (hosted URL required)

### Firefox Add-ons:
- [ ] All icon sizes
- [ ] Source code submission (ZIP)
- [ ] Privacy policy URL
- [ ] Detailed description
- [ ] Prepare for manual review (stricter than Chrome)

## 🛣️ Roadmap

### v2.0 (Current)
- ✅ AI-powered suspension
- ✅ Audio protection
- ✅ Productivity analytics
- ✅ Whitelist management

### v2.1 (Next)
- [ ] Form detection (prevent losing unsaved data)
- [ ] Session export/import
- [ ] Keyboard shortcuts

### v3.0 (Pro Features)
- [ ] Cross-browser sync
- [ ] Team collaboration
- [ ] Advanced analytics dashboard
- [ ] Custom rules engine

## 📄 License

MIT License - Feel free to fork and improve!

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

---

**Built with ❤️ for a faster, smarter web**
