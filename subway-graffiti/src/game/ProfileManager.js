const PROFILES_KEY = 'subway_graffiti_profiles'
const PROFILE_DATA_PREFIX = 'subway_graffiti_save_'
const OLD_SAVE_KEY = 'subway_graffiti_save'
const DELETED_PROFILES_KEY = 'subway_graffiti_deleted_snapshots'

const DEFAULT_PROFILE_COLORS = [
  '#e94560', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#e74c3c'
]

const DEFAULT_PROFILE_NAMES = [
  '玩家1', '玩家2', '玩家3', '玩家4',
  '玩家5', '玩家6', '玩家7', '玩家8'
]

class ProfileManager {
  constructor() {
    this.profiles = []
    this.currentProfileId = null
    this.deletedSnapshots = []
    this._loadProfilesMetadata()
    this._loadDeletedSnapshots()
    this._migrateOldSaveIfNeeded()
  }

  _loadDeletedSnapshots() {
    try {
      const data = localStorage.getItem(DELETED_PROFILES_KEY)
      if (data) {
        this.deletedSnapshots = JSON.parse(data)
      }
    } catch (e) {
      console.warn('读取已删除档案快照失败:', e)
      this.deletedSnapshots = []
    }
  }

  _saveDeletedSnapshots() {
    try {
      localStorage.setItem(DELETED_PROFILES_KEY, JSON.stringify(this.deletedSnapshots))
    } catch (e) {
      console.warn('保存已删除档案快照失败:', e)
    }
  }

  _loadProfilesMetadata() {
    try {
      const data = localStorage.getItem(PROFILES_KEY)
      if (data) {
        const saved = JSON.parse(data)
        this.profiles = saved.profiles || []
        this.currentProfileId = saved.currentProfileId || null
      }
    } catch (e) {
      console.warn('读取档案列表失败:', e)
      this.profiles = []
      this.currentProfileId = null
    }
  }

