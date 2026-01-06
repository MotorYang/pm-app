<script setup>
import {ref, computed} from 'vue'
import {Fork, User, Time} from '@icon-park/vue-next'
import {useGitStore} from '@/stores/git'
import CartoonCard from '@/components/ui/CartoonCard.vue'

const gitStore = useGitStore()
const selectedHash = ref(null)

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
            <Fork :size="20" theme="outline"/>
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
            <!-- 提交图形指示器 -->
            <div class="commit-graph">
              <div class="commit-dot" :class="{ merge: isMergeCommit(commit) }"></div>
              <div v-if="commit.parents.length > 0" class="commit-line"></div>
            </div>

            <!-- 提交信息 -->
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
              <User :size="14" theme="outline"/>
              {{ commit.author }}
            </span>
                <span class="date">
              <Time :size="14" theme="outline"/>
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
/* 添加包裹层来处理 CartoonCard 的 padding */
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
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.commit-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.no-commits {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}

.commits {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.commit-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
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
  width: 20px;
  flex-shrink: 0;
  position: relative;
}

.commit-dot {
  width: 12px;
  height: 12px;
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
  margin-top: 2px;
  min-height: 30px;
}

.commit-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.commit-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.commit-hash {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
  padding: 2px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
}

.commit-item.selected .commit-hash {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.merge-badge {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: white;
  background-color: var(--color-secondary);
  padding: 2px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
}

.commit-item.selected .merge-badge {
  background-color: rgba(255, 255, 255, 0.3);
}

.commit-message {
  font-size: var(--font-size-md);
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
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.commit-item.selected .commit-meta {
  color: rgba(255, 255, 255, 0.8);
}

.author,
.date {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
</style>
