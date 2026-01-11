<script setup>
import {ref, computed} from 'vue'
import {Refresh, Download, Close, CheckOne} from '@icon-park/vue-next'
import CartoonButton from '@/components/ui/CartoonButton.vue'
import Logo from '@/assets/logo.png'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentVersion: {
    type: String,
    default: ''
  },
  newVersion: {
    type: String,
    default: ''
  },
  releaseNotes: {
    type: String,
    default: ''
  },
  downloading: {
    type: Boolean,
    default: false
  },
  downloadProgress: {
    type: Number,
    default: 0
  },
  downloaded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'update-now', 'update-later', 'skip-version'])

const handleClose = () => {
  emit('update:show', false)
}

const handleUpdateNow = () => {
  emit('update-now')
}

const handleUpdateLater = () => {
  emit('update-later')
  handleClose()
}

const handleSkipVersion = () => {
  emit('skip-version')
  handleClose()
}

const progressPercent = computed(() => {
  return Math.round(props.downloadProgress * 100)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="update-backdrop" @click.self="handleClose">
        <Transition name="modal-slide">
          <div v-if="show" class="update-dialog">
            <!-- 头部 -->
            <div class="update-header">
              <img :src="Logo" alt="logo" class="update-logo"/>
              <div class="update-title">发现新版本</div>
              <div class="update-versions">
                <span class="version-old">v{{ currentVersion }}</span>
                <span class="version-arrow">→</span>
                <span class="version-new">v{{ newVersion }}</span>
              </div>
            </div>

            <!-- 内容 -->
            <div class="update-body">
              <div v-if="releaseNotes" class="release-notes">
                <div class="notes-title">更新内容</div>
                <div class="notes-content">{{ releaseNotes }}</div>
              </div>

              <!-- 下载进度 -->
              <div v-if="downloading" class="download-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{width: progressPercent + '%'}"></div>
                </div>
                <div class="progress-text">正在下载更新... {{ progressPercent }}%</div>
              </div>

              <!-- 下载完成 -->
              <div v-if="downloaded" class="download-complete">
                <CheckOne :size="20" theme="filled"/>
                <span>下载完成，重启应用后生效</span>
              </div>
            </div>

            <!-- 底部按钮 -->
            <div class="update-footer">
              <template v-if="!downloading && !downloaded">
                <span class="skip-link" @click="handleSkipVersion">跳过此版本</span>
                <div class="footer-buttons">
                  <CartoonButton variant="secondary" size="small" @click="handleUpdateLater">
                    下次启动时更新
                  </CartoonButton>
                  <CartoonButton variant="primary" size="small" @click="handleUpdateNow">
                    <Download :size="16"/>
                    立即更新
                  </CartoonButton>
                </div>
              </template>

              <template v-else-if="downloaded">
                <div class="footer-buttons">
                  <CartoonButton variant="secondary" size="small" @click="handleClose">
                    稍后重启
                  </CartoonButton>
                  <CartoonButton variant="primary" size="small" @click="handleUpdateNow">
                    立即重启
                  </CartoonButton>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.update-dialog {
  background: var(--color-bg-primary);
  border-radius: 16px;
  border: 3px solid var(--color-border);
  box-shadow: var(--shadow-xl);
  width: 380px;
  overflow: hidden;
}

.update-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 24px 16px;
  background: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border);
}

.update-logo {
  width: 56px;
  height: 56px;
  margin-bottom: 12px;
}

.update-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.update-versions {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.version-old {
  color: var(--color-text-tertiary);
}

.version-arrow {
  color: var(--color-text-tertiary);
}

.version-new {
  color: var(--color-primary);
  font-weight: 600;
}

.update-body {
  padding: 16px 24px;
  min-height: 60px;
}

.release-notes {
  margin-bottom: 16px;
}

.notes-title {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 6px;
}

.notes-content {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.download-progress {
  text-align: center;
}

.progress-bar {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.download-complete {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #16a34a;
  font-size: 14px;
}

.update-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-bg-secondary);
  border-top: 2px solid var(--color-border);
}

.skip-link {
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.skip-link:hover {
  color: var(--color-text-secondary);
  text-decoration: underline;
}

.footer-buttons {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
}

.modal-slide-leave-active {
  transition: transform 0.2s, opacity 0.2s;
}

.modal-slide-enter-from {
  transform: translateY(-30px) scale(0.95);
  opacity: 0;
}

.modal-slide-leave-to {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}
</style>
