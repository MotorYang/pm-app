<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useTauri } from '@/composables/useTauri.js'
import { save } from '@tauri-apps/plugin-dialog'
import { FolderClose, Lock, FileText, CheckOne } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import HandoverProgress from './HandoverProgress.vue'
import { useDocumentsStore } from '@/stores/documents.js'

const projectsStore = useProjectsStore()
const documentsStore = useDocumentsStore()
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
    const result = await tauri.invokeCommand('check_vault_has_data', {
      projectId: projectsStore.activeProject.id
    })
    hasVaultData.value = result
  } catch (error) {
    console.error('Failed to check vault data:', error)
    hasVaultData.value = false
  }
}

onMounted(() => {
  checkVaultData()
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
    exportMessage.value = '准备导出...'

    /*
    * 调用Rust后端来导出项目
    */
    await tauri.invokeCommand('export_project_handover', {
      project: projectsStore.activeProject,
      outputPath: filePath,
      documents: selectedItems.value.documents ? documentsStore.documents: [],
      vaultEntries: selectedItems.value.vault ? [] : [],
      vaultMasters: selectedItems.value.vault ? null : null
    }).finally(() => {
      exportProgress.value = 100
      exportMessage.value = '导出完成！'
      // Reset after a delay
    })

  } catch (error) {
    console.error('Export failed:', error)
    errorMessage.value = '导出失败: ' + error
    isExporting.value = false
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
                  <FolderClose :size="20" theme="outline" />
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
                  <FileText :size="20" theme="outline" />
                  <span class="checkbox-label">文档库</span>
                </div>
                <p class="checkbox-description">包含所有文档和图片资源</p>
              </div>
            </label>

            <label
              class="checkbox-item"
              :class="{ disabled: !hasVaultData }"
            >
              <input
                type="checkbox"
                v-model="selectedItems.vault"
                :disabled="!hasVaultData"
                @change="handleVaultChange"
              />
              <div class="checkbox-content">
                <div class="checkbox-header">
                  <Lock :size="20" theme="outline" />
                  <span class="checkbox-label">保险箱</span>
                  <span v-if="!hasVaultData" class="badge-empty">无数据</span>
                </div>
                <p class="checkbox-description">包含加密存储的敏感信息</p>
              </div>
            </label>
          </div>

          <!-- Vault password input -->
          <div v-if="showPasswordInput" class="password-section">
            <label class="password-label">
              <Lock :size="16" theme="outline" />
              保险箱密码
            </label>
            <CartoonInput
              v-model="vaultPassword"
              type="password"
              placeholder="请输入保险箱密码以验证身份"
              required
            />
            <p class="password-hint">导出时需要验证密码以确保安全</p>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="actions">
          <CartoonButton
            variant="primary"
            size="lg"
            @click="handleExport"
            :disabled="!canExport || isExporting"
          >
            <CheckOne :size="18" theme="outline" />
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
  max-width: 800px;
  margin: 0 auto;
}

.handover-card {
  padding: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.page-description {
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-xl) 0;
  line-height: 1.6;
}

.project-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-xl);
}

.info-label {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  font-size: var(--font-size-lg);
}

.selection-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
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

.checkbox-item input[type="checkbox"] {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.checkbox-item.disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.checkbox-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.checkbox-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.checkbox-label {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.badge-empty {
  padding: 2px var(--spacing-xs);
  background-color: var(--color-warning);
  color: white;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.checkbox-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.password-section {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--border-radius-md);
  border-left: 3px solid var(--color-primary);
}

.password-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.password-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: var(--spacing-xs) 0 0 0;
}

.error-message {
  padding: var(--spacing-md);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
