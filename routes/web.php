<?php

use App\Http\Controllers\BlogApiController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('blog');
});

Route::match(['get', 'post'], '/api', BlogApiController::class)->name('blog.api');
