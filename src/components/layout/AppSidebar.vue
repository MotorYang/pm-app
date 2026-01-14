<script setup>
import { ref, onMounted } from 'vue'
import { Plus, MenuFold, MenuUnfold, Tool, Github, Box, Cup, ApplicationMenu, Code, LinkOne, DatabaseNetwork, Api, Terminal, FileCode, DocumentFolder, Search } from '@icon-park/vue-next'
import { open } from '@tauri-apps/plugin-shell'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import ProjectCard from '@/components/projects/ProjectCard.vue'
import AddProjectModal from '@/components/projects/AddProjectModal.vue'
import { useProjectsStore } from '@/stores/projects'
import { useConfirm } from "@/composables/useConfirm.js";

const projectsStore = useProjectsStore()
const confirmDialog = useConfirm()
const showAddModal = ref(false)

// Sidebar collapse state
const isCollapsed = ref(false)

// 工具栏展开状态
const isToolbarExpanded = ref(false)

// 常用工具站列表
const toolLinks = [
  { name: 'GitHub', url: 'https://github.com', icon: Github },
  { name: 'Docker Hub', url: 'https://hub.docker.com', icon: Box },
  { name: 'Maven Repo', url: 'https://mvnrepository.com', icon: ApplicationMenu },
  { name: 'Oracle JDK', url: 'https://www.oracle.com/java/technologies/downloads/', icon: Cup },
  { name: 'Python', url: 'https://www.python.org', icon: Code },
  { name: 'NPM', url: 'https://www.npmjs.com', icon: LinkOne },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: Search },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: DocumentFolder },
  { name: 'Can I Use', url: 'https://caniuse.com', icon: Terminal },
  { name: 'Regex101', url: 'https://regex101.com', icon: FileCode },
  { name: 'JSON Editor', url: 'https://jsoneditoronline.org', icon: Api },
  { name: 'Postman', url: 'https://www.postman.com', icon: Api },
  { name: 'Redis Docs', url: 'https://redis.io/docs', icon: DatabaseNetwork },
  { name: 'MySQL Docs', url: 'https://dev.mysql.com/doc/', icon: DatabaseNetwork },
  { name: 'Vue.js', url: 'https://vuejs.org', icon: Code },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com', icon: FileCode },
]

const toggleToolbar = () => {
  isToolbarExpanded.value = !isToolbarExpanded.value
}

const openToolLink = (url) => {
  open(url)
}

// 拖拽状态
const dragIndex = ref(null)
const dragOverIndex = ref(null)

// Load collapse state from localStorage
onMounted(() => {
  const savedState = localStorage.getItem('sidebar-collapsed')
  if (savedState !== null) {
    isCollapsed.value = savedState === 'true'
  }
})

onMounted(() => {
  projectsStore.loadProjects()
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebar-collapsed', isCollapsed.value.toString())
}

const handleProjectClick = (project) => {
  projectsStore.setActiveProject(project.id)
}

const handleDeleteProject = async (project) => {
  const result = await confirmDialog({
    title: '删除项目',
    message: '该操作不可撤销，是否继续？',
    danger: true,
    confirmText: '删除',
    cancelText: '取消'
  })

  if (result) {
    await projectsStore.deleteProject(project.id)
  }
}

// 拖拽排序 - 使用鼠标事件实现
const isDragging = ref(false)
const dragStartY = ref(0)
const dragElement = ref(null)

const handleMouseDown = (event, index) => {
  // 只响应左键
  if (event.button !== 0) return

  dragIndex.value = index
  dragStartY.value = event.clientY
  isDragging.value = false
  dragElement.value = event.currentTarget

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event) => {
  if (dragIndex.value === null) return

  // 判断是否开始拖拽（移动超过5px）
  if (!isDragging.value && Math.abs(event.clientY - dragStartY.value) > 5) {
    isDragging.value = true
  }

  if (!isDragging.value) return

  // 找到鼠标下的元素
  const elements = document.querySelectorAll('.project-drag-wrapper')
  elements.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    const midY = rect.top + rect.height / 2

    if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
      if (event.clientY < midY) {
        dragOverIndex.value = index
      } else {
        dragOverIndex.value = index + 1
      }
    }
  })
}

const handleMouseUp = () => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  if (isDragging.value && dragIndex.value !== null && dragOverIndex.value !== null) {
    let toIndex = dragOverIndex.value
    if (toIndex > dragIndex.value) {
      toIndex -= 1
    }
    if (toIndex !== dragIndex.value) {
      projectsStore.reorderProjects(dragIndex.value, toIndex)
    }
  }

  dragIndex.value = null
  dragOverIndex.value = null
  isDragging.value = false
  dragElement.value = null
}
</script>

