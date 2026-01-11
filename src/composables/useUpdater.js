import {ref} from 'vue'
import {getVersion} from '@tauri-apps/api/app'
import {check} from '@tauri-apps/plugin-updater'
import {relaunch} from '@tauri-apps/plugin-process'

const UPDATE_URL = 'https://motoryang.github.io/pm-app/update.json'
const SKIP_VERSION_KEY = 'pm-app-skip-version'

// 全局状态
const showUpdateModal = ref(false)
const currentVersion = ref('')
const newVersion = ref('')
const releaseNotes = ref('')
const downloading = ref(false)
const downloadProgress = ref(0)
const downloaded = ref(false)
const updateAvailable = ref(false)
const updateError = ref('')

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
 * @param {boolean} force - 是否强制检查（忽略跳过的版本）
 */
const checkForUpdate = async (force = false) => {
  try {
    // 重置状态
    updateError.value = ''
    downloading.value = false
    downloaded.value = false
    downloadProgress.value = 0

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
      console.log('Tauri updater 检查成功:', pendingUpdate)
    } catch (err) {
      console.error('Tauri updater 检查失败:', err)
      // 保存错误信息以便显示
      updateError.value = '更新检查失败: ' + (err.message || String(err))
      pendingUpdate = null
    }

    // 显示更新弹窗
    showUpdateModal.value = true

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
    // 开发模式下无法使用自动更新，提示用户
    updateError.value = '开发模式下无法自动更新，请手动下载安装包'
    return false
  }

  try {
    downloading.value = true
    downloadProgress.value = 0
    updateError.value = ''

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
      }
    })

    return true
  } catch (err) {
    console.error('下载更新失败:', err)
    downloading.value = false
    updateError.value = '下载失败: ' + (err.message || '未知错误')
    return false
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
 * 稍后提醒（只关闭弹窗，下次启动时会再次提示）
 */
const updateLater = () => {
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
    await checkForUpdate(false)
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
    updateError,

    // 方法
    checkForUpdate,
    updateNow,
    updateLater,
    handleSkipVersion,
    initUpdater
  }
}
