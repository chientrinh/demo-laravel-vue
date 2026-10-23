<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    message?: string
    confirmLabel?: string
    loading?: boolean
  }>(),
  {
    title: 'Delete this task?',
    message: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    loading: false,
  },
)

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="pa-2">
      <v-card-text class="text-center pt-4">
        <v-avatar color="error" variant="tonal" size="58" class="mb-4">
          <v-icon icon="mdi-trash-can-outline" size="28" />
        </v-avatar>
        <h2 class="text-h6 font-weight-bold mb-2">{{ title }}</h2>
        <p class="text-body-2 text-muted mb-0">{{ message }}</p>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-btn variant="text" class="flex-grow-1" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          class="flex-grow-1"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