  _saveProfilesMetadata() {
    try {
      const data = {
        profiles: this.profiles,
        currentProfileId: this.currentProfileId
      }
      localStorage.setItem(PROFILES_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('保存档案列表失败:', e)
    }
  }

  _migrateOldSaveIfNeeded() {
    try {
      const oldSave = localStorage.getItem(OLD_SAVE_KEY)
      if (oldSave && this.profiles.length === 0) {
        const profileId = this._generateId()
        const profile = {
          id: profileId,
          name: '默认玩家',
          color: DEFAULT_PROFILE_COLORS[0],
          createdAt: Date.now(),
          lastPlayedAt: Date.now(),
          isMigrated: true
        }
        this.profiles.push(profile)
        this.currentProfileId = profileId
        localStorage.setItem(this._getProfileDataKey(profileId), oldSave)
        this._saveProfilesMetadata()
        console.log('旧存档已迁移到新档案系统')
      } else if (this.profiles.length === 0) {
        this.createProfile('默认玩家')
      }
    } catch (e) {
      console.warn('迁移旧存档失败:', e)
    }
  }

  _generateId() {
    return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  _getProfileDataKey(profileId) {
    return `${PROFILE_DATA_PREFIX}${profileId}`
  }

  _getNextAvailableColor() {
    const usedColors = this.profiles.map(p => p.color)
    for (const color of DEFAULT_PROFILE_COLORS) {
      if (!usedColors.includes(color)) {
        return color
      }
    }
    return DEFAULT_PROFILE_COLORS[this.profiles.length % DEFAULT_PROFILE_COLORS.length]
  }

  _getNextAvailableName() {
    const usedNames = this.profiles.map(p => p.name)
    for (const name of DEFAULT_PROFILE_NAMES) {
      if (!usedNames.includes(name)) {
        return name
      }
    }
    return `玩家${this.profiles.length + 1}`
  }

  createProfile(name, color) {
    const profileId = this._generateId()
    const profile = {
      id: profileId,
      name: name || this._getNextAvailableName(),
      color: color || this._getNextAvailableColor(),
      createdAt: Date.now(),
      lastPlayedAt: Date.now()
    }
    this.profiles.push(profile)
    this._saveProfilesMetadata()
    return profile
  }

  deleteProfile(profileId) {
    const index = this.profiles.findIndex(p => p.id === profileId)
    if (index === -1) return false
    if (this.profiles.length <= 1) return false

    const profile = this.profiles[index]
    const profileData = this.loadProfileData(profileId)
    const snapshot = {
      uid: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      profile: { ...profile },
      data: profileData || {},
      deletedAt: Date.now(),
      stats: this.getProfileStats(profileId)
    }
    this.deletedSnapshots.unshift(snapshot)
    if (this.deletedSnapshots.length > 20) {
      this.deletedSnapshots = this.deletedSnapshots.slice(0, 20)
    }
    this._saveDeletedSnapshots()

    try {
      localStorage.removeItem(this._getProfileDataKey(profileId))
    } catch (e) {
      console.warn('删除档案数据失败:', e)
    }

    this.profiles.splice(index, 1)

    if (this.currentProfileId === profileId) {
      this.currentProfileId = this.profiles[0]?.id || null
    }

    this._saveProfilesMetadata()
    return snapshot
  }

  getDeletedSnapshots() {
    return [...this.deletedSnapshots]
  }

  restoreDeletedSnapshot(snapshotUid) {
    const idx = this.deletedSnapshots.findIndex(s => s.uid === snapshotUid)
    if (idx === -1) return null
    const snapshot = this.deletedSnapshots[idx]
    const newId = this._generateId()
    const restoredProfile = {
      ...snapshot.profile,
      id: newId,
      createdAt: snapshot.profile.createdAt,
      lastPlayedAt: Date.now(),
      restoredAt: Date.now()
    }
    this.profiles.push(restoredProfile)
    this._saveProfilesMetadata()
    if (snapshot.data) {
      this.saveProfileData(newId, snapshot.data)
    }
    this.deletedSnapshots.splice(idx, 1)
    this._saveDeletedSnapshots()
    return { profile: restoredProfile, snapshot }
  }

  switchProfile(profileId) {
    const profile = this.profiles.find(p => p.id === profileId)
    if (!profile) return false

    this.currentProfileId = profileId
    profile.lastPlayedAt = Date.now()
    this._saveProfilesMetadata()
    return true
  }

  updateProfile(profileId, updates) {
    const profile = this.profiles.find(p => p.id === profileId)
    if (!profile) return false

    if (updates.name) profile.name = updates.name
    if (updates.color) profile.color = updates.color
    profile.lastPlayedAt = Date.now()

    this._saveProfilesMetadata()
    return true
  }

  getCurrentProfile() {
    return this.profiles.find(p => p.id === this.currentProfileId) || this.profiles[0] || null
  }

  getProfile(profileId) {
    return this.profiles.find(p => p.id === profileId) || null
  }

  getAllProfiles() {
    return [...this.profiles]
  }

  getProfileCount() {
    return this.profiles.length
  }

  loadProfileData(profileId) {
    try {
      const data = localStorage.getItem(this._getProfileDataKey(profileId))
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.warn('读取档案数据失败:', e)
      return null
    }
  }

  saveProfileData(profileId, data) {
    try {
      localStorage.setItem(this._getProfileDataKey(profileId), JSON.stringify(data))
      const profile = this.profiles.find(p => p.id === profileId)
      if (profile) {
        profile.lastPlayedAt = Date.now()
        this._saveProfilesMetadata()
      }
      return true
    } catch (e) {
      console.warn('保存档案数据失败:', e)
      return false
    }
  }

  getProfileStats(profileId) {
    const data = this.loadProfileData(profileId)
    if (!data) {
      return {
        highScore: 0,
        totalScore: 0,
        maxCombo: 0,
        gamesPlayed: 0,
        unlockedSkinsCount: 1,
        unlockedStationsCount: 2
      }
    }
    return {
      highScore: data.highScore || 0,
      totalScore: data.totalScore || 0,
      maxCombo: data.maxCombo || 0,
      gamesPlayed: data.gamesPlayed || 0,
      unlockedSkinsCount: (data.unlockedSkins || ['default']).length,
      unlockedStationsCount: (data.unlockedStations || ['s1-1', 's2-1']).length
    }
  }
}

export const profileManager = new ProfileManager()
