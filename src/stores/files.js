import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { readDir, stat } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'

export const useFilesStore = defineStore('files', () => {
  const loading = ref(false)
  const error = ref(null)
  const fileStats = ref([])
  const scanProgress = ref(0)
  const totalFiles = ref(0)

  // 文件类型映射
  const fileTypeMap = {
    // 代码文件
    js: 'JavaScript',
    jsx: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript',
    vue: 'Vue',
    py: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    h: 'C/C++ Header',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',

    // Web文件
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'SASS',
    less: 'LESS',

    // 数据文件
    json: 'JSON',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
    toml: 'TOML',

    // 文档文件
    md: 'Markdown',
    txt: 'Text',
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',

    // 图片文件
    png: 'PNG',
    jpg: 'JPEG',
    jpeg: 'JPEG',
    gif: 'GIF',
    svg: 'SVG',
    webp: 'WebP',
    ico: 'Icon',

    // 其他
    zip: 'Archive',
    tar: 'Archive',
    gz: 'Archive',
    rar: 'Archive',
    '7z': 'Archive',
  }

  // 需要忽略的目录
  const ignoreDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'target',
    '.next',
    '.nuxt',
    'coverage',
    '.vscode',
    '.idea',
    '__pycache__',
    '.pytest_cache',
    'vendor',
    'tmp',
    'temp',
  ])

  // 按文件类型分组统计
  const fileTypeStats = computed(() => {
    const stats = {}
    let totalSize = 0

    fileStats.value.forEach(file => {
      const ext = file.extension || 'other'
      const type = fileTypeMap[ext] || ext.toUpperCase()

      if (!stats[type]) {
        stats[type] = {
          type,
          count: 0,
          size: 0,
          files: []
        }
      }

      stats[type].count++
      stats[type].size += file.size
      stats[type].files.push(file)
      totalSize += file.size
    })

    // 转换为数组并排序
    return Object.values(stats)
      .map(stat => ({
        ...stat,
        percentage: totalSize > 0 ? (stat.size / totalSize * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.size - a.size)
  })

  // 最大的文件列表
  const largestFiles = computed(() => {
    return [...fileStats.value]
      .sort((a, b) => b.size - a.size)
      .slice(0, 20)
  })

  // 总文件大小
  const totalSize = computed(() => {
    return fileStats.value.reduce((sum, file) => sum + file.size, 0)
  })

  // 格式化文件大小
  function formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }

  // 获取文件扩展名
  function getExtension(filename) {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1 || lastDot === 0) return ''
    return filename.slice(lastDot + 1).toLowerCase()
  }

  // 递归扫描目录
  async function scanDirectory(dirPath, relativePath = '') {
    try {
      const entries = await readDir(dirPath)

      for (const entry of entries) {
        // 跳过忽略的目录
        if (entry.isDirectory && ignoreDirs.has(entry.name)) {
          continue
        }

        const fullPath = await join(dirPath, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory) {
          await scanDirectory(fullPath, relPath)
        } else if (entry.isFile) {
          try {
            const fileStat = await stat(fullPath)
            const extension = getExtension(entry.name)

            fileStats.value.push({
              name: entry.name,
              path: relPath,
              fullPath: fullPath,
              size: fileStat.size || 0,
              extension: extension,
              type: fileTypeMap[extension] || extension.toUpperCase() || 'Unknown',
              modified: fileStat.mtime ? new Date(fileStat.mtime) : null
            })

            totalFiles.value++
            scanProgress.value = totalFiles.value
          } catch (e) {
            console.warn(`Failed to stat file: ${fullPath}`, e)
          }
        }
      }
    } catch (e) {
      console.error(`Failed to read directory: ${dirPath}`, e)
    }
  }

  // 分析项目文件
  async function analyzeProject(projectPath) {
    if (!projectPath) {
      error.value = 'Project path is required'
      return
    }

    loading.value = true
    error.value = null
    fileStats.value = []
    scanProgress.value = 0
    totalFiles.value = 0

    try {
      await scanDirectory(projectPath)
    } catch (e) {
      error.value = e.message || 'Failed to analyze project files'
      console.error('Failed to analyze project:', e)
    } finally {
      loading.value = false
    }
  }

  // 清除统计数据
  function clearStats() {
    fileStats.value = []
    scanProgress.value = 0
    totalFiles.value = 0
    error.value = null
  }

  return {
    // State
    loading,
    error,
    fileStats,
    scanProgress,
    totalFiles,

    // Computed
    fileTypeStats,
    largestFiles,
    totalSize,

    // Actions
    analyzeProject,
    clearStats,
    formatSize,
  }
})
