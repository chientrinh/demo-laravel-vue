<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UserRole } from '@/modules/auth'

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit'
    errors?: Record<string, string | undefined>
    lockUserRole?: boolean
    userId?: string
  }>(),
  {
    mode: 'create',
    errors: () => ({}),
    lockUserRole: false,
    userId: '',
  },
)

const name = defineModel<string>('name', { required: true })
const email = defineModel<string>('email', { required: true })
const password = defineModel<string>('password', { required: true })
const role = defineModel<UserRole>('role', { required: true })

const showPassword = ref(false)
const isEdit = computed(() => props.mode === 'edit')

const roleOptions = computed(() => [
  {
    value: 'admin' as UserRole,
    title: 'Admin',
    icon: 'mdi-shield-account-outline',
    description: isEdit.value ? 'Full workspace management' : 'Full access',
    detail: isEdit.value
      ? 'Manage users, delete tasks, and see all workspace data.'
      : 'Manage users, delete tasks, and see all workspace data.',
    disabled: false,
  },
  {
    value: 'user' as UserRole,
    title: 'User',
    icon: 'mdi-account-outline',
    description: isEdit.value ? 'Standard member access' : 'Standard access',
    detail: isEdit.value
      ? 'Can view and update only tasks assigned to them.'
      : 'Can view and update only tasks assigned to them.',
    disabled: props.lockUserRole,
  },
])
</script>

<template>
  <div class="d-flex flex-column ga-5">
    <v-text-field
      v-if="isEdit"
      :model-value="userId"
      label="User ID"
      prepend-inner-icon="mdi-tag-outline"
      variant="outlined"
      density="comfortable"
      readonly
      hide-details
    />

    <v-text-field
      v-model="name"
      label="Name"
      placeholder="e.g. Rachel Adams"
      prepend-inner-icon="mdi-account-outline"
      variant="outlined"
      density="comfortable"
      autocomplete="name"
      :error-messages="errors.name"
      hide-details="auto"
    />

    <v-text-field
      v-model="email"
      label="Email"
      placeholder="e.g. rachel.adams@materio.io"
      prepend-inner-icon="mdi-email-outline"
      variant="outlined"
      density="comfortable"
      type="email"
      autocomplete="email"
      :error-messages="errors.email"
      hide-details="auto"
    />

    <v-text-field
      v-model="password"
      label="Password"
      :placeholder="isEdit ? '••••••••••••' : 'Enter password'"
      prepend-inner-icon="mdi-lock-outline"
      :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
      variant="outlined"
      density="comfortable"
      :type="showPassword ? 'text' : 'password'"
      :autocomplete="isEdit ? 'new-password' : 'new-password'"
      :hint="isEdit ? 'Leave blank to keep current password' : undefined"
      :persistent-hint="isEdit"
      :error-messages="errors.password"
      hide-details="auto"
      @click:append-inner="showPassword = !showPassword"
    />

    <div>
      <p class="text-body-2 font-weight-medium mb-1">
        Role <span class="text-error">*</span>
      </p>
      <p class="text-caption text-muted mb-3">
        Choose the level of access this account should have.
      </p>

      <div class="role-grid" role="radiogroup" aria-label="Role">
        <button
          v-for="option in roleOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="role-card"
          :class="{ 'role-card--active': role === option.value, 'role-card--disabled': option.disabled }"
          :aria-checked="role === option.value"
          :disabled="option.disabled"
          @click="role = option.value"
        >
          <v-icon :icon="option.icon" size="22" />
          <span class="role-card__body">
            <span class="role-card__title">{{ option.title }}</span>
            <span class="role-card__description">{{ option.description }}</span>
            <span class="role-card__detail">{{ option.detail }}</span>
          </span>
          <v-icon
            v-if="role === option.value"
            icon="mdi-check-circle"
            color="primary"
            size="20"
          />
        </button>
      </div>

      <p v-if="lockUserRole" class="text-caption text-medium-emphasis mt-2 mb-0">
        You cannot remove your own admin role.
      </p>
      <p v-if="errors.role" class="text-caption text-error mt-2 mb-0">{{ errors.role }}</p>
    </div>
  </div>
</template>

<style scoped>
.role-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 600px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
}

.role-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 1px solid #e7e0ec;
  border-radius: 14px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.role-card:hover {
  border-color: #c9b8e8;
}

.role-card--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.role-card--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.role-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.role-card__title {
  font-size: 0.95rem;
  font-weight: 700;
}

.role-card__description {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.role-card__detail {
  font-size: 0.78rem;
  line-height: 1.35;
  color: #6b6472;
}
</style>
