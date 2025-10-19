const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Pre-defined cleaning profiles
 */
const DEFAULT_PROFILES = {
  'privacy-mode': {
    id: 'privacy-mode',
    name: 'Privacy Mode',
    description: 'Remove browsing history and tracking data for enhanced privacy',
    icon: '',
    cleaningTasks: {
      browserHistory: {
        enabled: true,
        browsers: ['all']
      },
      browserCookies: {
        enabled: true,
        browsers: ['all'],
        excludeWhitelist: true
      },
      browserCache: {
        enabled: true,
        browsers: ['all']
      },
      formData: {
        enabled: true
      },
      downloadHistory: {
        enabled: true
      },
      trackingCookies: {
        enabled: true
      },
      tempFiles: {
        enabled: false
      },
      largeFiles: {
        enabled: false
      },
      duplicates: {
        enabled: false
      },
      appCaches: {
        enabled: false
      }
    },
    options: {
      askBeforeDelete: false,
      autoQuitApps: true,
      preserveLogs: false,
      showNotifications: true,
      runOnBattery: false,
      runOnMetered: false
    },
    estimatedTime: 120, // seconds
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  'deep-clean': {
    id: 'deep-clean',
    name: 'Deep Clean',
    description: 'Comprehensive system cleaning including browser data, temp files, and old downloads',
    icon: '',
    cleaningTasks: {
      browserHistory: {
        enabled: true,
        browsers: ['all']
      },
      browserCookies: {
        enabled: true,
        browsers: ['all'],
        excludeWhitelist: false
      },
      browserCache: {
        enabled: true,
        browsers: ['all']
      },
      formData: {
        enabled: true
      },
      downloadHistory: {
        enabled: true
      },
      trackingCookies: {
        enabled: true
      },
      tempFiles: {
        enabled: true
      },
      largeFiles: {
        enabled: true,
        minSize: 1024 * 1024 * 1024, // 1GB
        minAge: 180 // 180 days
      },
      duplicates: {
        enabled: true,
        autoDelete: false
      },
      appCaches: {
        enabled: true,
        apps: ['all']
      },
      oldDownloads: {
        enabled: true,
        minAge: 90 // 90 days
      }
    },
    options: {
      askBeforeDelete: true,
      autoQuitApps: true,
      preserveLogs: false,
      showNotifications: true,
      runOnBattery: false,
      runOnMetered: false
    },
    estimatedTime: 1800, // 30 minutes
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  'quick-maintenance': {
    id: 'quick-maintenance',
    name: 'Quick Maintenance',
    description: 'Fast cleanup of temp files, trash, and recent items',
    icon: '',
    cleaningTasks: {
      browserHistory: {
        enabled: false
      },
      browserCookies: {
        enabled: false
      },
      browserCache: {
        enabled: true,
        browsers: ['all']
      },
      formData: {
        enabled: false
      },
      downloadHistory: {
        enabled: false
      },
      trackingCookies: {
        enabled: false
      },
      tempFiles: {
        enabled: true
      },
      trash: {
        enabled: true
      },
      recentItems: {
        enabled: true
      },
      logFiles: {
        enabled: true,
        minAge: 7 // 7 days
      },
      largeFiles: {
        enabled: false
      },
      duplicates: {
        enabled: false
      },
      appCaches: {
        enabled: false
      }
    },
    options: {
      askBeforeDelete: false,
      autoQuitApps: false,
      preserveLogs: true,
      showNotifications: true,
      runOnBattery: true,
      runOnMetered: true
    },
    estimatedTime: 60, // 1 minute
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  'developer-mode': {
    id: 'developer-mode',
    name: 'Developer Mode',
    description: 'Clean development caches, build artifacts, and package manager files',
    icon: '',
    cleaningTasks: {
      browserHistory: {
        enabled: false
      },
      browserCookies: {
        enabled: false
      },
      browserCache: {
        enabled: false
      },
      formData: {
        enabled: false
      },
      downloadHistory: {
        enabled: false
      },
      trackingCookies: {
        enabled: false
      },
      tempFiles: {
        enabled: false
      },
      npmCache: {
        enabled: true
      },
      yarnCache: {
        enabled: true
      },
      pipCache: {
        enabled: true
      },
      dockerImages: {
        enabled: true,
        danglingOnly: true
      },
      buildArtifacts: {
        enabled: true,
        paths: ['node_modules/.cache', 'dist', 'build', 'out']
      },
      xcodeCache: {
        enabled: true
      },
      androidStudioCache: {
        enabled: true
      },
      gradleCache: {
        enabled: true
      }
    },
    options: {
      askBeforeDelete: true,
      autoQuitApps: false,
      preserveLogs: true,
      showNotifications: true,
      runOnBattery: false,
      runOnMetered: false
    },
    estimatedTime: 900, // 15 minutes
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

/**
 * Profile Manager Class
 */
class ProfileManager {
  constructor() {
    this.profilesPath = path.join(app.getPath('userData'), 'cleaning-profiles.json');
    this.profiles = this.loadProfiles();
  }

  /**
   * Load profiles from disk
   */
  loadProfiles() {
    try {
      if (fs.existsSync(this.profilesPath)) {
        const data = fs.readFileSync(this.profilesPath, 'utf8');
        const customProfiles = JSON.parse(data);

        // Merge default profiles with custom ones
        return {
          ...DEFAULT_PROFILES,
          ...customProfiles
        };
      }

      // Return only default profiles if no custom file exists
      return { ...DEFAULT_PROFILES };
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error loading profiles:', error);
      return { ...DEFAULT_PROFILES };
    }
  }

  /**
   * Save custom profiles to disk
   */
  saveProfiles() {
    try {
      // Only save custom (non-built-in) profiles
      const customProfiles = {};
      Object.keys(this.profiles).forEach(key => {
        if (!this.profiles[key].isBuiltIn) {
          customProfiles[key] = this.profiles[key];
        }
      });

      fs.writeFileSync(
        this.profilesPath,
        JSON.stringify(customProfiles, null, 2),
        'utf8'
      );

      console.log('[PROFILE_MANAGER] Profiles saved successfully');
      return { success: true };
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error saving profiles:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all profiles
   */
  getAllProfiles() {
    return Object.values(this.profiles);
  }

  /**
   * Get profile by ID
   */
  getProfile(id) {
    return this.profiles[id] || null;
  }

  /**
   * Create new profile
   */
  createProfile(profile) {
    try {
      // Generate ID if not provided
      const id = profile.id || `custom-${Date.now()}`;

      // Validate profile
      if (!profile.name || !profile.cleaningTasks) {
        return {
          success: false,
          error: 'Profile must have name and cleaningTasks'
        };
      }

      // Check if profile already exists
      if (this.profiles[id]) {
        return {
          success: false,
          error: 'Profile with this ID already exists'
        };
      }

      // Create profile with defaults
      const newProfile = {
        id,
        name: profile.name,
        description: profile.description || '',
        icon: profile.icon || '',
        cleaningTasks: profile.cleaningTasks,
        options: profile.options || {
          askBeforeDelete: true,
          autoQuitApps: true,
          preserveLogs: false,
          showNotifications: true,
          runOnBattery: false,
          runOnMetered: false
        },
        estimatedTime: profile.estimatedTime || 300,
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.profiles[id] = newProfile;
      this.saveProfiles();

      return {
        success: true,
        profile: newProfile
      };
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error creating profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update profile
   */
  updateProfile(id, updates) {
    try {
      const profile = this.profiles[id];

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      if (profile.isBuiltIn) {
        return {
          success: false,
          error: 'Cannot modify built-in profiles'
        };
      }

      // Update profile
      this.profiles[id] = {
        ...profile,
        ...updates,
        id, // Preserve ID
        isBuiltIn: false, // Cannot change this
        createdAt: profile.createdAt, // Preserve creation time
        updatedAt: Date.now()
      };

      this.saveProfiles();

      return {
        success: true,
        profile: this.profiles[id]
      };
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error updating profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete profile
   */
  deleteProfile(id) {
    try {
      const profile = this.profiles[id];

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      if (profile.isBuiltIn) {
        return {
          success: false,
          error: 'Cannot delete built-in profiles'
        };
      }

      delete this.profiles[id];
      this.saveProfiles();

      return { success: true };
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error deleting profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export profile to JSON
   */
  exportProfile(id) {
    try {
      const profile = this.profiles[id];

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      // Remove metadata for cleaner export
      const exportData = {
        name: profile.name,
        description: profile.description,
        icon: profile.icon,
        cleaningTasks: profile.cleaningTasks,
        options: profile.options,
        estimatedTime: profile.estimatedTime
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error exporting profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import profile from JSON
   */
  importProfile(jsonData) {
    try {
      const profileData = JSON.parse(jsonData);

      // Validate required fields
      if (!profileData.name || !profileData.cleaningTasks) {
        return {
          success: false,
          error: 'Invalid profile data: missing required fields'
        };
      }

      // Create profile with imported data
      return this.createProfile(profileData);
    } catch (error) {
      console.error('[PROFILE_MANAGER] Error importing profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ProfileManager;