<template>
  <aside class="app-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <button class="toggle-btn" @click="toggleCollapse" :title="isCollapsed ? '展开侧边栏' : '收缩侧边栏'">
        <MenuUnfold v-if="isCollapsed" :size="20" theme="outline" />
        <MenuFold v-else :size="20" theme="outline" />
      </button>
      <h3 v-if="!isCollapsed" class="sidebar-title">项目列表</h3>
      <CartoonButton
        v-if="!isCollapsed"
        variant="primary"
        size="sm"
        @click="showAddModal = true"
      >
        <Plus :size="16" theme="outline" />
        添加
      </CartoonButton>
    </div>

    <div class="sidebar-content">
      <div v-if="projectsStore.loading && !isCollapsed" class="sidebar-loading">
        加载中...
      </div>

      <div v-else-if="projectsStore.projects.length === 0 && !isCollapsed" class="sidebar-empty">
        <p>还没有项目</p>
        <p class="empty-hint">点击上方按钮添加项目</p>
      </div>

      <div v-else class="projects-list">
        <div
          v-for="(project, index) in projectsStore.projects"
          :key="project.id"
          class="project-drag-wrapper"
          :class="{
            dragging: isDragging && dragIndex === index,
            'drag-over-above': dragOverIndex === index && dragIndex !== index,
            'drag-over-below': dragOverIndex === index + 1 && dragIndex !== index
          }"
          @mousedown="handleMouseDown($event, index)"
        >
          <ProjectCard
            :project="project"
            :active="project.id === projectsStore.activeProjectId"
            :collapsed="isCollapsed"
            :compact="!isCollapsed"
            @click="handleProjectClick"
            @delete="handleDeleteProject"
          />
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="toolbar-section" :class="{ expanded: isToolbarExpanded, collapsed: isCollapsed }">
      <button class="toolbar-toggle" @click="toggleToolbar" :title="isToolbarExpanded ? '收起工具栏' : '展开工具栏'">
        <Tool :size="18" theme="outline" />
        <span v-if="!isCollapsed" class="toolbar-title">常用工具</span>
        <MenuUnfold v-if="!isCollapsed && !isToolbarExpanded" :size="14" theme="outline" class="toolbar-arrow" />
        <MenuFold v-if="!isCollapsed && isToolbarExpanded" :size="14" theme="outline" class="toolbar-arrow" />
      </button>
      <div v-if="isToolbarExpanded" class="toolbar-links">
        <button
          v-for="tool in toolLinks"
          :key="tool.name"
          class="tool-link"
          @click="openToolLink(tool.url)"
          :title="tool.name"
        >
          <component :is="tool.icon" :size="16" theme="outline" />
          <span class="tool-name">{{ tool.name }}</span>
        </button>
      </div>
    </div>

    <AddProjectModal
      v-model:open="showAddModal"
      @close="showAddModal = false"
    />
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 250px;
  height: 100%;
  background-color: var(--color-bg-secondary);
  border-right: var(--border-width) solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-normal);
  overflow: hidden;
}

.app-sidebar.collapsed {
  width: 60px;
  overflow: visible;
}

.sidebar-header {
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  height: 38px;
}

.collapsed .sidebar-header {
  justify-content: center;
  padding: var(--spacing-md) var(--spacing-sm);
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
  flex-shrink: 0;
  line-height: 1;
}

.toggle-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.sidebar-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.sidebar-content::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.collapsed .sidebar-content {
  padding: var(--spacing-sm);
}

.sidebar-loading {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.sidebar-empty {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.sidebar-empty p {
  margin: var(--spacing-sm) 0;
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.collapsed .projects-list {
  align-items: center;
}

.project-drag-wrapper {
  position: relative;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
  border-radius: var(--border-radius-md);
}

.project-drag-wrapper.dragging {
  opacity: 0.5;
}

.project-drag-wrapper.drag-over {
  transform: translateY(4px);
}

.project-drag-wrapper.drag-over::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-primary);
  border-radius: 1px;
}

/* 工具栏样式 */
.toolbar-section {
  border-top: var(--border-width) solid var(--color-border);
  background-color: var(--color-bg-secondary);
  flex-shrink: 0;
  position: relative;
}

.toolbar-toggle {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  text-align: left;
}

.toolbar-toggle:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.toolbar-section.collapsed .toolbar-toggle {
  justify-content: center;
  padding: var(--spacing-sm);
}

.toolbar-title {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.toolbar-arrow {
  opacity: 0.6;
}

.toolbar-links {
  display: flex;
  flex-direction: column;
  padding: 0 var(--spacing-sm) var(--spacing-sm);
  gap: var(--spacing-xs);
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.toolbar-links::-webkit-scrollbar {
  display: none;
}

.toolbar-section.collapsed .toolbar-links {
  position: absolute;
  left: 100%;
  bottom: 0;
  min-width: 160px;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
  margin-left: var(--spacing-xs);
  max-height: 300px;
  z-index: 100;
}

.tool-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: none;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
  line-height: 1;
}

.tool-link :deep(svg) {
  flex-shrink: 0;
  vertical-align: middle;
}

.tool-link:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-primary);
}

.toolbar-section.collapsed .tool-link {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  justify-content: flex-start;
}

.tool-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  display: flex;
  align-items: center;
}
</style>
