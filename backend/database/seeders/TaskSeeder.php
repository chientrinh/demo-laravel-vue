<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    /**
     * @var list<array{title: string, description: string, status: string, priority: string, email: string, due: int|null, created: int, updated: int}>
     */
    private array $tasks = [
        ['title' => 'Finalize Q3 product roadmap', 'description' => 'Align product, design, and engineering on the Q3 priorities and publish the final roadmap.', 'status' => 'in_progress', 'priority' => 'urgent', 'email' => 'olivia@taskflow.dev', 'due' => 2, 'created' => -12, 'updated' => -1],
        ['title' => 'Redesign onboarding flow', 'description' => 'Simplify the first-run experience and reduce the time-to-first-value for new accounts.', 'status' => 'todo', 'priority' => 'high', 'email' => 'phoenix@taskflow.dev', 'due' => 6, 'created' => -9, 'updated' => -2],
        ['title' => 'Fix billing webhook retries', 'description' => 'Webhook retries can duplicate invoice events. Add idempotency keys and alerting.', 'status' => 'in_progress', 'priority' => 'urgent', 'email' => 'lana@taskflow.dev', 'due' => -1, 'created' => -15, 'updated' => -1],
        ['title' => 'Customer interview synthesis', 'description' => 'Summarize the last ten discovery interviews into themes for the planning workshop.', 'status' => 'done', 'priority' => 'medium', 'email' => 'demi@taskflow.dev', 'due' => -3, 'created' => -20, 'updated' => -3],
        ['title' => 'Ship usage analytics dashboard', 'description' => 'Expose weekly active teams, activation, and retention in the internal analytics dashboard.', 'status' => 'in_progress', 'priority' => 'high', 'email' => 'candice@taskflow.dev', 'due' => 4, 'created' => -18, 'updated' => -2],
        ['title' => 'Refresh design system tokens', 'description' => 'Consolidate color, spacing, and radius tokens into the shared design system package.', 'status' => 'todo', 'priority' => 'medium', 'email' => 'olivia@taskflow.dev', 'due' => 10, 'created' => -7, 'updated' => -4],
        ['title' => 'Draft security review checklist', 'description' => 'Create a lightweight checklist for authentication, authorization, and data handling reviews.', 'status' => 'todo', 'priority' => 'low', 'email' => 'phoenix@taskflow.dev', 'due' => 14, 'created' => -6, 'updated' => -5],
        ['title' => 'Resolve mobile navigation overflow', 'description' => 'Long workspace names break the mobile drawer. Truncate labels and add a tooltip.', 'status' => 'done', 'priority' => 'high', 'email' => 'lana@taskflow.dev', 'due' => -6, 'created' => -22, 'updated' => -6],
        ['title' => 'Automate release notes', 'description' => 'Generate release notes from merged pull requests and publish them to the changelog.', 'status' => 'in_progress', 'priority' => 'medium', 'email' => 'demi@taskflow.dev', 'due' => 8, 'created' => -11, 'updated' => -2],
        ['title' => 'Archive legacy notifications', 'description' => 'Remove the deprecated notification center from the codebase after the migration window.', 'status' => 'cancelled', 'priority' => 'low', 'email' => 'candice@taskflow.dev', 'due' => null, 'created' => -30, 'updated' => -10],
        ['title' => 'Improve empty-state guidance', 'description' => 'Add clearer next steps and documentation links to empty states across the workspace.', 'status' => 'todo', 'priority' => 'low', 'email' => 'admin@taskflow.dev', 'due' => 16, 'created' => -5, 'updated' => -5],
        ['title' => 'Quarterly access review', 'description' => 'Review workspace roles and remove access for inactive accounts before the audit.', 'status' => 'done', 'priority' => 'urgent', 'email' => 'admin@taskflow.dev', 'due' => -8, 'created' => -25, 'updated' => -8],
    ];

    public function run(): void
    {
        Task::query()->delete();

        $users = User::query()->pluck('id', 'email');

        foreach ($this->tasks as $task) {
            $model = new Task([
                'title' => $task['title'],
                'description' => $task['description'],
                'status' => $task['status'],
                'priority' => $task['priority'],
                'assigned_to' => $users[$task['email']],
                'due_date' => $task['due'] === null ? null : now()->addDays($task['due'])->toDateString(),
            ]);

            $model->created_at = now()->addDays($task['created']);
            $model->updated_at = now()->addDays($task['updated']);
            $model->save();
        }
    }
}
