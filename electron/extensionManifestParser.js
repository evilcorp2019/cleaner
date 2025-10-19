/**
 * Extension Manifest Parser
 * Parses browser extension manifest.json files to extract metadata
 * Supports Chrome Manifest v2/v3 and Firefox WebExtension formats
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Parse a manifest.json file and extract metadata
 * @param {string} manifestPath - Path to manifest.json
 * @returns {Object|null} Parsed manifest data or null if invalid
 */
async function parseManifest(manifestPath) {
  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    // Extract common fields across all manifest versions
    return {
      name: cleanExtensionName(manifest.name || 'Unknown Extension'),
      version: manifest.version || 'Unknown',
      description: manifest.description || '',
      author: extractAuthor(manifest),
      manifestVersion: manifest.manifest_version || 2,
      permissions: manifest.permissions || [],
      homepage: manifest.homepage_url || manifest.homepage || '',
      icons: manifest.icons || {}
    };
  } catch (error) {
    console.error(`Error parsing manifest at ${manifestPath}:`, error.message);
    return null;
  }
}

/**
 * Clean extension name by removing common prefixes/suffixes and i18n markers
 * @param {string} name - Raw extension name
 * @returns {string} Cleaned name
 */
function cleanExtensionName(name) {
  // Remove i18n markers like __MSG_extensionName__
  if (name.startsWith('__MSG_') && name.endsWith('__')) {
    return 'Unknown Extension';
  }

  // Remove common test prefixes
  name = name.replace(/^(test|dev|staging)[-_]/i, '');

  return name.trim();
}

/**
 * Extract author information from manifest
 * @param {Object} manifest - Parsed manifest object
 * @returns {string} Author name or empty string
 */
function extractAuthor(manifest) {
  // Check various author fields
  if (manifest.author) {
    if (typeof manifest.author === 'string') {
      return manifest.author;
    }
    if (manifest.author.name) {
      return manifest.author.name;
    }
  }

  // Check developer field (Firefox)
  if (manifest.developer) {
    if (typeof manifest.developer === 'string') {
      return manifest.developer;
    }
    if (manifest.developer.name) {
      return manifest.developer.name;
    }
  }

  return '';
}

/**
 * Extract extension ID from folder name or path
 * @param {string} folderPath - Path to extension folder
 * @param {string} browserType - Type of browser ('chromium', 'firefox', 'safari')
 * @returns {string|null} Extension ID or null if not found
 */
function extractExtensionId(folderPath, browserType) {
  const folderName = path.basename(folderPath);

  if (browserType === 'chromium') {
    // Chromium extension IDs are 32-character lowercase letters (a-p)
    // Example: nmmhkkegccagdldgiimedpiccmgmieda
    if (/^[a-p]{32}$/i.test(folderName)) {
      return folderName.toLowerCase();
    }

    // IndexedDB folders use format: chrome-extension_<id>_0
    const match = folderName.match(/^chrome-extension_([a-p]{32})_/i);
    if (match) {
      return match[1].toLowerCase();
    }
  } else if (browserType === 'firefox') {
    // Firefox extension IDs can be:
    // 1. Email format: addon@developer.com
    // 2. UUID format: {12345678-1234-1234-1234-123456789012}
    // 3. moz-extension+++ format in storage folders

    if (folderName.includes('@') || folderName.match(/^\{[0-9a-f-]+\}$/i)) {
      return folderName;
    }

    // Extract from moz-extension+++ format
    const match = folderName.match(/^moz-extension\+\+\+(.+)$/);
    if (match) {
      return match[1];
    }

    // Firefox also uses file names like {id}.xpi
    const xpiMatch = folderName.match(/^(.+)\.xpi$/);
    if (xpiMatch) {
      return xpiMatch[1];
    }
  } else if (browserType === 'safari') {
    // Safari extension IDs are bundle identifiers
    // Example: com.example.safari-extension
    if (folderName.match(/^[a-z0-9.-]+$/i)) {
      return folderName;
    }

    // Extract from safari-extension_<id> format
    const match = folderName.match(/^safari-extension_(.+)$/);
    if (match) {
      return match[1];
    }
  }

  // If no specific pattern matched, use the folder name as ID
  return folderName;
}

