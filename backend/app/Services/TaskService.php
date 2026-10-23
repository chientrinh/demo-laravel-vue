<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class TaskService
{
    public function __construct(private readonly TaskRepositoryInterface $tasks) {}

    public function paginate(?User $user, array $filters): LengthAwarePaginator
    {
        if ($user) {
            Gate::authorize('viewAny', Task::class);

            return $this->tasks->paginateFor($user, $filters);
        }

        return $this->tasks->paginateFor(null, $filters);
    }

    public function find(?User $user, int $id): Task
    {
        $task = $this->tasks->findOrFail($id);

        if ($user) {
            Gate::authorize('view', $task);
        }

        return $task;
    }

    public function create(?User $user, array $data): Task
    {
        // If no user is authenticated, allow creation (policy returns true for create)
        // If user is authenticated, check assignment rules
        if ($user) {
            Gate::authorize('create', Task::class);

            if (! $user->isAdmin() && (int) ($data['assigned_to'] ?? 0) !== $user->id) {
                throw new AuthorizationException('You may only assign tasks to yourself.');
            }
        }

        $data['priority'] ??= Task::PRIORITY_MEDIUM;

        return DB::transaction(fn () => $this->tasks->create($data));
    }

    public function update(?User $user, int $id, array $data): Task
    {
        $task = $this->tasks->findOrFail($id);

        if ($user) {
            Gate::authorize('update', $task);

            if (
                ! $user->isAdmin()
                && array_key_exists('assigned_to', $data)
                && (int) $data['assigned_to'] !== $user->id
            ) {
                throw new AuthorizationException('You may only assign tasks to yourself.');
            }
        }

        return DB::transaction(fn () => $this->tasks->update($task, $data));
    }

    public function delete(?User $user, int $id): void
    {
        $task = $this->tasks->findOrFail($id);

        if ($user) {
            Gate::authorize('delete', $task);
        }

        DB::transaction(fn () => $this->tasks->delete($task));
    }
}
