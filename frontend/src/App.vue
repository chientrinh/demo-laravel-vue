<script setup lang="ts">
import { useToast } from '@/shared/composables/useToast'

const toast = useToast()
</script>

<template>
  <v-app>
    <RouterView />
    <v-snackbar
      :model-value="toast.state.visible"
      :color="toast.state.color"
      location="top right"
      variant="flat"
      rounded="lg"
      @update:model-value="!$event && toast.hide()"
    >
      {{ toast.state.message }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" size="small" @click="toast.hide()" />
      </template>
    </v-snackbar>
  </v-app>
</template>
