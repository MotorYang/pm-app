<script setup>
import {ref, watch, onMounted} from 'vue'
import {convertFileSrc, invoke} from '@tauri-apps/api/core'

console.log('1. 组件 Setup 开始执行');

const props = defineProps({
  pdfDocument: Object,
  page: {type: Number, default: 1}
})

const viewerUrl = ref('')
const loading = ref(true)
const error = ref(null)

async function loadPdf() {
  console.log('2. loadPdf 开始运行');

  if (!props.pdfDocument?.path || !props.pdfDocument?.project_id) {
    console.error('3. 错误：path 或 projectId 缺失', props.pdfDocument);
    error.value = "文档信息不完整";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const absFilePath = await invoke('get_file_absolute_path', {
      projectId: props.pdfDocument.project_id,
      relativePath: props.pdfDocument.path
    });

    console.log('5. Rust 返回路径:', absFilePath);

    const fileUrl = convertFileSrc(absFilePath);
    console.log('6. 转换后的 Asset URL:', fileUrl);

    const baseUrl = `/pdfjs/viewer.html?file=${encodeURIComponent(fileUrl)}&locale=zh-CN`;

    // 2. 视图控制参数使用 # 拼接（PDF.js 官方支持的参数）
    // page: 初始页码
    // zoom: 缩放模式 (page-fit, page-width 等)
    // pagemode: 侧边栏模式 (none, thumbs, outline)
    const viewConfig = `#page=${props.page}&view=FitH&pagemode=none`;

    // 只对 fileUrl 进行一次编码，page 这种简单参数直接拼接
    viewerUrl.value = baseUrl + viewConfig;
    console.log('7. 最终 viewerUrl:', viewerUrl.value);
  } catch (err) {
    console.error('加载过程崩溃:', err);
    error.value = `系统错误: ${err}`;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadPdf();
});

watch(
    () => props.pdfDocument,
    () => loadPdf(),
    {deep: true}
);
</script>

<template>
  <div class="pdf-viewer-root">
    <div v-if="loading" class="pdf-loading">
      <span>正在加载 PDF…</span>
    </div>

    <div v-if="error" class="pdf-error">
      <div class="error-msg">{{ error }}</div>
      <button @click="loadPdf" class="retry-btn">重试</button>
    </div>

    <iframe
        v-if="viewerUrl"
        v-show="!loading && !error"
        class="pdf-frame"
        :src="viewerUrl"
    />
  </div>
</template>

<style scoped>
/* 保持原有样式不变 */
.pdf-viewer-root {
  position: relative;
  width: 100%;
  height: 100%;
  background: #525659;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.pdf-loading, .pdf-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: #2c2c2c;
  color: white;
}
</style>