<script setup>
import { onMounted, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useFilesStore } from '@/stores/files'
import { Refresh } from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import FileTypeStats from '@/components/files/FileTypeStats.vue'
import LargestFiles from '@/components/files/LargestFiles.vue'

const projectsStore = useProjectsStore()
const filesStore = useFilesStore()

onMounted(() => {
  if (projectsStore.activeProject) {
    analyzeCurrentProject()
  }
})

watch(() => projectsStore.activeProject, (newProject) => {
  if (newProject) {
    analyzeCurrentProject()
  } else {
    filesStore.clearStats()
  }
})

const analyzeCurrentProject = async () => {
  if (projectsStore.activeProject) {
    await filesStore.analyzeProject(projectsStore.activeProject.path)
  }
}
</script>

<template>
  <div class="files-view">
    <div class="files-header">
      <CartoonButton
        v-if="projectsStore.activeProject"
        variant="primary"
        @click="analyzeCurrentProject"
        :loading="filesStore.loading"
        :disabled="filesStore.loading"
      >
        <Refresh :size="16" theme="outline" />
      </CartoonButton>
    </div>

    <div v-if="!projectsStore.activeProject" class="files-empty">
      <p>请先选择一个项目</p>
    </div>

    <div v-else-if="filesStore.loading" class="files-loading">
      <div class="loading-spinner"></div>
      <p>正在分析项目文件...</p>
      <p class="loading-progress">已扫描 {{ filesStore.scanProgress }} 个文件</p>
    </div>

    <div v-else-if="filesStore.error" class="files-error">
      <p>分析失败: {{ filesStore.error }}</p>
      <CartoonButton variant="primary" @click="analyzeCurrentProject">
        重试
      </CartoonButton>
    </div>

    <div v-else-if="filesStore.fileStats.length === 0" class="files-empty">
      <p>未找到文件</p>
    </div>

    <div v-else class="files-content">
      <!-- 统计概览 -->
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-label">总文件数</div>
          <div class="stat-value">{{ filesStore.totalFiles.toLocaleString() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总大小</div>
          <div class="stat-value">{{ filesStore.formatSize(filesStore.totalSize) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">文件类型</div>
          <div class="stat-value">{{ filesStore.fileTypeStats.length }}</div>
        </div>
      </div>

      <!-- 文件类型统计 -->
      <FileTypeStats :stats="filesStore.fileTypeStats" />

      <!-- 最大文件列表 -->
      <LargestFiles :files="filesStore.largestFiles" />
    </div>
  </div>
</template>

<style scoped>
.files-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.files-header {
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

.files-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.files-empty,
.files-loading,
.files-error {
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

.loading-progress {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  text-align: center;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.stat-value {
  font-size: var(--font-size-xxl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}
</style>
