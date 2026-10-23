# Forms & Validation — Frontend

## Form Architecture

```
Form Component (Vue)
      ↓
Composable (useTaskForm, useLoginForm)
      ↓
VeeValidate + Zod Schema
      ↓
Submit → Composable Action → tasksService → tasksRepository
```

---

## VeeValidate + Zod

```typescript
// modules/tasks/ui/composables/useTaskForm.ts
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { tasksService } from '../../application/services/tasks.service'
import { createTaskSchema } from '../../domain/schemas'
import type { Task, TaskStatus } from '../../domain/types'

const taskSchema = toTypedSchema(createTaskSchema)

export function useTaskForm(initialTask?: Task | null) {
  const submitting = ref(false)

  const { handleSubmit, errors, meta, resetForm, values } = useForm({
    validationSchema: taskSchema,
    initialValues: {
      title: initialTask?.title ?? '',
      description: initialTask?.description ?? '',
      status: initialTask?.status ?? 'todo',
      assignedTo: initialTask?.assignedTo ?? '',
      dueDate: initialTask?.dueDate ? initialTask.dueDate.toISOString().split('T')[0] : '',
    },
  })

  const onSubmit = handleSubmit(async (form) => {
    submitting.value = true
    try {
      const payload = {
        title: form.title,
        description: form.description ?? '',
        status: form.status as TaskStatus,
        assignedTo: form.assignedTo,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
      }

      if (initialTask) {
        await tasksService.update(initialTask.id, payload)
      } else {
        await tasksService.create(payload)
      }
    } finally {
      submitting.value = false
    }
  })

  function reset(task?: Task | null) {
    resetForm({
      values: {
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? 'todo',
        assignedTo: task?.assignedTo ?? '',
        dueDate: task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
      },
    })
  }

  return {
    form: values,
    errors,
    meta,
    submitting,
    handleSubmit: onSubmit,
    reset,
  }
}
```

---

## Form Component

```vue
<!-- modules/tasks/ui/components/TaskForm.vue -->
<script setup lang="ts">
import { watch } from 'vue'
import { useTaskForm } from '../composables/useTaskForm'
import type { Task } from '../../domain/types'

interface Props {
  open: boolean
  task?: Task | null
  assignees: { id: string; name: string }[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
  cancel: []
}>()

const { form, errors, meta, submitting, handleSubmit, reset } = useTaskForm(props.task)

watch(
  () => props.task,
  (newTask) => reset(newTask),
  { immediate: true },
)

function close(): void {
  emit('update:open', false)
  emit('cancel')
}

async function submit(): Promise<void> {
  await handleSubmit()
  emit('saved')
  close()
}
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="600"
    persistent
    @update:model-value="emit('update:open', $event)"
  >
    <v-card>
      <v-card-title>{{ props.task ? 'Edit Task' : 'Create Task' }}</v-card-title>
      <v-card-text class="pt-0">
        <v-form id="task-form" @submit.prevent="submit">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="form.title"
                label="Title"
                :error-messages="errors.title"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="form.description" label="Description" rows="3" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.status"
                :items="['todo', 'in_progress', 'done']"
                label="Status"
                :error-messages="errors.status"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.assignedTo"
                :items="props.assignees"
                label="Assignee"
                item-title="name"
                item-value="id"
                :error-messages="errors.assignedTo"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.dueDate"
                label="Due Date"
                type="date"
                :error-messages="errors.dueDate"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          type="submit"
          form="task-form"
          :loading="submitting"
          :disabled="!meta.valid"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

---

## Validation Rules

### Zod Schemas

```typescript
// modules/tasks/domain/schemas.ts
import * as zod from 'zod'

export const createTaskSchema = zod.object({
  title: zod.string().min(1, 'Title is required').max(255),
  description: zod.string().optional(),
  status: zod.enum(['todo', 'in_progress', 'done']),
  assignedTo: zod.string().min(1, 'Assignee is required'),
  dueDate: zod
    .string()
    .optional()
    .nullable()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
})

export const updateTaskSchema = createTaskSchema.partial()

