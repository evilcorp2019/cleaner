/**
 * Application Cache Database
 *
 * Comprehensive database of 50+ popular applications with their cache locations
 * across macOS, Windows, and Linux platforms.
 *
 * Each application entry contains:
 * - name: Display name
 * - category: Grouping category
 * - icon: Emoji or Unicode icon
 * - cachePaths: Platform-specific cache directories
 * - appPaths: Platform-specific installation paths
 * - processNames: Process names to check if app is running
 * - preservePaths: Directories/files to never delete (settings, logins)
 * - description: Brief description of the application
 * - averageCacheSize: Typical cache size (for estimation)
 */

const os = require('os');
const path = require('path');

// Helper to expand environment variables and user home
function expandPath(pathStr) {
  if (!pathStr) return null;

  // Replace ~ with home directory
  let expanded = pathStr.replace(/^~/, os.homedir());

  // Windows environment variables
  if (process.platform === 'win32') {
    expanded = expanded.replace(/%([^%]+)%/g, (_, name) => {
      return process.env[name] || '';
    });
  }

  return expanded;
}

const APPLICATIONS = {
  // Communication & Collaboration
  discord: {
    name: 'Discord',
    category: 'Communication',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Discord', '~/Library/Application Support/Discord/Cache', '~/Library/Application Support/Discord/Code Cache'],
      win32: ['%AppData%/discord/Cache', '%AppData%/discord/Code Cache', '%AppData%/discord/GPUCache'],
      linux: ['~/.config/discord/Cache', '~/.config/discord/Code Cache', '~/.config/discord/GPUCache']
    },
    appPaths: {
      darwin: '/Applications/Discord.app',
      win32: '%LocalAppData%/Discord',
      linux: '/usr/share/discord'
    },
    processNames: ['Discord', 'discord'],
    preservePaths: ['Local Storage', 'Session Storage', 'IndexedDB'],
    description: 'Voice, video, and text communication platform',
    averageCacheSize: 7 * 1024 * 1024 * 1024 // 7GB
  },

  slack: {
    name: 'Slack',
    category: 'Communication',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Slack', '~/Library/Application Support/Slack/Cache', '~/Library/Application Support/Slack/Code Cache'],
      win32: ['%AppData%/Slack/Cache', '%AppData%/Slack/Code Cache', '%AppData%/Slack/Service Worker/CacheStorage'],
      linux: ['~/.config/Slack/Cache', '~/.config/Slack/Code Cache']
    },
    appPaths: {
      darwin: '/Applications/Slack.app',
      win32: '%LocalAppData%/slack',
      linux: '/usr/bin/slack'
    },
    processNames: ['Slack', 'slack'],
    preservePaths: ['Local Storage', 'Cookies'],
    description: 'Team collaboration and messaging',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  teams: {
    name: 'Microsoft Teams',
    category: 'Communication',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.microsoft.teams', '~/Library/Application Support/Microsoft/Teams/Cache'],
      win32: ['%AppData%/Microsoft/Teams/Cache', '%AppData%/Microsoft/Teams/blob_storage', '%AppData%/Microsoft/Teams/Service Worker/CacheStorage'],
      linux: ['~/.config/Microsoft/Microsoft Teams/Cache']
    },
    appPaths: {
      darwin: '/Applications/Microsoft Teams.app',
      win32: '%LocalAppData%/Microsoft/Teams',
      linux: '/usr/bin/teams'
    },
    processNames: ['Teams', 'teams'],
    preservePaths: ['Local Storage', 'Cookies'],
    description: 'Microsoft Teams communication platform',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  zoom: {
    name: 'Zoom',
    category: 'Communication',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/us.zoom.xos'],
      win32: ['%AppData%/Zoom/logs', '%AppData%/Zoom/data'],
      linux: ['~/.zoom/logs', '~/.zoom/data']
    },
    appPaths: {
      darwin: '/Applications/zoom.us.app',
      win32: '%ProgramFiles%/Zoom',
      linux: '/usr/bin/zoom'
    },
    processNames: ['zoom.us', 'zoom', 'Zoom'],
    preservePaths: ['zoomus.conf'],
    description: 'Video conferencing platform',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  skype: {
    name: 'Skype',
    category: 'Communication',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.skype.skype', '~/Library/Application Support/Skype/Media Cache'],
      win32: ['%AppData%/Skype/Media Cache', '%AppData%/Microsoft/Skype for Desktop/Cache'],
      linux: ['~/.config/skypeforlinux/Cache']
    },
    appPaths: {
      darwin: '/Applications/Skype.app',
      win32: '%ProgramFiles%/Microsoft/Skype for Desktop',
      linux: '/usr/bin/skypeforlinux'
    },
    processNames: ['Skype', 'skype'],
    preservePaths: ['My Skype Received Files'],
    description: 'Video and voice calling',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  telegram: {
    name: 'Telegram',
    category: 'Communication',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Telegram', '~/Library/Application Support/Telegram Desktop/tdata/user_data'],
      win32: ['%AppData%/Telegram Desktop/tdata/user_data'],
      linux: ['~/.local/share/TelegramDesktop/tdata/user_data']
    },
    appPaths: {
      darwin: '/Applications/Telegram.app',
      win32: '%AppData%/Telegram Desktop',
      linux: '/usr/bin/telegram-desktop'
    },
    processNames: ['Telegram', 'telegram'],
    preservePaths: ['key_data', 'settings'],
    description: 'Secure messaging application',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  // Entertainment & Media
  spotify: {
    name: 'Spotify',
    category: 'Media',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.spotify.client', '~/Library/Caches/com.spotify.client.helper', '~/Library/Application Support/Spotify/PersistentCache'],
      win32: ['%AppData%/Spotify/Cache', '%AppData%/Spotify/Data'],
      linux: ['~/.cache/spotify']
    },
    appPaths: {
      darwin: '/Applications/Spotify.app',
      win32: '%AppData%/Spotify',
      linux: '/usr/share/spotify'
    },
    processNames: ['Spotify', 'spotify'],
    preservePaths: ['Users', 'prefs'],
    description: 'Music streaming service',
    averageCacheSize: 10 * 1024 * 1024 * 1024 // 10GB
  },

  steam: {
    name: 'Steam',
    category: 'Gaming',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Steam', '~/Library/Application Support/Steam/appcache', '~/Library/Application Support/Steam/Steam.AppBundle/Steam/Contents/MacOS/shader_cache_temp_dir_*'],
      win32: ['%ProgramFiles(x86)%/Steam/appcache', '%ProgramFiles(x86)%/Steam/config/htmlcache'],
      linux: ['~/.steam/steam/appcache', '~/.local/share/Steam/appcache']
    },
    appPaths: {
      darwin: '/Applications/Steam.app',
      win32: '%ProgramFiles(x86)%/Steam',
      linux: '/usr/bin/steam'
    },
    processNames: ['Steam', 'steam'],
    preservePaths: ['userdata', 'config'],
    description: 'Gaming platform and store',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  epicgames: {
    name: 'Epic Games Launcher',
    category: 'Gaming',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.epicgames.EpicGamesLauncher'],
      win32: ['%LocalAppData%/EpicGamesLauncher/Saved/webcache', '%LocalAppData%/EpicGamesLauncher/Saved/Logs'],
      linux: ['~/.config/Epic/EpicGamesLauncher/Saved/webcache']
    },
    appPaths: {
      darwin: '/Applications/Epic Games Launcher.app',
      win32: '%ProgramFiles(x86)%/Epic Games',
      linux: null
    },
    processNames: ['EpicGamesLauncher'],
    preservePaths: ['Config'],
    description: 'Epic Games store and launcher',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  battlenet: {
    name: 'Battle.net',
    category: 'Gaming',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Application Support/Battle.net/Cache', '~/Library/Caches/com.blizzard.Battle.net'],
      win32: ['%ProgramData%/Battle.net/Cache', '%AppData%/Battle.net/Cache'],
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Battle.net.app',
      win32: '%ProgramFiles(x86)%/Battle.net',
      linux: null
    },
    processNames: ['Battle.net', 'Battle.net.exe'],
    preservePaths: ['Battle.net.config'],
    description: 'Blizzard gaming platform',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  itunes: {
    name: 'iTunes/Music',
    category: 'Media',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.apple.iTunes', '~/Library/Caches/com.apple.Music'],
      win32: ['%LocalAppData%/Apple Computer/iTunes/Cache'],
      linux: null
    },
    appPaths: {
      darwin: '/System/Applications/Music.app',
      win32: '%ProgramFiles%/iTunes',
      linux: null
    },
    processNames: ['Music', 'iTunes'],
    preservePaths: ['iTunes Library', 'Music Library'],
    description: 'Apple music and media player',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  vlc: {
    name: 'VLC Media Player',
    category: 'Media',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/org.videolan.vlc'],
      win32: ['%AppData%/vlc/cache'],
      linux: ['~/.cache/vlc']
    },
    appPaths: {
      darwin: '/Applications/VLC.app',
      win32: '%ProgramFiles%/VideoLAN/VLC',
      linux: '/usr/bin/vlc'
    },
    processNames: ['VLC', 'vlc'],
    preservePaths: ['vlcrc'],
    description: 'Multimedia player',
    averageCacheSize: 500 * 1024 * 1024 // 500MB
  },

  // Development Tools
  vscode: {
    name: 'Visual Studio Code',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Code', '~/Library/Application Support/Code/Cache', '~/Library/Application Support/Code/CachedData', '~/Library/Application Support/Code/CachedExtensions'],
      win32: ['%AppData%/Code/Cache', '%AppData%/Code/CachedData', '%AppData%/Code/CachedExtensions'],
      linux: ['~/.config/Code/Cache', '~/.config/Code/CachedData', '~/.config/Code/CachedExtensions']
    },
    appPaths: {
      darwin: '/Applications/Visual Studio Code.app',
      win32: '%LocalAppData%/Programs/Microsoft VS Code',
      linux: '/usr/bin/code'
    },
    processNames: ['Code', 'code', 'code-insiders'],
    preservePaths: ['User', 'extensions'],
    description: 'Code editor by Microsoft',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  intellij: {
    name: 'IntelliJ IDEA',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/JetBrains/IntelliJIdea*'],
      win32: ['%LocalAppData%/JetBrains/IntelliJIdea*/system'],
      linux: ['~/.cache/JetBrains/IntelliJIdea*']
    },
    appPaths: {
      darwin: '/Applications/IntelliJ IDEA.app',
      win32: '%ProgramFiles%/JetBrains/IntelliJ IDEA',
      linux: '/usr/bin/idea'
    },
    processNames: ['idea', 'idea64'],
    preservePaths: ['config'],
    description: 'Java IDE by JetBrains',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  androidstudio: {
    name: 'Android Studio',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/AndroidStudio*', '~/Library/Caches/Google/AndroidStudio*'],
      win32: ['%LocalAppData%/Google/AndroidStudio*/cache'],
      linux: ['~/.cache/Google/AndroidStudio*']
    },
    appPaths: {
      darwin: '/Applications/Android Studio.app',
      win32: '%ProgramFiles%/Android/Android Studio',
      linux: '/usr/bin/android-studio'
    },
    processNames: ['studio', 'studio64'],
    preservePaths: ['config'],
    description: 'Android development IDE',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  xcode: {
    name: 'Xcode',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Developer/Xcode/DerivedData', '~/Library/Caches/com.apple.dt.Xcode', '~/Library/Developer/Xcode/Archives'],
      win32: null,
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Xcode.app',
      win32: null,
      linux: null
    },
    processNames: ['Xcode', 'xcodebuild'],
    preservePaths: ['UserData'],
    description: 'Apple development IDE',
    averageCacheSize: 20 * 1024 * 1024 * 1024 // 20GB
  },

  docker: {
    name: 'Docker',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Containers/com.docker.docker/Data/vms'],
      win32: ['%LocalAppData%/Docker'],
      linux: ['/var/lib/docker']
    },
    appPaths: {
      darwin: '/Applications/Docker.app',
      win32: '%ProgramFiles%/Docker',
      linux: '/usr/bin/docker'
    },
    processNames: ['Docker', 'com.docker.backend'],
    preservePaths: ['config.json'],
    description: 'Container platform',
    averageCacheSize: 10 * 1024 * 1024 * 1024 // 10GB
  },

  // Browsers (additional caches)
  chrome: {
    name: 'Google Chrome',
    category: 'Browsers',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Google/Chrome', '~/Library/Application Support/Google/Chrome/Default/GPUCache', '~/Library/Application Support/Google/Chrome/ShaderCache'],
      win32: ['%LocalAppData%/Google/Chrome/User Data/Default/Cache', '%LocalAppData%/Google/Chrome/User Data/ShaderCache'],
      linux: ['~/.cache/google-chrome', '~/.config/google-chrome/Default/GPUCache']
    },
    appPaths: {
      darwin: '/Applications/Google Chrome.app',
      win32: '%ProgramFiles%/Google/Chrome',
      linux: '/usr/bin/google-chrome'
    },
    processNames: ['Google Chrome', 'chrome'],
    preservePaths: ['Bookmarks', 'Preferences', 'Login Data'],
    description: 'Google web browser',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  firefox: {
    name: 'Mozilla Firefox',
    category: 'Browsers',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Firefox', '~/Library/Caches/Mozilla/Firefox'],
      win32: ['%LocalAppData%/Mozilla/Firefox/Profiles/*/cache2'],
      linux: ['~/.cache/mozilla/firefox']
    },
    appPaths: {
      darwin: '/Applications/Firefox.app',
      win32: '%ProgramFiles%/Mozilla Firefox',
      linux: '/usr/bin/firefox'
    },
    processNames: ['firefox', 'Firefox'],
    preservePaths: ['places.sqlite', 'key*.db', 'logins.json'],
    description: 'Mozilla web browser',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  safari: {
    name: 'Safari',
    category: 'Browsers',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.apple.Safari', '~/Library/Safari/WebKit/*/Cache.db'],
      win32: null,
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Safari.app',
      win32: null,
      linux: null
    },
    processNames: ['Safari'],
    preservePaths: ['Bookmarks.plist', 'History.plist'],
    description: 'Apple web browser',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  edge: {
    name: 'Microsoft Edge',
    category: 'Browsers',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Microsoft Edge', '~/Library/Application Support/Microsoft Edge/Default/Cache'],
      win32: ['%LocalAppData%/Microsoft/Edge/User Data/Default/Cache'],
      linux: ['~/.cache/microsoft-edge']
    },
    appPaths: {
      darwin: '/Applications/Microsoft Edge.app',
      win32: '%ProgramFiles(x86)%/Microsoft/Edge',
      linux: '/usr/bin/microsoft-edge'
    },
    processNames: ['Microsoft Edge', 'msedge'],
    preservePaths: ['Bookmarks', 'Preferences'],
    description: 'Microsoft web browser',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  // Productivity
  notion: {
    name: 'Notion',
    category: 'Productivity',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Application Support/Notion/Cache', '~/Library/Caches/notion.id'],
      win32: ['%AppData%/Notion/Cache', '%AppData%/Notion/Code Cache'],
      linux: ['~/.config/Notion/Cache']
    },
    appPaths: {
      darwin: '/Applications/Notion.app',
      win32: '%LocalAppData%/Programs/Notion',
      linux: '/usr/bin/notion-app'
    },
    processNames: ['Notion', 'notion'],
    preservePaths: ['Local Storage'],
    description: 'All-in-one workspace',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  evernote: {
    name: 'Evernote',
    category: 'Productivity',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.evernote.Evernote'],
      win32: ['%LocalAppData%/Evernote/Evernote/Cache'],
      linux: ['~/.cache/Evernote']
    },
    appPaths: {
      darwin: '/Applications/Evernote.app',
      win32: '%ProgramFiles(x86)%/Evernote',
      linux: null
    },
    processNames: ['Evernote'],
    preservePaths: ['Databases'],
    description: 'Note-taking application',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  adobecc: {
    name: 'Adobe Creative Cloud',
    category: 'Productivity',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Adobe', '~/Library/Application Support/Adobe/Common/Media Cache Files'],
      win32: ['%LocalAppData%/Adobe/Common/Media Cache Files', '%AppData%/Adobe/Common/Media Cache'],
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Adobe Creative Cloud',
      win32: '%ProgramFiles%/Adobe',
      linux: null
    },
    processNames: ['Creative Cloud'],
    preservePaths: ['Adobe ID'],
    description: 'Adobe creative applications',
    averageCacheSize: 15 * 1024 * 1024 * 1024 // 15GB
  },

  msoffice: {
    name: 'Microsoft Office',
    category: 'Productivity',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.microsoft.Word', '~/Library/Caches/com.microsoft.Excel', '~/Library/Caches/com.microsoft.Powerpoint'],
      win32: ['%LocalAppData%/Microsoft/Office/*/Cache'],
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Microsoft Word.app',
      win32: '%ProgramFiles%/Microsoft Office',
      linux: null
    },
    processNames: ['Microsoft Word', 'Microsoft Excel', 'WINWORD.EXE', 'EXCEL.EXE'],
    preservePaths: ['Templates'],
    description: 'Microsoft Office suite',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  // System Tools & Package Managers
  homebrew: {
    name: 'Homebrew',
    category: 'System',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Homebrew', '/Library/Caches/Homebrew'],
      win32: null,
      linux: null
    },
    appPaths: {
      darwin: '/usr/local/bin/brew',
      win32: null,
      linux: null
    },
    processNames: ['brew'],
    preservePaths: [],
    description: 'macOS package manager',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  npm: {
    name: 'NPM Cache',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/.npm/_cacache'],
      win32: ['%AppData%/npm-cache'],
      linux: ['~/.npm/_cacache']
    },
    appPaths: {
      darwin: '/usr/local/bin/npm',
      win32: '%ProgramFiles%/nodejs/npm',
      linux: '/usr/bin/npm'
    },
    processNames: ['npm'],
    preservePaths: [],
    description: 'Node.js package manager cache',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  yarn: {
    name: 'Yarn Cache',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Yarn'],
      win32: ['%LocalAppData%/Yarn/Cache'],
      linux: ['~/.cache/yarn']
    },
    appPaths: {
      darwin: '/usr/local/bin/yarn',
      win32: '%ProgramFiles%/Yarn',
      linux: '/usr/bin/yarn'
    },
    processNames: ['yarn'],
    preservePaths: [],
    description: 'Alternative Node package manager',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  pip: {
    name: 'Python pip Cache',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/pip'],
      win32: ['%LocalAppData%/pip/Cache'],
      linux: ['~/.cache/pip']
    },
    appPaths: {
      darwin: '/usr/local/bin/pip',
      win32: '%ProgramFiles%/Python*/Scripts/pip',
      linux: '/usr/bin/pip'
    },
    processNames: ['pip'],
    preservePaths: [],
    description: 'Python package installer cache',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  gradle: {
    name: 'Gradle Cache',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/.gradle/caches'],
      win32: ['%UserProfile%/.gradle/caches'],
      linux: ['~/.gradle/caches']
    },
    appPaths: {
      darwin: '/usr/local/bin/gradle',
      win32: '%ProgramFiles%/Gradle',
      linux: '/usr/bin/gradle'
    },
    processNames: ['gradle'],
    preservePaths: ['gradle.properties'],
    description: 'Build automation tool cache',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  maven: {
    name: 'Maven Cache',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/.m2/repository'],
      win32: ['%UserProfile%/.m2/repository'],
      linux: ['~/.m2/repository']
    },
    appPaths: {
      darwin: '/usr/local/bin/mvn',
      win32: '%ProgramFiles%/Apache Maven',
      linux: '/usr/bin/mvn'
    },
    processNames: ['mvn'],
    preservePaths: ['settings.xml'],
    description: 'Java build tool cache',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  // Additional Popular Apps
  dropbox: {
    name: 'Dropbox',
    category: 'Cloud Storage',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.dropbox.DropboxMacUpdate', '~/Dropbox/.dropbox.cache'],
      win32: ['%LocalAppData%/Dropbox/logs'],
      linux: ['~/.dropbox/logs']
    },
    appPaths: {
      darwin: '/Applications/Dropbox.app',
      win32: '%ProgramFiles(x86)%/Dropbox',
      linux: '/usr/bin/dropbox'
    },
    processNames: ['Dropbox'],
    preservePaths: ['config.dbx'],
    description: 'Cloud storage service',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  googledrive: {
    name: 'Google Drive',
    category: 'Cloud Storage',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Application Support/Google/DriveFS/*/content_cache'],
      win32: ['%LocalAppData%/Google/DriveFS/*/content_cache'],
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Google Drive.app',
      win32: '%ProgramFiles%/Google/Drive File Stream',
      linux: null
    },
    processNames: ['Google Drive'],
    preservePaths: ['cloud_graph'],
    description: 'Google cloud storage',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  onedrive: {
    name: 'OneDrive',
    category: 'Cloud Storage',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.microsoft.OneDrive'],
      win32: ['%LocalAppData%/Microsoft/OneDrive/logs'],
      linux: null
    },
    appPaths: {
      darwin: '/Applications/OneDrive.app',
      win32: '%ProgramFiles%/Microsoft OneDrive',
      linux: null
    },
    processNames: ['OneDrive'],
    preservePaths: ['settings'],
    description: 'Microsoft cloud storage',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  postman: {
    name: 'Postman',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Application Support/Postman/Cache'],
      win32: ['%AppData%/Postman/Cache'],
      linux: ['~/.config/Postman/Cache']
    },
    appPaths: {
      darwin: '/Applications/Postman.app',
      win32: '%LocalAppData%/Postman',
      linux: '/usr/bin/postman'
    },
    processNames: ['Postman'],
    preservePaths: ['Local Storage'],
    description: 'API development tool',
    averageCacheSize: 500 * 1024 * 1024 // 500MB
  },

  figma: {
    name: 'Figma',
    category: 'Design',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Application Support/Figma/Cache'],
      win32: ['%AppData%/Figma/Cache'],
      linux: ['~/.config/Figma/Cache']
    },
    appPaths: {
      darwin: '/Applications/Figma.app',
      win32: '%LocalAppData%/Figma',
      linux: null
    },
    processNames: ['Figma'],
    preservePaths: ['Local Storage'],
    description: 'Collaborative design tool',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  gimp: {
    name: 'GIMP',
    category: 'Design',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Application Support/GIMP/*/cache'],
      win32: ['%AppData%/GIMP/*/cache'],
      linux: ['~/.cache/gimp']
    },
    appPaths: {
      darwin: '/Applications/GIMP.app',
      win32: '%ProgramFiles%/GIMP 2',
      linux: '/usr/bin/gimp'
    },
    processNames: ['gimp'],
    preservePaths: ['gimprc'],
    description: 'Image editing software',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  blender: {
    name: 'Blender',
    category: 'Design',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Blender'],
      win32: ['%AppData%/Blender Foundation/Blender/*/cache'],
      linux: ['~/.cache/blender']
    },
    appPaths: {
      darwin: '/Applications/Blender.app',
      win32: '%ProgramFiles%/Blender Foundation',
      linux: '/usr/bin/blender'
    },
    processNames: ['blender'],
    preservePaths: ['config'],
    description: '3D creation suite',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  unity: {
    name: 'Unity',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/com.unity3d.UnityEditor*'],
      win32: ['%LocalAppData%/Unity/cache'],
      linux: ['~/.cache/unity3d']
    },
    appPaths: {
      darwin: '/Applications/Unity',
      win32: '%ProgramFiles%/Unity',
      linux: '/usr/bin/unity-editor'
    },
    processNames: ['Unity'],
    preservePaths: ['preferences'],
    description: 'Game engine',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  },

  sublimetext: {
    name: 'Sublime Text',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Sublime Text'],
      win32: ['%AppData%/Sublime Text/Cache'],
      linux: ['~/.cache/sublime-text']
    },
    appPaths: {
      darwin: '/Applications/Sublime Text.app',
      win32: '%ProgramFiles%/Sublime Text',
      linux: '/usr/bin/subl'
    },
    processNames: ['sublime_text'],
    preservePaths: ['Packages/User'],
    description: 'Text editor',
    averageCacheSize: 500 * 1024 * 1024 // 500MB
  },

  atom: {
    name: 'Atom',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Atom'],
      win32: ['%AppData%/Atom/Cache'],
      linux: ['~/.cache/atom']
    },
    appPaths: {
      darwin: '/Applications/Atom.app',
      win32: '%LocalAppData%/atom',
      linux: '/usr/bin/atom'
    },
    processNames: ['Atom'],
    preservePaths: ['.atom'],
    description: 'Hackable text editor',
    averageCacheSize: 1 * 1024 * 1024 * 1024 // 1GB
  },

  eclipse: {
    name: 'Eclipse',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/Eclipse'],
      win32: ['%LocalAppData%/Eclipse/cache'],
      linux: ['~/.cache/eclipse']
    },
    appPaths: {
      darwin: '/Applications/Eclipse.app',
      win32: '%ProgramFiles%/Eclipse',
      linux: '/usr/bin/eclipse'
    },
    processNames: ['eclipse'],
    preservePaths: ['workspace/.metadata'],
    description: 'Java IDE',
    averageCacheSize: 3 * 1024 * 1024 * 1024 // 3GB
  },

  pycharm: {
    name: 'PyCharm',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/JetBrains/PyCharm*'],
      win32: ['%LocalAppData%/JetBrains/PyCharm*/system'],
      linux: ['~/.cache/JetBrains/PyCharm*']
    },
    appPaths: {
      darwin: '/Applications/PyCharm.app',
      win32: '%ProgramFiles%/JetBrains/PyCharm',
      linux: '/usr/bin/pycharm'
    },
    processNames: ['pycharm'],
    preservePaths: ['config'],
    description: 'Python IDE',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  webstorm: {
    name: 'WebStorm',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/JetBrains/WebStorm*'],
      win32: ['%LocalAppData%/JetBrains/WebStorm*/system'],
      linux: ['~/.cache/JetBrains/WebStorm*']
    },
    appPaths: {
      darwin: '/Applications/WebStorm.app',
      win32: '%ProgramFiles%/JetBrains/WebStorm',
      linux: '/usr/bin/webstorm'
    },
    processNames: ['webstorm'],
    preservePaths: ['config'],
    description: 'JavaScript IDE',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  rider: {
    name: 'Rider',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/JetBrains/Rider*'],
      win32: ['%LocalAppData%/JetBrains/Rider*/system'],
      linux: ['~/.cache/JetBrains/Rider*']
    },
    appPaths: {
      darwin: '/Applications/Rider.app',
      win32: '%ProgramFiles%/JetBrains/Rider',
      linux: '/usr/bin/rider'
    },
    processNames: ['rider'],
    preservePaths: ['config'],
    description: '.NET IDE',
    averageCacheSize: 2 * 1024 * 1024 * 1024 // 2GB
  },

  visualstudio: {
    name: 'Visual Studio',
    category: 'Development',
    icon: '',
    cachePaths: {
      darwin: ['~/Library/Caches/VisualStudio'],
      win32: ['%LocalAppData%/Microsoft/VisualStudio/*/ComponentModelCache'],
      linux: null
    },
    appPaths: {
      darwin: '/Applications/Visual Studio.app',
      win32: '%ProgramFiles%/Microsoft Visual Studio',
      linux: null
    },
    processNames: ['devenv'],
    preservePaths: ['settings'],
    description: 'Microsoft IDE',
    averageCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
  }
};

