# Form Task (Tạo/Sửa Task)

## Mục tiêu
Dialog form để tạo mới hoặc chỉnh sửa task.

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v-select | required, exists:users,id | Yes | Admin sees all, User sees only self |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card with v-form
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v-select | required, exists:users,id | Yes | Admin thấy all, User chỉ thấy mình |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card với v-form bên trong
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"

## Form Composable

**File:** `modules/tasks/ui/composables/useTaskForm.ts`

```typescript
import { ref, computed } from 'vue';
import { useForm } from 'vee-validate';
import * as zod from 'zod';
import type { Task, TaskStatus, CreateTaskDto, UpdateTaskDto } from '../../domain/types';

const taskSchema = zod.object({
  title: zod.string().min(1, 'Title is required').max(255),
  description: zod.string().optional(),
  status: zod.enum(['todo', 'in_progress', 'done']),
  assignedTo: zod.string().min(1, 'Assignee is required'),
  dueDate: zod.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
)

export function useTaskForm(initialTask?: Task | null) {
  const { handleSubmit, errors, setFieldError, resetForm, setValues, meta } = useForm({
    validationSchema: taskSchema,
    initialValues: {
      title: initialTask?.title ?? '',
      description: initialTask?.description ?? '',
      status: initialTask?.status ?? 'todo',
      assignedTo: initialTask?.assignedTo ?? '',
      dueDate: initialTask?.dueDate ? initialTask.dueDate.toISOString().split('T')[0] : '',
    },
  })

  const submitting = ref(false)

  const onSubmit = handleSubmit(async (values) => {
    submitting.value = true
    try {
      const dto: CreateTaskDto | UpdateTaskDto = {
        title: values.title,
        description: values.description,
        status: values.status,
        assigned_to: values.assignedTo,
        due_date: values.dueDate || null,
      }
      // Call service/composable action
      await submitAction(dto)
    } finally {
      submitting.value = false
    }
  })

  function reset(task?: Task | null) {
    resetForm({
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      assignedTo: task?.assignedTo ?? '',
      dueDate: task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
    })
  }

  return {
    handleSubmit: onSubmit,
    errors,
    meta,
    submitting,
    reset,
    setFieldError: (field: string, message: string) => { /* vee-validate handles this */ },
  }
}
```

## Form Component

**File:** `modules/tasks/ui/components/TaskForm.vue`

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTaskForm } from '../composables/useTaskForm';
import type { Task, TaskStatus } from '../../domain/types';

interface Props {
  modelValue?: Task | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  submit: [data: CreateTaskDto | UpdateTaskDto]
  cancel: [];
}>();

const { form, errors, submitting, isValid, validate, reset, clearErrors } = useTaskForm(props.modelValue);

watch(() => props.modelValue, (newTask) => {
  reset(newTask)
  clearErrors()
}, { immediate: true })

async function handleSubmit(): Promise<void> {
  if (!validate()) return
  submitting.value = true
  try {
    emit('submit', { ...form.value })
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  emit('cancel')
}
</script>

<template>
  <v-dialog v-model="form.visible" max-width="600" persistent>
    <v-card>
      <v-card-title>Create Task</v-card-title>
      <v-card-text class="pt-0">
        <v-form @submit.prevent="handleSubmit">
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
              <v-textarea
                v-model="form.description"
                label="Description"
                rows="3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.status"
                :items="['todo', 'in_progress', 'done']"
                label="Status"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.assignedTo"
                :items="assignees"
                label="Assignee"
                item-title="name"
                item-value="id"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-date-picker
                v-model="form.dueDate"
                label="Due Date"
                :no-title="true"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn 
          color="primary" 
          type="submit" 
          :loading="submitting" 
          :disabled="!isValid"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v-select | required, exists:users,id | Yes | Admin thấy all, User chỉ thấy mình |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card với v-form bên trong
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v-select | required, exists:users,id | Yes | Admin thấy all, User chỉ thấy mình |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card với v-form bên trong
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v-select | required, exists:users,id | Yes | Admin thấy all, User chỉ thấy mình |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card với v-form bên trong
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v-select | required, exists:users,id | Yes | Admin thấy all, User chỉ thấy mình |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card với v-form bên trong
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"

## UI/UX Specs (Per `task-create.html` và `task-edit.html`)

### Layout
- **Dialog/Page**: v-dialog max-width 600, persistent
- **Card**: v-card với v-form bên trong
- **Header**: "Create Task" hoặc "Edit Task"
- **Form Fields**: Title, Description, Status, Assignee, Due Date
- **Actions**: Cancel (text), Save (primary, loading state, disabled khi invalid)

### Form Fields

| Field | Type | Validation | Required | Notes |
|-------|------|------------|----------|-------|
| Title | v-text-field | min 1, max 255 | Yes | Char counter (120 max) |
| Description | v-textarea | optional | No | rows=3 |
| Status | v-select | enum: todo/in_progress/done | Yes | default: todo |
| Assignee | v_select | required, exists:users,id | Yes | Admin sees all, User sees self |
| Due Date | v-date-picker | optional, date >= today | No | Date picker |

### Form Layout (Per `task-create.html`)
- **Dialog/Page Layout**: Max-width 600, persistent
- **Card Layout**: v-card với v-form bên trong
- **Fields Arrangement**: 
  - Title (full width)
  - Description (textarea, rows=3)
  - Status + Assignee (side by side, sm=6)
  - Due Date (date picker)

### Assignee Dropdown
- Admin: sees all users
- User: only sees themselves (disabled select)

### Status Options
- todo (To Do)
- in_progress (In Progress)
- done (Done)

### Due Date
- v-date-picker with :no-title="true"
- Optional, validation: date >= today

### Form Actions
- **Cancel**: v-btn variant="text", emits cancel
- **Save**: v-btn color="primary", type="submit", :loading="submitting", :disabled="!isValid"