<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * @var list<array{name: string, email: string, role: string}>
     */
    private array $users = [
        ['name' => 'Musharof Chowdhury', 'email' => 'admin@taskflow.dev', 'role' => 'admin'],
        ['name' => 'Olivia Rhye', 'email' => 'olivia@taskflow.dev', 'role' => 'admin'],
        ['name' => 'Phoenix Baker', 'email' => 'phoenix@taskflow.dev', 'role' => 'user'],
        ['name' => 'Lana Steiner', 'email' => 'lana@taskflow.dev', 'role' => 'user'],
        ['name' => 'Demi Wilkinson', 'email' => 'demi@taskflow.dev', 'role' => 'user'],
        ['name' => 'Candice Wu', 'email' => 'candice@taskflow.dev', 'role' => 'user'],
    ];

    public function run(): void
    {
        foreach ($this->users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'password' => Hash::make('password123'),
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
