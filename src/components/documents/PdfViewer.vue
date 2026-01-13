<script setup>
import {ref, shallowRef, computed, onMounted, watch} from 'vue'
import {Left, Right, ZoomIn, ZoomOut, FullScreenOne} from '@icon-park/vue-next'

const props = defineProps({
  // Binary data of the PDF file (Uint8Array or array of bytes)
  data: {
    type: Array,
    default: null
  },
  // Document title for display
  title: {
    type: String,
    default: 'PDF Document'
  }
})

// PDF.js related state
// Use shallowRef to avoid Vue's reactivity proxy interfering with PDF.js private fields
const pdfDoc = shallowRef(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const loading = ref(true)
const error = ref(null)
const canvasRef = ref(null)
const containerRef = ref(null)

// PDF.js library reference
let pdfjsLib = null

// Computed
const canGoPrev = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

// Initialize PDF.js
async function initPdfJs() {
  if (pdfjsLib) return true

  try {
    // Dynamically import pdfjs-dist
    pdfjsLib = await import('pdfjs-dist')

    // Set worker source
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default

    return true
  } catch (e) {
    console.error('Failed to load PDF.js:', e)
    error.value = 'PDF.js 加载失败，请检查是否已安装 pdfjs-dist'
    return false
  }
}

// Load PDF document
async function loadPdf() {
  if (!props.data || props.data.length === 0) {
    error.value = 'No PDF data provided'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    const initialized = await initPdfJs()
    if (!initialized) return

    // Convert data to Uint8Array
    const data = new Uint8Array(props.data)

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({data})
    pdfDoc.value = await loadingTask.promise

    totalPages.value = pdfDoc.value.numPages
    currentPage.value = 1

    // Render first page
    await renderPage(1)
  } catch (e) {
    console.error('Failed to load PDF:', e)
    error.value = 'PDF 加载失败: ' + (e.message || '未知错误')
  } finally {
    loading.value = false
  }
}

// Render a specific page
async function renderPage(pageNum) {
  if (!pdfDoc.value || !canvasRef.value) return

  try {
    const page = await pdfDoc.value.getPage(pageNum)

    const canvas = canvasRef.value
    const context = canvas.getContext('2d')

    // Calculate viewport
    const viewport = page.getViewport({scale: scale.value})

    // Set canvas dimensions
    canvas.height = viewport.height
    canvas.width = viewport.width

    // Render page
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }

    await page.render(renderContext).promise
  } catch (e) {
    console.error('Failed to render page:', e)
    error.value = '页面渲染失败'
  }
}

// Navigation
function prevPage() {
  if (canGoPrev.value) {
    currentPage.value--
    renderPage(currentPage.value)
  }
}

function nextPage() {
  if (canGoNext.value) {
    currentPage.value++
    renderPage(currentPage.value)
  }
}

// Zoom
function zoomIn() {
  if (scale.value < 3) {
    scale.value = Math.min(scale.value + 0.25, 3)
    renderPage(currentPage.value)
  }
}

function zoomOut() {
  if (scale.value > 0.5) {
    scale.value = Math.max(scale.value - 0.25, 0.5)
    renderPage(currentPage.value)
  }
}

// Watch for data changes
watch(() => props.data, () => {
  if (props.data) {
    loadPdf()
  }
}, {immediate: true})

onMounted(() => {
  if (props.data) {
    loadPdf()
  }
})
</script>

<template>
  <div class="pdf-viewer" ref="containerRef">
    <!-- Toolbar -->
    <div class="pdf-toolbar">
      <div class="toolbar-left">
        <span class="pdf-title">{{ title }}</span>
      </div>

      <div class="toolbar-center">
        <button @click="prevPage" :disabled="!canGoPrev" title="上一页">
          <Left :size="18" theme="outline"/>
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="!canGoNext" title="下一页">
          <Right :size="18" theme="outline"/>
        </button>
      </div>

      <div class="toolbar-right">
        <button @click="zoomOut" :disabled="scale <= 0.5" title="缩小">
          <ZoomOut :size="18" theme="outline"/>
        </button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" :disabled="scale >= 3" title="放大">
          <ZoomIn :size="18" theme="outline"/>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="pdf-content">
      <div v-if="loading" class="pdf-loading">
        加载中...
      </div>

      <div v-else-if="error" class="pdf-error">
        <p>{{ error }}</p>
        <p class="error-hint">请确保已安装 pdfjs-dist: npm install pdfjs-dist</p>
      </div>

      <div v-else class="pdf-canvas-container">
        <canvas ref="canvasRef"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
}

.pdf-toolbar {
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

.pdf-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-info,
.zoom-level {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 60px;
  text-align: center;
}

.pdf-toolbar button {
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

.pdf-toolbar button:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
}

.pdf-toolbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pdf-content {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: var(--spacing-md);
}

.pdf-loading,
.pdf-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.error-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

.pdf-canvas-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.pdf-canvas-container canvas {
  box-shadow: var(--shadow-md);
  background-color: white;
}
</style>
