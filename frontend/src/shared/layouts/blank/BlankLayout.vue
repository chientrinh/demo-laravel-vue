<script setup lang="ts">
const highlights = [
  { icon: 'mdi-shield-check-outline', title: 'Secure by default', text: 'Role-aware access and protected routes.' },
  { icon: 'mdi-view-dashboard-outline', title: 'Focused workspace', text: 'Everything your team needs in one place.' },
  { icon: 'mdi-chart-timeline-variant', title: 'Clear progress', text: 'Track priorities, owners, and due dates.' },
]
</script>

<template>
  <div class="auth-layout">
    <aside class="auth-layout__brand auth-gradient d-none d-lg-flex">
      <div class="brand-content">
        <div class="d-flex align-center ga-3 mb-10">
          <v-avatar color="white" size="48" rounded="lg">
            <v-icon icon="mdi-check-decagram" color="primary" size="28" />
          </v-avatar>
          <div>
            <p class="text-h6 font-weight-bold text-white mb-0">TaskFlow</p>
            <p class="text-caption text-white mb-0" style="opacity: 0.7">Team task management</p>
          </div>
        </div>

        <v-chip color="white" variant="outlined" size="small" class="mb-5 text-white">
          Built for calm, focused teams
        </v-chip>
        <h1 class="text-h3 font-weight-bold text-white mb-4" style="max-width: 460px">
          Move work forward, together.
        </h1>
        <p class="text-body-1 mb-10" style="color: rgba(255, 255, 255, 0.76); max-width: 430px">
          Plan tasks, clarify ownership, and keep every deadline visible without adding noise.
        </p>

        <div class="d-flex flex-column ga-5">
          <div v-for="item in highlights" :key="item.title" class="d-flex ga-3">
            <v-avatar color="white" variant="tonal" size="38" rounded="lg">
              <v-icon :icon="item.icon" color="white" size="20" />
            </v-avatar>
            <div>
              <p class="text-body-2 font-weight-bold text-white mb-0">{{ item.title }}</p>
              <p class="text-caption mb-0" style="color: rgba(255, 255, 255, 0.64)">
                {{ item.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="auth-layout__form">
      <div class="d-flex flex-column align-center mb-6 d-lg-none">
        <v-avatar color="primary" size="52" rounded="lg" class="mb-3">
          <v-icon icon="mdi-check-decagram" size="30" />
        </v-avatar>
        <p class="text-h6 font-weight-bold mb-0">TaskFlow</p>
      </div>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(480px, 0.95fr);
  background: #fff;
}

.auth-layout__brand {
  position: relative;
  overflow: hidden;
  padding: 56px clamp(40px, 7vw, 104px);
  align-items: center;
}

.auth-layout__brand::after {
  content: '';
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  right: -180px;
  top: -120px;
}

.auth-layout__form {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: #fff;
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 580px;
  width: 100%;
}

@media (max-width: 1279px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-layout__form {
    background: #f8f5fc;
  }
}
</style>
