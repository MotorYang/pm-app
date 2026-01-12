<script setup>
import {ref, computed} from 'vue'
import {CheckOne, CloseOne, SendOne} from '@icon-park/vue-next'
import {invoke} from '@tauri-apps/api/core'
import {useGitStore} from '@/stores/git'
import {useProjectsStore} from '@/stores/projects'
import {useSettingsStore} from '@/stores/settings'
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
  <CartoonCard class="git-changes-card" padding="sm">
    <div class="changes-content">
      <!-- 已暂存的更改 -->
      <div v-if="stagedFiles.length" class="file-section">
        <div class="section-header">
          <span class="section-label">已暂存的更改 ({{ stagedFiles.length }})</span>
          <button class="text-button" @click="handleUnstageAll" :disabled="gitStore.loading">
            取消全部
          </button>
        </div>

        <div class="file-list">
          <div v-for="file in stagedFiles" :key="file.path" class="file-item">
            <div class="file-info">
              <span :class="['file-status', getStatusClass(file.status)]">
                {{ getStatusText(file.status) }}
              </span>
              <span class="file-path" :title="file.path" @click="handleOpenFile(file.path)">
                {{ file.path }}
              </span>
            </div>
            <button class="file-action" @click.stop="handleUnstage(file)" :disabled="gitStore.loading" title="取消暂存">
              <CloseOne :size="12" theme="outline"/>
            </button>
          </div>
        </div>
      </div>

      <!-- 未暂存的更改 -->
      <div v-if="unstagedFiles.length" class="file-section">
        <div class="section-header">
          <span class="section-label">未暂存的更改 ({{ unstagedFiles.length }})</span>
          <button class="text-button" @click="handleStageAll" :disabled="gitStore.loading">
            暂存全部
          </button>
        </div>

        <div class="file-list">
          <div v-for="file in unstagedFiles" :key="file.path" class="file-item">
            <div class="file-info">
              <span :class="['file-status', getStatusClass(file.status)]">
                {{ getStatusText(file.status) }}
              </span>
              <span class="file-path" :title="file.path" @click="handleOpenFile(file.path)">
                {{ file.path }}
              </span>
            </div>
            <button class="file-action" @click.stop="handleStage(file)" :disabled="gitStore.loading" title="暂存文件">
              <CheckOne :size="12" theme="outline"/>
            </button>
          </div>
        </div>
      </div>

      <!-- 无更改 -->
      <div v-if="!stagedFiles.length && !unstagedFiles.length" class="no-changes">
        <p>工作区干净，没有更改</p>
      </div>
    </div>

    <!-- 提交区域 -->
    <div v-if="stagedFiles.length" class="commit-section">
      <textarea v-model="commitMessage" class="commit-message-input" placeholder="输入提交消息..." rows="2"
                :disabled="committing"></textarea>
      <CartoonButton variant="primary" @click="handleCommit" :loading="committing"
                     :disabled="committing || !commitMessage.trim()" class="commit-button">
        <SendOne :size="14" theme="outline"/>
        提交更改
      </CartoonButton>
    </div>

    <!-- Editor Warning Dialog -->
    <ConfirmDialog
        v-model:open="showEditorWarning"
        title="未设置编辑器"
        message="请先在设置中配置默认编辑器路径。"
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.changes-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
  min-height: 0;
}

.file-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;
}

.section-label {
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.text-button {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
}

.text-button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
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
  padding: 2px 6px;
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
  gap: 6px;
  min-width: 0;
}

.file-status {
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  padding: 1px 4px;
  border-radius: var(--border-radius-sm);
  flex-shrink: 0;
  text-align: center;
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
  font-size: 12px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;      /* 保留 RTL 让省略号出现在左边 */
  text-align: left;    /* 保证文字从左向右显示 */
  cursor: pointer;
}

.file-path:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.file-action {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-action:hover:not(:disabled) {
  background-color: var(--color-bg-secondary);
  color: var(--color-primary);
}

.no-changes {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  padding: 16px;
  min-height: 120px;
}

.commit-section {
  flex-shrink: 0;
  padding: 4px 8px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--color-bg-secondary);
}

.commit-message-input {
  width: 100%;
  padding: 4px;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-size: 12px;
  font-family: inherit;
  resize: none;
  height: 48px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.commit-message-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.commit-button {
  width: 100%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>
