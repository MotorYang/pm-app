<script setup>
import { ref, computed } from 'vue'
import { CheckOne, CloseOne, SendOne } from '@icon-park/vue-next'
import { invoke } from '@tauri-apps/api/core'
import { useGitStore } from '@/stores/git'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const gitStore = useGitStore()
const projectsStore = useProjectsStore()
const settingsStore = useSettingsStore()
const commitMessage = ref('')
const committing = ref(false)
const showEditorWarning = ref(false)

// 已暂存的文件
const stagedFiles = computed(() => {
  if (!gitStore.status || !gitStore.status.files) return []
  return gitStore.status.files.filter(f => f.staged)
})

// 未暂存的文件
const unstagedFiles = computed(() => {
  if (!gitStore.status || !gitStore.status.files) return []
  return gitStore.status.files.filter(f => !f.staged)
})

// 获取文件状态的显示文本
const getStatusText = (status) => {
  const statusMap = {
    'modified': '已修改',
    'added': '新增',
    'deleted': '已删除',
    'untracked': '未跟踪',
    'unknown': '未知'
  }
  return statusMap[status] || status
}

// 获取文件状态的颜色类
const getStatusClass = (status) => {
  const classMap = {
    'modified': 'status-modified',
    'added': 'status-added',
    'deleted': 'status-deleted',
    'untracked': 'status-untracked',
    'unknown': 'status-unknown'
  }
  return classMap[status] || 'status-unknown'
}

// 暂存文件
const handleStage = async (file) => {
  try {
    await gitStore.stageFiles([file.path])
  } catch (e) {
    alert(e.message || '暂存文件失败')
  }
}

// 取消暂存文件
const handleUnstage = async (file) => {
  try {
    await gitStore.unstageFiles([file.path])
  } catch (e) {
    alert(e.message || '取消暂存失败')
  }
}

// 暂存所有文件
const handleStageAll = async () => {
  if (unstagedFiles.value.length === 0) return

  try {
    const paths = unstagedFiles.value.map(f => f.path)
    await gitStore.stageFiles(paths)
  } catch (e) {
    alert(e.message || '暂存所有文件失败')
  }
}

// 取消暂存所有文件
const handleUnstageAll = async () => {
  if (stagedFiles.value.length === 0) return

  try {
    const paths = stagedFiles.value.map(f => f.path)
    await gitStore.unstageFiles(paths)
  } catch (e) {
    alert(e.message || '取消暂存所有文件失败')
  }
}

// 提交更改
const handleCommit = async () => {
  if (!commitMessage.value.trim()) {
    alert('请输入提交消息')
    return
  }

  if (stagedFiles.value.length === 0) {
    alert('没有已暂存的更改')
    return
  }

  committing.value = true

  try {
    await gitStore.commit(commitMessage.value)
    commitMessage.value = ''
    alert('提交成功')
  } catch (e) {
    alert(e.message || '提交失败')
  } finally {
    committing.value = false
  }
}

// 在编辑器中打开文件
const handleOpenFile = async (filename) => {
  if (!settingsStore.editorPath) {
    showEditorWarning.value = true
    return
  }

  const projectPath = projectsStore.activeProject?.path
  if (!projectPath) {
    console.error('No active project')
    return
  }

  const filePath = `${projectPath}/${filename}`

  try {
    await invoke('open_in_editor', {
      editorPath: settingsStore.editorPath,
      filePath: filePath
    })
  } catch (err) {
    console.error('Failed to open file in editor:', err)
    alert('打开文件失败: ' + err)
  }
}
</script>

