<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Plus, MoreFour, FileText, Time,
  FilePdf, Picture, Code, FileZip, FileWord, Music, Video, FileHashOne
} from '@icon-park/vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProjectView from '@/views/ProjectView.vue'
import ShortcutCard from '@/components/shortcuts/ShortcutCard.vue'
import ShortcutDialog from '@/components/shortcuts/ShortcutDialog.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import UpdateModal from '@/components/update/UpdateModal.vue'
import { useProjectsStore } from '@/stores/projects'
import { useShortcutsStore } from '@/stores/shortcuts'
import { useDocumentsStore } from '@/stores/documents'
import { useConfirm } from '@/composables/useConfirm'
import { useUpdater } from '@/composables/useUpdater'
import { getFileType, fileTypeColors } from '@/utils/fileTypes'
import Logo from '@/assets/logo.png'

const projectsStore = useProjectsStore()
const shortcutsStore = useShortcutsStore()
const documentsStore = useDocumentsStore()
const confirmDialog = useConfirm()

// 更新器
const {
  showUpdateModal,
  currentVersion,
  newVersion,
  releaseNotes,
  downloading,
  downloadProgress,
  downloaded,
  updateError,
  updateNow,
  updateLater,
  handleSkipVersion,
  initUpdater
} = useUpdater()

const hasActiveProject = computed(() => projectsStore.activeProject !== null)

onMounted(() => {
  // 启动时检查更新
  initUpdater()
})

const showShortcutDialog = ref(false)
const editingShortcut = ref(null)

// 快捷方式处理
const handleAddShortcut = () => {
  editingShortcut.value = null
  showShortcutDialog.value = true
}

const handleEditShortcut = (shortcut) => {
  editingShortcut.value = shortcut
  showShortcutDialog.value = true
}

const handleDeleteShortcut = async (id) => {
  const confirm = await confirmDialog(
      {
        title: '删除快捷方式',
        message: '该操作不可撤销，是否继续？',
        danger: true,
        confirmText: '删除',
        cancelText: '取消'
      }
  )

  if (confirm) {
    try {
      await shortcutsStore.deleteShortcut(id);
    } catch (e) {
      alert('删除失败: ' + (e.message || '未知错误'))
    }
  }
}

const handleSaveShortcut = (data) => {
  if (data.id) {
    // 编辑模式
    shortcutsStore.updateShortcut(data.id, data)
  } else {
    // 新建模式
    shortcutsStore.addShortcut(data)
  }
}

const handleOpenRecentDoc = async (doc) => {
  if (!doc || !doc.project_id) {
    return
  }

  const project =
    Array.isArray(projectsStore.projects)
      ? projectsStore.projects.find(p => p.id === doc.project_id)
      : null

  if (!project) {
    alert('对应项目不存在，可能已被删除')
    return
  }

  try {
    if (!projectsStore.activeProject || projectsStore.activeProject.id !== doc.project_id) {
      await projectsStore.setActiveProject(doc.project_id)
    }

    await documentsStore.loadDocuments(doc.project_id)

    if (doc.path) {
      await documentsStore.openDocumentByPath(doc.path, doc.project_id)
    } else if (doc.id) {
      await documentsStore.openDocumentByType(doc.id)
    }
  } catch (e) {
    alert('打开文档失败: ' + (e.message || '未知错误'))
  }
}

// 获取文件类型图标
const getFileIcon = (doc) => {
  let type = doc.type
  if (!type && doc.file_ext) {
    type = getFileType(doc.file_ext)
  } else if (!type && doc.title) {
    const parts = doc.title.split('.')
    if (parts.length > 1) {
      type = getFileType(parts[parts.length - 1])
    }
  }

  if (!type) type = 'markdown'

  switch (type) {
    case 'pdf': return FilePdf
    case 'image': return Picture
    case 'text': return FileText
    case 'code': return Code
    case 'archive': return FileZip
    case 'office': return FileWord
    case 'audio': return Music
    case 'video': return Video
    case 'file': return FileHashOne
    default: return FileText
  }
}

// 获取文件类型颜色
const getFileIconColor = (doc) => {
  let type = doc.type
  if (!type && doc.file_ext) {
    type = getFileType(doc.file_ext)
  } else if (!type && doc.title) {
    const parts = doc.title.split('.')
    if (parts.length > 1) {
      type = getFileType(parts[parts.length - 1])
    }
  }

  if (!type) type = 'markdown'
  return fileTypeColors[type] || fileTypeColors.markdown
}

