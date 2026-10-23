<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UserIndexRequest;
use App\Http\Resources\UserResource;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly UserService $userService,
    ) {}

    public function index(UserIndexRequest $request): JsonResponse
    {
        $paginator = $this->users->paginate($request->safe()->only(['page', 'per_page', 'search', 'role']));
        $paginator->appends($request->query());

        return response()->json([
            'data' => UserResource::collection($paginator->items())->resolve($request),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'page' => $paginator->currentPage(),
                'total_pages' => $paginator->lastPage(),
            ],
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return response()->json([
            'data' => new UserResource($user),
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, int $user): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($this->users->findOrFail($user)),
        ]);
    }

    public function update(UpdateUserRequest $request, int $user): JsonResponse
    {
        $updated = $this->userService->update($request->user(), $user, $request->validated());

        return response()->json([
            'data' => new UserResource($updated),
        ]);
    }

    public function destroy(Request $request, int $user): Response
    {
        $this->userService->delete($request->user(), $user);

        return response()->noContent();
    }
}
