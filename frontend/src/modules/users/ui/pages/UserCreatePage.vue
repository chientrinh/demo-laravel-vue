<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { createUserSchema, type CreateUserFormValues } from '../../domain/schemas'
import userService from '../../application/services/user.service'
import UserFormFields from '../components/UserFormFields.vue'
import { fieldErrorsFrom } from '../utils/formErrors'
import { useToast } from '@/shared/composables/useToast'
import { ApiError } from '@/shared/utils/errors'
import { getApiErrorMessage } from '@/adapters/infrastructures/clients/HttpClient'

const router = useRouter()
const toast = useToast()
const serverError = ref<string | null>(null)

const { handleSubmit, defineField, errors, setErrors, isSubmitting, meta } =
  useForm<CreateUserFormValues>({
    validationSchema: toTypedSchema(createUserSchema),
    initialValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
  })

const [name] = defineField('name')
const [email] = defineField('email')
const [password] = defineField('password')
const [role] = defineField('role')

const submit = handleSubmit(async (values) => {
  serverError.value = null
  try {
    await userService.create(values)
    toast.success('User created successfully.')
    await router.push({ name: 'users' })
  } catch (caught) {
    if (caught instanceof ApiError && caught.statusCode === 403) {
      toast.error('You do not have permission to access this page.')
      await router.replace({ name: 'tasks' })
      return
    }

    const fieldErrors = fieldErrorsFrom(caught)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
    } else {
      serverError.value = getApiErrorMessage(caught)
    }
  }
})

function cancel(): void {
  void router.push({ name: 'users' })
}
</script>

<template>
  <div class="user-form-page p-4!">
    <div class="d-flex align-center ga-3 mb-2">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        color="medium-emphasis"
        aria-label="Back to users"
        @click="cancel"
      />
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Create New User</h1>
        <p class="text-body-2 text-muted mb-0">
          Provision team member credentials, assign initial role, and configure granular system
          permissions.
        </p>
      </div>
    </div>

    <v-card class="form-card pa-5 pa-sm-7 mt-6 mx-auto" elevation="0">
      <div class="d-flex align-center ga-3 mb-6">
        <v-avatar color="primary" variant="tonal" rounded="lg" size="42">
          <v-icon icon="mdi-account-plus-outline" size="22" />
        </v-avatar>
        <div>
          <h2 class="text-h6 font-weight-bold mb-0">User Details</h2>
          <p class="text-caption text-muted mb-0">All fields are required.</p>
        </div>
      </div>

      <v-alert
        v-if="serverError"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-5"
        closable
        @click:close="serverError = null"
      >
        {{ serverError }}
      </v-alert>

      <v-form @submit.prevent="submit">
        <UserFormFields
          v-model:name="name"
          v-model:email="email"
          v-model:password="password"
          v-model:role="role"
          mode="create"
          :errors="errors"
        />

        <div class="d-flex justify-end ga-3 mt-7">
          <v-btn variant="text" color="medium-emphasis" @click="cancel">Cancel</v-btn>
          <v-btn
            type="submit"
            color="primary"
            prepend-icon="mdi-account-plus-outline"
            :loading="isSubmitting"
            :disabled="!meta.valid || isSubmitting"
          >
            Create User
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 720px;
  border: 1px solid #e7e0ec;
  border-radius: 18px;
}
</style>
