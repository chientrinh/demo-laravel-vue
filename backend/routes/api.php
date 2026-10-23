<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    DB::connection()->getPdo();

    return response()->json([
        "status" => "ok",
        "service" => "taskflow-api",
        "timestamp" => now()->toISOString(),
    ]);
});

Route::post("/login", [AuthController::class, "login"])->name("login")->middleware("throttle:5,1");
Route::post("/register", [AuthController::class, "register"])->middleware("throttle:5,1");

Route::middleware("auth:sanctum")->group(function () {
    Route::get("/me", [AuthController::class, "me"]);
    Route::get("/user", [AuthController::class, "user"]);
    Route::post("/logout", [AuthController::class, "logout"]);

    Route::post("/tasks", [TaskController::class, "store"]);
    Route::get("/tasks", [TaskController::class, "index"]);
    Route::get("/tasks/{task}", [TaskController::class, "show"])->whereNumber("task");
    Route::match(["put", "patch"], "/tasks/{task}", [TaskController::class, "update"])->whereNumber("task");
    Route::delete("/tasks/{task}", [TaskController::class, "destroy"])->whereNumber("task")->middleware("role:admin");

    Route::middleware("role:admin")->group(function () {
        Route::get("/users", [UserController::class, "index"]);
        Route::post("/users", [UserController::class, "store"]);
        Route::get("/users/{user}", [UserController::class, "show"])->whereNumber("user");
        Route::match(["put", "patch"], "/users/{user}", [UserController::class, "update"])->whereNumber("user");
        Route::delete("/users/{user}", [UserController::class, "destroy"])->whereNumber("user");
    });
});
