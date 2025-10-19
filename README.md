# System Cleaner

A professional, cross-platform desktop application for system optimization and maintenance. Built with React, System Cleaner provides a comprehensive suite of tools to keep your computer running smoothly.

![System Cleaner](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Features

### System Cleaner
Clean temporary files, caches, and free up valuable disk space.
- Smart OS detection and scanning
- Safety-first approach with protected directories
- Real-time progress and detailed previews
- Parallel scanning for fast performance

### Duplicate File Finder
Intelligent duplicate detection with multi-stage optimization.
- Three-stage algorithm (size, partial hash, full hash)
- Memory-efficient streaming for large files
- Smart selection tools (Keep Newest/Oldest)
- Safe deletion with system protection

### Browser Data Cleaner
Comprehensive browser cleaning for 6 major browsers.
- Supported: Chrome, Firefox, Edge, Safari, Opera, Brave
- Clean cache, cookies, history, downloads, form data, session data
- Running browser detection
- Space analysis before cleaning

### System Updates
Check for and install system updates automatically.
- Cross-platform update detection
- Automated installation
- System reboot management

### Driver Updates (Windows Only)
Detect and update outdated device drivers with multiple fallback mechanisms.
- **Multi-Method Detection**: PSWindowsUpdate module (primary), Windows Update COM API (fallback), WMI device detection (last resort)
- **Automatic Service Management**: Detects and attempts to start Windows Update service if stopped
- **Intelligent Error Handling**: Provides context-aware error messages and troubleshooting steps
- **Individual Driver Selection**: Checkboxes for selective installation
- **Safety Features**: Automatic system restore point creation before updates
- **Support for Large Drivers**: Up to 30 minutes timeout for graphics card and firmware drivers
- **Multiple Detection Methods**: Works even when Windows Update service is restricted
- **Administrator Detection**: Checks and prompts for required privileges
- **PSWindowsUpdate Module**: Automatically installs if needed for improved reliability

## Installation

### Prerequisites
- Node.js v16 or higher
- npm or yarn package manager

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   npm run package
   ```

## Usage

### System Cleaner
1. Click "Cleaner" on home page
2. Click "Start Scan" and wait for completion
3. Review found items and their sizes
4. Click "Clean Selected" and confirm

### Duplicate File Finder
1. Click "Duplicate Finder" on home page
2. Select a file type filter (optional)
3. Click "Start Scan" and monitor progress
4. Use "Keep Newest/Oldest" or manually select files
5. Click "Delete Selected" and confirm

### Browser Data Cleaner
1. Click "Browsers" on home page
2. Select browsers to clean (running browsers cannot be selected)
3. Choose data types to clean
4. Click "Analyze" to preview space savings
5. Click "Clean Now" and confirm

### Driver Updates (Windows Only)
1. Click "Driver Updates" on home page
2. Click "Check for Driver Updates" and wait for scan
3. Review available driver updates with details
4. Select individual drivers to update using checkboxes
5. Use "Select All" or "Deselect All" for batch selection
6. Click "Install Selected Drivers" and confirm
7. A system restore point will be created automatically
8. Wait for installation to complete (may take 10-30 minutes for large drivers)

Note: May require running the app as Administrator. Windows Update service must be enabled.

## Technology Stack

- **Frontend**: React 18.2.0 with Vite 5.0.11

- **Icons**: react-icons 5.5.0
- **Styling**: Modern CSS
- **Runtime**: Node.js v16+

## Design Philosophy

System Cleaner features a professional, desktop-optimized design:
- **Professional Color Palette**: GitHub blue (#0969DA), forest green, accessible colors
- **Optimized Sizing**: 44px touch targets, compact layouts, 30% improved density
- **Minimalistic Design**: Icon-focused navigation, generous whitespace
- **WCAG 2.1 AA Compliant**: High contrast ratios, keyboard navigation

## Project Structure

```
cleaner/
├── electron/              # Application backend
│   ├── main.js           # Application entry & IPC handlers
│   ├── preload.js        # IPC bridge
│   ├── cleaner.js        # System cleaner logic
│   ├── duplicateFinder.js
│   ├── browserCleaner.js
│   └── ...
├── src/                  # React frontend
│   ├── App.jsx           # Main app & routing
│   ├── components/       # Reusable components
│   └── pages/            # Page components
├── docs/                 # Documentation
│   └── DOCUMENTATION.md  # Complete technical docs
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE              # MIT License
└── package.json         # Dependencies
```

## Available Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build React app for production
- `npm start` - Run application (after building)
- `npm run package` - Create distributable package
- `npm run dev:react` - Run only React dev server

## Safety & Permissions

### macOS Permissions
You may need to grant **Full Disk Access** in:
System Preferences > Security & Privacy > Privacy > Full Disk Access

### What the App Accesses
- Temporary file directories
- Cache directories
- System logs
- Browser data directories

### What the App NEVER Touches
- Documents, Desktop (except for duplicate scanning)
- Pictures, Videos, Music (except for duplicate scanning)
- System critical directories
- Application executables

## Performance

- **Fast Startup**: Optimized application bundle
- **Efficient Scanning**: Parallel file operations, 10,000+ files in ~30 seconds
- **Memory Safe**: Streaming I/O for large files
- **Smooth UI**: Hardware-accelerated transforms, sub-200ms interactions

## Documentation

- **Complete Technical Docs**: [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **License**: [LICENSE](LICENSE)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup and workflow
- Coding standards and best practices
- Testing requirements
- Pull request guidelines

## Known Limitations

1. **Driver Updates**: Windows only
2. **Safari**: macOS only
3. **Linux Support**: Not fully tested
4. **Cookie Whitelist**: Foundation implemented, ready for SQLite enhancement
5. **Firefox Profiles**: Currently uses default profile only

## Troubleshooting

### App won't start
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Permission errors
- Grant Full Disk Access on macOS
- Run as Administrator on Windows (required for driver updates)

### Browser cleaning fails
- Close the browser completely
- Check if browser process is still running
- Restart the app

### Driver update issues (Windows)

**"Windows Update service not available" error:**
1. **Service is Stopped**: The app will attempt to start it automatically. If that fails:
   - Right-click the app and select "Run as Administrator"
   - The app needs admin rights to start the service

2. **Service is Disabled** (common in corporate environments):
   - Press `Win + R`, type `services.msc`, press Enter
   - Find "Windows Update" in the list
   - Right-click > Properties
   - Change "Startup type" from "Disabled" to "Manual" (recommended) or "Automatic"
   - Click "Start" to start the service
   - Click "OK" and restart the app

3. **Alternative Methods**:
   - The app will automatically try PSWindowsUpdate module if available
   - If all methods fail, it will detect problem devices using WMI
   - Problem devices will be listed with instructions to update manually

**PSWindowsUpdate module installation:**
- First-time use may take 1-2 minutes to install the module
- Requires internet connection
- If installation fails, the app falls back to Windows Update COM API

**Other issues:**
- Ensure Windows Update service is not blocked by Group Policy (corporate PCs)
- Check internet connection for downloading updates
- Disable antivirus temporarily if blocking Windows Update
- Large drivers (graphics cards, chipsets) may take 10-30 minutes to download and install
- System restore point is created automatically before updates
- If updates fail, you can restore from the restore point in System Properties

**Manual alternative:**
1. Open Device Manager (devmgmt.msc)
2. Look for devices with yellow warning icons
3. Right-click > Update driver > Search automatically for drivers

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for more troubleshooting tips.

## License

MIT License - free for personal and commercial use. See [LICENSE](LICENSE) for details.

## Disclaimer

While System Cleaner is designed with safety in mind:
- Always review what you're deleting before confirming
- Maintain backups of important data
- The developers are not responsible for any data loss
- Use at your own risk

## Acknowledgments

- Icons by react-icons (Simple Icons and Tabler Icons)
- Inspired by CCleaner, CleanMyMac, and modern desktop apps
- Built with React and Vite

---

**Made with precision for a cleaner, faster system**

Version 1.0.0 | Last Updated: 2025-10-15
