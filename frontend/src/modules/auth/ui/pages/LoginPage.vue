<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema } from '../../domain/schemas'
import { useAuthPage } from '../composables/useAuthPage'
import { useToast } from '@/shared/composables/useToast'

const { authStore, redirectAfterAuth } = useAuthPage()
const toast = useToast()

const showPassword = ref(false)
const serverError = ref('')

const { handleSubmit, defineField, errors, isSubmitting, setFieldValue } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '' },
})

const [email, emailProps] = defineField('email')
const [password, passwordProps] = defineField('password')

const errorMessage = computed(() => serverError.value)

const onSubmit = handleSubmit(async (values) => {
  serverError.value = ''
  try {
    await authStore.login(values)
    toast.success('Welcome back. Your workspace is ready.')
    redirectAfterAuth()
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to sign in.'
  }
})

function forgotPassword(): void {
  toast.info('Password reset is not available in this demo. Contact a workspace administrator.')
}

function useDemoAccount(): void {
  setFieldValue('email', 'admin@taskflow.dev')
  setFieldValue('password', 'password123')
}
</script>

<template>
  <v-card class="auth-card" elevation="10">
    <v-card-text class="pa-8 pa-sm-10">
      <div class="mb-7">
        <p class="eyebrow mb-2">Welcome back</p>
        <h1 class="text-h4 font-weight-bold mb-2">Sign in to TaskFlow</h1>
        <p class="text-body-2 text-muted mb-0">
          Enter your details to continue to your workspace.
        </p>
      </div>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-5"
        closable
        @click:close="serverError = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <v-form @submit.prevent="onSubmit">
        <v-label class="text-body-2 font-weight-medium mb-2">Email address</v-label>
        <v-text-field
          v-model="email"
          v-bind="emailProps"
          type="email"
          placeholder="you@company.com"
          prepend-inner-icon="mdi-email-outline"
          autocomplete="email"
          :error-messages="errors.email"
          class="mb-1"
        />

        <v-label class="text-body-2 font-weight-medium mb-2">Password</v-label>
        <v-text-field
          v-model="password"
          v-bind="passwordProps"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Enter your password"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          autocomplete="current-password"
          :error-messages="errors.password"
          @click:append-inner="showPassword = !showPassword"
        />

        <div class="d-flex align-center justify-space-between mb-6 mt-1">
          <v-checkbox label="Remember me" density="compact" hide-details color="primary" />
          <v-btn
            variant="text"
            color="primary"
            size="small"
            class="px-0"
            type="button"
            @click="forgotPassword"
          >
            Forgot password?
          </v-btn>
        </div>

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          rounded="lg"
          :loading="isSubmitting || authStore.loading"
        >
          Sign in
        </v-btn>
      </v-form>

      <v-divider class="my-7 soft-divider">
        <span class="text-caption text-muted px-3">Demo access</span>
      </v-divider>

      <v-btn variant="tonal" color="primary" block rounded="lg" @click="useDemoAccount">
        Use demo admin account
      </v-btn>

      <p class="text-caption text-muted text-center mt-3 mb-0">
        admin@taskflow.dev · password123
      </p>

      <p class="text-body-2 text-center mt-7 mb-0">
        New to TaskFlow?
        <RouterLink :to="{ name: 'register' }" class="text-primary font-weight-bold ms-1">
          Create an account
        </RouterLink>
      </p>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 500px;
  border: 1px solid #e7e0ec;
}
</style>
