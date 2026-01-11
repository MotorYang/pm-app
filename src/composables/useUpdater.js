import {ref} from 'vue'
import {getVersion} from '@tauri-apps/api/app'
import {check} from '@tauri-apps/plugin-updater'
import {relaunch} from '@tauri-apps/plugin-process'
import {openUrl} from '@tauri-apps/plugin-opener'

const UPDATE_URL = 'https://motoryang.github.io/pm-app/update.json'
const SKIP_VERSION_KEY = 'pm-app-skip-version'
const UPDATE_LATER_KEY = 'pm-app-update-later'

// 全局状态
const showUpdateModal = ref(false)
const currentVersion = ref('')
const newVersion = ref('')
const releaseNotes = ref('')
const downloading = ref(false)
const downloadProgress = ref(0)
const downloaded = ref(false)
const updateAvailable = ref(false)

// 存储 Update 对象以便后续下载
let pendingUpdate = null

/**
 * 检查是否跳过某个版本
 */
const isVersionSkipped = (version) => {
  const skipped = localStorage.getItem(SKIP_VERSION_KEY)
  return skipped === version
}

/**
 * 跳过某个版本
 */
const skipVersion = (version) => {
  localStorage.setItem(SKIP_VERSION_KEY, version)
}

/**
 * 标记下次启动时更新
 */
const setUpdateLater = (version) => {
  localStorage.setItem(UPDATE_LATER_KEY, version)
}

/**
 * 获取待更新版本
 */
const getUpdateLater = () => {
  return localStorage.getItem(UPDATE_LATER_KEY)
}

/**
 * 清除待更新标记
 */
const clearUpdateLater = () => {
  localStorage.removeItem(UPDATE_LATER_KEY)
}

/**
 * 通过 fetch 检查远程版本信息
 */
const fetchVersionInfo = async () => {
  try {
    const response = await fetch(UPDATE_URL)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (err) {
    console.error('获取版本信息失败:', err)
    return null
  }
}

/**
 * 比较版本号
 */
const compareVersions = (v1, v2) => {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number)
  const parts2 = v2.replace(/^v/, '').split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * 检查更新
 * @param {boolean} silent - 是否静默检查（不显示弹窗，后台下载）
 * @param {boolean} force - 是否强制检查（忽略跳过的版本）
 */
const checkForUpdate = async (silent = false, force = false) => {
  try {
    // 获取当前版本
    currentVersion.value = await getVersion()

    // 获取远程版本信息
    const remoteInfo = await fetchVersionInfo()
    if (!remoteInfo || !remoteInfo.version) {
      return false
    }

    const remoteVersion = remoteInfo.version

    // 检查是否有新版本
    if (compareVersions(remoteVersion, currentVersion.value) <= 0) {
      return false
    }

    // 检查是否跳过此版本
    if (!force && isVersionSkipped(remoteVersion)) {
      return false
    }

    // 有新版本
    newVersion.value = remoteVersion
    releaseNotes.value = remoteInfo.notes || ''
    updateAvailable.value = true

    // 尝试获取 Tauri updater 的 Update 对象
    try {
      pendingUpdate = await check()
    } catch (err) {
      console.warn('Tauri updater 检查失败，将使用浏览器下载:', err)
      pendingUpdate = null
    }

    if (silent) {
      // 静默模式：直接后台下载
      await downloadUpdate()
    } else {
      // 显示更新弹窗
      showUpdateModal.value = true
    }

    return true
  } catch (err) {
    console.error('检查更新失败:', err)
    return false
  }
}

/**
 * 下载更新
 */
const downloadUpdate = async () => {
  if (!pendingUpdate) {
    // 没有 Tauri Update 对象，打开浏览器下载
    openUrl('https://github.com/motoryang/pm-app/releases/latest')
    return
  }

  try {
    downloading.value = true
    downloadProgress.value = 0

    let totalSize = 0
    let downloadedSize = 0

    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        totalSize = event.data.contentLength || 0
        console.log('开始下载更新，总大小:', totalSize)
      } else if (event.event === 'Progress') {
        downloadedSize += event.data.chunkLength || 0
        if (totalSize > 0) {
          downloadProgress.value = downloadedSize / totalSize
        }
      } else if (event.event === 'Finished') {
        console.log('下载完成')
        downloadProgress.value = 1
        downloaded.value = true
        downloading.value = false
        clearUpdateLater()
      }
    })
  } catch (err) {
    console.error('下载更新失败:', err)
    downloading.value = false
    // 失败时打开浏览器下载
    openUrl('https://github.com/motoryang/pm-app/releases/latest')
  }
}

/**
 * 立即更新
 */
const updateNow = async () => {
  if (downloaded.value) {
    // 已下载完成，重启应用
    await relaunch()
  } else {
    // 开始下载
    await downloadUpdate()
  }
}

/**
 * 下次启动时更新
 */
const updateLater = () => {
  setUpdateLater(newVersion.value)
  showUpdateModal.value = false
}

/**
 * 跳过此版本
 */
const handleSkipVersion = () => {
  skipVersion(newVersion.value)
  showUpdateModal.value = false
}

/**
 * 初始化更新检查
 */
const initUpdater = async () => {
  // 延迟几秒后检查，避免影响启动体验
  setTimeout(async () => {
    // 检查是否有待更新（上次选择了"下次启动时更新"）
    const laterVersion = getUpdateLater()
    if (laterVersion) {
      // 静默下载更新
      await checkForUpdate(true, true)
    } else {
      // 正常检查更新
      await checkForUpdate(false, false)
    }
  }, 3000)
}

export function useUpdater() {
  return {
    // 状态
    showUpdateModal,
    currentVersion,
    newVersion,
    releaseNotes,
    downloading,
    downloadProgress,
    downloaded,
    updateAvailable,

    // 方法
    checkForUpdate,
    updateNow,
    updateLater,
    handleSkipVersion,
    initUpdater
  }
}
