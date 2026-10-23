<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\TaskIndexRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $tasks) {}

    public function index(TaskIndexRequest $request): JsonResponse
    {
        $paginator = $this->tasks->paginate($request->user(), $request->filters());
        $paginator->appends($request->query());

        return response()->json([
            'data' => TaskResource::collection($paginator->items())->resolve($request),
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

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = $this->tasks->create($request->user(), $request->validated());

        return response()->json([
            'data' => new TaskResource($task),
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, int $task): JsonResponse
    {
        $task = $this->tasks->find($request->user(), $task);

        return response()->json([
            'data' => new TaskResource($task),
        ]);
    }

    public function update(UpdateTaskRequest $request, int $task): JsonResponse
    {
        $task = $this->tasks->update($request->user(), $task, $request->validated());

        return response()->json([
            'data' => new TaskResource($task),
        ]);
    }

    public function destroy(Request $request, int $task): Response
    {
        $this->tasks->delete($request->user(), $task);

        return response()->noContent();
    }
}