// 获取文档显示名称
const getDocDisplayName = (doc) => {
  if (!doc.title) return 'Untitled'
  
  // 如果有明确的扩展名
  if (doc.file_ext) {
    // 检查标题是否已经包含了扩展名
    if (doc.title.toLowerCase().endsWith('.' + doc.file_ext.toLowerCase())) {
      return doc.title
    }
    return `${doc.title}.${doc.file_ext}`
  }
  
  // 兼容旧数据：如果没有扩展名且标题不包含点号，默认显示为 .md
  if (!doc.title.includes('.')) {
    return `${doc.title}.md`
  }

  return doc.title
}

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 7) return `${diffDay} 天前`

  return date.toLocaleDateString()
}
</script>

<template>
  <div class="app">
    <AppHeader />
    <AppLayout>
      <!-- Welcome screen when no project is selected -->
      <div v-if="!hasActiveProject" class="welcome-section animate-fade-in">
        <h1 class="welcome-title">
          <img :src="Logo" alt="logo" width="50px">
        </h1>
        <p class="welcome-subtitle">
          功能丰富的本地项目管理应用
        </p>

        <!-- 快捷方式区域 -->
        <div class="shortcuts-section">
          <div class="section-header">
            <h3 class="section-title">
              <MoreFour :size="16" theme="outline" />
              快捷方式
            </h3>
            <button @click="handleAddShortcut">
              <Plus :size="16" theme="outline" />
            </button>
          </div>

          <div v-if="shortcutsStore.shortcuts.length > 0" class="shortcuts-grid">
            <ShortcutCard
              v-for="shortcut in shortcutsStore.shortcuts"
              :key="shortcut.id"
              :shortcut="shortcut"
              @edit="handleEditShortcut"
              @delete="handleDeleteShortcut"
            />
          </div>

          <div v-else class="no-shortcuts">
            <p>暂无快捷方式，点击右上角按钮添加</p>
          </div>
        </div>

        <div class="recent-section">
          <h3 class="section-title">
            <Time :size="16" theme="outline" />
            最近文档
          </h3>
          <div class="recent-list">
            <div
                v-for="doc in documentsStore.recentDocuments"
                :key="doc.id"
                class="recent-item"
                @click="handleOpenRecentDoc(doc)"
            >
              <component
                  :is="getFileIcon(doc)"
                  :size="14"
                  theme="outline"
                  class="recent-icon"
                  :style="{ color: getFileIconColor(doc) }"
              />
              <span class="recent-doc-name">{{ getDocDisplayName(doc) }}</span>
              <span
                  class="recent-project-tag"
                  :style="{ backgroundColor: doc.project_color + '20', color: doc.project_color }"
              >
                {{ doc.project_name }}
              </span>
              <span class="recent-time">{{ formatTime(doc.updated_at) }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Project view when a project is selected -->
      <ProjectView v-else />
    </AppLayout>

    <!-- 快捷方式对话框 -->
    <ShortcutDialog
      v-model:show="showShortcutDialog"
      :edit-data="editingShortcut"
      @save="handleSaveShortcut"
    />

    <!-- 全局右键菜单 -->
    <ContextMenu />

    <!-- 更新提示弹窗 -->
    <UpdateModal
      v-model:show="showUpdateModal"
      :current-version="currentVersion"
      :new-version="newVersion"
      :release-notes="releaseNotes"
      :downloading="downloading"
      :download-progress="downloadProgress"
      :downloaded="downloaded"
      :error="updateError"
      @update-now="updateNow"
      @update-later="updateLater"
      @skip-version="handleSkipVersion"
    />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.welcome-section {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.welcome-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-align: center;
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
}

.welcome-title img {
  width: 60px;
  margin: 10px auto;
}

.welcome-subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.shortcuts-section {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: var(--border-width) solid var(--color-border);
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: 10px;

  display: flex;
  align-items: center;
}

.section-header > button {
  color: var(--color-text-secondary);
}

.section-title :deep(svg) {
  display: block;
  margin-right: var(--spacing-xs);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 180px));
  gap: var(--spacing-md);
}

.no-shortcuts {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.recent-section {
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: var(--border-width) solid var(--color-border);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.recent-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.recent-item:hover {
  background-color: var(--color-bg-tertiary);
}

.recent-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.recent-doc-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-project-tag {
  font-size: var(--font-size-xs);
  padding: 2px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  flex-shrink: 0;
}

.recent-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
</style>
