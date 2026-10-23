<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { updateUserSchema, type UpdateUserFormValues } from '../../domain/schemas'
import userService from '../../application/services/user.service'
import type { User } from '../../domain/types'
import { useAuthStore } from '@/modules/auth'
import UserFormFields from '../components/UserFormFields.vue'
import ConfirmDialog from '@/shared/components/common/ConfirmDialog.vue'
import ErrorState from '@/shared/components/common/ErrorState.vue'
import { fieldErrorsFrom } from '../utils/formErrors'
import { useToast } from '@/shared/composables/useToast'
import { ApiError } from '@/shared/utils/errors'
import { formatDate } from '@/shared/utils/date'
import { getApiErrorMessage } from '@/adapters/infrastructures/clients/HttpClient'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const userId = computed(() => String(route.params.id ?? ''))
const user = ref<User | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const serverError = ref<string | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)

const { handleSubmit, defineField, errors, setErrors, resetForm, isSubmitting, meta } =
  useForm<UpdateUserFormValues>({
    validationSchema: toTypedSchema(updateUserSchema),
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

const isSelf = computed(() => Boolean(user.value && authStore.user?.id === user.value.id))
const canDelete = computed(() => Boolean(user.value) && !isSelf.value)
const canSave = computed(() => meta.value.valid && meta.value.dirty && !isSubmitting.value)

function applyUser(value: User): void {
  user.value = value
  resetForm({
    values: {
      name: value.name,
      email: value.email,
      password: '',
      role: value.role,
    },
  })
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    applyUser(await userService.get(userId.value))
  } catch (caught) {
    if (caught instanceof ApiError && caught.statusCode === 404) {
      toast.error('User not found.')
      await router.replace({ name: 'users' })
      return
    }
    if (caught instanceof ApiError && caught.statusCode === 403) {
      toast.error('You do not have permission to access this page.')
      await router.replace({ name: 'tasks' })
      return
    }
    loadError.value = getApiErrorMessage(caught)
  } finally {
    loading.value = false
  }
}

const submit = handleSubmit(async (values) => {
  serverError.value = null
  try {
    const updated = await userService.update(userId.value, values)
    applyUser(updated)
    toast.success('User updated successfully.')
    await router.push({ name: 'users' })
  } catch (caught) {
    if (caught instanceof ApiError && caught.statusCode === 404) {
      toast.error('User not found.')
      await router.replace({ name: 'users' })
      return
    }
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

async function confirmDelete(): Promise<void> {
  if (!user.value) return
  deleting.value = true
  try {
    await userService.remove(user.value.id)
    toast.success('User deleted.')
    deleteOpen.value = false
    await router.push({ name: 'users' })
  } catch (caught) {
    if (caught instanceof ApiError && caught.statusCode === 404) {
      toast.error('User not found.')
      deleteOpen.value = false
      await router.replace({ name: 'users' })
      return
    }
    toast.error(getApiErrorMessage(caught))
  } finally {
    deleting.value = false
  }
}

function cancel(): void {
  void router.push({ name: 'users' })
}

onMounted(load)
</script>

<template>
  <div class="user-form-page p-4!">
    <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-6">
      <div>
        <div class="d-flex align-center ga-3 mb-1">
          <h1 class="text-h4 font-weight-bold mb-0">Edit User</h1>
          <v-chip v-if="user" color="primary" variant="tonal" size="small" class="font-weight-bold">
            #{{ user.id }}
          </v-chip>
        </div>
        <p class="text-body-2 text-muted mb-0">
          Update account credentials and user role privileges.
        </p>
      </div>

      <div v-if="user" class="d-flex flex-wrap align-center ga-2">
        <v-btn variant="text" color="medium-emphasis" @click="cancel">Cancel</v-btn>
        <v-tooltip
          :text="canDelete ? 'Delete user' : 'You cannot delete your own account'"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <span v-bind="tooltipProps">
              <v-btn
                variant="outlined"
                color="error"
                prepend-icon="mdi-trash-can-outline"
                :disabled="!canDelete"
                @click="deleteOpen = true"
              >
                Delete User
              </v-btn>
            </span>
          </template>
        </v-tooltip>
        <v-btn
          color="primary"
          prepend-icon="mdi-content-save-outline"
          :loading="isSubmitting"
          :disabled="!canSave"
          @click="submit"
        >
          Save Changes
        </v-btn>
      </div>
    </div>

    <v-skeleton-loader v-if="loading" type="heading, text, text, text, text" class="form-card" />

    <v-card v-else-if="loadError" class="form-card pa-5" elevation="0">
      <ErrorState :message="loadError" @retry="load" />
    </v-card>

    <v-card v-else-if="user" class="form-card pa-5 pa-sm-7 mx-auto" elevation="0">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="42">
            <v-icon icon="mdi-account-cog-outline" size="22" />
          </v-avatar>
          <div>
            <h2 class="text-h6 font-weight-bold mb-0">User Details</h2>
            <p class="text-caption text-muted mb-0">Account information</p>
          </div>
        </div>
        <v-chip size="small" variant="outlined" color="medium-emphasis">ID: #{{ user.id }}</v-chip>
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
          mode="edit"
          :errors="errors"
          :user-id="user.id"
          :lock-user-role="isSelf"
        />

        <div class="d-flex flex-wrap align-center ga-4 mt-7 text-caption text-muted">
          <span class="d-flex align-center ga-2">
            <v-icon icon="mdi-clock-outline" size="16" />
            Created: {{ formatDate(user.createdAt) }}
          </span>
          <span class="d-flex align-center ga-2">
            <v-icon icon="mdi-update" size="16" />
            Updated: {{ formatDate(user.updatedAt) }}
          </span>
        </div>
      </v-form>
    </v-card>

    <ConfirmDialog
      v-model="deleteOpen"
      title="Delete user?"
      :message="`“${user?.name ?? ''}” (${user?.email ?? ''}) will be permanently removed. All tasks assigned to this user will also be deleted.`"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.form-card {
  max-width: 720px;
  border: 1px solid #e7e0ec;
  border-radius: 18px;
}
</style>
