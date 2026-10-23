<script setup lang="ts">
import { computed } from 'vue'
import type { TaskPriority } from '@/modules/tasks/domain/types'
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/shared/constants/task'

const props = defineProps<{ priority: TaskPriority }>()
const color = computed(() => PRIORITY_COLOR[props.priority])
const label = computed(() => PRIORITY_LABEL[props.priority])
</script>

<template>
  <v-chip :color="color" variant="tonal" size="small" label class="font-weight-bold">
    {{ label }}
  </v-chip>
</template>
