<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UserService
{
    public function __construct(private readonly UserRepositoryInterface $users) {}

    public function create(array $data): User
    {
        return DB::transaction(fn () => $this->users->create($data));
    }

    public function update(User $actor, int $id, array $data): User
    {
        $user = $this->users->findOrFail($id);

        if (array_key_exists('password', $data) && blank($data['password'])) {
            unset($data['password']);
        }

        if (
            $actor->id === $user->id
            && array_key_exists('role', $data)
            && $data['role'] !== User::ROLE_ADMIN
        ) {
            throw ValidationException::withMessages([
                'role' => 'You cannot remove your own admin role.',
            ]);
        }

        return DB::transaction(fn () => $this->users->update($user, $data));
    }

    public function delete(User $actor, int $id): void
    {
        $user = $this->users->findOrFail($id);

        if ($actor->id === $user->id) {
            throw new AuthorizationException('You cannot delete your own account.');
        }

        if (
            $user->role === User::ROLE_ADMIN
            && User::query()->where('role', User::ROLE_ADMIN)->count() <= 1
        ) {
            throw new HttpException(409, 'The last admin account cannot be deleted.');
        }

        DB::transaction(fn () => $this->users->delete($user));
    }
}