export const taskFiltersSchema = zod.object({
  page: zod.number().int().positive().default(1),
  per_page: zod.number().int().min(1).max(100).default(20),
  status: zod.enum(['todo', 'in_progress', 'done']).optional(),
  search: zod.string().max(255).optional(),
  sort_by: zod.enum(['created_at', 'updated_at', 'title', 'due_date']).default('created_at'),
  sort_order: zod.enum(['asc', 'desc']).default('desc'),
})

// taskFiltersSchema validates API query params (see TaskFilters), not form state.
// Domain types remain the source of truth; form schemas validate input only.
```

### VeeValidate + Zod Integration

```typescript
// In composable
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as zod from 'zod'

const schema = toTypedSchema(
  zod.object({
    email: zod.string().email('Invalid email'),
    password: zod.string().min(8, 'Password must be at least 8 characters'),
  }),
)

const { handleSubmit, errors, resetForm } = useForm({
  validationSchema: schema,
  initialValues: { email: '', password: '' },
})

const onSubmit = handleSubmit(async (values) => {
  // values is typed and validated
})
```

---

## Error Display

```vue
<!-- Field with error -->
<v-text-field
  v-model="form.email"
  label="Email"
  :error-messages="errors.email"
/>

<!-- Global form error -->
<div v-if="errors.form" class="error-summary">
  {{ errors.form }}
</div>

<!-- Toast for submit errors -->
<script setup>
import { useUIStore } from '@/shared/stores/ui.store'

const uiStore = useUIStore()

const onSubmit = handleSubmit(async (values) => {
  try {
    await submitAction(values)
    uiStore.toast.success('Saved successfully')
  } catch (e) {
    uiStore.toast.error(e.message)
  }
})
</script>
```

---

## File Upload

```typescript
// File validation
const fileSchema = zod.object({
  file: zod.instanceof(File)
    .refine(f => f.size <= 5 * 1024 * 1024, 'Max 5MB')
    .refine(f => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type), 'Invalid file type'),
})

// Component
<v-file-input
  v-model="form.file"
  :error-messages="errors.file"
  accept="image/jpeg,image/png,image/webp,application/pdf"
  :max-size="5 * 1024 * 1024"
  show-size
/>
```

```typescript
// Upload to signed URL
async function uploadFile(file: File) {
  const { uploadUrl } = await api.post('/uploads/sign', { contentType: file.type })
  await fetch(uploadUrl, { 
    method: 'PUT', 
    body: file, 
    headers: { 'Content-Type': file.type } 
  })
}
```

---

## Custom Validators

```typescript
// Async validator (check unique email)
const emailSchema = zod.string().email().refine(
  async (email) => {
    const exists = await authService.isEmailTaken(email)
    return !exists
  },
  'Email already registered'
)

// Conditional validation
const taskSchema = zod.object({
  status: zod.enum(['todo', 'in_progress', 'done']),
  dueDate: zod.string().date().optional(),
}).refine(data => {
  if (data.status === 'done' && !data.dueDate) return false
  return true
}, {
  message: 'Due date required when status is Done',
  path: ['dueDate'],
})
```

---

## Form State Management

```typescript
// Composable pattern
export function useTaskForm(initialTask?: Task | null) {
  const form = ref({...})
  const errors = ref({})
  const submitting = ref(false)

  const validate = (): boolean => { ... }
  const setFieldError = (field: string, message: string) => { ... }
  const clearErrors = () => { errors.value = {} }
  const reset = (task?: Task | null) => { ... }

  return { form, errors, submitting, validate, setFieldError, clearErrors, reset }
}
```

---

## Testing Forms

```typescript
// tests/components/TaskForm.test.ts
import { render, screen, fireEvent } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import TaskForm from '@/modules/tasks/ui/components/TaskForm.vue'

describe('TaskForm', () => {
  it('shows validation errors', async () => {
    render(TaskForm)
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Assignee is required')).toBeInTheDocument()
  })

  it('submits valid form', async () => {
    const mockAssignees = [{ id: '1', name: 'John' }]
    const { emitted } = render(TaskForm, { 
      global: { provide: { assignees: mockAssignees } } 
    })
    
    await userEvent.type(screen.getByLabelText(/title/i), 'New Task')
    await userEvent.selectOptions(screen.getByLabelText(/assignee/i), '1')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    
    expect(emitted().submit).toHaveLength(1)
  })
})
```