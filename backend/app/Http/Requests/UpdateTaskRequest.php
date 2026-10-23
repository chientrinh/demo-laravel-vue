<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', 'required', Rule::in(Task::PRIORITIES)],
            'assigned_to' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'due_date' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
