# Frontend Forms & Validation — Vue 3 + Vee‑Validate / HTML5

This document describes the **current** form handling and validation patterns in the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/src/modules/` and `frontend/src/shared/` is the single source of truth; this page exists to help contributors build consistent, accessible forms.

## 1. Validation strategy

- **Client‑side** – Vue’s native `v‑model` + HTML5 attributes (`required`, `min`, `max`, `pattern`) + optional **VeeValidate** for richer error messaging.  
- **Server‑side** – Laravel Form Requests always enforce the definitive rules; the frontend must display the error envelope returned by the API (`status_code`, `code`, `message`, `errors`).  
- **Never duplicate** the full validation logic on the frontend; keep the backend as the source of truth.

## 2. HTML5 attributes (recommended)

```vue
<template>
  <VTextField
    label="Tiêu đề"
    v-model="newTask.title"
    rule="required"
    :rules="[{ required: true, message: 'Tiêu đề bắt buộc' }]"
    :placeholder="Nhập tiêu đề..."
  />
  <VSelect
    label="Trạng thái"
    v-model="newTask.status"
    :options="statusOptions"
    rule="required"
  />
  <VTextarea
    label="Mô tả"
    v-model="newTask.description"
    :rules="[{ maxLength: 2000 }]"
    :placeholder="Mô tả ngắn..."
  />
</template>

<script setup>
import { taskStatusOptions, priorityOptions } from '@/shared/constants';
</script>
```

- `rule="required"` – built‑in VeeValidate rule; displays the custom message if missing.  
- `:rules="[{ maxLength: 2000 }]"` – limits characters; the backend also caps at 5000, but the UI limits to 2000 for usability.  
- `:options` supplies the enum list for status/priority.

## 3. VeeValidate (optional, used in some components)

- Install: `npm i vee-validate@next`.  
- Provide the plugin in `main.ts` if globally used, or use `<ValidationProvider>` locally.

```ts
import { ValidationProvider, defineRule } from 'vee-validate';
import { required, max, alpha_num } from 'vee-validate/dist/rules';

defineRule('required', required);
defineRule('max', max);
defineRule('alpha_num', alpha_num);
```

Then in a component:

```vue
<ValidationProvider
  rules="{ required: true, max: 100 }"
  v-slot="{ errors }"
>
  <input v-model="value" />
  <span>{{ errors || '' }}</span>
</ValidationProvider>
```

- **Rule list commonly used**

| Rule | Meaning |
|------|---------|
| `required` | Field must not be empty. |
| `max: N` | Value must not exceed N characters (or bytes). |
| `min: N` | Value must be at least N characters. |
| `alpha_num` | Must contain only letters and numbers. |
| `regex: /pattern/` | Custom regular expression. |

## 4. Server‑side error display

When a submit fails (HTTP 422), the `HttpClient` error interceptor extracts the `errors` array from the Laravel envelope and stores it in the store; the UI component then iterates over it.

### Example: CreateTaskForm.vue error handling

```vue
<script setup>
import { useTaskStore } from '@/modules/tasks/store';
import { taskStatusOptions, priorityOptions } from '@/shared/constants';

const errors = ref<string[]>([]);
const newTask = reactive({
  title: '',
  status: 'todo',
  priority: 'low',
  description: '',
});

const store = useTaskStore();

function onSubmit() {
  store.createTask(newTask).catch(err => {
    if (err.response?.status === 422) {
      errors.value = err.response.data.errors?.map(e => e.message) || [];
    } else {
      errors.value = ['Có lỗi xảy ra, vui lòng thử lại later.'];
    }
  });
}
</script>

<template>
  <VForm @submit.prevent="onSubmit">
    <VTextField
      label="Tiêu đề"
      v-model="newTask.title"
      :rules="[{ required: true, message: 'Tiêu đề bắt buộc' }]"
    />
    <VSelect
      label="Trạng thái"
      v-model="newTask.status"
      :options="statusOptions"
      :rules="[{ required: true }]"
    />
    <VSelect
      label="Ưu tiên"
      v-model="newTask.priority"
      :options="priorityOptions"
    />
    <VTextarea
      label="Mô tả"
      v-model="newTask.description"
      :rules="[{ maxLength: 2000 }]"
    />
    <VBtn type="submit">Lưu</VBtn>

    <!-- Error list -->
    <VAlert v-if="errors.length" color="error">
      <VList>
        <VListItem v-for="err in errors" :key="err">
          <VListItemContent>{{ err }}</VListItemContent>
        </VListItem>
      </VList>
    </VAlert>
  </VForm>
</template>
```

## 5. Form reset & default values

- After a successful create or update, reset the form by setting `reactive` defaults or calling `resetForm()` if using VeeValidate.
- Default values for status and priority are usually the first enum option (`'todo'`, `'low'`).

## 6. Accessibility

- Associate `<label>` elements with inputs via the `label` prop of Vuetify components (`<VTextField label="…">`) – this automatically sets the `for` attribute.  
- Use `aria-invalid` and `aria-describedby`; VeeValidate adds these automatically when `validationProvider` is used.  
- Provide clear error messages in the user's language (Vietnamese messages are acceptable if the UI is Vietnamese, but the backend error `message` is in English; keep consistency).

## 6. Known constraints

- **Title** – backend max 255 characters; UI limit 120 (displayed as a hint).  
- **Description** – backend max 5000 characters; UI limit 2000.  
- **Priority** – one of `low`, `medium`, `high`, `urgent`.  
- **Status** – one of `todo`, `in_progress`, `done`, `cancelled`.  
- **Assign to** – must be an existing user ID (backend `exists:users,id`).  

## 7. Links

- [State management](state-management.md) – how forms interact with Pinia stores.  
- [Data fetching](data-fetching.md) – how submissions call the API.  
- [Design system](design-system.md) – styling of form controls.  
- [API error handling](api/error-handling.md) – envelope shape that forms must display.

---

*If a new form is added, follow the patterns above; add a new component under `src/modules/<feature>/ui/` and, if needed, a mapper in the feature’s `mappers.ts`.*