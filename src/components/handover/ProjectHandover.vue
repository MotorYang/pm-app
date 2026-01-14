<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useTauri } from '@/composables/useTauri.js'
import { save } from '@tauri-apps/plugin-dialog'
import { listen } from '@tauri-apps/api/event'
import { FolderClose, Lock, FileText, CheckOne } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import HandoverProgress from './HandoverProgress.vue'
import { useDocumentsStore } from '@/stores/documents.js'
import { useSettingsStore } from '@/stores/settings.js'
import { useVaultStore } from '@/stores/vault.js'

const projectsStore = useProjectsStore()
const documentsStore = useDocumentsStore()
const settingsStore = useSettingsStore()
const vaultStore = useVaultStore()
const tauri = useTauri()

const selectedItems = ref({
  project: true,
  documents: false,
  vault: false
})

const vaultPassword = ref('')
const hasVaultData = ref(false)
const isExporting = ref(false)
const exportProgress = ref(0)
const exportMessage = ref('')
const errorMessage = ref('')
const showPasswordInput = ref(false)

// Check if vault has data
const checkVaultData = async () => {
  if (!projectsStore.activeProject) return

  try {
    hasVaultData.value = await vaultStore.hasEntries(projectsStore.activeProject.id)
  } catch (error) {
    console.error('Failed to check vault data:', error)
    hasVaultData.value = false
  }
}

// 监听导出进度事件
let unlistenProgress = null

const setupProgressListener = async () => {
  unlistenProgress = await listen('export-progress', (event) => {
    const { progress, message } = event.payload
    exportProgress.value = progress
    exportMessage.value = message
  })
}

onMounted(() => {
  checkVaultData()
  setupProgressListener()
})

onUnmounted(() => {
  if (unlistenProgress) {
    unlistenProgress()
  }
})

// Watch vault selection
const handleVaultChange = () => {
  showPasswordInput.value = selectedItems.value.vault
  if (!selectedItems.value.vault) {
    vaultPassword.value = ''
  }
}

// Validate selections
const canExport = computed(() => {
  if (!projectsStore.activeProject) return false

  const hasSelection = selectedItems.value.project ||
                       selectedItems.value.documents ||
                       selectedItems.value.vault

  if (!hasSelection) return false

  // If vault is selected, password is required
  if (selectedItems.value.vault && !vaultPassword.value.trim()) {
    return false
  }

  return true
})

// Handle export
const handleExport = async () => {
  if (!canExport.value) return

  try {
    errorMessage.value = ''

    // 如果选择了保险箱，需要先验证密码并加载数据
    let vaultEntriesToExport = []
    if (selectedItems.value.vault) {
      exportMessage.value = '验证保险箱密码...'
      try {
        // 先解锁保险箱（会验证密码并加载数据）
        await vaultStore.unlockVault(projectsStore.activeProject.id, vaultPassword.value)
        vaultEntriesToExport = vaultStore.entries
      } catch (err) {
        errorMessage.value = '保险箱密码验证失败: ' + err.message
        isExporting.value = false
        return
      }
    }

    // Get save path
    const defaultFileName = `${projectsStore.activeProject.name}_交接包.zip`
    const filePath = await save({
      title: '选择保存位置',
      defaultPath: defaultFileName,
      filters: [{
        name: 'ZIP 文件',
        extensions: ['zip']
      }]
    })

    if (!filePath) return

    isExporting.value = true
    exportProgress.value = 0

    exportMessage.value = '正在导出...'

    // 获取文档库路径
    let docvaultPath = null
    if (selectedItems.value.documents) {
      docvaultPath = await documentsStore.getDocvaultPath(projectsStore.activeProject.id)
    }

    /*
    * 调用Rust后端来导出项目
    * 进度由后端通过 export-progress 事件更新
    */
    await tauri.invokeCommand('export_project_handover', {
      project: projectsStore.activeProject,
      outputPath: filePath,
      docvaultPath: docvaultPath,
      vaultEntries: vaultEntriesToExport,
      vaultMasters: selectedItems.value.vault ? vaultPassword.value : null,
      exportOptions: {
        ignore_plugin: settingsStore.exportProjectBehavior,
        zip_encryption: false,
      }
    })
    // 导出完成后进度由后端事件更新为 100%

  } catch (error) {
    console.error('Export failed:', error)
    errorMessage.value = '导出失败: ' + error
    isExporting.value = false
    exportProgress.value = 0
    exportMessage.value = ''
  }
}
</script>

