<script setup>
import { ref, onMounted, watch } from 'vue'
import DocumentList from '@/components/documents/DocumentList.vue'
import DocumentSplitView from '@/components/documents/DocumentSplitView.vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import { useDocumentsStore } from '@/stores/documents'
import { useProjectsStore } from '@/stores/projects'

const documentsStore = useDocumentsStore()
const projectsStore = useProjectsStore()

const showCreateModal = ref(false)
const newFileName = ref('')
const creating = ref(false)
const createError = ref('')

onMounted(() => {
  if (projectsStore.activeProject) {
    documentsStore.loadDocuments(projectsStore.activeProject.id)
  }
})

// Watch for active project changes
watch(() => projectsStore.activeProject, (newProject) => {
  if (newProject) {
    documentsStore.loadDocuments(newProject.id)
  } else {
    documentsStore.documents = []
    documentsStore.closeDocument()
  }
})

const handleCreate = () => {
  showCreateModal.value = true
  newFileName.value = ''
  createError.value = ''
}

const handleCreateSubmit = async () => {
  if (!newFileName.value.trim()) {
    createError.value = '请输入文件名'
    return
  }

  creating.value = true
  createError.value = ''

  try {
    await documentsStore.createDocument(projectsStore.activeProject.id, newFileName.value.trim())
    showCreateModal.value = false
    newFileName.value = ''
  } catch (e) {
    createError.value = e.message || '创建文档失败'
  } finally {
    creating.value = false
  }
}

const handleCloseModal = () => {
  showCreateModal.value = false
  newFileName.value = ''
  createError.value = ''
}
</script>

<template>
  <div class="documents-view">
    <div class="documents-sidebar">
      <DocumentList @create="handleCreate" />
    </div>

    <div class="documents-main">
      <DocumentSplitView />
    </div>

    <CartoonModal
      :open="showCreateModal"
      title="新建文档"
      size="sm"
      @close="handleCloseModal"
    >
      <div class="create-form">
        <CartoonInput
          v-model="newFileName"
          label="文件名"
          placeholder="输入文件名 (例如: README.md)"
          required
          @keyup.enter="handleCreateSubmit"
        />

        <div v-if="createError" class="error-message">
          {{ createError }}
        </div>
      </div>

      <template #footer>
        <CartoonButton
          variant="ghost"
          @click="handleCloseModal"
          :disabled="creating"
        >
          取消
        </CartoonButton>
        <CartoonButton
          variant="primary"
          @click="handleCreateSubmit"
          :loading="creating"
          :disabled="creating"
        >
          创建
        </CartoonButton>
      </template>
    </CartoonModal>
  </div>
</template>

<style scoped>
.documents-view {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.documents-sidebar {
  width: 200px;
  height: 100%;
  border-right: var(--border-width) solid var(--color-border);
  flex-shrink: 0;
}

.documents-main {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.create-form {
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
