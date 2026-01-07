<script setup>
import { ref, watch, computed } from 'vue'
import { Close, FolderOpen } from '@icon-park/vue-next'
import { open } from '@tauri-apps/plugin-dialog'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:show', 'save'])

const formData = ref({
  name: '',
  type: 'url',
  target: ''
})

const isEditMode = computed(() => props.editData !== null)

// 监听对话框显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.editData) {
      // 编辑模式：填充现有数据
      formData.value = {
        name: props.editData.name,
        type: props.editData.type,
        target: props.editData.target
      }
    } else {
      // 新建模式：重置表单
      formData.value = {
        name: '',
        type: 'url',
        target: ''
      }
    }
  }
})

const handleClose = () => {
  emit('update:show', false)
}

// 选择文件夹
const handleSelectFolder = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false
    })

    if (selected) {
      formData.value.target = selected
    }
  } catch (err) {
    console.error('Failed to select folder:', err)
  }
}

// 选择应用程序
const handleSelectApp = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Executable',
        extensions: ['exe', 'app', 'sh', 'bat']
      }]
    })

    if (selected) {
      formData.value.target = selected
    }
  } catch (err) {
    console.error('Failed to select app:', err)
  }
}

const handleSave = () => {
  if (!formData.value.name || !formData.value.target) {
    alert('请填写所有必填字段')
    return
  }

  emit('save', {
    ...formData.value,
    ...(props.editData ? { id: props.editData.id } : {})
  })
  handleClose()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-mask">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">{{ isEditMode ? '编辑快捷方式' : '添加快捷方式' }}</h3>
            <button class="close-button" @click="handleClose">
              <Close :size="18" theme="outline" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">名称 *</label>
              <input
                v-model="formData.name"
                type="text"
                class="form-input"
                placeholder="输入快捷方式名称"
              />
            </div>

            <div class="form-group">
              <label class="form-label">类型 *</label>
              <div class="type-selector">
                <label class="type-option">
                  <input
                    v-model="formData.type"
                    type="radio"
                    value="url"
                  />
                  <span>网址</span>
                </label>
                <label class="type-option">
                  <input
                    v-model="formData.type"
                    type="radio"
                    value="app"
                  />
                  <span>应用程序</span>
                </label>
                <label class="type-option">
                  <input
                    v-model="formData.type"
                    type="radio"
                    value="folder"
                  />
                  <span>文件夹</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                {{ formData.type === 'url' ? '网址' : '路径' }} *
              </label>
              <div class="input-with-button">
                <input
                  v-model="formData.target"
                  type="text"
                  class="form-input"
                  :placeholder="
                    formData.type === 'url'
                      ? 'https://example.com'
                      : '选择路径'
                  "
                  :readonly="formData.type !== 'url'"
                />
                <button
                  v-if="formData.type === 'folder'"
                  class="browse-button"
                  @click="handleSelectFolder"
                >
                  <FolderOpen :size="16" theme="outline" />
                  选择
                </button>
                <button
                  v-if="formData.type === 'app'"
                  class="browse-button"
                  @click="handleSelectApp"
                >
                  <FolderOpen :size="16" theme="outline" />
                  选择
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <CartoonButton variant="secondary" @click="handleClose">
              取消
            </CartoonButton>
            <CartoonButton variant="primary" @click="handleSave">
              {{ isEditMode ? '保存' : '添加' }}
            </CartoonButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--spacing-xl);
}

.modal-container {
  background-color: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: var(--border-width) solid var(--color-border);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

.form-input:read-only {
  background-color: var(--color-bg-secondary);
  cursor: default;
}

.type-selector {
  display: flex;
  gap: var(--spacing-md);
}

.type-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.type-option input[type="radio"] {
  cursor: pointer;
}

.input-with-button {
  display: flex;
  gap: var(--spacing-xs);
}

.input-with-button .form-input {
  flex: 1;
}

.browse-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.browse-button:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: var(--border-width) solid var(--color-border);
}

/* 动画效果 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
