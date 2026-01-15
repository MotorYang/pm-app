<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Plus, MoreFour, FileText, Time,
  FilePdf, Picture, Code, FileZip, FileWord, Music, Video, FileHashOne, AllApplication
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

const projectCount = computed(() =>
  Array.isArray(projectsStore.projects) ? projectsStore.projects.length : 0
)

const shortcutCount = computed(() =>
  Array.isArray(shortcutsStore.shortcuts) ? shortcutsStore.shortcuts.length : 0
)

const recentDocCount = computed(() =>
  Array.isArray(documentsStore.recentDocuments) ? documentsStore.recentDocuments.length : 0
)

const recentProjects = computed(() => {
  if (!Array.isArray(projectsStore.projects)) return []
  return projectsStore.projects.slice(0, 4)
})

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
        <div class="welcome-top">
          <div class="welcome-title-block">
            <h1 class="welcome-title">
              <img :src="Logo" alt="logo" width="50px">
            </h1>
            <p class="welcome-subtitle">
              功能丰富的本地项目管理应用
            </p>
          </div>
          <div class="overview-card">
            <div class="overview-header">
              <div class="overview-title">今日概览</div>
              <div class="overview-subtitle">当前工作空间的一些关键数字</div>
            </div>
            <div class="overview-items">
              <div class="overview-item">
                <span class="overview-item-label">项目</span>
                <span class="overview-item-value">{{ projectCount }}</span>
              </div>
              <div class="overview-item">
                <span class="overview-item-label">最近文档</span>
                <span class="overview-item-value">{{ recentDocCount }}</span>
              </div>
              <div class="overview-item">
                <span class="overview-item-label">快捷方式</span>
                <span class="overview-item-value">{{ shortcutCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="home-main-grid">
          <div class="home-column">
            <div class="shortcuts-section">
              <div class="section-header">
                <h3 class="section-title">
                  <MoreFour :size="22" theme="outline" />
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
                  compact
                  @edit="handleEditShortcut"
                  @delete="handleDeleteShortcut"
                />
              </div>

              <div v-else class="no-shortcuts">
                <p>暂无快捷方式，点击右上角按钮添加</p>
              </div>
            </div>

            <div class="projects-section" v-if="recentProjects.length > 0">
              <div class="section-header">
                <h3 class="section-title">
                  <AllApplication :size="22" theme="outline" />
                  最近项目
                </h3>
              </div>
              <div class="projects-list">
                <div
                  v-for="project in recentProjects"
                  :key="project.id"
                  class="project-item"
                  @click="projectsStore.setActiveProject(project.id)"
                >
                  <div
                    class="project-color-dot"
                    :style="{ backgroundColor: project.color || '#4c6fff' }"
                  />
                  <div class="project-main">
                    <div class="project-name">{{ project.name }}</div>
                    <div class="project-path" v-if="project.path">{{ project.path }}</div>
                  </div>
                  <div class="project-enter">进入</div>
                </div>
              </div>
            </div>
          </div>

          <div class="home-column">
            <div class="recent-section">
              <div class="section-header">
                <h3 class="section-title">
                  <Time :size="22" theme="outline" />
                  最近文档
                </h3>
              </div>
              <div class="recent-list">
                <div
                    v-for="doc in documentsStore.recentDocuments"
                    :key="doc.id"
                    class="recent-item"
                    @click="handleOpenRecentDoc(doc)"
                >
                  <div
                    class="recent-icon-badge"
                    :style="{ backgroundColor: getFileIconColor(doc) + '22' }"
                  >
                    <component
                        :is="getFileIcon(doc)"
                        :size="14"
                        theme="outline"
                        class="recent-icon"
                        :style="{ color: getFileIconColor(doc) }"
                    />
                  </div>
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
  padding: var(--spacing-lg);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  overflow: hidden;
  background:
    radial-gradient(circle at 0% 0%, rgba(129, 212, 250, 0.18), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(244, 143, 177, 0.16), transparent 55%);
}

.welcome-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-align: left;
  flex-shrink: 0;
}

.welcome-title img {
  width: 60px;
  margin: 10px auto;
}

.welcome-subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  text-align: left;
  flex-shrink: 0;
}

.shortcuts-section {
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: none;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
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
  padding: 4px;
  border-radius: 999px;
  background-color: rgba(76, 111, 255, 0.08);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--spacing-sm);
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
  border: none;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
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
  padding: 6px var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.recent-item:hover {
  background-color: var(--color-bg-tertiary);
}

.recent-icon-badge {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recent-icon {
  flex-shrink: 0;
  transform: translateY(0);
}

.recent-doc-name {
  font-size: var(--font-size-xs);
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
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.welcome-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.welcome-title-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.overview-card {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-lg);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  min-width: 220px;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.overview-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.overview-subtitle {
  font-size: var(--font-size-xxs);
  color: var(--color-text-tertiary);
}

.overview-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--color-border);
}

.overview-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: var(--font-size-xs);
}

.overview-item-label {
  color: var(--color-text-secondary);
}

.overview-item-value {
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.home-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
  gap: var(--spacing-md);
  flex: 1;
  min-height: 0;
}

.home-column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  min-height: 0;
}

.projects-section {
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  border: none;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  overflow-y: auto;
}

.project-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 4px var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
}

.project-item:hover {
  background-color: var(--color-bg-tertiary);
  transform: translateY(-1px);
}

.project-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex-shrink: 0;
}

@keyframes float-soft {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0px);
  }
}

.shortcuts-section,
.recent-section,
.projects-section {
  animation: float-soft 9s ease-in-out infinite;
}

.project-main {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-path {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-enter {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .welcome-section {
    padding: var(--spacing-md);
  }

  .welcome-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .home-main-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
