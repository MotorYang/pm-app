<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {Time, FileText, Plus, MoreFour} from '@icon-park/vue-next'
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
import CartoonButton from '@/components/ui/CartoonButton.vue'
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
  updateNow,
  updateLater,
  handleSkipVersion,
  initUpdater
} = useUpdater()

const hasActiveProject = computed(() => projectsStore.activeProject !== null)

onMounted(() => {
  documentsStore.loadRecentDocuments()
  // 启动时检查更新
  initUpdater()
})

// 返回欢迎页面时刷新最近文档列表
watch(hasActiveProject, (hasProject) => {
  if (!hasProject) {
    documentsStore.loadRecentDocuments()
  }
})

// 打开最近文档
const handleOpenRecentDoc = async (doc) => {
  // 先切换到对应项目
  await projectsStore.setActiveProject(doc.project_id)
  // 加载项目文档
  await documentsStore.loadDocuments(doc.project_id)
  // 打开文档
  await documentsStore.openDocument(doc.id)
}

// 格式化时间
const formatTime = (dateStr) => {
  if (!dateStr) return ''
  // SQLite CURRENT_TIMESTAMP 返回 UTC 时间，格式为 "YYYY-MM-DD HH:MM:SS"
  // 需要添加 'Z' 后缀让 JS 正确解析为 UTC
  const normalizedStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z'
  const date = new Date(normalizedStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN')
}

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

        <div v-if="documentsStore.recentDocuments.length > 0" class="recent-section">
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
              <FileText :size="14" theme="outline" class="recent-icon" />
              <span class="recent-doc-name">{{ doc.title }}.md</span>
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
