<script setup>
import { ref, onMounted } from 'vue'
import { Plus, MenuFold, MenuUnfold } from '@icon-park/vue-next'
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
            @click="handleProjectClick"
            @delete="handleDeleteProject"
          />
        </div>
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
}

.sidebar-header {
  padding: var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  height: 48px;
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
  font-size: var(--font-size-lg);
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
  gap: var(--spacing-sm);
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
</style>
