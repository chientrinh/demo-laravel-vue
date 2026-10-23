<script setup lang="ts">
defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center py-14 px-6">
    <v-avatar color="error" variant="tonal" size="64" class="mb-4">
      <v-icon icon="mdi-alert-circle-outline" size="30" />
    </v-avatar>
    <h3 class="text-h6 font-weight-bold mb-1">Something went wrong</h3>
    <p class="text-body-2 text-muted mb-5" style="max-width: 420px">
      {{ message ?? 'We could not load this data. Please try again.' }}
    </p>
    <v-btn color="primary" prepend-icon="mdi-refresh" @click="$emit('retry')">Try again</v-btn>
  </div>
</template>
