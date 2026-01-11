<script setup>
import {ref, onMounted, computed} from 'vue'
import {useSettingsStore, THEME_COLORS} from '@/stores/settings'
import {open} from '@tauri-apps/plugin-dialog'
import {openUrl} from '@tauri-apps/plugin-opener'
import {platform, version as osVersion, arch} from '@tauri-apps/plugin-os'
import {getVersion} from '@tauri-apps/api/app'
// updater 插件在开发模式下有限制，使用 fetch 直接检查更新
import {
  FolderOpen,
  Check,
  CloseOne,
  Attention,
  Github,
  Refresh,
  LoadingOne
} from '@icon-park/vue-next'

import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'

/* ---------------- props / emit ---------------- */
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'update:show'])

/* ---------------- store ---------------- */
const settingsStore = useSettingsStore()

/* ---------------- state ---------------- */
const activeTab = ref('general')
const saving = ref(false)
const errorMessage = ref('')

// 本地临时状态
const localSettings = ref({
  editorPath: '',
  closeButtonBehavior: 'hide',
  exportProjectBehavior: 'ignore-plugin-directory',
  themeColor: 'pink'
})

// Tab 配置
const tabs = [
  {id: 'general', label: '常规设置'},
  {id: 'export', label: '导出选项'},
  {id: 'about', label: '关于'},
]

// 关于页面状态
const systemInfo = ref({
  platform: '',
  osVersion: '',
  arch: ''
})
const appVersion = ref('')
const updateStatus = ref('idle') // idle, checking, available, upToDate, error
const updateInfo = ref(null)
const updateError = ref('')

/* ---------------- lifecycle ---------------- */
onMounted(async () => {
  await settingsStore.loadSettings()
  localSettings.value.editorPath = settingsStore.editorPath
  localSettings.value.closeButtonBehavior = settingsStore.closeButtonBehavior
  localSettings.value.exportProjectBehavior = settingsStore.exportProjectBehavior
  localSettings.value.themeColor = settingsStore.themeColor

  // 获取系统信息
  try {
    systemInfo.value.platform = platform()
    systemInfo.value.osVersion = osVersion()
    systemInfo.value.arch = arch()
  } catch (err) {
    console.error('获取系统信息失败:', err)
  }

  // 获取应用版本
  try {
    appVersion.value = await getVersion()
  } catch (err) {
    console.error('获取版本失败:', err)
  }
})

/* ---------------- actions ---------------- */
const handleBrowseEditor = async () => {
  try {
    const selected = await open({
      title: '选择编辑器可执行文件',
      multiple: false,
      filters: [{name: '可执行文件', extensions: ['exe', 'app', 'sh']}]
    })
    if (selected) localSettings.value.editorPath = selected
  } catch (err) {
    errorMessage.value = '文件选择失败'
  }
}

