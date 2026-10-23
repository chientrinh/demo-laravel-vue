<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->auth->login($request->validated('email'), $request->validated('password'));

        return response()->json([
            'user' => new UserResource($user),
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->auth->register($request->validated());

        return response()->json([
            'user' => new UserResource($user),
        ], Response::HTTP_CREATED);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json((new UserResource($request->user()))->resolve($request));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request);

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}