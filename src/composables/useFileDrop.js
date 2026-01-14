import {ref} from 'vue'
import {canImport} from '@/utils/fileTypes'

/**
 * Composable for handling file drag and drop
 * @param {Function} onImport - Callback when files are dropped (receives array of file paths)
 * @returns {Object} - isDragging state and event handlers
 */
export function useFileDrop(onImport) {
  const isDragging = ref(false)
  const dragCounter = ref(0)

  const handleDragEnter = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragCounter.value++
    isDragging.value = true
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragCounter.value--
    if (dragCounter.value === 0) {
      isDragging.value = false
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false
    dragCounter.value = 0

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return

    const filePaths = []

    for (const file of files) {
      // In Tauri, dropped files have a path property
      const filePath = file.path

      if (filePath && canImport(file.name)) {
        filePaths.push({
          path: filePath,
          name: file.name,
          size: file.size,
        })
      }
    }

    if (filePaths.length > 0 && onImport) {
      await onImport(filePaths)
    }
  }

  // Bind all handlers to an element
  const bindEvents = (element) => {
    if (!element) return

    element.addEventListener('dragenter', handleDragEnter)
    element.addEventListener('dragleave', handleDragLeave)
    element.addEventListener('dragover', handleDragOver)
    element.addEventListener('drop', handleDrop)

    return () => {
      element.removeEventListener('dragenter', handleDragEnter)
      element.removeEventListener('dragleave', handleDragLeave)
      element.removeEventListener('dragover', handleDragOver)
      element.removeEventListener('drop', handleDrop)
    }
  }

  return {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    bindEvents,
  }
}
