<script setup>
import { computed, ref } from 'vue'
import { FileText, User, Time, Code } from '@icon-park/vue-next'
import { useGitStore } from '@/stores/git'
import { useSettingsStore } from '@/stores/settings'
import { useProjectsStore } from '@/stores/projects'
import { invoke } from '@tauri-apps/api/core'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const gitStore = useGitStore()
const settingsStore = useSettingsStore()
const projectsStore = useProjectsStore()

const showEditorWarning = ref(false)

const commit = computed(() => gitStore.currentCommit)

const hasBody = computed(() => {
  return commit.value && commit.value.body && commit.value.body.trim().length > 0
})

const getStatusIcon = (status) => {
  switch (status) {
    case 'added':
      return '+'
    case 'deleted':
      return '-'
    case 'modified':
      return 'M'
    case 'renamed':
      return 'R'
    default:
      return '?'
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'added':
      return 'var(--color-success)'
    case 'deleted':
      return 'var(--color-danger)'
    case 'modified':
      return 'var(--color-warning)'
    case 'renamed':
      return 'var(--color-accent)'
    default:
      return 'var(--color-text-secondary)'
  }
}

// Load settings on mount
settingsStore.loadSettings()

// Handle file click
const handleFileClick = async (filename) => {
  // Check if editor is configured
  if (!settingsStore.editorPath) {
    showEditorWarning.value = true
    return
  }

  // Build full file path
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
  <CartoonCard class="commit-detail-card" padding="none">
    <div class="commit-detail-wrapper">
      <div class="commit-detail">
        <div v-if="!commit" class="no-selection">
          <Code :size="48" theme="outline" />
          <p>选择一个提交查看详情</p>
        </div>

        <div v-else class="detail-content">
          <div class="detail-header">
            <h3 class="commit-subject">{{ commit.subject }}</h3>

            <div class="commit-info">
              <div class="info-item">
                <User :size="16" theme="outline" />
                <span class="label">作者:</span>
                <span class="value">{{ commit.author }}</span>
              </div>
              <div class="info-item">
                <Time :size="16" theme="outline" />
                <span class="label">时间:</span>
                <span class="value">{{ gitStore.formatDate(commit.date) }}</span>
              </div>
              <div class="info-item">
                <Code :size="16" theme="outline" />
                <span class="label">Hash:</span>
                <span class="value hash">{{ commit.hash }}</span>
              </div>
              <div v-if="commit.parents.length > 0" class="info-item">
                <span class="label">父提交:</span>
                <div class="parents">
                  <span v-for="parent in commit.parents" :key="parent" class="parent-hash">
                    {{ parent.substring(0, 7) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="hasBody" class="commit-body">
              <pre>{{ commit.body }}</pre>
            </div>
          </div>

          <div class="files-section">
            <h4 class="section-title">
              <FileText :size="18" theme="outline" />
              变更文件 ({{ commit.files.length }})
            </h4>

            <div v-if="commit.files.length === 0" class="no-files">
              <p>没有文件变更</p>
            </div>

            <div v-else class="files-list">
              <div
                  v-for="file in commit.files"
                  :key="file.filename"
                  class="file-item"
              >
                <div class="file-header">
                  <span class="file-status" :style="{ color: getStatusColor(file.status) }">
                    {{ getStatusIcon(file.status) }}
                  </span>
                  <span
                    class="file-name clickable"
                    @click="handleFileClick(file.filename)"
                    :title="'点击在编辑器中打开: ' + file.filename"
                  >
                    {{ file.filename }}
                  </span>
                </div>
                <div class="file-stats">
                  <span v-if="file.additions > 0" class="additions">
                    +{{ file.additions }}
                  </span>
                  <span v-if="file.deletions > 0" class="deletions">
                    -{{ file.deletions }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Warning Dialog -->
    <ConfirmDialog
      v-model:open="showEditorWarning"
      title="未设置编辑器"
      message="您还没有设置默认编辑器，请先在设置中配置编辑器路径。"
      confirm-text="去设置"
      cancel-text="取消"
      @confirm="$router ? $router.push('/settings') : null"
    />
  </CartoonCard>
</template>

<style scoped>
.commit-detail-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
}

.commit-detail-card :deep(.cartoon-card-body) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.commit-detail-wrapper {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.commit-detail {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}

.detail-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  min-width: 0;
}

.commit-subject {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
}

.commit-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 0;
}

.label {
  font-weight: var(--font-weight-medium);
  min-width: 60px;
  flex-shrink: 0;
}

.value {
  flex: 1;
  min-width: 0;
  color: var(--color-text-primary);
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.value.hash {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-xs);
  word-break: break-all;
}

.parents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.parent-hash {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-xs);
  background-color: var(--color-bg-tertiary);
  padding: 2px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  color: var(--color-text-primary);
}

.commit-body {
  background-color: var(--color-bg-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border-left: 3px solid var(--color-primary);
}

.commit-body pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
}

.files-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.no-files {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  background-color: var(--color-bg-tertiary);
  transition: all var(--transition-fast);
  min-width: 0;
  max-width: 100%;
}

.file-item:hover {
  background-color: var(--color-bg-secondary);
  transform: translateX(2px);
}

.file-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}

.file-status {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.file-name {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  flex: 1;
  min-width: 0;
}

/* 自定义滚动条样式 */
.file-name::-webkit-scrollbar {
  height: 4px;
}

.file-name::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
  border-radius: 2px;
}

.file-name::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.file-name::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

.file-name.clickable {
  cursor: pointer;
  transition: color var(--transition-fast);
}

.file-name.clickable:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.file-stats {
  display: flex;
  gap: var(--spacing-sm);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.additions {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.deletions {
  color: var(--color-danger);
  font-weight: var(--font-weight-medium);
}
</style>