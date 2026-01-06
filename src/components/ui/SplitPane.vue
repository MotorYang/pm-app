<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  defaultSplit: {
    type: Number,
    default: 50 // Default split at 50%
  },
  minSize: {
    type: Number,
    default: 20 // Minimum size in percentage
  },
  direction: {
    type: String,
    default: 'horizontal', // 'horizontal' or 'vertical'
    validator: (value) => ['horizontal', 'vertical'].includes(value)
  }
})

const splitPercent = ref(props.defaultSplit)
const isDragging = ref(false)
const containerRef = ref(null)

const startDrag = () => {
  isDragging.value = true
  document.body.style.cursor = props.direction === 'horizontal' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

const stopDrag = () => {
  isDragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const onDrag = (event) => {
  if (!isDragging.value || !containerRef.value) return

  const container = containerRef.value
  const rect = container.getBoundingClientRect()

  let newPercent
  if (props.direction === 'horizontal') {
    const x = event.clientX - rect.left
    newPercent = (x / rect.width) * 100
  } else {
    const y = event.clientY - rect.top
    newPercent = (y / rect.height) * 100
  }

  // Clamp between minSize and (100 - minSize)
  newPercent = Math.max(props.minSize, Math.min(100 - props.minSize, newPercent))
  splitPercent.value = newPercent
}

onMounted(() => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div
    ref="containerRef"
    class="split-pane"
    :class="{ 'split-horizontal': direction === 'horizontal', 'split-vertical': direction === 'vertical' }"
  >
    <div
      class="pane pane-first"
      :style="{
        [direction === 'horizontal' ? 'width' : 'height']: `${splitPercent}%`
      }"
    >
      <slot name="first"></slot>
    </div>

    <div
      class="divider"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <div class="divider-handle"></div>
    </div>

    <div
      class="pane pane-second"
      :style="{
        [direction === 'horizontal' ? 'width' : 'height']: `${100 - splitPercent}%`
      }"
    >
      <slot name="second"></slot>
    </div>
  </div>
</template>

<style scoped>
.split-pane {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.split-horizontal {
  flex-direction: row;
}

.split-vertical {
  flex-direction: column;
}

.pane {
  overflow: auto;
  position: relative;
}

.pane-first,
.pane-second {
  flex-shrink: 0;
}

.divider {
  flex-shrink: 0;
  background-color: var(--color-border);
  position: relative;
  transition: background-color var(--transition-fast);
}

.split-horizontal .divider {
  width: var(--border-width);
  cursor: col-resize;
}

.split-vertical .divider {
  height: var(--border-width);
  cursor: row-resize;
}

.divider:hover,
.divider.dragging {
  background-color: var(--color-primary);
}

.divider-handle {
  position: absolute;
  background-color: transparent;
  transition: background-color var(--transition-fast);
}

.split-horizontal .divider-handle {
  width: 8px;
  height: 40px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: var(--border-radius-sm);
}

.split-vertical .divider-handle {
  width: 40px;
  height: 8px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: var(--border-radius-sm);
}

.divider:hover .divider-handle,
.divider.dragging .divider-handle {
  background-color: var(--color-primary);
}
</style>
