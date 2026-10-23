# Frontend Feature Development Guide — Vue 3 SPA

This guide walks a contributor through adding a new feature to the TaskFlow Vue 3 single‑page application, from idea to code to documentation. The **source code** in `frontend/src/` is the single source of truth; the steps below reflect the current patterns.

---

## 1. Define the scope

1. **What UI component or page** is needed? (e.g. a “Create Project” form, a new dashboard widget.)
2. **Which feature module** does it belong to? (`auth`, `tasks`, `users`, or a new `projects` module).
3. **What API endpoints** are required? (list, create, show, update, delete – or a custom endpoint).
4. **What state** does the feature need in Pinia? (filters, selected item, loading flag).
5. **What validation** is required? (client‑side rules, server‑side Form Request).

*Write a short bullet list; keep it concise enough for a pull‑request description.*

---

## 2. API contract

1. **Check the existing API** – `docs/backend/api/overview.md`, `docs/backend/api/endpoints/*.md` – to see if an endpoint already exists or if a new one is needed.
2. **If new** – define the request/response shapes (snake_case API, camelCase domain).  
3. **Add mapper** – create or update `src/modules/<feature>/mappers.ts` (or the analogous file) to convert snake_case ↔ camelCase.  
4. **Update HttpClient** – add the new function in `src/adaptors/infrastructures/clients/HttpClient.ts` (see `data-fetching.md` for the pattern).

---

## 3. Pinia store

1. **Create / update the store** under `src/modules/<feature>/store/`.

   ```ts
   // Example: use<Feature>Store
   export const use<Feature>Store = defineStore('<feature>', () => {
     const items = ref<DomainType[]>([]);
     const loading = ref(false);
     const error = ref<string | null>(null);

     async function load(filters = {}) {
       loading.value = true;
       try {
         const { data, meta } = await $http.<feature>.list(filters);
         items.value = data; // already mapped by HttpClient
       } catch (e) {
         error.value = e.response?.data?.message || 'Failed to load';
       } finally {
         loading.value = false;
       }
     }

     function setFilter(key, value) {
       // e.g. statusFilter.value = value;
     }
   });
   ```

2. **Register the store** – Pinia auto‑registers all stores defined with `defineStore`; no manual registration needed in `main.ts` unless you want a custom namespace.

---

## 4. User interface (components)

1. **Create / update the Vue component** under `src/modules/<feature>/ui/`.

   ```vue
   <!-- Example: Create<Feature>Form.vue -->
   <template>
     <VForm @submit.prevent="onSubmit">
       <VTextField v-model="newItem.title" rule="required" :title=" " />
       <VSelect v-model="newItem.status" :options="statusOptions" rule="required" />
       <VSelect v-model="newItem.priority" :options="priorityOptions" />
       <VTextarea v-model="newItem.description" :rules="[{ maxLength: 2000 }]" />
       <VBtn type="submit">Lưu</VBtn>
     </VForm>
   </template>

   <script setup>
   import { use<Feature>Store } from '@/modules/<feature>/store';
   import { taskStatusOptions, priorityOptions } from '@/shared/constants';

   const errors = ref<string[]>([]);
   const store = use<Feature>Store();
   const newItem = reactive({
     title: '',
     status: 'todo',
     priority: 'low',
     description: '',
   });

   function onSubmit() {
     store.createItem(newItem).catch(err => {
       if (err.response?.status === 422) {
         errors.value = err.response.data.errors?.map(e => e.message) || [];
       } else {
         errors.value = ['Có lỗi xảy ra, vui lòng thử lại sau.'];
       }
     });
   }
   </script>

   <style scoped>
   /* component‑specific styles */
   </style>
   ```

2. **Add the component to the route** – edit `src/app/router/routes.ts` (or the feature’s route file) and add a new route entry, using the appropriate guard (`authenticated`, `roleAdmin`, or public).

---

## 5. Forms & validation

- Follow the patterns in `forms-and-validation.md`:
  - Use HTML5 `required`, `maxLength`, etc.
  - Display server‑side errors from the API envelope (`status_code` = 422 → `errors` array).
  - Keep the backend as the source of truth; never duplicate full validation on the frontend.

---

## 6. Styling

- Use Vuetify 3 components for layout and primary controls.
- Add Tailwind utility classes for supplemental spacing/colours if needed (see `design-system.md`).
- Keep the design‑system colour palette consistent (`primary: #6C31DE`, etc.).

---

## 6. Mock mode considerations

- When `VITE_USE_MOCK` is not `"false"`, the `HttpClient` falls back to `mockDb.*` functions.
- Ensure the mock data in `mockDb.ts` includes the new entity (task, user, etc.) with realistic IDs (strings) and fields.
- If the new feature requires a new mock entity, add it to `mockDb.ts` and update the relevant store actions to call `mockDb.*` instead of `$http.*`.

---

## 7. Testing

1. **Unit test the store** – verify `load`, `create`, `update`, `delete` actions (mock mode by default).  
   ```ts
   // src/modules/<feature>/__tests__/use<Feature>Store.test.ts
   import { describe, it, expect } from 'vitest';
   import { use<Feature>Store } from '@/modules/<feature>/store';
   // … tests …
   ```
2. **Playwright e2e** – add a new test case in `frontend/e2e/vue.spec.ts` (or a new file) that exercises the new flow: login → navigate to new page → fill form → submit → verify result → logout.
3. **Run the suite** before opening a PR:
   ```bash
   npx vitest run
   npm run test:e2e
   ```

---

## 8. Documentation

1. **Update the documentation index** – add the new component/page to the relevant doc files (`routing.md`, `design-system.md`, `forms-and-validation.md`).
2. **Add a brief entry** in the “Documentation index” tables if the feature has its own section.
3. **Link** to the new route from `routing.md` and to the new component from the feature’s module README (if one exists).

---

## 9. Quick checklist (run before opening a PR)

- [ ] Scope defined and documented.
- [ ] API endpoint(s) exist or have been added (backend routes, Form Requests, Resources).
- [ ] Mappers updated (snake_case ↔ camelCase).
- [ ] HttpClient function(s) added and tested.
- [ ] Pinia store created/updated with actions & getters.
- [ ] Vue component created under `src/modules/<feature>/ui/` and wired into routes.
- [ ] Forms follow `forms-and-validation.md` patterns.
- [ ] Styling consistent with `design-system.md`.
- [ ] Mock data updated in `mockDb.ts` if mock mode is on.
- [ ] Unit tests written and passing (`vitest run`).
- [ ] e2e test added/updated (if applicable) and passing (`npm run test:e2e`).
- [ ] Documentation files updated (routing, design‑system, forms, etc.).
- [ ] `npm run lint` passes (`oxlint . && eslint .`).
- [ ] `npm run type-check` passes (`vue-tsc --noEmit -p tsconfig.json`).

*If any step is missing, the PR will be returned for revisions.*

---

*This guide mirrors the current codebase patterns (Pinia stores, HttpClient, Vuetify 3 + Tailwind 4, mock mode) and the test baseline described in `CONTRIBUTING.md`. When in doubt, look at the existing task or user implementation as the reference.*