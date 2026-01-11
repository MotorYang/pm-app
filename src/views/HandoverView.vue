<script setup>
import ProjectHandover from '@/components/handover/ProjectHandover.vue'
</script>
<template>
  <div class="project-handover">
    <ProjectHandover class="handover"/>
  </div>
</template>

<style scoped>
.project-handover {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-primary);
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.handover {
  width: 100%;
}
</style>