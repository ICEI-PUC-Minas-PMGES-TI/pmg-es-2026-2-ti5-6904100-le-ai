<script setup lang="ts">
import { onMounted } from 'vue'

import { initializeTheme } from './theme'

onMounted(initializeTheme)
</script>

<template>
  <RouterView />
</template>
