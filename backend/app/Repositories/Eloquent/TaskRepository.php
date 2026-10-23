<?php

namespace App\Repositories\Eloquent;

use App\Models\Task;
use App\Models\User;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class TaskRepository implements TaskRepositoryInterface
{
    private const SORTABLE = ['created_at', 'updated_at', 'title', 'due_date', 'priority'];

    public function paginateFor(?User $user, array $filters): LengthAwarePaginator
    {
        $query = Task::query()->with('assignee');

        if ($user && ! $user->isAdmin()) {
            $query->where('assigned_to', $user->id);
        }

        $this->applyFilters($query, $filters);
        $this->applySorting($query, $filters);

        return $query->paginate(
            (int) ($filters['per_page'] ?? 20),
            ['*'],
            'page',
            (int) ($filters['page'] ?? 1),
        );
    }

    public function findOrFail(int $id): Task
    {
        return Task::query()->with('assignee')->findOrFail($id);
    }

    public function create(array $data): Task
    {
        return Task::query()->create($data)->load('assignee');
    }

    public function update(Task $task, array $data): Task
    {
        $task->fill($data)->save();

        return $task->fresh()->load('assignee');
    }

    public function delete(Task $task): void
    {
        $task->delete();
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['search'])) {
            $search = '%'.$filters['search'].'%';

            $query->where(function (Builder $builder) use ($search) {
                $builder->where('title', 'like', $search)
                    ->orWhere('description', 'like', $search);
            });
        }

        foreach (['status', 'priority', 'assigned_to'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
    }

    private function applySorting(Builder $query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'created_at';

        if (! in_array($sortBy, self::SORTABLE, true)) {
            $sortBy = 'created_at';
        }

        $direction = strtolower((string) ($filters['sort_order'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'priority') {
            $query->orderByRaw(
                "CASE priority WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'urgent' THEN 3 ELSE 4 END {$direction}"
            );
        } else {
            $query->orderBy($sortBy, $direction);
        }

        if ($sortBy !== 'created_at') {
            $query->orderByDesc('created_at');
        }
    }
}