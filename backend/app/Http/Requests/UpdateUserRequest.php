<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore((int) $this->route('user')),
            ],
            'password' => ['sometimes', 'nullable', 'string', Password::min(8)],
            'role' => ['sometimes', 'required', Rule::in([User::ROLE_ADMIN, User::ROLE_USER])],
        ];
    }

    protected function prepareForValidation(): void
    {
        $data = [];

        if ($this->has('name')) {
            $data['name'] = is_string($this->name) ? trim($this->name) : $this->name;
        }

        if ($this->has('email')) {
            $data['email'] = is_string($this->email) ? Str::lower(trim($this->email)) : $this->email;
        }

        $this->merge($data);
    }
}
