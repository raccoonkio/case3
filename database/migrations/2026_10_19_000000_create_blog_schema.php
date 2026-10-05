<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('handle', 24)->unique();
            $table->string('password_hash');
            $table->text('bio')->default('');
            $table->string('avatar', 8)->default('?');
            $table->string('tone', 20)->default('yellow');
            $table->string('created_at');
        });

        Schema::create('follows', function (Blueprint $table): void {
            $table->unsignedBigInteger('follower_id');
            $table->unsignedBigInteger('following_id');
            $table->string('created_at');
            $table->primary(['follower_id', 'following_id']);
            $table->foreign('follower_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('following_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('posts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('author_id');
            $table->string('title');
            $table->text('body');
            $table->text('excerpt');
            $table->string('visibility', 10)->default('public');
            $table->string('created_at');
            $table->string('updated_at');
            $table->foreign('author_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('tags', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
        });

        Schema::create('post_tags', function (Blueprint $table): void {
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('tag_id');
            $table->primary(['post_id', 'tag_id']);
            $table->foreign('post_id')->references('id')->on('posts')->cascadeOnDelete();
            $table->foreign('tag_id')->references('id')->on('tags')->cascadeOnDelete();
        });

        Schema::create('comments', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('user_id');
            $table->text('body');
            $table->string('created_at');
            $table->foreign('post_id')->references('id')->on('posts')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('access_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('post_id');
            $table->unsignedBigInteger('requester_id');
            $table->string('status', 10)->default('pending');
            $table->string('created_at');
            $table->unique(['post_id', 'requester_id']);
            $table->foreign('post_id')->references('id')->on('posts')->cascadeOnDelete();
            $table->foreign('requester_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_requests');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('post_tags');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('follows');
        Schema::dropIfExists('users');
    }
};
