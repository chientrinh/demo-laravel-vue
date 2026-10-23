<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { registerSchema } from '../../domain/schemas'
import { useAuthPage } from '../composables/useAuthPage'
import { useToast } from '@/shared/composables/useToast'

const { authStore, redirectAfterAuth } = useAuthPage()
const toast = useToast()

const showPassword = ref(false)
const serverError = ref('')

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(registerSchema),
  initialValues: {
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  },
})

const [name, nameProps] = defineField('name')
const [email, emailProps] = defineField('email')
const [password, passwordProps] = defineField('password')
const [passwordConfirmation, confirmationProps] = defineField('passwordConfirmation')

const onSubmit = handleSubmit(async (values) => {
  serverError.value = ''
  try {
    await authStore.register(values)
    toast.success('Your workspace is ready.')
    redirectAfterAuth()
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to create your account.'
  }
})
</script>

<template>
  <v-card class="auth-card" elevation="10">
    <v-card-text class="pa-8 pa-sm-10">
      <div class="mb-7">
        <p class="eyebrow mb-2">Get started</p>
        <h1 class="text-h4 font-weight-bold mb-2">Create your account</h1>
        <p class="text-body-2 text-muted mb-0">
          Start organizing your team's work in a few seconds.
        </p>
      </div>

      <v-alert
        v-if="serverError"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-5"
        closable
        @click:close="serverError = ''"
      >
        {{ serverError }}
      </v-alert>

      <v-form @submit.prevent="onSubmit">
        <v-label class="text-body-2 font-weight-medium mb-2">Full name</v-label>
        <v-text-field
          v-model="name"
          v-bind="nameProps"
          placeholder="Alex Morgan"
          prepend-inner-icon="mdi-account-outline"
          autocomplete="name"
          :error-messages="errors.name"
          class="mb-1"
        />

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
          placeholder="At least 8 characters"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          autocomplete="new-password"
          :error-messages="errors.password"
          class="mb-1"
          @click:append-inner="showPassword = !showPassword"
        />

        <v-label class="text-body-2 font-weight-medium mb-2">Confirm password</v-label>
        <v-text-field
          v-model="passwordConfirmation"
          v-bind="confirmationProps"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Repeat your password"
          prepend-inner-icon="mdi-lock-check-outline"
          autocomplete="new-password"
          :error-messages="errors.passwordConfirmation"
          class="mb-2"
        />

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          rounded="lg"
          class="mt-5"
          :loading="isSubmitting || authStore.loading"
        >
          Create account
        </v-btn>
      </v-form>

      <p class="text-caption text-muted text-center mt-4 mb-0">
        By continuing, you agree to the workspace terms and privacy policy.
      </p>

      <p class="text-body-2 text-center mt-6 mb-0">
        Already have an account?
        <RouterLink :to="{ name: 'login' }" class="text-primary font-weight-bold ms-1">
          Sign in
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
