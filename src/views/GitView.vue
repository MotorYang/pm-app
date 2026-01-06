<script setup>
import { onMounted, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useGitStore } from '@/stores/git'
import {Home, Refresh} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import GitBranchPanel from '@/components/git/GitBranchPanel.vue'
import GitCommitList from '@/components/git/GitCommitList.vue'
import GitCommitDetail from '@/components/git/GitCommitDetail.vue'

const projectsStore = useProjectsStore()
const gitStore = useGitStore()

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
      <CartoonButton
        v-if="projectsStore.activeProject"
        variant="primary"
        @click="handleRefresh"
        :loading="gitStore.loading"
        :disabled="gitStore.loading"
      >
        <Refresh :size="16" theme="outline" />
      </CartoonButton>
    </div>

    <div v-if="!projectsStore.activeProject" class="git-empty">
      <p>请先选择一个项目</p>
    </div>

    <div v-else-if="gitStore.loading && !gitStore.currentBranch" class="git-loading">
      <div class="loading-spinner"></div>
      <p>正在加载Git仓库信息...</p>
    </div>

    <div v-else-if="gitStore.error" class="git-error">
      <p>{{ gitStore.error }}</p>
      <CartoonButton variant="primary" @click="handleRefresh">
        重试
      </CartoonButton>
    </div>

    <div v-else class="git-content">
      <!-- 分支面板 -->
      <GitBranchPanel class="branch-panel" />

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
  height: 48px;
  padding: var(--spacing-lg);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  gap: var(--spacing-md);
  background-color: var(--color-bg-secondary);
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
  flex-direction: column;
  gap: var(--spacing-md);
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

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.branch-panel {
  flex-shrink: 0;
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
