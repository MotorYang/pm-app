<script setup>
import {ref, watch} from 'vue'
import {Fork, User, Time} from '@icon-park/vue-next'
import {useGitStore} from '@/stores/git'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const gitStore = useGitStore()
const selectedHash = ref(null)

// 自动选中第一个
watch(() => gitStore.commits, (newCommits) => {
  if (newCommits && newCommits.length > 0) {
    selectedHash.value = newCommits[0].hash
  } else {
    selectedHash.value = null
  }
}, { immediate: true })

const selectCommit = async (commit) => {
  selectedHash.value = commit.hash
  await gitStore.getCommitDetail(commit.hash)
}

// 判断是否为合并提交
const isMergeCommit = (commit) => {
  return commit.parents && commit.parents.length > 1
}

// 获取提交消息的第一行
const getCommitSubject = (message) => {
  return message.split('\n')[0]
}
</script>

<template>
  <CartoonCard class="commit-list-card" padding="none">
    <div class="commit-list-wrapper">
      <div class="commit-list">
        <div class="list-header">
          <h3 class="section-title">
            <Fork :size="14" theme="outline"/>
            提交历史
          </h3>
          <span class="commit-count">{{ gitStore.commits.length }} 个提交</span>
        </div>

        <div v-if="gitStore.commits.length === 0" class="no-commits">
          <p>暂无提交记录</p>
        </div>

        <div v-else class="commits">
          <div
              v-for="commit in gitStore.commits"
              :key="commit.hash"
              class="commit-item"
              :class="{
              selected: selectedHash === commit.hash,
              merge: isMergeCommit(commit)
            }"
              @click="selectCommit(commit)"
          >
            <div class="commit-graph">
              <div class="commit-dot" :class="{ merge: isMergeCommit(commit) }"></div>
              <div v-if="commit.parents.length > 0" class="commit-line"></div>
            </div>

            <div class="commit-content">
              <div class="commit-header">
                <span class="commit-hash">{{ commit.short_hash }}</span>
                <span v-if="isMergeCommit(commit)" class="merge-badge">合并</span>
              </div>

              <div class="commit-message">
                {{ getCommitSubject(commit.message) }}
              </div>

              <div class="commit-meta">
                <span class="author">
                  <User :size="10" theme="outline"/>
                  {{ commit.author }}
                </span>
                <span class="date">
                  <Time :size="10" theme="outline"/>
                  {{ gitStore.formatDate(commit.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </CartoonCard>
</template>

<style scoped>
.commit-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.commit-list-card :deep(.cartoon-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.commit-list-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.commit-list {
  padding: 4px 8px; /* 缩小 padding */
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.commit-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.no-commits {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  padding: 16px;
}

.commits {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.commit-item {
  display: flex;
  gap: 4px;
  padding: 2px 4px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.commit-item:hover {
  background-color: var(--color-bg-tertiary);
}

.commit-item.selected {
  background-color: var(--color-primary);
  color: white;
}

.commit-graph {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
  position: relative;
}

.commit-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
  border: 2px solid var(--color-primary);
  z-index: 2;
  flex-shrink: 0;
}

.commit-dot.merge {
  background-color: var(--color-secondary);
  border-color: var(--color-secondary);
}

.commit-item.selected .commit-dot {
  background-color: white;
  border-color: white;
}

.commit-line {
  width: 2px;
  flex: 1;
  background-color: var(--color-border);
  margin-top: 1px;
  min-height: 12px;
}

.commit-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.commit-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.commit-hash {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
  padding: 1px 4px;
  border-radius: var(--border-radius-sm);
}

.commit-item.selected .commit-hash {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.merge-badge {
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  color: white;
  background-color: var(--color-secondary);
  padding: 1px 4px;
  border-radius: var(--border-radius-sm);
}

.commit-item.selected .merge-badge {
  background-color: rgba(255, 255, 255, 0.3);
}

.commit-message {
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-item.selected .commit-message {
  color: white;
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.commit-item.selected .commit-meta {
  color: rgba(255, 255, 255, 0.8);
}

.author,
.date {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
