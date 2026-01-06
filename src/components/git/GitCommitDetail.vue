<script setup>
import { computed } from 'vue'
import { FileText, User, Time, Code } from '@icon-park/vue-next'
import { useGitStore } from '@/stores/git'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const gitStore = useGitStore()

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
                  <span class="file-name">{{ file.filename }}</span>
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
  </CartoonCard>
</template>

<style scoped>
.commit-detail-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.commit-detail-card :deep(.cartoon-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.commit-detail-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.commit-detail {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
}

.label {
  font-weight: var(--font-weight-medium);
  min-width: 60px;
}

.value {
  flex: 1;
  color: var(--color-text-primary);
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
  flex-shrink: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
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