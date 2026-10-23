<?php

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class UserRepository implements UserRepositoryInterface
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = User::query()->orderBy('name');

        if (! empty($filters['search'])) {
            $search = '%'.$filters['search'].'%';

            $query->where(function (Builder $builder) use ($search) {
                $builder->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search);
            });
        }

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        return $query->paginate(
            (int) ($filters['per_page'] ?? 20),
            ['*'],
            'page',
            (int) ($filters['page'] ?? 1),
        );
    }

    public function findOrFail(int $id): User
    {
        return User::query()->findOrFail($id);
    }

    public function create(array $data): User
    {
        return User::query()->create($data);
    }

    public function update(User $user, array $data): User
    {
        $user->fill($data)->save();

        return $user->fresh();
    }

    public function delete(User $user): void
    {
        $user->delete();
    }
}
