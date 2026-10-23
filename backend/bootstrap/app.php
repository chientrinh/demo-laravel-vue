<?php

use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            $errors = $e->errors();
            $message = collect($errors)->flatten()->first() ?: 'The given data was invalid.';

            return response()->json([
                'status_code' => 422,
                'code' => 'VALIDATION_ERROR',
                'message' => $message,
                'errors' => $errors,
                'details' => $errors,
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json([
                'status_code' => 401,
                'code' => 'UNAUTHENTICATED',
                'message' => $e->getMessage() ?: 'Unauthenticated.',
                'details' => [],
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], 401);
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            return response()->json([
                'status_code' => 403,
                'code' => 'FORBIDDEN',
                'message' => $e->getMessage() ?: 'You do not have permission to perform this action.',
                'details' => [],
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], 403);
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return response()->json([
                'status_code' => 404,
                'code' => 'NOT_FOUND',
                'message' => 'Resource not found.',
                'details' => [],
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], 404);
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            return response()->json([
                'status_code' => 405,
                'code' => 'METHOD_NOT_ALLOWED',
                'message' => 'Method not allowed.',
                'details' => [],
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], 405);
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            return response()->json([
                'status_code' => 429,
                'code' => 'TOO_MANY_REQUESTS',
                'message' => 'Too many attempts. Please try again later.',
                'details' => [],
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], 429, $e->getHeaders());
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            $status = $e->getStatusCode();

            return response()->json([
                'status_code' => $status,
                'code' => match (true) {
                    $status === 400 => 'BAD_REQUEST',
                    $status === 409 => 'CONFLICT',
                    $status >= 500 => 'SERVER_ERROR',
                    default => 'HTTP_ERROR',
                },
                'message' => $e->getMessage() ?: 'Request failed.',
                'details' => [],
                'path' => $request->path(),
                'timestamp' => now()->toISOString(),
            ], $status, $e->getHeaders());
        });
    })->create();
