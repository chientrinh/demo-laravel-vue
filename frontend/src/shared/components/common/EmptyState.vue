<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    description?: string
  }>(),
  {
    icon: 'mdi-clipboard-text-outline',
    title: 'Nothing here yet',
    description: 'Create your first item to get started.',
  },
)
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center py-14 px-6">
    <v-avatar color="primary" variant="tonal" size="64" class="mb-4">
      <v-icon :icon="icon" size="30" />
    </v-avatar>
    <h3 class="text-h6 font-weight-bold mb-1">{{ title }}</h3>
    <p class="text-body-2 text-muted mb-5" style="max-width: 380px">{{ description }}</p>
    <slot />
  </div>
</template>