<template>
  <div>
    <CartoonCard v-if="!projectsStore.activeProject" class="no-project">
      <div class="empty-state">
        <FolderClose :size="64" theme="outline" />
        <p>请先选择一个项目</p>
      </div>
    </CartoonCard>

    <div v-else class="handover-content">
      <CartoonCard class="handover-card">
        <p class="page-description">
          导出项目文件、文档和保险箱内容，用于项目交接和备份
        </p>

        <div class="project-info">
          <div class="info-label">当前项目：</div>
          <div class="info-value">{{ projectsStore.activeProject.name }}</div>
        </div>

        <div class="selection-section">
          <h3 class="section-title">选择导出内容</h3>

          <div class="checkbox-group">
            <label class="checkbox-item">
              <input
                type="checkbox"
                v-model="selectedItems.project"
              />
              <div class="checkbox-content">
                <div class="checkbox-header">
                  <FolderClose :size="16" theme="outline" />
                  <span class="checkbox-label">项目文件</span>
                </div>
                <p class="checkbox-description">包含项目的基本信息和配置</p>
              </div>
            </label>

            <label class="checkbox-item">
              <input
                type="checkbox"
                v-model="selectedItems.documents"
              />
              <div class="checkbox-content">
                <div class="checkbox-header">
                  <FileText :size="16" theme="outline" />
                  <span class="checkbox-label">文档库</span>
                </div>
                <p class="checkbox-description">包含所有文档和图片资源</p>
              </div>
            </label>

            <div
              class="checkbox-item vault-item"
              :class="{ disabled: !hasVaultData, selected: selectedItems.vault }"
            >
              <label class="checkbox-main">
                <input
                  type="checkbox"
                  v-model="selectedItems.vault"
                  :disabled="!hasVaultData"
                  @change="handleVaultChange"
                />
                <div class="checkbox-content">
                  <div class="checkbox-header">
                    <Lock :size="16" theme="outline" />
                    <span class="checkbox-label">保险箱</span>
                    <span v-if="!hasVaultData" class="badge-empty">无数据</span>
                  </div>
                  <p class="checkbox-description">包含加密存储的敏感信息</p>
                </div>
              </label>

              <!-- Vault password input (inline) -->
              <Transition name="expand">
                <div v-if="showPasswordInput" class="password-inline" @click.stop>
                  <CartoonInput
                    v-model="vaultPassword"
                    type="password"
                    placeholder="请输入保险箱密码"
                    required
                  />
                  <p class="password-hint">导出时需要验证密码以确保安全</p>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="actions">
          <CartoonButton
            variant="primary"
            @click="handleExport"
            :disabled="!canExport || isExporting"
          >
            <CheckOne :size="16" theme="outline" />
            开始导出
          </CartoonButton>
        </div>
      </CartoonCard>
    </div>

    <!-- Progress overlay -->
    <HandoverProgress
      v-if="isExporting"
      :progress="exportProgress"
      :message="exportMessage"
      @close="isExporting = false"
    />
  </div>
</template>

<style scoped>
.no-project {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
}

.handover-content {
  max-width: 600px;
  margin: 0 auto;
}

.handover-card {
  padding: var(--spacing-lg);
}

.page-description {
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.project-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-md);
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.selection-section {
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.checkbox-item:hover:not(.disabled) {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-primary);
}

.checkbox-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-item.vault-item {
  flex-direction: column;
  gap: 0;
}

.checkbox-item.vault-item.selected {
  border-color: var(--color-primary);
  background-color: var(--color-bg-tertiary);
}

.checkbox-main {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
  width: 100%;
}

.checkbox-item input[type="checkbox"] {
  margin-top: 1px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.checkbox-item.disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.checkbox-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkbox-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.checkbox-header .i-icon {
  width: 16px;
  height: 16px;
}

.checkbox-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.badge-empty {
  padding: 1px 6px;
  background-color: var(--color-warning);
  color: white;
  border-radius: var(--border-radius-sm);
  font-size: 10px;
  font-weight: var(--font-weight-medium);
}

.checkbox-description {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  line-height: 1.4;
}

.password-inline {
  width: 100%;
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  padding-left: calc(16px + var(--spacing-sm));
  border-top: 1px dashed var(--color-border);
}

.password-hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin: 4px 0 0 0;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 100px;
}

.error-message {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  margin-bottom: var(--spacing-md);
}

.actions {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-sm);
}
</style>
