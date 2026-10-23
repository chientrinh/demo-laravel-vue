<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_user(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/users', [
            'name' => '  Rachel Adams  ',
            'email' => '  Rachel.Adams@Materio.IO ',
            'password' => 'secret123',
            'role' => 'user',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Rachel Adams')
            ->assertJsonPath('data.email', 'rachel.adams@materio.io')
            ->assertJsonPath('data.role', 'user');

        $user = User::query()->where('email', 'rachel.adams@materio.io')->firstOrFail();
        $this->assertTrue(Hash::check('secret123', $user->password));
        $this->assertNull($user->email_verified_at);
    }

    public function test_create_user_validates_payload_and_unique_email(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['email' => 'taken@example.com']);

        Sanctum::actingAs($admin);

        $this->postJson('/api/users', [
            'name' => '',
            'email' => 'TAKEN@EXAMPLE.COM',
            'password' => 'short',
            'role' => 'superadmin',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password', 'role']);
    }

    public function test_member_cannot_manage_users(): void
    {
        $member = User::factory()->create();
        $other = User::factory()->create();

        Sanctum::actingAs($member);

        $this->postJson('/api/users', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'secret123',
            'role' => 'user',
        ])->assertForbidden();

        $this->putJson("/api/users/{$other->id}", ['name' => 'Renamed'])->assertForbidden();
        $this->deleteJson("/api/users/{$other->id}")->assertForbidden();
    }

    public function test_admin_can_update_a_user_and_keep_password_when_blank(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create([
            'email' => 'old@example.com',
            'password' => Hash::make('oldsecret'),
        ]);

        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$target->id}", [
            'name' => 'Updated Name',
            'email' => 'new@example.com',
            'password' => '',
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.email', 'new@example.com')
            ->assertJsonPath('data.role', 'admin');

        $target->refresh();
        $this->assertTrue(Hash::check('oldsecret', $target->password));

        $this->putJson("/api/users/{$target->id}", ['email' => 'new@example.com'])
            ->assertOk();
    }

    public function test_admin_cannot_remove_their_own_admin_role(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$admin->id}", ['role' => 'user'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_admin_can_delete_a_user_and_their_tasks(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $task = Task::factory()->forAssignee($target)->create();

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/users/{$target->id}")->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_admin_cannot_delete_themselves(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/users/{$admin->id}")->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_users_can_be_filtered_by_role(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(2)->create();

        Sanctum::actingAs($admin);

        $this->getJson('/api/users?role=admin')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.role', 'admin');

        $this->getJson('/api/users?role=user')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }
}
