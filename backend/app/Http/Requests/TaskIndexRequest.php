<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', 'nullable', Rule::in(Task::PRIORITIES)],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'sort_by' => ['sometimes', Rule::in(['created_at', 'updated_at', 'title', 'due_date', 'priority'])],
            'sort_order' => ['sometimes', Rule::in(['asc', 'desc', 'ASC', 'DESC'])],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return $this->safe()->only([
            'page',
            'per_page',
            'search',
            'status',
            'priority',
            'assigned_to',
            'sort_by',
            'sort_order',
        ]);
    }
}
