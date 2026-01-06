<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { open } from '@tauri-apps/plugin-dialog'
import { Setting, FolderOpen, Check } from '@icon-park/vue-next'
import CartoonModal from '@/components/ui/CartoonModal.vue'
import CartoonInput from '@/components/ui/CartoonInput.vue'
import CartoonButton from '@/components/ui/CartoonButton.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'update:show'])

const settingsStore = useSettingsStore()
const localEditorPath = ref('')
const saving = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  await settingsStore.loadSettings()
  localEditorPath.value = settingsStore.editorPath
})

const handleBrowseEditor = async () => {
  try {
    const selected = await open({
      title: '选择编辑器',
      multiple: false,
      filters: [{
        name: '可执行文件',
        extensions: ['exe', 'app', 'sh']
      }]
    })

    if (selected) {
      localEditorPath.value = selected
    }
  } catch (err) {
    errorMessage.value = '选择文件失败: ' + err.message
  }
}

const handleSave = async () => {
  try {
    saving.value = true
    errorMessage.value = ''

    await settingsStore.saveEditorPath(localEditorPath.value)

    // Close modal after successful save
    setTimeout(() => {
      handleClose()
    }, 500)
  } catch (err) {
    errorMessage.value = '保存设置失败: ' + err.message
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}
</script>

<template>
  <CartoonModal
    :open="show"
    title="设置"
    size="md"
    @close="handleClose"
  >
    <div class="settings-content">
      <!-- Editor Settings -->
      <div class="settings-section">
        <h3 class="section-title">
          <Setting :size="20" theme="outline" />
          编辑器设置
        </h3>

        <div class="form-group">
          <label class="form-label">默认编辑器路径</label>
          <p class="form-hint">设置用于打开文件的默认编辑器（如 VS Code, Sublime Text 等）</p>

          <div class="input-with-button">
            <CartoonInput
              v-model="localEditorPath"
              placeholder="例如: C:\Program Files\Microsoft VS Code\Code.exe"
            />
            <CartoonButton variant="secondary" @click="handleBrowseEditor">
              <FolderOpen :size="16" theme="outline" />
              浏览
            </CartoonButton>
          </div>

          <p class="form-hint hint-example">
            常用编辑器路径示例：<br>
            VS Code: <code>C:\Program Files\Microsoft VS Code\Code.exe</code><br>
            Notepad++: <code>C:\Program Files\Notepad++\notepad++.exe</code><br>
            Sublime Text: <code>C:\Program Files\Sublime Text\sublime_text.exe</code>
          </p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- Actions -->
      <div class="settings-actions">
        <CartoonButton variant="secondary" @click="handleClose">
          取消
        </CartoonButton>
        <CartoonButton
          variant="primary"
          @click="handleSave"
          :loading="saving"
          :disabled="saving"
        >
          <Check :size="16" theme="outline" />
          保存设置
        </CartoonButton>
      </div>
    </div>
  </CartoonModal>
</template>

<style scoped>
.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.hint-example code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-xs);
  background-color: var(--color-bg-tertiary);
  padding: 2px 4px;
  border-radius: var(--border-radius-sm);
  color: var(--color-accent);
}

.input-with-button {
  display: flex;
  gap: var(--spacing-sm);
}

.error-message {
  padding: var(--spacing-md);
  background-color: rgba(255, 71, 87, 0.1);
  border: var(--border-width) solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.settings-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-md);
  border-top: var(--border-width) solid var(--color-border);
}
</style>