const handleSave = async () => {
  try {
    saving.value = true
    errorMessage.value = ''

    await Promise.all([
      settingsStore.saveEditorPath(localSettings.value.editorPath),
      settingsStore.saveCloseButtonBehavior(localSettings.value.closeButtonBehavior),
      settingsStore.saveExportProjectBehavior(localSettings.value.exportProjectBehavior),
      settingsStore.saveThemeColor(localSettings.value.themeColor)
    ])

    // 模拟保存成功的微小延迟，增加“确切感”
    setTimeout(() => {
      handleClose()
    }, 300)
  } catch (err) {
    errorMessage.value = '保存失败: ' + err.message
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

// 更新服务器地址
const UPDATE_URL = 'https://motoryang.github.io/pm-app/update.json'

// 检查更新
const handleCheckUpdate = async () => {
  try {
    updateStatus.value = 'checking'
    updateError.value = ''
    updateInfo.value = null

    // 先通过 fetch 检查远程版本
    const response = await fetch(UPDATE_URL)
    if (!response.ok) {
      if (response.status === 404) {
        updateStatus.value = 'upToDate'
        return
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const remoteInfo = await response.json()
    const remoteVersion = remoteInfo.version

    // 比较版本（只有远程版本更高时才提示更新）
    if (remoteVersion && compareVersions(remoteVersion, appVersion.value) > 0) {
      updateStatus.value = 'available'
      updateInfo.value = {
        version: remoteVersion,
        notes: remoteInfo.notes || '',
        url: remoteInfo.platforms?.[getPlatformKey()]?.url
      }
    } else {
      updateStatus.value = 'upToDate'
    }
  } catch (err) {
    console.error('检查更新失败:', err)
    updateStatus.value = 'error'
    if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
      updateError.value = '网络连接失败，请检查网络后重试'
    } else {
      updateError.value = err.message || '检查更新失败'
    }
  }
}

// 比较版本号，v1 > v2 返回 1，v1 < v2 返回 -1，相等返回 0
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

// 获取当前平台的 key
const getPlatformKey = () => {
  const p = systemInfo.value.platform
  const a = systemInfo.value.arch
  if (p === 'windows') {
    return a === 'x86_64' ? 'windows-x86_64' : 'windows-i686'
  } else if (p === 'darwin' || p === 'macos') {
    return a === 'aarch64' ? 'darwin-aarch64' : 'darwin-x86_64'
  } else if (p === 'linux') {
    return 'linux-x86_64'
  }
  return 'windows-x86_64'
}

// 打开外部链接
const handleOpenUrl = async (url) => {
  try {
    await openUrl(url)
  } catch (err) {
    console.error('打开链接失败:', err)
  }
}

// 格式化平台名称
const formatPlatform = (p) => {
  const platformNames = {
    'windows': 'Windows',
    'linux': 'Linux',
    'macos': 'macOS',
    'darwin': 'macOS'
  }
  return platformNames[p] || p
}

// 格式化架构名称
const formatArch = (a) => {
  const archNames = {
    'x86_64': 'x64',
    'x86': 'x86',
    'aarch64': 'ARM64',
    'arm': 'ARM'
  }
  return archNames[a] || a
}
</script>

<template>
  <CartoonModal
      :open="show"
      title="偏好设置"
      size="lg"
      @close="handleClose"
  >
    <div class="settings-wrapper">
      <aside class="settings-aside">
        <div
            v-for="tab in tabs"
            :key="tab.id"
            class="nav-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </div>
      </aside>

      <main class="settings-main">
        <div class="settings-body">
          <div v-if="activeTab === 'general'" class="panel-content">
            <h3 class="panel-header">常规</h3>

            <div class="form-item">
              <label class="item-label">默认编辑器</label>
              <div class="input-group">
                <CartoonInput
                    v-model="localSettings.editorPath"
                    placeholder="请选择编辑器路径..."
                    class="flex-1"
                />
                <CartoonButton variant="secondary" @click="handleBrowseEditor">
                  <FolderOpen/>
                  <span>浏览</span>
                </CartoonButton>
              </div>
              <p class="item-hint">当需要修改代码时，系统将调用此路径的程序</p>
            </div>

            <div class="form-item">
              <label class="item-label">窗口关闭行为</label>
              <div class="card-options">
                <div
                    class="option-card"
                    :class="{ selected: localSettings.closeButtonBehavior === 'hide' }"
                    @click="localSettings.closeButtonBehavior = 'hide'"
                >
                  <div class="card-title">
                    <b>最小化到托盘</b>
                    <Check v-if="localSettings.closeButtonBehavior === 'hide'"/>
                  </div>
                  <p>点击关闭按钮时，应用将在后台继续运行</p>
                </div>

                <div
                    class="option-card"
                    :class="{ selected: localSettings.closeButtonBehavior === 'quit' }"
                    @click="localSettings.closeButtonBehavior = 'quit'"
                >
                  <div class="card-title">
                    <b>直接退出</b>
                    <Check v-if="localSettings.closeButtonBehavior === 'quit'"/>
                  </div>
                  <p>点击关闭按钮时，将完全结束进程</p>
                </div>
              </div>
            </div>

            <div class="form-item">
              <label class="item-label">主题色</label>
              <div class="color-options">
                <div
                    v-for="theme in THEME_COLORS"
                    :key="theme.id"
                    class="color-option"
                    :class="{ selected: localSettings.themeColor === theme.id }"
                    :style="{ '--theme-color': theme.color }"
                    @click="localSettings.themeColor = theme.id"
                    :title="theme.label"
                >
                  <div class="color-circle" :style="{ backgroundColor: theme.color }">
                    <Check v-if="localSettings.themeColor === theme.id" :size="14"/>
                  </div>
                  <span class="color-label">{{ theme.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'export'" class="panel-content">
            <h3 class="panel-header">项目导出</h3>
            <div class="form-item">
              <label class="item-label">清理策略</label>
              <div class="card-options vertical">
                <div
                    class="option-card"
                    :class="{ selected: localSettings.exportProjectBehavior === 'ignore-plugin-directory' }"
                    @click="localSettings.exportProjectBehavior = 'ignore-plugin-directory'"
                >
                  <div class="card-title">
                    <b>智能精简模式 (推荐)</b>
                    <Check v-if="localSettings.exportProjectBehavior === 'ignore-plugin-directory'"/>
                  </div>
                  <p>自动剔除 node_modules, target, .git 等冗余目录，缩小导出体积</p>
                </div>

                <div
                    class="option-card"
                    :class="{ selected: localSettings.exportProjectBehavior === 'all-directory' }"
                    @click="localSettings.exportProjectBehavior = 'all-directory'"
                >
                  <div class="card-title">
                    <b>完整源码模式</b>
                    <Check v-if="localSettings.exportProjectBehavior === 'all-directory'"/>
                  </div>
                  <p>不进行任何过滤，原样复制整个项目文件夹</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'about'" class="panel-content about-panel">
            <!-- 应用图标和名称 -->
            <div class="about-header">
              <img src="@/assets/logo.png" alt="logo" class="app-logo"/>
              <div class="app-name">ProManager</div>
              <div class="app-version">v{{ appVersion || '-' }}</div>
            </div>

            <!-- 信息列表 -->
            <div class="about-info">
              <div class="info-row">
                <span class="info-label">系统平台</span>
                <span class="info-value">
                  {{ formatPlatform(systemInfo.platform) }} {{ systemInfo.osVersion }} ({{ formatArch(systemInfo.arch) }})
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">开源地址</span>
                <span class="info-link" @click="handleOpenUrl('https://github.com/motoryang/pm-app')">
                  <Github :size="14"/>
                  motoryang/pm-app
                </span>
              </div>
            </div>

            <!-- 更新检查 -->
            <div class="about-update">
              <CartoonButton
                  variant="secondary"
                  size="small"
                  :disabled="updateStatus === 'checking'"
                  @click="handleCheckUpdate"
              >
                <LoadingOne v-if="updateStatus === 'checking'" :size="16" spin/>
                <Refresh v-else :size="16"/>
                <span>{{ updateStatus === 'checking' ? '检查中...' : '检查更新' }}</span>
              </CartoonButton>

              <div v-if="updateStatus === 'upToDate'" class="update-msg success">
                <Check :size="14"/>
                <span>已是最新版本</span>
              </div>
              <div v-else-if="updateStatus === 'available' && updateInfo" class="update-msg available">
                <span>发现新版本 v{{ updateInfo.version }}</span>
                <span class="update-link" @click="handleOpenUrl('https://github.com/motoryang/pm-app/releases/latest')">
                  前往下载
                </span>
              </div>
              <div v-else-if="updateStatus === 'error'" class="update-msg error">
                <span>{{ updateError }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          <CloseOne/>
          {{ errorMessage }}
        </div>

        <footer class="settings-footer">
          <CartoonButton variant="secondary" @click="handleClose">
            取消
          </CartoonButton>
          <CartoonButton
              variant="primary"
              :loading="saving"
              @click="handleSave"
              class="save-btn"
          >
            <Check/>
            保存更改
          </CartoonButton>
        </footer>
      </main>
    </div>
  </CartoonModal>
</template>

<style scoped>
/* 容器布局 */
.settings-wrapper {
  display: flex;
  height: 520px;
  margin: -24px; /* 抵消 Modal 内边距 */
  background: var(--color-bg-primary);
  overflow: hidden;
}

/* 左侧导航栏 */
.settings-aside {
  width: 130px;
  background: var(--color-bg-secondary);
  border-right: 3px solid var(--color-border);
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  border: 1px solid transparent;
  margin: 0 auto;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: translateX(4px);
}

.nav-item.active {
  background: var(--color-primary);
  color: white;
}

.nav-icon {
  font-size: 16px;
}

/* 右侧内容区 */
.settings-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.settings-body {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.panel-header {
  font-size: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 表单样式 */
.form-item {
  margin-bottom: 28px;
}

.item-label {
  display: block;
  font-weight: 800;
  font-size: 15px;
  margin-bottom: 12px;
  color: var(--color-text-primary);
}

.item-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 8px;
}

.input-group {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

/* 卡片选择器 */
.card-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card-options.vertical {
  grid-template-columns: 1fr;
}

.option-card {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-primary);
}

.option-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.option-card.selected {
  border-color: var(--color-primary);
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  color: var(--color-text-primary);
}

.option-card p {
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin: 0;
}

/* 底部状态 */
.error-banner {
  margin: 0 32px;
  padding: 10px 16px;
  background: #fff2f0;
  border: 2px solid var(--color-danger);
  border-radius: 10px;
  color: var(--color-danger);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-footer {
  padding: 24px 32px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: var(--color-bg-primary);
}

.save-btn {
  min-width: 120px;
}

/* 动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
  gap: 16px;
}

/* 主题色选择器 */
.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.color-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.color-option:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.color-option.selected {
  border-color: var(--theme-color);
  background: rgba(0, 0, 0, 0.03);
}

.color-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

.color-option:hover .color-circle {
  transform: scale(1.1);
}

.color-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.color-option.selected .color-label {
  color: var(--theme-color);
  font-weight: 700;
}

/* 关于页面样式 */
.about-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 24px;
}

.about-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.app-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.app-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.app-version {
  font-size: 14px;
  color: var(--color-text-tertiary);
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--color-text-tertiary);
}

.info-value {
  color: var(--color-text-primary);
}

.info-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.info-link:hover {
  text-decoration: underline;
}

.about-update {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.update-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.update-msg.success {
  color: #16a34a;
}

.update-msg.available {
  color: #d97706;
}

.update-msg.error {
  color: #dc2626;
}

.update-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.update-link:hover {
  text-decoration: underline;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>