# System Cleaner - Technical Documentation

Complete technical documentation for System Cleaner including architecture, features, design system, and implementation details.

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Design System](#design-system)
4. [Development](#development)
5. [API Reference](#api-reference)

---

## Architecture

### Technology Stack

- **Frontend**: React 18.2.0 with Vite 5.0.11
- 
- **Icons**: react-icons 5.5.0
- **Styling**: Modern CSS (no preprocessors)
- **Runtime**: Node.js v16+

### Process Model

```
Main Process (Node.js)
├── Window Management
├── Native OS Integration
├── File System Operations
└── IPC Communication

Renderer Process (Browser/React)
├── UI Rendering
├── User Interactions
└── IPC Requests

Preload Script
└── Secure Bridge (contextBridge)
```

### IPC Communication Pattern

**Renderer to Main:**
```javascript
// Renderer (React)
const result = await window.api.scanFiles();

// Preload
contextBridge.exposeInMainWorld('api', {
  scanFiles: () => ipcRenderer.invoke('scan-files')
});

// Main
ipcMain.handle('scan-files', async () => {
  return { success: true, data: files };
});
```

### Project Structure

```
cleaner/
├── backend/                  # Application Backend main process
│   ├── main.js               # Application entry & IPC handlers
│   ├── preload.js            # IPC bridge
│   ├── cleaner.js            # System cleaner logic
│   ├── duplicateFinder.js    # Duplicate detection
│   ├── browserCleaner.js     # Browser data cleaning
│   ├── systemUpdater.js      # System updates
│   └── driverUpdater.js      # Driver updates (Windows)
├── src/                      # React frontend
│   ├── App.jsx               # Main app & routing
│   ├── components/           # Reusable components
│   └── pages/                # Page components
├── docs/                     # Documentation
└── package.json              # Dependencies
```

---

## Features

### 1. System Cleaner

**Purpose:** Clean temporary files, caches, and free up disk space.

**Scanned Locations:**

macOS:
- `~/Library/Caches` - User cache files
- `/Library/Caches` - System cache files
- `/tmp` - Temporary files
- `~/Library/Logs` - Application logs
- Browser caches (Chrome, Firefox, Safari)
- npm cache (`~/.npm`)
- Yarn cache (`~/Library/Caches/Yarn`)

Windows:
- `%TEMP%` - User temporary files
- `%LOCALAPPDATA%\Temp` - Local app data temp
- Windows Update cache
- Browser caches (Chrome, Edge)
- npm cache (`%APPDATA%\npm-cache`)

**Safety Features:**
- Protected directory blacklist
- Never touches Documents, Desktop, personal files
- Path validation before deletion
- Preview before cleaning

**Performance:**
- Parallel directory scanning
- Typical scan time: 10-30 seconds
- Memory-efficient file list streaming

### 2. System Updates

**Purpose:** Automated system update detection and installation.

**Platform Support:**
- macOS: Uses `softwareupdate` command
- Windows: Windows Update service integration

**Features:**
- Cross-platform update detection
- Automated installation
- Reboot management
- Progress tracking

### 3. Driver Updates (Windows Only)

**Purpose:** Detect and update outdated device drivers with selective installation.

**Requirements:**
- Windows operating system (Windows 7 or later)
- Administrator privileges required
- Windows Update service must be enabled
- Internet connection for driver downloads

**Supported Categories:**
- Graphics cards (GPU)
- Network adapters
- Audio devices
- Chipset drivers
- Storage controllers
- Input devices
- Peripherals

**Features:**
- Hardware scanning via Windows Update API
- Individual driver selection with checkboxes
- Selective installation by UpdateID (properly filtered)
- Automatic system restore point creation before updates
- Extended timeout support (30 minutes for large drivers)
- Comprehensive error handling with helpful messages
- Result code interpretation (Success, In Progress, Failed, etc.)
- Debug logging throughout the process
- Select All / Deselect All batch operations

**Implementation Details:**

Driver Detection:
- Uses Windows Update COM API (Microsoft.Update.Session)
- Searches for driver-only updates
- Filters by category (Drivers)
- Returns UpdateID, Title, Description, and Size

Driver Installation:
1. Creates system restore point before installation
2. Writes PowerShell script to temporary file
3. Filters updates by selected UpdateIDs
4. Downloads selected drivers
5. Installs selected drivers
6. Reports detailed results with status codes

**Result Codes:**
- 2: Success (Successfully installed)
- 3: Success with errors (Completed with some errors)
- 4: Failed (Installation failed)
- 5: Aborted (Installation was cancelled)
- Other: In progress or pending

**Error Handling:**
- Permission errors with helpful messages
- Timeout errors for large downloads (30 minute max)
- Windows Update service not running detection
- Driver download failures
- Installation failures with specific error codes

**Performance:**
- Small drivers: 1-5 minutes
- Medium drivers (network, audio): 5-15 minutes
- Large drivers (graphics cards): 10-30 minutes
- Progress updates via PowerShell output streaming

**Safety:**
- System restore point created automatically before any installation
- Only installs user-selected drivers by UpdateID
- Validates Windows Update service availability
- Proper privilege escalation with UAC prompt

### 4. Duplicate File Finder

**Purpose:** Find and remove duplicate files using multi-stage hashing.

**Algorithm:**

Stage 1: Size Comparison
- Groups files by identical size
- Instant comparison
- Eliminates non-duplicates immediately

Stage 2: Partial Hash (1KB)
- Hashes first 1KB of each file
- Fast comparison of file beginnings
- Catches most duplicates quickly

Stage 3: Full MD5 Hash
- Full file hashing only when needed
- Confirms true duplicates
- Streaming hashing for memory efficiency

**Scan Directories:**
- Downloads
- Documents
- Desktop
- Pictures
- Music
- Videos

**File Type Filters:**
- All Files
- Images: jpg, jpeg, png, gif, bmp, webp, svg, ico
- Videos: mp4, avi, mov, mkv, wmv, flv, webm
- Documents: pdf, doc, docx, txt, rtf, odt, xls, xlsx, ppt, pptx
- Audio: mp3, wav, flac, aac, ogg, wma, m4a
- Archives: zip, rar, 7z, tar, gz, bz2

**Smart Selection:**
- Keep Newest: Selects older files for deletion
- Keep Oldest: Selects newer files for deletion
- Manual selection: Click to toggle

**Performance:**
- 10,000 files scanned in ~30 seconds
- Memory-efficient streaming
- Handles files of any size

**Safety:**
- Skips system directories
- Protects application folders
- Confirmation before deletion

### 5. Browser Data Cleaner

**Purpose:** Clean browser data from 6 major browsers.

**Supported Browsers:**

Cross-platform:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Opera
- Brave

macOS only:
- Safari

**Data Types:**

1. Cache (Always safe to delete)
   - Cache files, Code Cache, GPU Cache, Service Worker cache
   - Typical size: 100 MB - 2 GB per browser

2. Cookies (Logs you out of websites)
   - Cookie database and journal files
   - Typical size: 1-50 MB per browser

3. History (Safe to delete)
   - History database, journal files, visited links
   - Typical size: 10-100 MB per browser

4. Downloads (History only, not files)
   - Download history records
   - Minimal size

5. Form Data (Removes autofill)
   - Web Data database
   - Saved form entries
   - Typical size: 1-20 MB per browser

6. Session Data (Resets open tabs)
   - Session files, Session Storage, Local Storage
   - Typical size: 1-50 MB per browser

**Features:**

Running Browser Detection:
- macOS: Uses `pgrep -x` for exact process matching
- Windows: Uses `tasklist` command
- Visual "Running" badge on active browsers
- Cannot select running browsers

Space Analysis:
- Calculates space for selected data types
- Per-browser breakdown
- Total space to free
- Fast recursive traversal

Cookie Preservation (Foundation):
- Checkbox to enable
- Domain whitelist input
- Ready for SQLite enhancement

**Platform-Specific Paths:**

macOS:
- `~/Library/Application Support/Google/Chrome/Default`
- `~/Library/Application Support/Firefox/Profiles/*`
- `~/Library/Application Support/Microsoft Edge/Default`
- `~/Library/Safari`

Windows:
- `%LOCALAPPDATA%\Google\Chrome\User Data\Default`
- `%APPDATA%\Mozilla\Firefox\Profiles\*`
- `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default`

**Safety Features:**
- Pre-cleaning checks
- Confirmation dialogs
- Error handling for locked files
- Process recheck before cleaning

---

## Design System

### Color Palette

**Primary:**
- Blue: #0969DA (GitHub blue, 7.2:1 contrast)
- Hover: #0550a8

**Semantic:**
- Success: #1A7F37 (forest green, 5.9:1 contrast)
- Warning: #d97706 (amber, 5.1:1 contrast)
- Error: #ff3b30 (red, 4.5:1 contrast)

**Neutral:**
- Primary Text: #1d1d1f (16.1:1 contrast)
- Secondary Text: #86868b (4.6:1 contrast)
- Border: #e5e5e7
- Background: #ffffff, #f5f5f7

**Browser Brand Colors:**
- Chrome: #4285F4
- Firefox: #FF7139
- Edge: #0078D7
- Safari: #006CFF
- Opera: #FF1B2D
- Brave: #FB542B

### Typography

**Font Stack:**
```css
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
'Helvetica Neue', sans-serif
```

**Sizes:**
- Display: 32px (large numbers)
- Page Title: 22px
- Section Title: 16px
- Large: 15px
- Base: 14px
- Body: 13px
- Small: 12px
- Micro: 11px

**Weights:**
- Medium: 500 (standard)
- Semibold: 600 (headings, buttons)
- Bold: 700 (numbers, emphasis)

### Spacing Scale (4px-based)

```
4px, 6px, 8px, 10px, 12px, 16px, 20px, 24px
```

### Component Sizing

**Buttons:**
- Height: 44px (touch-optimized)
- Padding: 12px 20px
- Border Radius: 8px

**Cards:**
- Browser: 56px height
- Data Type: 48px height
- Section: 20px padding, 10px border radius

**Icons:**
- Home Page: 48px
- Browser List: 32px
- Section Header: 20px
- Button: 16px

### Interaction States

**Hover:**
```css
transition: all 0.2s ease;
transform: translateY(-1px);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
```

**Active:**
```css
transform: translateY(0);
box-shadow: none;
```

**Focus:**
```css
outline: 2px solid #0969DA;
outline-offset: 2px;
```

**Disabled:**
```css
opacity: 0.6;
cursor: not-allowed;
pointer-events: none;
```

### Accessibility

**WCAG 2.1 AA Compliance:**
- Color contrast minimum 4.5:1
- Touch targets minimum 44x44px
- Keyboard navigation support
- Visible focus states
- Semantic HTML with ARIA labels

---

## Development

### Setup

```bash
npm install        # Install dependencies
npm run dev        # Start development mode
npm run build      # Build for production
npm start          # Run Application Backend app
npm run package    # Create distributable
```

### Development Workflow

**Hot Reloading:**
- React changes: Instant HMR
- Application Backend main: Requires restart
- Preload script: Requires restart

**Adding Features:**

1. Backend (Application Backend):
   - Create module in `backend/`
   - Add IPC handlers in `main.js`
   - Expose API in `preload.js`

2. Frontend (React):
   - Create component in `src/components/`
   - Create page in `src/pages/`
   - Add routing in `App.jsx`

### Coding Standards

**Critical Rules:**
- NO EMOJIS anywhere
- Use ES6+ (const/let, async/await)
- Functional React components only
- 2-space indentation
- Single quotes for strings

**Naming Conventions:**
- Variables: camelCase
- Components: PascalCase
- CSS classes: kebab-case
- Constants: UPPER_CASE

**Error Handling:**
```javascript
ipcMain.handle('operation', async () => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### Testing

**Manual Testing Checklist:**
- Test on macOS and Windows
- Verify all interactions
- Check error handling
- Test edge cases
- Ensure accessibility

### Building & Packaging

**Build Process:**
```bash
npm run build      # Vite builds React to dist/
npm run package    # electron-builder creates DMG/exe
```

**Output:**
- macOS: `release/System Cleaner-{version}.dmg`
- Windows: `release/System Cleaner Setup {version}.exe`

---

## API Reference

### Application Backend IPC Handlers

**System Cleaner:**
```javascript
window.api.scanFiles()
  // Returns: { success: true, files: [...] }

window.api.cleanFiles(filePaths)
  // Returns: { success: true, cleaned: number }
```

**Duplicate Finder:**
```javascript
window.api.scanForDuplicates(directories, fileType)
  // Returns: { success: true, duplicates: [...] }

window.api.deleteDuplicates(filePaths)
  // Returns: { success: true, deleted: number }
```

**Browser Cleaner:**
```javascript
window.api.detectBrowsers()
  // Returns: { success: true, browsers: [...] }

window.api.analyzeBrowserData(browserId, dataTypes)
  // Returns: { success: true, analysis: {...} }

window.api.cleanBrowserData(browserId, dataTypes, options)
  // Returns: { success: true, cleaned: {...} }
```

**System Updates:**
```javascript
window.api.checkUpdates()
  // Returns: { success: true, updates: [...] }

window.api.installUpdates()
  // Returns: { success: true }
```

**Driver Updates:**
```javascript
window.api.checkDrivers()
  // Returns: { success: true, drivers: [...] }
  // Each driver includes: updateId, title, description, driverClass,
  // driverProvider, driverDate, driverVersion

window.api.updateDrivers(selectedDriverIds)
  // Parameters: Array of UpdateIDs (strings)
  // Returns: { success: true, results: [...] } or { success: false, error: "message" }
  // Creates system restore point automatically before installation
  // May take 10-30 minutes for large drivers
  // Requires Administrator privileges
```

### Response Format

**Success:**
```javascript
{
  success: true,
  data: {...}  // or array
}
```

**Error:**
```javascript
{
  success: false,
  error: "Error message"
}
```

---

## Advanced Topics

### Duplicate Finder Algorithm Details

**Stage 1: Size Grouping**
- Complexity: O(n)
- Groups files by size
- Eliminates unique sizes immediately

**Stage 2: Partial Hashing**
- Complexity: O(n log n) per size group
- Reads first 1KB of each file
- MD5 hash comparison
- Eliminates most false positives

**Stage 3: Full Hashing**
- Complexity: O(n) per candidate group
- Full file MD5 hash
- Streaming for memory efficiency
- Confirms true duplicates

**Memory Management:**
```javascript
const stream = fs.createReadStream(filePath);
const hash = crypto.createHash('md5');
stream.on('data', chunk => hash.update(chunk));
stream.on('end', () => {
  const digest = hash.digest('hex');
  // Process digest
});
```

### Browser Cleaner Process Detection

**macOS:**
```bash
pgrep -x "Google Chrome"  # Returns PID if running
```

**Windows:**
```cmd
tasklist | findstr chrome.exe  # Returns process info
```

**Implementation:**
```javascript
const isRunning = async (processName) => {
  const command = process.platform === 'darwin'
    ? `pgrep -x "${processName}"`
    : `tasklist | findstr ${processName}`;

  try {
    await exec(command);
    return true;
  } catch {
    return false;
  }
};
```

### Performance Optimization

**File Operations:**
- Use streaming for large files
- Parallel operations where safe
- Debounce frequent operations

**React Optimization:**
```javascript
// Memoize expensive calculations
const total = useMemo(() =>
  items.reduce((sum, item) => sum + item.value, 0),
  [items]
);

// Memoize callbacks
const handleClick = useCallback(() =>
  doSomething(value),
  [value]
);
```

### Security Best Practices

**Path Validation:**
```javascript
function isValidPath(filePath) {
  if (filePath.includes('..')) return false;
  if (isSystemDirectory(filePath)) return false;
  return true;
}
```

**IPC Input Sanitization:**
```javascript
ipcMain.handle('operation', async (event, input) => {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input');
  }
  if (!isValidPath(input)) {
    throw new Error('Invalid path');
  }
  // Proceed with operation
});
```

---

## Troubleshooting

### Common Issues

**Dependencies not installing:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Application Backend won't start:**
- Check port 3000 is available
- Verify Vite dev server starts
- Try rebuilding: `npm run build && npm start`

**IPC communication fails:**
- Check contextBridge exposure in preload
- Verify handler exists in main process
- Check IPC channel names match

**Permission errors (macOS):**
- Grant Full Disk Access in System Preferences
- Security & Privacy > Privacy > Full Disk Access

**Process detection fails:**
- Verify process names in config
- Test command manually in terminal

**Driver updates fail (Windows only):**
- Run application as Administrator (required for driver installation)
- Check if Windows Update service is running:
  ```cmd
  sc query wuauserv
  ```
- Enable Windows Update service if disabled:
  ```cmd
  sc config wuauserv start=demand
  sc start wuauserv
  ```
- Check internet connection
- Temporarily disable antivirus if it's blocking driver downloads
- Large drivers (especially graphics cards) can take 10-30 minutes to download and install
- Check available disk space (some drivers require 1-2 GB)
- System restore point is created automatically before any installation

**Driver update timeout errors:**
- This is normal for large drivers (graphics cards especially)
- Timeout is set to 30 minutes to accommodate large downloads
- If timeout occurs, check Windows Update logs
- Try updating one driver at a time for large drivers
- Ensure stable internet connection

**Driver installation permissions:**
- UAC prompt will appear - must be accepted
- Application must be run as Administrator
- User must have administrator privileges on the system
- Some corporate policies may block driver installation

---

## Resources

**Documentation:**
- [Application Backend Docs](https://nodejs.org/docs)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)

**Tools:**
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [react-icons](https://react-icons.github.io/react-icons/)

---

## Version History

**v1.0.0 (2025-10-15)**
- Initial release
- System Cleaner, Duplicate Finder, Browser Cleaner
- System Updates, Driver Updates
- Professional design system
- Cross-platform support (macOS, Windows)

**v1.0.1 (2025-10-15)**
- Fixed critical driver updater bugs
- Added selective driver installation by UpdateID
- Implemented automatic system restore point creation
- Added individual driver selection UI with checkboxes
- Increased timeout to 30 minutes for large driver downloads
- Improved PowerShell execution for better output capture
- Enhanced error handling with helpful messages
- Added result code mapping for Windows Update
- Implemented comprehensive debug logging
- Fixed driver ID filtering (was installing ALL drivers instead of selected ones)
- Fixed UAC/privilege escalation issues
- Added Select All / Deselect All functionality

---

**Document Version:** 2.1
**Last Updated:** 2025-10-15
**Maintained By:** Development Team