// Get applications for current platform
function getApplicationsForPlatform() {
  const platform = process.platform;
  const apps = [];

  for (const [id, app] of Object.entries(APPLICATIONS)) {
    const cachePaths = app.cachePaths[platform];
    const appPath = app.appPaths[platform];

    // Skip apps not available on this platform
    if (!cachePaths || !appPath) {
      continue;
    }

    apps.push({
      id,
      ...app,
      cachePaths: Array.isArray(cachePaths) ? cachePaths : [cachePaths],
      appPath
    });
  }

  return apps;
}

// Get specific application by ID
function getApplicationById(appId) {
  const app = APPLICATIONS[appId];
  if (!app) return null;

  const platform = process.platform;
  const cachePaths = app.cachePaths[platform];
  const appPath = app.appPaths[platform];

  if (!cachePaths || !appPath) {
    return null;
  }

  return {
    id: appId,
    ...app,
    cachePaths: Array.isArray(cachePaths) ? cachePaths : [cachePaths],
    appPath
  };
}

// Get categories
function getCategories() {
  const categories = new Set();
  Object.values(APPLICATIONS).forEach(app => {
    categories.add(app.category);
  });
  return Array.from(categories).sort();
}

module.exports = {
  APPLICATIONS,
  getApplicationsForPlatform,
  getApplicationById,
  getCategories,
  expandPath
};
