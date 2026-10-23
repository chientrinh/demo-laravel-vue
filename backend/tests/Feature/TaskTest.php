<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_all_tasks_and_members_see_only_their_own(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        $other = User::factory()->create();

        Task::factory()->forAssignee($member)->create();
        Task::factory()->forAssignee($other)->create();

        Sanctum::actingAs($admin);

        $this->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        Sanctum::actingAs($member);

        $this->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.assigned_to', $member->id)
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'title',
                    'description',
                    'status',
                    'priority',
                    'assigned_to',
                    'due_date',
                    'created_at',
                    'updated_at',
                    'assignee' => ['id', 'name', 'email', 'role'],
                ]],
                'meta' => ['current_page', 'last_page', 'per_page', 'total', 'page', 'total_pages'],
                'links',
            ]);
    }

    public function test_tasks_can_be_filtered_searched_and_sorted(): void
    {
        $admin = User::factory()->admin()->create();
        $assignee = User::factory()->create();

        Task::factory()->forAssignee($assignee)->create([
            'title' => 'Write release notes',
            'description' => 'Draft the changelog',
            'status' => 'todo',
            'priority' => 'low',
        ]);

        Task::factory()->forAssignee($assignee)->create([
            'title' => 'Fix login bug',
            'description' => 'Authentication regression',
            'status' => 'in_progress',
            'priority' => 'urgent',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/tasks?status=todo')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Write release notes');

        $this->getJson('/api/tasks?search=login')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Fix login bug');

        $this->getJson('/api/tasks?sort_by=priority&sort_order=asc')
            ->assertOk()
            ->assertJsonPath('data.0.priority', 'low');

        $this->getJson('/api/tasks?per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonCount(1, 'data');
    }

    public function test_member_can_create_a_task_assigned_to_themselves(): void
    {
        $member = User::factory()->create();

        Sanctum::actingAs($member);

        $response = $this->postJson('/api/tasks', [
            'title' => 'New task',
            'description' => 'Something to do',
            'status' => 'todo',
            'priority' => 'high',
            'assigned_to' => $member->id,
            'due_date' => '2026-12-01',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'New task')
            ->assertJsonPath('data.assigned_to', $member->id)
            ->assertJsonPath('data.due_date', '2026-12-01')
            ->assertJsonPath('data.assignee.id', $member->id);

        $this->assertDatabaseHas('tasks', ['title' => 'New task']);
    }

    public function test_member_cannot_assign_a_task_to_someone_else(): void
    {
        $member = User::factory()->create();
        $other = User::factory()->create();

        Sanctum::actingAs($member);

        $this->postJson('/api/tasks', [
            'title' => 'Not mine',
            'assigned_to' => $other->id,
        ])->assertForbidden();
    }

    public function test_admin_can_assign_a_task_to_anyone(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->postJson('/api/tasks', [
            'title' => 'Assigned by admin',
            'assigned_to' => $other->id,
        ])->assertCreated()
            ->assertJsonPath('data.assigned_to', $other->id);
    }

    public function test_task_creation_is_validated(): void
    {
        $member = User::factory()->create();

        Sanctum::actingAs($member);

        $this->postJson('/api/tasks', [
            'title' => '',
            'status' => 'unknown',
            'priority' => 'extreme',
            'assigned_to' => 999999,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'priority', 'assigned_to']);
    }

    public function test_member_cannot_view_or_update_another_users_task(): void
    {
        $member = User::factory()->create();
        $other = User::factory()->create();
        $task = Task::factory()->forAssignee($other)->create();

        Sanctum::actingAs($member);

        $this->getJson('/api/tasks/'.$task->id)->assertForbidden();

        $this->putJson('/api/tasks/'.$task->id, [
            'title' => 'Hijacked',
            'assigned_to' => $member->id,
        ])->assertForbidden();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => $task->title]);
    }

    public function test_member_can_update_their_own_task_but_not_reassign_it(): void
    {
        $member = User::factory()->create();
        $other = User::factory()->create();
        $task = Task::factory()->forAssignee($member)->create();

        Sanctum::actingAs($member);

        $this->putJson('/api/tasks/'.$task->id, [
            'title' => 'Updated title',
            'status' => 'done',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Updated title')
            ->assertJsonPath('data.status', 'done');

        $this->putJson('/api/tasks/'.$task->id, [
            'assigned_to' => $other->id,
        ])->assertForbidden();
    }

    public function test_only_admin_can_delete_tasks(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        $task = Task::factory()->forAssignee($member)->create();

        Sanctum::actingAs($member);

        $this->deleteJson('/api/tasks/'.$task->id)->assertForbidden();

        Sanctum::actingAs($admin);

        $this->deleteJson('/api/tasks/'.$task->id)->assertNoContent();

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_missing_task_returns_not_found_envelope(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/tasks/999999')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND')
            ->assertJsonPath('status_code', 404);
    }

    public function test_only_admin_can_list_users(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        Sanctum::actingAs($member);
        $this->getJson('/api/users')->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }
}
