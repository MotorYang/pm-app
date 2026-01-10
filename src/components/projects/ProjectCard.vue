<script setup>
import { ref } from 'vue'
import { FolderOpen, Delete, Edit, Text } from '@icon-park/vue-next'
import CartoonCard from '@/components/ui/CartoonCard.vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import EditProjectModal from './EditProjectModal.vue'
import { useContextMenu } from '@/composables/useContextMenu'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'delete'])

const contextMenu = useContextMenu()
const showRenameModal = ref(false)
const showEditModal = ref(false)
const newName = ref('')
const renaming = ref(false)
const renameError = ref('')

const handleClick = () => {
  emit('click', props.project)
}

const handleContextMenu = (event) => {
  const menuItems = [
    {
      label: '重命名',
      icon: Text,
      action: () => handleRename()
    },
    {
      label: '编辑项目',
      icon: Edit,
      action: () => handleEdit()
    },
    { divider: true },
    {
      label: '删除项目',
      icon: Delete,
      danger: true,
      action: () => handleDelete()
    }
  ]
  contextMenu.show(event, menuItems)
}

const handleDelete = () => {
  emit('delete', props.project)
}

const handleRename = () => {
  newName.value = props.project.name
  renameError.value = ''
  showRenameModal.value = true
}

const handleEdit = () => {
  showEditModal.value = true
}

const handleRenameSubmit = async () => {
  if (!newName.value.trim()) {
    renameError.value = '请输入项目名称'
    return
  }

  renaming.value = true
  renameError.value = ''

  try {
    const { useProjectsStore } = await import('@/stores/projects')
    const projectsStore = useProjectsStore()
    await projectsStore.updateProject(props.project.id, { name: newName.value.trim() })
    showRenameModal.value = false
  } catch (e) {
    renameError.value = e.message || '重命名失败'
  } finally {
    renaming.value = false
  }
}

const handleCloseRenameModal = () => {
  showRenameModal.value = false
  newName.value = ''
  renameError.value = ''
}
</script>

<template>
  <CartoonCard
      hoverable
      shadow="sm"
      :padding="collapsed ? 'none' : 'sm'"
      :class="['project-card', { 'project-card-active': active, 'project-card-collapsed': collapsed }]"
      @click="handleClick"
      @contextmenu="handleContextMenu"
  >
    <div class="project-content" :class="{ collapsed }">
      <div class="project-icon" :style="{ color: project.color }" :title="collapsed ? project.name : ''">
        <FolderOpen :size="collapsed ? 20 : 24" theme="filled" />
      </div>
      <div v-if="!collapsed" class="project-info">
        <h4 class="project-name">{{ project.name }}</h4>
        <p class="project-path">{{ project.path }}</p>
      </div>
      <button
          v-if="!collapsed"
          class="project-delete-btn"
          @click.stop="handleDelete"
          title="删除项目"
      >
        <Delete :size="16" theme="outline" />
      </button>
    </div>
  </CartoonCard>

  <!-- 重命名弹窗 -->
  <CartoonModal
    :open="showRenameModal"
    title="重命名项目"
    size="sm"
    @close="handleCloseRenameModal"
  >
    <div class="rename-form">
      <CartoonInput
        v-model="newName"
        label="项目名称"
        placeholder="输入新的项目名称"
        required
        @keyup.enter="handleRenameSubmit"
      />

      <div v-if="renameError" class="error-message">
        {{ renameError }}
      </div>
    </div>

    <template #footer>
      <CartoonButton
        variant="ghost"
        @click="handleCloseRenameModal"
        :disabled="renaming"
      >
        取消
      </CartoonButton>
      <CartoonButton
        variant="primary"
        @click="handleRenameSubmit"
        :loading="renaming"
        :disabled="renaming"
      >
        重命名
      </CartoonButton>
    </template>
  </CartoonModal>

  <!-- 编辑项目弹窗 -->
  <EditProjectModal
    v-model:open="showEditModal"
    :project="project"
  />
</template>

<style scoped>
.project-card {
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: 5px;
}

.project-card-collapsed {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card-active {
  border-color: var(--color-primary);
  background-color: var(--color-bg-tertiary);
}

.project-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.project-content.collapsed {
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  gap: 0;
}

.project-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0; /* 移除行高影响 */
}

/* 修正图标垂直对齐 */
.project-icon :deep(svg) {
  display: block;
  vertical-align: middle;
}

.project-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.project-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.project-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.project-delete-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--border-radius-sm);
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast),
  background-color var(--transition-fast),
  color var(--transition-fast);
}

.project-delete-btn :deep(svg) {
  display: block;
}

.project-card:hover .project-delete-btn {
  opacity: 1;
}

.project-delete-btn:hover {
  background-color: var(--color-danger);
}

.rename-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.error-message {
  padding: var(--spacing-sm);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
</style>
