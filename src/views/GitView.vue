<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useGitStore } from '@/stores/git'
import { Refresh, FileEditingOne } from '@icon-park/vue-next'
import GitBranchSelect from '@/components/git/GitBranchSelect.vue'
import GitChangesModal from '@/components/git/GitChangesModal.vue'
import GitCommitList from '@/components/git/GitCommitList.vue'
import GitCommitDetail from '@/components/git/GitCommitDetail.vue'

const projectsStore = useProjectsStore()
const gitStore = useGitStore()
const showChangesModal = ref(false)

// 计算工作区更改数量
const changesCount = computed(() => {
  if (!gitStore.status || !gitStore.status.files) return 0
  return gitStore.status.files.length
})

onMounted(() => {
  if (projectsStore.activeProject) {
    initGit()
  }
})

watch(() => projectsStore.activeProject, (newProject) => {
  if (newProject) {
    initGit()
  } else {
    gitStore.clearData()
  }
})

const initGit = async () => {
  if (projectsStore.activeProject) {
    await gitStore.initGitData(projectsStore.activeProject.path)
  }
}

const handleRefresh = async () => {
  await initGit()
}
</script>

<template>
  <div class="git-view">
    <div class="git-header">
      <div>
        <GitBranchSelect v-if="projectsStore.activeProject && gitStore.currentBranch && !gitStore.error"  />
      </div>
      <div class="header-actions">
        <!-- 工作区更改按钮 -->
        <button
          v-if="projectsStore.activeProject && !gitStore.error"
          class="header-button"
          @click="showChangesModal = true"
          :title="changesCount > 0 ? `${changesCount} 个更改` : '工作区更改'"
        >
          <FileEditingOne :size="18" theme="outline" />
          <span v-if="changesCount > 0" class="badge">{{ changesCount }}</span>
        </button>

        <!-- 刷新按钮 -->
        <button
          v-if="projectsStore.activeProject"
          class="header-button"
          @click="handleRefresh"
          :disabled="gitStore.loading"
          :title="gitStore.loading ? '刷新中...' : '刷新'"
        >
          <Refresh :size="18" theme="outline" :class="{ spinning: gitStore.loading }" />
        </button>
      </div>
    </div>

    <!-- 工作区更改对话框 -->
    <GitChangesModal v-model:show="showChangesModal" />

    <div v-if="!projectsStore.activeProject" class="git-empty">
      <p>请先选择一个项目</p>
    </div>

    <div v-else-if="gitStore.loading && !gitStore.currentBranch" class="git-loading">
      <div class="loading-spinner"></div>
      <p>正在加载Git仓库信息...</p>
    </div>

    <div v-else-if="gitStore.error" class="git-error">
      <p>{{ gitStore.error }}</p>
      <button class="retry-button" @click="handleRefresh">
        重试
      </button>
    </div>

    <div v-else class="git-content">
      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 提交列表 -->
        <GitCommitList class="commit-list" />

        <!-- 提交详情 -->
        <GitCommitDetail class="commit-detail" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.git-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.git-header {
  height: 38px;
  padding: var(--spacing-lg);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  background-color: var(--color-bg-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--color-bg-primary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
}

.header-button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.header-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-button .badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: badge-pulse 2s ease-in-out infinite;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.header-info {
  flex: 1;
}

.view-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.project-path {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.git-content {
  flex: 1;
  display: flex;
  padding: var(--spacing-lg);
  overflow: hidden;
}

.git-empty,
.git-loading,
.git-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}

.retry-button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.retry-button:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.retry-button:active {
  transform: translateY(0);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  overflow: hidden;
  min-height: 0;
}

.commit-list,
.commit-detail {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.commit-list-card,
.commit-detail-card {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
</style>
