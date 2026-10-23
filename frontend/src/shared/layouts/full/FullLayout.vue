<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { getInitials } from '@/shared/utils/task'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { mdAndUp } = useDisplay()

const drawer = ref(mdAndUp.value)
const profileMenu = ref(false)

const pageTitle = computed(() => String(route.meta.title ?? 'Tasks'))
const isTaskDetail = computed(() => route.name === 'task-detail')
const sectionLabel = computed(() => (route.path.startsWith('/users') ? 'User Management' : 'Workspace'))

const navigationSections = computed(() => {
  const sections = [
    {
      label: 'Workspace',
      items: [{ title: 'All Tasks', icon: 'mdi-format-list-checks', to: { name: 'tasks' } }],
    },
  ]

  if (authStore.isAdmin) {
    sections.push({
      label: 'User Management',
      items: [{ title: 'Users', icon: 'mdi-account-group-outline', to: { name: 'users' } }],
    })
    sections.push({
      label: 'Admin',
      items: [{ title: 'Create User', icon: 'mdi-account-plus-outline', to: { name: 'user-create' } }],
    })
  }

  return sections
})

watch(mdAndUp, (value) => {
  drawer.value = value
})

function navigate(to: RouteLocationRaw): void {
  void router.push(to)
  if (!mdAndUp.value) drawer.value = false
}

function isActive(to: RouteLocationRaw): boolean {
  const name = typeof to === 'object' && 'name' in to ? to.name : undefined
  if (name === 'tasks') return route.name === 'tasks' || route.name === 'task-detail'
  if (name === 'users') return route.name === 'users'
  if (name === 'user-create') return route.name === 'user-create'
  return false
}

async function signOut(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}

onMounted(() => {
  drawer.value = mdAndUp.value
})
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    :temporary="!mdAndUp"
    width="272"
    color="white"
    class="app-drawer"
  >
    <div class="d-flex flex-column h-100">
      <div class="d-flex align-center ga-3 px-5 py-5">
        <v-avatar color="primary" size="40" rounded="lg">
          <v-icon icon="mdi-check-decagram" size="24" />
        </v-avatar>
        <div>
          <p class="text-subtitle-1 font-weight-bold mb-0">TaskFlow</p>
          <p class="text-caption text-muted mb-0">Workspace</p>
        </div>
      </div>

      <v-divider class="soft-divider mx-4" />

      <div class="nav-scroll px-4 pt-5 pb-2">
        <div v-for="section in navigationSections" :key="section.label" class="mb-4">
          <p class="eyebrow mb-2">{{ section.label }}</p>
          <v-list nav density="comfortable" class="pa-0">
            <v-list-item
              v-for="item in section.items"
              :key="item.title"
              :prepend-icon="item.icon"
              :title="item.title"
              rounded="lg"
              :active="isActive(item.to)"
              color="primary"
              class="mb-1"
              @click="navigate(item.to)"
            />
          </v-list>
        </div>
      </div>

      <v-spacer />

      <div class="pa-4">
        <v-card class="surface-card pa-4" flat>
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" variant="tonal" size="38">
              <span class="text-caption font-weight-bold">{{ getInitials(authStore.displayName) }}</span>
            </v-avatar>
            <div class="min-w-0">
              <p class="text-body-2 font-weight-bold mb-0 truncate-1">{{ authStore.displayName }}</p>
              <p class="text-caption text-muted mb-0 text-capitalize">{{ authStore.user?.role }}</p>
            </div>
          </div>
        </v-card>
      </div>
    </div>
  </v-navigation-drawer>

  <v-app-bar color="white" flat border class="app-bar">
    <v-app-bar-nav-icon v-if="!mdAndUp" @click="drawer = !drawer" />
    <div class="d-flex align-center ga-2 ps-2">
      <span class="text-caption text-muted">{{ sectionLabel }}</span>
      <v-icon icon="mdi-chevron-right" size="14" color="medium-emphasis" />
      <span class="text-body-2 font-weight-medium">{{ isTaskDetail ? 'Task details' : pageTitle }}</span>
    </div>

    <v-spacer />

    <v-btn icon="mdi-bell-outline" variant="text" color="medium-emphasis" aria-label="Notifications" />
    <v-menu v-model="profileMenu" location="bottom end" :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" class="px-2" rounded="lg">
          <v-avatar color="primary" variant="tonal" size="32" class="me-2">
            <span class="text-caption font-weight-bold">{{ getInitials(authStore.displayName) }}</span>
          </v-avatar>
          <span class="d-none d-sm-inline text-body-2 font-weight-medium">{{ authStore.displayName }}</span>
          <v-icon icon="mdi-chevron-down" size="16" class="ms-1" />
        </v-btn>
      </template>
      <v-list width="240" density="comfortable" class="pa-2">
        <v-list-item :title="authStore.displayName" :subtitle="authStore.user?.email" />
        <v-divider class="my-2" />
        <v-list-item
          prepend-icon="mdi-logout"
          title="Sign out"
          rounded="lg"
          @click="signOut"
        />
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main class="app-main">
    <RouterView />
  </v-main>
</template>

<style scoped>
.app-drawer {
  border-right: 1px solid #e7e0ec !important;
}

.app-bar {
  border-bottom: 1px solid #e7e0ec;
}

.app-main {
  background: #f8f5fc;
}

.min-w-0 {
  min-width: 0;
}

.nav-scroll {
  overflow-y: auto;
}
</style>
