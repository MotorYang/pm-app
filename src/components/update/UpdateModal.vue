<script setup>
import {computed} from 'vue'
import {Download, CheckOne} from '@icon-park/vue-next'
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
  },
  error: {
    type: String,
    default: ''
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
              <div class="update-info">
                <div class="update-title">发现新版本</div>
                <div class="update-versions">
                  <span class="version-old">v{{ currentVersion }}</span>
                  <span class="version-arrow">→</span>
                  <span class="version-new">v{{ newVersion }}</span>
                </div>
              </div>
            </div>

            <!-- 内容 -->
            <div v-if="releaseNotes || downloading || downloaded || error" class="update-body">
              <div v-if="releaseNotes && !downloading && !downloaded && !error" class="release-notes">
                {{ releaseNotes }}
              </div>

              <!-- 下载进度 -->
              <div v-if="downloading" class="download-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{width: progressPercent + '%'}"></div>
                </div>
                <div class="progress-text">正在下载... {{ progressPercent }}%</div>
              </div>

              <!-- 下载完成 -->
              <div v-if="downloaded" class="download-complete">
                <CheckOne :size="16" theme="filled"/>
                <span>下载完成，重启后生效</span>
              </div>

              <!-- 错误信息 -->
              <div v-if="error" class="download-error">
                {{ error }}
              </div>
            </div>

            <!-- 底部按钮 -->
            <div class="update-footer">
              <!-- 正常状态：显示跳过、稍后、立即更新 -->
              <template v-if="!downloading && !downloaded && !error">
                <button class="btn-link" @click="handleSkipVersion">跳过</button>
                <div class="footer-buttons">
                  <button class="btn-secondary" @click="handleUpdateLater">稍后</button>
                  <button class="btn-primary" @click="handleUpdateNow">
                    <Download :size="14"/>
                    立即更新
                  </button>
                </div>
              </template>

              <!-- 出错状态：显示关闭和重试 -->
              <template v-else-if="error">
                <div class="footer-buttons full">
                  <button class="btn-secondary" @click="handleUpdateLater">关闭</button>
                  <button class="btn-primary" @click="handleUpdateNow">重试</button>
                </div>
              </template>

              <!-- 下载完成：显示稍后重启和立即重启 -->
              <template v-else-if="downloaded">
                <div class="footer-buttons full">
                  <button class="btn-secondary" @click="handleClose">稍后重启</button>
                  <button class="btn-primary" @click="handleUpdateNow">立即重启</button>
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
  border-radius: 12px;
  border: 2px solid var(--color-border);
  box-shadow: var(--shadow-xl);
  width: 320px;
  overflow: hidden;
}

.update-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border);
}

.update-logo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.update-info {
  flex: 1;
  min-width: 0;
}

.update-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.update-versions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
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
  padding: 12px 16px;
}

.release-notes {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;
}

.download-progress {
  text-align: center;
}

.progress-bar {
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.download-complete {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #16a34a;
  font-size: 13px;
}

.download-error {
  font-size: 13px;
  color: #dc2626;
  text-align: center;
}

.update-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border-top: 2px solid var(--color-border);
}

.btn-link {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  color: var(--color-text-secondary);
  text-decoration: underline;
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

.footer-buttons.full {
  width: 100%;
  justify-content: flex-end;
}

.btn-secondary,
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  filter: brightness(1.1);
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
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
}

.modal-slide-leave-active {
  transition: transform 0.15s, opacity 0.15s;
}

.modal-slide-enter-from {
  transform: translateY(-20px) scale(0.96);
  opacity: 0;
}

.modal-slide-leave-to {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}
</style>
