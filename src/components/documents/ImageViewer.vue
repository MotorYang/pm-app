<script setup>
import {ref, computed, onMounted, watch, onUnmounted} from 'vue'
import {ZoomIn, ZoomOut, LeftOne, RightOne} from '@icon-park/vue-next'

const props = defineProps({
  // Binary data of the image (Uint8Array or array of bytes)
  data: {
    type: Array,
    default: null
  },
  // Image title for display
  title: {
    type: String,
    default: 'Image'
  },
  // File extension to determine MIME type
  ext: {
    type: String,
    default: 'png'
  }
})

// State
const scale = ref(1)
const rotation = ref(0)
const imageUrl = ref(null)
const loading = ref(true)
const error = ref(null)
const imageRef = ref(null)
const containerRef = ref(null)

// Dragging state
const isDragging = ref(false)
const dragStart = ref({x: 0, y: 0})
const position = ref({x: 0, y: 0})

// Get MIME type from extension
const mimeType = computed(() => {
  const types = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon'
  }
  return types[props.ext.toLowerCase()] || 'image/png'
})

// Create blob URL from binary data
function createImageUrl() {
  if (!props.data || props.data.length === 0) {
    error.value = 'No image data provided'
    loading.value = false
    return
  }

  try {
    // Revoke previous URL
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value)
    }

    // Create new blob URL
    const uint8Array = new Uint8Array(props.data)
    const blob = new Blob([uint8Array], {type: mimeType.value})
    imageUrl.value = URL.createObjectURL(blob)
    loading.value = false
  } catch (e) {
    console.error('Failed to create image URL:', e)
    error.value = '图片加载失败'
    loading.value = false
  }
}

// Zoom controls
function zoomIn() {
  if (scale.value < 5) {
    scale.value = Math.min(scale.value + 0.25, 5)
  }
}

function zoomOut() {
  if (scale.value > 0.25) {
    scale.value = Math.max(scale.value - 0.25, 0.25)
  }
}

function resetZoom() {
  scale.value = 1
  position.value = {x: 0, y: 0}
}

// Rotation controls
function rotateLeft() {
  rotation.value = (rotation.value - 90) % 360
}

function rotateRight() {
  rotation.value = (rotation.value + 90) % 360
}

// Mouse wheel zoom
function handleWheel(e) {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// Drag to pan
function handleMouseDown(e) {
  if (scale.value > 1) {
    isDragging.value = true
    dragStart.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y
    }
  }
}

function handleMouseMove(e) {
  if (isDragging.value) {
    position.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
  }
}

function handleMouseUp() {
  isDragging.value = false
}

// Computed style for image transform
const imageStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
  cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default'
}))

// Watch for data changes
watch(() => props.data, () => {
  if (props.data) {
    loading.value = true
    error.value = null
    createImageUrl()
  }
}, {immediate: true})

// Cleanup
onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})
</script>

<template>
  <div class="image-viewer" ref="containerRef">
    <!-- Toolbar -->
    <div class="image-toolbar">
      <div class="toolbar-left">
        <span class="image-title">{{ title }}.{{ ext }}</span>
      </div>

      <div class="toolbar-center">
        <button @click="zoomOut" :disabled="scale <= 0.25" title="缩小">
          <ZoomOut :size="18" theme="outline"/>
        </button>
        <span class="zoom-level" @click="resetZoom" title="点击重置">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" :disabled="scale >= 5" title="放大">
          <ZoomIn :size="18" theme="outline"/>
        </button>
      </div>

      <div class="toolbar-right">
        <button @click="rotateLeft" title="向左旋转">
          <LeftOne :size="18" theme="outline"/>
        </button>
        <button @click="rotateRight" title="向右旋转">
          <RightOne :size="18" theme="outline"/>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div
        class="image-content"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
    >
      <div v-if="loading" class="image-loading">
        加载中...
      </div>

      <div v-else-if="error" class="image-error">
        {{ error }}
      </div>

      <div v-else class="image-container">
        <img
            ref="imageRef"
            :src="imageUrl"
            :alt="title"
            :style="imageStyle"
            draggable="false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
}

.image-toolbar {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: var(--border-width) solid var(--color-border);
  background-color: var(--color-bg-primary);
  gap: var(--spacing-md);
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.image-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zoom-level {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 50px;
  text-align: center;
  cursor: pointer;
}

.zoom-level:hover {
  color: var(--color-primary);
}

.image-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.15s;
}

.image-toolbar button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
}

.image-toolbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.image-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-tertiary);
  /* Checkerboard pattern for transparent images */
  background-image:
      linear-gradient(45deg, var(--color-border) 25%, transparent 25%),
      linear-gradient(-45deg, var(--color-border) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--color-border) 75%),
      linear-gradient(-45deg, transparent 75%, var(--color-border) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.image-loading,
.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.1s ease-out;
  user-select: none;
}
</style>
