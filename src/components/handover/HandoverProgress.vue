<script setup>
import { computed } from 'vue'
import { Loading } from '@icon-park/vue-next'

const props = defineProps({
  progress: {
    type: Number,
    default: 0
  },
  message: {
    type: String,
    default: '正在处理...'
  }
})

const progressPercentage = computed(() => {
  return Math.min(Math.max(props.progress, 0), 100)
})

const isComplete = computed(() => {
  return progressPercentage.value >= 100
})
</script>

<template>
  <div class="handover-progress-overlay">
    <div class="progress-container">
      <div class="progress-icon">
        <Loading
          v-if="!isComplete"
          :size="64"
          theme="outline"
          class="spinning"
        />
        <div v-else class="checkmark">
          <svg viewBox="0 0 52 52" class="checkmark-svg">
            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
      </div>

      <div class="progress-message">
        {{ message }}
      </div>

      <div class="progress-bar-container">
        <div
          class="progress-bar-fill"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>

      <div class="progress-percentage">
        {{ progressPercentage }}%
      </div>
    </div>
  </div>
</template>

<style scoped>
.handover-progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.progress-container {
  background-color: var(--color-bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
}

.progress-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinning {
  color: var(--color-primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.checkmark {
  width: 64px;
  height: 64px;
}

.checkmark-svg {
  width: 100%;
  height: 100%;
}

.checkmark-circle {
  stroke: var(--color-success);
  stroke-width: 2;
  stroke-miterlimit: 10;
  animation: checkmark-circle 0.6s ease-in-out;
}

.checkmark-check {
  stroke: var(--color-success);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-miterlimit: 10;
  animation: checkmark-check 0.6s 0.3s ease-in-out forwards;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
}

@keyframes checkmark-circle {
  0% {
    stroke-dasharray: 0, 157;
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dasharray: 157, 157;
    stroke-dashoffset: 0;
  }
}

@keyframes checkmark-check {
  to {
    stroke-dashoffset: 0;
  }
}

.progress-message {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  text-align: center;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: 999px;
  transition: width 0.3s ease-out;
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.5);
}

.progress-percentage {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
