<script setup>
import { FileText, FolderOpen } from '@icon-park/vue-next'
import { useFilesStore } from '@/stores/files'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import { useTauri } from '@/composables/useTauri.js'

const props = defineProps({
  files: {
    type: Array,
    required: true
  }
})

const filesStore = useFilesStore()
const tauri = useTauri()

// 打开文件所在文件夹
async function openFileLocation(file) {
  try {
    // 获取文件所在目录
    const dirPath = file.fullPath.substring(0, file.fullPath.lastIndexOf('\\'))
    await tauri.invokeCommand('open_in_file_explorer', {
      path: dirPath
    })
  } catch (e) {
    console.error('Failed to open file location:', e)
  }
}

// 获取文件图标颜色
function getFileColor(extension) {
  const colorMap = {
    js: '#F7DF1E',
    jsx: '#61DAFB',
    ts: '#3178C6',
    tsx: '#3178C6',
    vue: '#42B883',
    py: '#3776AB',
    java: '#007396',
    cpp: '#00599C',
    c: '#A8B9CC',
    rs: '#DEA584',
    go: '#00ADD8',
    html: '#E34F26',
    css: '#1572B6',
    json: '#292929',
    md: '#000000',
  }
  return colorMap[extension] || '#6C757D'
}
</script>

<template>
  <CartoonCard class="largest-files">
    <h3 class="section-title">最大文件 (Top 20)</h3>

    <div v-if="files.length === 0" class="no-data">
      <p>暂无数据</p>
    </div>

    <div v-else class="files-list">
      <div
        v-for="(file, index) in files"
        :key="file.fullPath"
        class="file-item"
        @click="openFileLocation(file)"
      >
        <div class="file-rank">{{ index + 1 }}</div>

        <div class="file-icon" :style="{ color: getFileColor(file.extension) }">
          <FileText :size="20" theme="outline" />
        </div>

        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-path">{{ file.path }}</div>
        </div>

        <div class="file-meta">
          <div class="file-type">{{ file.type }}</div>
          <div class="file-size">{{ filesStore.formatSize(file.size) }}</div>
        </div>

        <button class="file-action" title="在文件管理器中打开">
          <FolderOpen :size="16" theme="outline" />
        </button>
      </div>
    </div>
  </CartoonCard>
</template>

<style scoped>
.largest-files {
  padding: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-lg) 0;
}

.no-data {
  text-align: center;
  padding: var(--spacing-xl);
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
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.file-item:hover {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border);
  transform: translateX(2px);
}

.file-rank {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-tertiary);
  min-width: 24px;
  text-align: center;
}

.file-item:nth-child(1) .file-rank {
  color: #FFD700;
}

.file-item:nth-child(2) .file-rank {
  color: #C0C0C0;
}

.file-item:nth-child(3) .file-rank {
  color: #CD7F32;
}

.file-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.file-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.file-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
  padding: 2px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
}

.file-size {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.file-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius-sm);
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
}

.file-item:hover .file-action {
  opacity: 1;
}

.file-action:hover {
  background-color: var(--color-primary);
  color: white;
}
</style>