<template>
  <CartoonCard class="git-changes-card" padding="none">
    <div class="changes-content">
        <!-- 已暂存的更改 -->
        <div v-if="stagedFiles.length > 0" class="file-section">
          <div class="section-header">
            <span class="section-label">已暂存的更改 ({{ stagedFiles.length }})</span>
            <button class="text-button" @click="handleUnstageAll" :disabled="gitStore.loading">
              取消全部暂存
            </button>
          </div>

          <div class="file-list">
            <div
              v-for="file in stagedFiles"
              :key="file.path"
              class="file-item"
            >
              <div class="file-info">
                <span :class="['file-status', getStatusClass(file.status)]">
                  {{ getStatusText(file.status) }}
                </span>
                <span
                  class="file-path"
                  :title="file.path"
                  @click="handleOpenFile(file.path)"
                >{{ file.path }}</span>
              </div>
              <button
                class="file-action"
                @click.stop="handleUnstage(file)"
                :disabled="gitStore.loading"
                title="取消暂存"
              >
                <CloseOne :size="14" theme="outline" />
              </button>
            </div>
          </div>
        </div>

        <!-- 未暂存的更改 -->
        <div v-if="unstagedFiles.length > 0" class="file-section">
          <div class="section-header">
            <span class="section-label">未暂存的更改 ({{ unstagedFiles.length }})</span>
            <button class="text-button" @click="handleStageAll" :disabled="gitStore.loading">
              暂存全部
            </button>
          </div>

          <div class="file-list">
            <div
              v-for="file in unstagedFiles"
              :key="file.path"
              class="file-item"
            >
              <div class="file-info">
                <span :class="['file-status', getStatusClass(file.status)]">
                  {{ getStatusText(file.status) }}
                </span>
                <span
                  class="file-path"
                  :title="file.path"
                  @click="handleOpenFile(file.path)"
                >{{ file.path }}</span>
              </div>
              <button
                class="file-action"
                @click.stop="handleStage(file)"
                :disabled="gitStore.loading"
                title="暂存文件"
              >
                <CheckOne :size="14" theme="outline" />
              </button>
            </div>
          </div>
        </div>

      <!-- 无更改 -->
      <div v-if="stagedFiles.length === 0 && unstagedFiles.length === 0" class="no-changes">
        <p>工作区干净，没有更改</p>
      </div>
    </div>

    <!-- 提交区域 -->
    <div v-if="stagedFiles.length > 0" class="commit-section">
      <textarea
        v-model="commitMessage"
        class="commit-message-input"
        placeholder="输入提交消息..."
        rows="3"
        :disabled="committing"
      ></textarea>
      <CartoonButton
        variant="primary"
        @click="handleCommit"
        :loading="committing"
        :disabled="committing || !commitMessage.trim()"
        class="commit-button"
      >
        <SendOne :size="16" theme="outline" />
        提交更改
      </CartoonButton>
    </div>

    <!-- Editor Warning Dialog -->
    <ConfirmDialog
        v-model:open="showEditorWarning"
        title="未设置编辑器"
        message="您还没有设置默认编辑器，请先在设置中配置编辑器路径。"
        confirm-text="确认"
        cancel-text="取消"
        :danger="true"
        @confirm="showEditorWarning = false"
    />

  </CartoonCard>
</template>

<style scoped>
.git-changes-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.git-changes-card :deep(.cartoon-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.changes-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: var(--spacing-sm) var(--spacing-md);
}

.file-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.file-section:last-of-type {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.section-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.text-button {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
}

.text-button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
}

.text-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  transition: background-color var(--transition-fast);
}

.file-item:hover {
  background-color: var(--color-bg-tertiary);
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.file-status {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  flex-shrink: 0;
}

.status-modified {
  background-color: rgba(255, 193, 7, 0.2);
  color: #ff9800;
}

.status-added {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-deleted {
  background-color: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.status-untracked {
  background-color: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.status-unknown {
  background-color: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.file-path {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.file-path:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.file-action {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.file-action:hover:not(:disabled) {
  background-color: var(--color-bg-secondary);
  color: var(--color-primary);
}

.file-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-changes {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
  min-height: 200px;
}

.commit-section {
  flex-shrink: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  margin-top: auto;
}

.commit-message-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-family: inherit;
  resize: none;
  height: 60px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast);
}

.commit-message-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

.commit-message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.commit-button {
  width: 100%;
}
</style>
