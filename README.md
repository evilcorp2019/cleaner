# System Cleaner

A professional cross-platform desktop application for system optimization and maintenance.

![System Cleaner](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Features

- **System Cleaner** - Clean temporary files, caches, and free up disk space
- **Duplicate Finder** - Intelligent duplicate detection with smart selection tools
- **Browser Cleaner** - Clean cache, cookies, history for Chrome, Firefox, Edge, Safari, Opera, Brave
- **Startup Manager** - Manage applications that run on system startup
- **Scheduled Cleaning** - Automate cleaning tasks on a schedule
- **Large File Finder** - Find and manage large files taking up space
- **App Cache Manager** - Clean application-specific cache files
- **Extension Remnant Cleaner** - Remove leftover files from uninstalled browser extensions
- **System Updates** - Check and install system updates
- **Driver Updates** - Update device drivers (Windows only)

## Installation

### Prerequisites
- Node.js v16 or higher

### Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run package
```

## Usage

1. Launch the application
2. Select a feature from the home page
3. Click "Start Scan" to analyze your system
4. Review the results and select items
5. Click the action button (Clean, Delete, Update, etc.)

## Technology Stack

- **Frontend**: React 18.2.0 + Vite 5.0.11
- **Backend**: Electron 31.7.5
- **Database**: better-sqlite3
- **Icons**: react-icons

## Scripts

- `npm run dev` - Development with hot reload
- `npm run build` - Build production bundle
- `npm start` - Run application
- `npm run package` - Create installer

## Permissions

### macOS
Grant **Full Disk Access** in:
System Preferences > Security & Privacy > Privacy > Full Disk Access

### Windows
Run as Administrator for driver updates and system modifications

## Project Structure

```
cleaner/
├── electron/         # Backend (main process, IPC handlers)
├── src/             # Frontend (React components, pages)
├── assets/          # Icons and images
└── docs/            # Documentation
```

## Troubleshooting

### Blue Screen or Blank Screen on Windows

If you see only a blue screen with no features after downloading from GitHub:

1. **Install dependencies first:**
   ```bash
   npm install
   ```

2. **Run the development version:**
   ```bash
   npm run dev
   ```

3. **Check the console:** Open DevTools (Ctrl+Shift+I on Windows) to see any error messages

4. **Verify Node.js version:**
   ```bash
   node --version  # Should be v16 or higher
   ```

### App Won't Start

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run dev
```

### Permission Errors

- **macOS:** Grant Full Disk Access in System Preferences > Security & Privacy > Privacy > Full Disk Access
- **Windows:** Run as Administrator (right-click the app and select "Run as Administrator")

### Browser Cleaning Fails

- Close browser completely before cleaning
- Check Task Manager for running browser processes
- Restart the System Cleaner app

### Driver Updates Not Working (Windows)

- Run the app as Administrator
- Ensure Windows Update service is enabled in Services (services.msc)
- Check internet connection

## License

MIT License - See [LICENSE](LICENSE) for details.

## Disclaimer

While designed with safety in mind, always review items before deletion and maintain backups of important data. Use at your own risk.

---

**Version 1.0.0** | Built with React and Electron
