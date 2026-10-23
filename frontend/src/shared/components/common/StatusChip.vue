<script setup lang="ts">
import { computed } from 'vue'
import type { TaskStatus } from '@/modules/tasks/domain/types'
import { STATUS_COLOR, STATUS_LABEL } from '@/shared/constants/task'

const props = defineProps<{ status: TaskStatus; compact?: boolean }>()
const color = computed(() => STATUS_COLOR[props.status])
const label = computed(() => STATUS_LABEL[props.status])
</script>

<template>
  <v-chip :color="color" variant="tonal" size="small" label class="font-weight-bold">
    <v-icon v-if="!compact" start size="14" icon="mdi-circle" />
    {{ label }}
  </v-chip>
</template>
