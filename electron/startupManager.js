/**
 * Startup Manager
 * Cross-platform startup program detection and management
 * Supports macOS, Windows, and Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { getProgramInfo, estimateImpact } = require('./startupProgramDatabase');

class StartupManager {
  constructor() {
    this.platform = process.platform;
    this.startupItems = [];
  }

  /**
   * Get all startup programs
   */
  async getStartupPrograms() {
    try {
      if (this.platform === 'darwin') {
        return await this.getMacStartupItems();
      } else if (this.platform === 'win32') {
        return await this.getWindowsStartupItems();
      } else if (this.platform === 'linux') {
        return await this.getLinuxStartupItems();
      }

      return [];
    } catch (error) {
      console.error('Error getting startup programs:', error);
      return [];
    }
  }

  /**
   * macOS: Get startup items from LaunchAgents and Login Items
   */
  async getMacStartupItems() {
    const items = [];

    // Check LaunchAgents directories
    const launchAgentPaths = [
      path.join(os.homedir(), 'Library', 'LaunchAgents'),
      '/Library/LaunchAgents',
      '/System/Library/LaunchAgents'
    ];

    // Check LaunchDaemons (system-wide)
    const launchDaemonPaths = [
      '/Library/LaunchDaemons',
      '/System/Library/LaunchDaemons'
    ];

    // Read plist files from LaunchAgents
    for (const dirPath of launchAgentPaths) {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
          if (file.endsWith('.plist')) {
            const filePath = path.join(dirPath, file);
            try {
              const item = await this.parseMacPlist(filePath, 'LaunchAgent');
              if (item) {
                items.push(item);
              }
            } catch (error) {
              console.error(`Error parsing ${filePath}:`, error.message);
            }
          }
        }
      }
    }

    // Read plist files from LaunchDaemons
    for (const dirPath of launchDaemonPaths) {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
          if (file.endsWith('.plist')) {
            const filePath = path.join(dirPath, file);
            try {
              const item = await this.parseMacPlist(filePath, 'LaunchDaemon');
              if (item) {
                items.push(item);
              }
            } catch (error) {
              console.error(`Error parsing ${filePath}:`, error.message);
            }
          }
        }
      }
    }

    // Get Login Items using osascript
    try {
      const loginItems = await this.getMacLoginItems();
      items.push(...loginItems);
    } catch (error) {
      console.error('Error getting login items:', error);
    }

    return this.enrichStartupItems(items);
  }

  /**
   * Parse macOS plist file
   */
  async parseMacPlist(filePath, type) {
    try {
      const { stdout } = await execPromise(`plutil -convert json -o - "${filePath}"`);
      const plist = JSON.parse(stdout);

      // Extract program name and path
      let programPath = '';
      let programName = '';

      if (plist.Program) {
        programPath = plist.Program;
      } else if (plist.ProgramArguments && plist.ProgramArguments.length > 0) {
        programPath = plist.ProgramArguments[0];
      }

      if (programPath) {
        programName = path.basename(programPath).replace(/\.(app|exe|sh|py)$/i, '');
      } else {
        programName = path.basename(filePath, '.plist');
      }

      // Check if enabled (not disabled)
      const isEnabled = !plist.Disabled;

      // Check if exists
      const exists = programPath ? fs.existsSync(programPath) : false;

      return {
        id: filePath,
        name: programName,
        path: programPath,
        filePath: filePath,
        enabled: isEnabled,
        type: type,
        method: type,
        exists: exists,
        label: plist.Label || programName,
        runAtLoad: plist.RunAtLoad || false
      };
    } catch (error) {
      console.error(`Error parsing plist ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Get macOS Login Items
   */
  async getMacLoginItems() {
    try {
      const script = `
        tell application "System Events"
          get the name of every login item
        end tell
      `;

      const { stdout } = await execPromise(`osascript -e '${script}'`);
      const items = stdout.trim().split(', ').filter(Boolean);

      return items.map((name, index) => ({
        id: `login-item-${index}`,
        name: name,
        path: '',
        filePath: '',
        enabled: true,
        type: 'LoginItem',
        method: 'Login Items',
        exists: true
      }));
    } catch (error) {
      console.error('Error getting login items:', error);
      return [];
    }
  }

  /**
   * Windows: Get startup items from Registry and Startup folder
   */
  async getWindowsStartupItems() {
    const items = [];

    // Registry paths to check
    const registryPaths = [
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce',
      'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce'
    ];

    // Query each registry path
    for (const regPath of registryPaths) {
      try {
        const { stdout } = await execPromise(`reg query "${regPath}"`);
        const lines = stdout.split('\n');

        for (const line of lines) {
          // Parse registry entry: NAME    TYPE    VALUE
          const match = line.trim().match(/^(\S+)\s+REG_SZ\s+(.+)$/);
          if (match) {
            const [, name, value] = match;
            if (name && value) {
              items.push({
                id: `${regPath}\\${name}`,
                name: name,
                path: value.trim(),
                filePath: value.trim(),
                enabled: true,
                type: 'Registry',
                method: `Registry: ${regPath.includes('HKCU') ? 'User' : 'System'}`,
                exists: fs.existsSync(value.trim().replace(/"/g, ''))
              });
            }
          }
        }
      } catch (error) {
        // Registry key might not exist or access denied
        console.error(`Error reading registry ${regPath}:`, error.message);
      }
    }

    // Check Startup folders
    const startupFolders = [
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'),
      path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    ];

    for (const folder of startupFolders) {
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);

        for (const file of files) {
          const filePath = path.join(folder, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile() && (file.endsWith('.lnk') || file.endsWith('.exe'))) {
            items.push({
              id: filePath,
              name: path.basename(file, path.extname(file)),
              path: filePath,
              filePath: filePath,
              enabled: true,
              type: 'StartupFolder',
              method: 'Startup Folder',
              exists: true
            });
          }
        }
      }
    }

    // Check Task Scheduler for logon tasks
    try {
      const { stdout } = await execPromise('schtasks /query /fo LIST /v');
      const tasks = this.parseWindowsScheduledTasks(stdout);
      items.push(...tasks);
    } catch (error) {
      console.error('Error reading scheduled tasks:', error);
    }

    return this.enrichStartupItems(items);
  }

  /**
   * Parse Windows scheduled tasks
   */
  parseWindowsScheduledTasks(output) {
    const tasks = [];
    const taskBlocks = output.split('\n\n');

    for (const block of taskBlocks) {
      const lines = block.split('\n');
      let taskName = '';
      let taskPath = '';
      let trigger = '';

      for (const line of lines) {
        if (line.includes('TaskName:')) {
          taskName = line.split('TaskName:')[1].trim();
        } else if (line.includes('Task To Run:')) {
          taskPath = line.split('Task To Run:')[1].trim();
        } else if (line.includes('Trigger:')) {
          trigger = line.split('Trigger:')[1].trim();
        }
      }

      // Only include tasks that run at logon
      if (taskName && trigger.toLowerCase().includes('logon')) {
        tasks.push({
          id: `task-${taskName}`,
          name: path.basename(taskName),
          path: taskPath,
          filePath: taskPath,
          enabled: true,
          type: 'TaskScheduler',
          method: 'Task Scheduler',
          exists: taskPath ? fs.existsSync(taskPath) : false
        });
      }
    }

    return tasks;
  }

  /**
   * Linux: Get startup items from autostart directories
   */
  async getLinuxStartupItems() {
    const items = [];

    // Autostart directories
    const autostartDirs = [
      path.join(os.homedir(), '.config', 'autostart'),
      '/etc/xdg/autostart'
    ];

    // Read .desktop files
    for (const dir of autostartDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          if (file.endsWith('.desktop')) {
            const filePath = path.join(dir, file);
            const item = this.parseLinuxDesktopFile(filePath);
            if (item) {
              items.push(item);
            }
          }
        }
      }
    }

    // Check systemd user services
    try {
      const { stdout } = await execPromise('systemctl --user list-unit-files --type=service --state=enabled');
      const services = this.parseLinuxSystemdServices(stdout);
      items.push(...services);
    } catch (error) {
      console.error('Error reading systemd services:', error);
    }

    return this.enrichStartupItems(items);
  }

  /**
   * Parse Linux .desktop file
   */
  parseLinuxDesktopFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      let name = '';
      let exec = '';
      let hidden = false;
      let enabled = true;

      for (const line of lines) {
        if (line.startsWith('Name=')) {
          name = line.substring(5).trim();
        } else if (line.startsWith('Exec=')) {
          exec = line.substring(5).trim();
        } else if (line.startsWith('Hidden=')) {
          hidden = line.substring(7).trim().toLowerCase() === 'true';
        } else if (line.includes('X-GNOME-Autostart-enabled=')) {
          enabled = line.split('=')[1].trim().toLowerCase() !== 'false';
        }
      }

      if (!name) {
        name = path.basename(filePath, '.desktop');
      }

      return {
        id: filePath,
        name: name,
        path: exec,
        filePath: filePath,
        enabled: enabled && !hidden,
        type: 'Autostart',
        method: 'Autostart',
        exists: true
      };
    } catch (error) {
      console.error(`Error parsing desktop file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse systemd services
   */
  parseLinuxSystemdServices(output) {
    const services = [];
    const lines = output.split('\n').slice(1); // Skip header

    for (const line of lines) {
      const match = line.trim().match(/^(\S+\.service)/);
      if (match) {
        const serviceName = match[1];
        services.push({
          id: `systemd-${serviceName}`,
          name: serviceName.replace('.service', ''),
          path: '',
          filePath: '',
          enabled: true,
          type: 'Systemd',
          method: 'systemd',
          exists: true
        });
      }
    }

    return services;
  }

  /**
   * Enrich startup items with metadata
   */
  enrichStartupItems(items) {
    return items.map(item => {
      const programInfo = getProgramInfo(item.name);
      const impact = estimateImpact({
        name: item.name,
        fileSize: this.getFileSize(item.path)
      });

      return {
        ...item,
        publisher: programInfo.publisher,
        description: programInfo.description,
        category: programInfo.category,
        impact: impact.level,
        bootTimeImpactSeconds: impact.seconds,
        essential: programInfo.essential,
        safeToDisable: programInfo.safeToDisable,
        recommendation: programInfo.recommendation,
        dependencies: programInfo.dependencies,
        fileSize: this.getFileSize(item.path),
        addedDate: this.getFileDate(item.filePath)
      };
    });
  }

  /**
   * Get file size
   */
  getFileSize(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.size;
      }
    } catch (error) {
      // Ignore errors
    }
    return 0;
  }

  /**
   * Get file creation/modification date
   */
  getFileDate(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.birthtime.getTime();
      }
    } catch (error) {
      // Ignore errors
    }
    return Date.now();
  }

  /**
   * Toggle startup item (enable/disable)
   */
  async toggleStartupItem(itemId, enabled) {
    if (this.platform === 'darwin') {
      return await this.toggleMacStartupItem(itemId, enabled);
    } else if (this.platform === 'win32') {
      return await this.toggleWindowsStartupItem(itemId, enabled);
    } else if (this.platform === 'linux') {
      return await this.toggleLinuxStartupItem(itemId, enabled);
    }

    throw new Error('Unsupported platform');
  }

  /**
   * Toggle macOS startup item
   */
  async toggleMacStartupItem(itemId, enabled) {
    try {
      if (itemId.endsWith('.plist')) {
        // LaunchAgent or LaunchDaemon
        if (enabled) {
          await execPromise(`launchctl load "${itemId}"`);
        } else {
          await execPromise(`launchctl unload "${itemId}"`);
        }
        return { success: true };
      } else if (itemId.startsWith('login-item-')) {
        // Login item - requires osascript
        const name = itemId.replace('login-item-', '');
        if (!enabled) {
          const script = `tell application "System Events" to delete login item "${name}"`;
          await execPromise(`osascript -e '${script}'`);
        }
        return { success: true };
      }
    } catch (error) {
      console.error('Error toggling macOS startup item:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle Windows startup item
   */
  async toggleWindowsStartupItem(itemId, enabled) {
    try {
      if (itemId.includes('\\Run')) {
        // Registry entry
        if (!enabled) {
          // Delete registry value
          const valueName = itemId.split('\\').pop();
          const keyPath = itemId.substring(0, itemId.lastIndexOf('\\'));
          await execPromise(`reg delete "${keyPath}" /v "${valueName}" /f`);
        }
        return { success: true };
      } else if (fs.existsSync(itemId) && itemId.includes('Startup')) {
        // Startup folder shortcut
        if (!enabled) {
          fs.unlinkSync(itemId);
        }
        return { success: true };
      }
    } catch (error) {
      console.error('Error toggling Windows startup item:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle Linux startup item
   */
  async toggleLinuxStartupItem(itemId, enabled) {
    try {
      if (itemId.endsWith('.desktop')) {
        // Desktop file - modify X-GNOME-Autostart-enabled
        const content = fs.readFileSync(itemId, 'utf8');
        const newContent = content.includes('X-GNOME-Autostart-enabled=')
          ? content.replace(/X-GNOME-Autostart-enabled=.+/, `X-GNOME-Autostart-enabled=${enabled}`)
          : content + `\nX-GNOME-Autostart-enabled=${enabled}`;
        fs.writeFileSync(itemId, newContent);
        return { success: true };
      } else if (itemId.startsWith('systemd-')) {
        // Systemd service
        const serviceName = itemId.replace('systemd-', '');
        if (enabled) {
          await execPromise(`systemctl --user enable ${serviceName}`);
        } else {
          await execPromise(`systemctl --user disable ${serviceName}`);
        }
        return { success: true };
      }
    } catch (error) {
      console.error('Error toggling Linux startup item:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove startup item completely
   */
  async removeStartupItem(itemId) {
    return await this.toggleStartupItem(itemId, false);
  }

  /**
   * Add program to startup (platform specific)
   */
  async addStartupItem(programPath, programName) {
    if (this.platform === 'darwin') {
      return await this.addMacStartupItem(programPath, programName);
    } else if (this.platform === 'win32') {
      return await this.addWindowsStartupItem(programPath, programName);
    } else if (this.platform === 'linux') {
      return await this.addLinuxStartupItem(programPath, programName);
    }

    throw new Error('Unsupported platform');
  }

  /**
   * Add macOS startup item (create LaunchAgent)
   */
  async addMacStartupItem(programPath, programName) {
    const label = `com.user.${programName.replace(/\s+/g, '')}`;
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`);

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${programPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>`;

    fs.writeFileSync(plistPath, plistContent);
    await execPromise(`launchctl load "${plistPath}"`);

    return { success: true, path: plistPath };
  }

  /**
   * Add Windows startup item (Registry)
   */
  async addWindowsStartupItem(programPath, programName) {
    const keyPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    await execPromise(`reg add "${keyPath}" /v "${programName}" /t REG_SZ /d "${programPath}" /f`);

    return { success: true };
  }

  /**
   * Add Linux startup item (create .desktop file)
   */
  async addLinuxStartupItem(programPath, programName) {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart');

    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    const desktopFile = path.join(autostartDir, `${programName.replace(/\s+/g, '')}.desktop`);
    const content = `[Desktop Entry]
Type=Application
Name=${programName}
Exec=${programPath}
X-GNOME-Autostart-enabled=true`;

    fs.writeFileSync(desktopFile, content);

    return { success: true, path: desktopFile };
  }
}

module.exports = StartupManager;
