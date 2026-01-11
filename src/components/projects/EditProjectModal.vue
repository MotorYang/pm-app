<script setup>
import { ref, watch } from 'vue'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import { useTauri } from '@/composables/useTauri'
import { useProjectsStore } from '@/stores/projects'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'update:open'])

const projectsStore = useProjectsStore()
const { selectFolder } = useTauri()

const formData = ref({
  name: '',
  path: '',
  description: '',
  color: '#FF6B9D'
})

const loading = ref(false)
const error = ref('')

watch(() => props.open, (newValue) => {
  if (newValue && props.project) {
    // 填充表单数据
    formData.value = {
      name: props.project.name || '',
      path: props.project.path || '',
      description: props.project.description || '',
      color: props.project.color || '#FF6B9D'
    }
    error.value = ''
  }
})

const handleSelectFolder = async () => {
  const folder = await selectFolder()
  if (folder) {
    formData.value.path = folder
  }
}

const handleSubmit = async () => {
  error.value = ''

  if (!formData.value.name.trim()) {
    error.value = '请输入项目名称'
    return
  }

  if (!formData.value.path.trim()) {
    error.value = '请选择项目路径'
    return
  }

  loading.value = true
  try {
    await projectsStore.updateProject(props.project.id, {
      name: formData.value.name,
      path: formData.value.path,
      description: formData.value.description || null,
      color: formData.value.color
    })
    handleClose()
  } catch (e) {
    error.value = e.message || '更新项目失败'
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('update:open', false)
  emit('close')
}
</script>

<template>
  <CartoonModal
    :open="open"
    title="编辑项目"
    size="md"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="edit-project-form">
      <CartoonInput
        v-model="formData.name"
        label="项目名称"
        placeholder="输入项目名称"
        required
      />

      <div class="path-input-group">
        <CartoonInput
          v-model="formData.path"
          label="项目路径"
          placeholder="选择项目文件夹"
          readonly
          required
        />
        <CartoonButton
          type="button"
          variant="secondary"
          @click="handleSelectFolder"
        >
          选择文件夹
        </CartoonButton>
      </div>

      <CartoonInput
        v-model="formData.description"
        label="项目描述（可选）"
        placeholder="输入项目描述"
      />

      <div class="color-input-group">
        <label class="color-label">项目颜色</label>
        <input
          v-model="formData.color"
          type="color"
          class="color-picker"
        />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </form>

    <template #footer>
      <CartoonButton
        variant="ghost"
        @click="handleClose"
        :disabled="loading"
      >
        取消
      </CartoonButton>
      <CartoonButton
        variant="primary"
        @click="handleSubmit"
        :loading="loading"
        :disabled="loading"
      >
        保存
      </CartoonButton>
    </template>
  </CartoonModal>
</template>

<style scoped>
.edit-project-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.path-input-group {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
}

.path-input-group > :first-child {
  flex: 1;
}

.color-input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.color-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.color-picker {
  width: 60px;
  height: 40px;
  border-radius: var(--border-radius-md);
  border: var(--border-width) solid var(--color-border);
  cursor: pointer;
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
