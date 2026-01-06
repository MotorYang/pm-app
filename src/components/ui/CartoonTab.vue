<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  icon: {
    type: Object,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

// Set component name for CartoonTabs to identify
defineOptions({
  name: 'CartoonTab'
})
</script>

<template>
  <div class="cartoon-tab">
    <slot></slot>
  </div>
</template>

<style scoped>
.cartoon-tab {
  width: 100%;
  height: 100%;
}
</style>
