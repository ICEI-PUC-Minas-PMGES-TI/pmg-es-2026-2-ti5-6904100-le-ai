<script setup lang="ts">
import { computed } from 'vue'

import { APARENCIA_DO_STATUS } from '../../estante/aparenciaDoStatus'
import { ROTULO_DO_STATUS } from '../../estante/textos'
import type { StatusEstante } from '../../services/leitura'

const props = defineProps<{ status: StatusEstante }>()

const aparencia = computed(() => APARENCIA_DO_STATUS[props.status])
</script>

<template>
  <span
    class="inline-flex items-center gap-space-1 rounded-full px-space-2 py-space-1 text-caption"
    :class="aparencia.classe"
  >
    <component
      :is="aparencia.icone"
      :size="16"
      :weight="aparencia.peso"
      aria-hidden="true"
    />
    {{ ROTULO_DO_STATUS[status] }}
  </span>
</template>
