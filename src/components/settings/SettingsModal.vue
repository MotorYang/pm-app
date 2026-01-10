<script setup>
import {ref, onMounted, computed} from 'vue'
import {useSettingsStore, THEME_COLORS} from '@/stores/settings'
import {open} from '@tauri-apps/plugin-dialog'
import {
  FolderOpen,
  Check,
  SettingTwo,
  ShareTwo,
  Config,
  CloseOne,
  Attention
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
  {id: 'advanced', label: '高级功能'},
]

/* ---------------- lifecycle ---------------- */
onMounted(async () => {
  await settingsStore.loadSettings()
  localSettings.value.editorPath = settingsStore.editorPath
  localSettings.value.closeButtonBehavior = settingsStore.closeButtonBehavior
  localSettings.value.exportProjectBehavior = settingsStore.exportProjectBehavior
  localSettings.value.themeColor = settingsStore.themeColor
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

          <div v-else class="panel-content empty-state">
            <Attention :size="48"/>
            <p>更多功能正在开发中...</p>
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
</style>