/**
 * Validate if a string is a valid extension ID for a given browser type
 * @param {string} id - Extension ID to validate
 * @param {string} browserType - Type of browser
 * @returns {boolean} True if valid
 */
function isValidExtensionId(id, browserType) {
  if (!id) return false;

  if (browserType === 'chromium') {
    return /^[a-p]{32}$/i.test(id);
  } else if (browserType === 'firefox') {
    return id.includes('@') || /^\{[0-9a-f-]+\}$/i.test(id);
  } else if (browserType === 'safari') {
    return /^[a-z0-9.-]+$/i.test(id);
  }

  return true; // Allow unknown browser types
}

/**
 * Extract extension name from folder metadata if manifest is not available
 * @param {string} folderPath - Path to extension folder
 * @returns {Promise<string>} Extension name or 'Unknown Extension'
 */
async function extractNameFromFolder(folderPath) {
  try {
    // Try to find any .json file that might contain the name
    const files = await fs.readdir(folderPath);

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'manifest.json') {
        try {
          const content = await fs.readFile(path.join(folderPath, file), 'utf8');
          const data = JSON.parse(content);

          if (data.name && typeof data.name === 'string') {
            return cleanExtensionName(data.name);
          }
        } catch {
          // Continue to next file
        }
      }
    }
  } catch {
    // Folder might not be accessible
  }

  return 'Unknown Extension';
}

/**
 * Get icon path from manifest
 * @param {Object} manifest - Parsed manifest object
 * @param {string} extensionPath - Path to extension folder
 * @returns {string|null} Path to icon or null
 */
async function getExtensionIcon(manifest, extensionPath) {
  if (!manifest || !manifest.icons) return null;

  // Try to get the largest icon
  const iconSizes = Object.keys(manifest.icons).map(Number).sort((a, b) => b - a);

  for (const size of iconSizes) {
    const iconPath = path.join(extensionPath, manifest.icons[size]);
    try {
      await fs.access(iconPath);
      return iconPath;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Check if manifest indicates a development/unpacked extension
 * @param {Object} manifest - Parsed manifest object
 * @returns {boolean} True if likely a development extension
 */
function isDevExtension(manifest) {
  if (!manifest) return false;

  const name = (manifest.name || '').toLowerCase();
  const description = (manifest.description || '').toLowerCase();

  // Check for common development indicators
  const devIndicators = ['test', 'dev', 'local', 'development', 'staging', 'debug'];

  return devIndicators.some(indicator =>
    name.includes(indicator) || description.includes(indicator)
  );
}

/**
 * Parse permissions to categorize extension capabilities
 * @param {Array} permissions - Array of permission strings
 * @returns {Object} Categorized permissions
 */
function categorizePermissions(permissions = []) {
  const categories = {
    storage: false,
    network: false,
    tabs: false,
    cookies: false,
    history: false,
    bookmarks: false,
    webRequest: false,
    privacy: false
  };

  for (const permission of permissions) {
    const perm = permission.toLowerCase();

    if (perm.includes('storage')) categories.storage = true;
    if (perm.includes('http') || perm.includes('webRequest')) categories.network = true;
    if (perm.includes('tabs') || perm.includes('activeTab')) categories.tabs = true;
    if (perm.includes('cookies')) categories.cookies = true;
    if (perm.includes('history')) categories.history = true;
    if (perm.includes('bookmarks')) categories.bookmarks = true;
    if (perm.includes('webRequest')) categories.webRequest = true;
    if (perm.includes('privacy')) categories.privacy = true;
  }

  return categories;
}

module.exports = {
  parseManifest,
  extractExtensionId,
  isValidExtensionId,
  extractNameFromFolder,
  getExtensionIcon,
  isDevExtension,
  categorizePermissions,
  cleanExtensionName
};
