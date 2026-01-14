// File type utilities for document vault

// Icon mappings from @icon-park/vue-next
export const fileTypeIcons = {
  markdown: 'FileText',
  pdf: 'FilePdf',
  image: 'Picture',
  text: 'FileText',
  code: 'Code',
  archive: 'FolderZip',
  office: 'FileWord',
  audio: 'Music',
  video: 'Video',
  file: 'File',
}

// File type colors
export const fileTypeColors = {
  markdown: 'var(--color-text-secondary)',
  pdf: '#e74c3c',
  image: '#3498db',
  text: '#7f8c8d',
  code: '#9b59b6',
  archive: '#f39c12',
  office: '#2980b9',
  audio: '#1abc9c',
  video: '#e91e63',
  file: 'var(--color-text-tertiary)',
}

// Image extensions
const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']
const textExtensions = ['txt', 'log', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf']
const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'less', 'rs', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rb', 'php', 'swift', 'kt']
const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']

// Get file type from extension
export function getFileType(ext) {
  if (!ext) return 'file'

  const extLower = ext.toLowerCase()

  if (extLower === 'md' || extLower === 'markdown') {
    return 'markdown'
  }

  if (extLower === 'pdf') {
    return 'pdf'
  }

  if (imageExtensions.includes(extLower)) {
    return 'image'
  }

  if (textExtensions.includes(extLower)) {
    return 'text'
  }

  if (codeExtensions.includes(extLower)) {
    return 'code'
  }

  if (archiveExtensions.includes(extLower)) {
    return 'archive'
  }

  if (officeExtensions.includes(extLower)) {
    return 'office'
  }

  if (audioExtensions.includes(extLower)) {
    return 'audio'
  }

  if (videoExtensions.includes(extLower)) {
    return 'video'
  }

  return 'file'
}

// Get file extension from filename
export function getExtension(filename) {
  if (!filename) return ''

  const parts = filename.split('.')
  if (parts.length < 2) return ''

  return parts[parts.length - 1].toLowerCase()
}

// Get filename without extension
export function getBasename(filename) {
  if (!filename) return ''

  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return filename

  return filename.substring(0, lastDot)
}

// Check if file type is supported for editing
export function isEditable(fileType) {
  return fileType === 'markdown'
}

// Check if file type is previewable
export function isPreviewable(fileType) {
  return ['markdown', 'pdf', 'image'].includes(fileType)
}

// Get preview unavailable message
export function getPreviewMessage(fileType) {
  const messages = {
    text: '文本文件暂不支持预览',
    code: '代码文件暂不支持预览',
    archive: '压缩文件无法预览',
    office: 'Office 文档暂不支持预览',
    audio: '音频文件暂不支持预览',
    video: '视频文件暂不支持预览',
    file: '此文件类型无法预览',
  }
  return messages[fileType] || '此文件类型无法预览'
}

// Get MIME type from extension
export function getMimeType(ext) {
  if (!ext) return 'application/octet-stream'

  const extLower = ext.toLowerCase()
  const mimeTypes = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  }

  return mimeTypes[extLower] || 'application/octet-stream'
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  if (!bytes) return ''

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

// Get display name with extension
export function getDisplayName(title, ext) {
  if (!ext) return title
  return `${title}.${ext}`
}

// Supported file extensions for import
export const supportedExtensions = [
  'md',
  'markdown',
  'pdf',
  ...imageExtensions,
]

// Check if file can be imported
export function canImport(filename) {
  const ext = getExtension(filename)
  return supportedExtensions.includes(ext.toLowerCase())
}
