# TabFlow - Memory Optimizer

🌊 A lightweight Chrome browser extension that automatically suspends inactive tabs to free up RAM and speed up your browser.

## Features

- **Auto-Suspend**: Automatically suspends tabs that have been inactive for 10+ minutes
- **Memory Savings**: Frees up approximately 15MB of RAM per suspended tab
- **Smart Detection**: Skips active, pinned, and system tabs (chrome:// URLs)
- **Manual Controls**: Suspend all inactive tabs or resume all tabs with one click
- **Real-time Stats**: Track active tabs, suspended tabs, and total memory freed
- **Lightweight**: Runs efficiently in the background with minimal resource usage

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "TabFlow - Memory Optimizer"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `TabFlow` folder from this repository

## Usage

Once installed, TabFlow runs automatically in the background:

1. **View Dashboard**: Click the TabFlow icon in your browser toolbar to see:
   - Number of active tabs
   - Number of suspended tabs
   - Total memory freed

2. **Suspend All**: Click "⚡ Suspend All Inactive" to immediately suspend all non-active tabs

3. **Resume All**: Click "↩️ Resume All" to restore all suspended tabs

## How It Works

- TabFlow monitors tab activity using Chrome's `tabs` API
- Tabs inactive for more than 10 minutes are automatically discarded (suspended)
- Suspended tabs remain visible in your tab bar but consume minimal memory
- Clicking on a suspended tab automatically restores it
- Activity data is persisted using Chrome's `storage` API

## Files Structure

```
TabFlow/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for tab management
├── popup.html          # Extension popup UI
├── popup.js            # Popup interaction logic
├── popup.css           # Popup styles
├── styles.css          # Additional styles
└── privacy-policy.html # Privacy policy
```

## Permissions

This extension requires the following permissions:
- `tabs`: To monitor and manage browser tabs
- `storage`: To persist tab activity data and statistics
- `alarms`: To schedule periodic checks for inactive tabs

## Privacy

TabFlow operates entirely locally on your machine. No data is sent to external servers. View our [Privacy Policy](TabFlow/privacy-policy.html) for more details.

## Roadmap

- [ ] Custom suspension rules (time thresholds, domain exclusions)
- [ ] Real-time dashboard with charts
- [ ] Team sync for enterprise users
- [ ] Pro version with advanced features ($3/month)

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Made with ❤️ by TabFlow Team