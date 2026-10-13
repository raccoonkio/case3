<?php

namespace App\Http\Controllers;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

class BlogApiController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $pdo = DB::connection()->getPdo();
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON');

        if (! $request->session()->has('csrf')) {
            $request->session()->put('csrf', bin2hex(random_bytes(24)));
        }

        $action = $request->query('action', $request->input('action', 'state'));
        if ($request->isMethod('GET') && $action !== 'state') {
            return $this->fail('Неизвестное действие.', 404);
        }
        $data = $request->isMethod('POST') ? $request->all() : [];

        try {
            return match ($action) {
                'state' => $this->json($this->postState($request, $pdo)),
                'login' => $this->login($request, $pdo, $data),
                'register' => $this->register($request, $pdo, $data),
                'logout' => $this->logout($request, $pdo),
                'create_post' => $this->createPost($request, $pdo, $data),
                'update_post' => $this->updatePost($request, $pdo, $data),
                'delete_post' => $this->deletePost($request, $pdo, $data),
                'follow' => $this->toggleFollow($request, $pdo, $data),
                'request_access' => $this->requestAccess($request, $pdo, $data),
                'access_request' => $this->updateAccessRequest($request, $pdo, $data),
                'comment' => $this->comment($request, $pdo, $data),
                default => $this->fail('Неизвестное действие.', 404),
            };
        } catch (PDOException $exception) {
            report($exception);

            return $this->fail('Сервер не смог выполнить действие. Проверьте данные и повторите попытку.', 500);
        }
    }

    private function login(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $login = trim((string) ($data['login'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $user = $this->userByLogin($pdo, $login);
        if (! $user || ! password_verify($password, $user['password_hash'])) {
            return $this->fail('Не удалось войти: проверьте логин и пароль.', 401);
        }

        $request->session()->regenerate();
        $request->session()->put('user_id', (int) $user['id']);
        $request->session()->put('csrf', bin2hex(random_bytes(24)));

        return $this->json(['message' => 'С возвращением, '.explode(' ', $user['name'])[0]] + $this->postState($request, $pdo));
    }

    private function register(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $name = trim((string) ($data['name'] ?? ''));
        $handle = strtolower(trim((string) ($data['handle'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $bio = trim((string) ($data['bio'] ?? '')) ?: 'Новый автор';

        if (mb_strlen($name) < 2 || ! preg_match('/^[a-zа-яё0-9_]{3,24}$/iu', $handle) || mb_strlen($password) < 4) {
            return $this->fail('Проверьте имя, логин и пароль.');
        }
        $exists = $pdo->prepare('SELECT 1 FROM users WHERE lower(handle) = lower(?)');
        $exists->execute([$handle]);
        if ($exists->fetchColumn()) {
            return $this->fail('Такой логин уже занят.');
        }

        $insert = $pdo->prepare('INSERT INTO users (name, handle, password_hash, bio, avatar, tone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $insert->execute([$name, $handle, password_hash($password, PASSWORD_DEFAULT), $bio, mb_strtoupper(mb_substr($name, 0, 1)), 'coral', gmdate('c')]);
        $request->session()->regenerate();
        $request->session()->put('user_id', (int) $pdo->lastInsertId());
        $request->session()->put('csrf', bin2hex(random_bytes(24)));

        return $this->json(['message' => 'Аккаунт создан — добро пожаловать.'] + $this->postState($request, $pdo));
    }

    private function logout(Request $request, PDO $pdo): JsonResponse
    {
        $request->session()->forget('user_id');
        $request->session()->put('csrf', bin2hex(random_bytes(24)));

        return $this->json(['message' => 'Вы вышли из аккаунта.'] + $this->postState($request, $pdo));
    }

    private function createPost(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $title = trim((string) ($data['title'] ?? ''));
        $body = trim((string) ($data['body'] ?? ''));
        $visibility = ($data['visibility'] ?? 'public') === 'request' ? 'request' : 'public';
        if ($title === '' || $body === '') {
            return $this->fail('Заголовок и текст не должны быть пустыми.');
        }

        $now = gmdate('c');
        $insert = $pdo->prepare('INSERT INTO posts (author_id, title, body, excerpt, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $insert->execute([$userId, $title, $body, mb_substr($body, 0, 170), $visibility, $now, $now]);
        $this->syncTags($pdo, (int) $pdo->lastInsertId(), $data['tags'] ?? []);

        return $this->json(['message' => 'Публикация размещена в ленте.'] + $this->postState($request, $pdo));
    }

    private function updatePost(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $postId = (int) ($data['id'] ?? 0);
        $title = trim((string) ($data['title'] ?? ''));
        $body = trim((string) ($data['body'] ?? ''));
        $visibility = ($data['visibility'] ?? 'public') === 'request' ? 'request' : 'public';
        if ($title === '' || $body === '') {
            return $this->fail('Заголовок и текст не должны быть пустыми.');
        }

        $owned = $pdo->prepare('SELECT 1 FROM posts WHERE id = ? AND author_id = ?');
        $owned->execute([$postId, $userId]);
        if (! $owned->fetchColumn()) {
            return $this->fail('Публикация не найдена или принадлежит другому автору.', 403);
        }
        $update = $pdo->prepare('UPDATE posts SET title = ?, body = ?, excerpt = ?, visibility = ?, updated_at = ? WHERE id = ?');
        $update->execute([$title, $body, mb_substr($body, 0, 170), $visibility, gmdate('c'), $postId]);
        $this->syncTags($pdo, $postId, $data['tags'] ?? []);

        return $this->json(['message' => 'Публикация обновлена.'] + $this->postState($request, $pdo));
    }

    private function deletePost(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $delete = $pdo->prepare('DELETE FROM posts WHERE id = ? AND author_id = ?');
        $delete->execute([(int) ($data['id'] ?? 0), $userId]);
        if ($delete->rowCount() === 0) {
            return $this->fail('Публикация не найдена или принадлежит другому автору.', 403);
        }

        return $this->json(['message' => 'Публикация удалена.'] + $this->postState($request, $pdo));
    }

    private function toggleFollow(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $followingId = (int) ($data['user_id'] ?? 0);
        if ($followingId === $userId) {
            return $this->fail('Нельзя подписаться на себя.');
        }

        $exists = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
        $exists->execute([$followingId]);
        if (! $exists->fetchColumn()) {
            return $this->fail('Пользователь не найден.', 404);
        }
        $check = $pdo->prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?');
        $check->execute([$userId, $followingId]);
        if ($check->fetchColumn()) {
            $pdo->prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')->execute([$userId, $followingId]);
            $message = 'Подписка отменена.';
        } else {
            $pdo->prepare('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)')->execute([$userId, $followingId, gmdate('c')]);
            $message = 'Вы подписались на автора.';
        }

        return $this->json(['message' => $message] + $this->postState($request, $pdo));
    }

    private function requestAccess(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $postId = (int) ($data['post_id'] ?? 0);
        $postStmt = $pdo->prepare("SELECT * FROM posts WHERE id = ? AND visibility = 'request'");
        $postStmt->execute([$postId]);
        $post = $postStmt->fetch();
        if (! $post || (int) $post['author_id'] === $userId) {
            return $this->fail('Нельзя запросить доступ к этой публикации.');
        }

        $requestStmt = $pdo->prepare('SELECT id FROM access_requests WHERE post_id = ? AND requester_id = ?');
        $requestStmt->execute([$postId, $userId]);
        $requestId = $requestStmt->fetchColumn();
        if ($requestId) {
            $pdo->prepare("UPDATE access_requests SET status = 'pending', created_at = ? WHERE id = ?")->execute([gmdate('c'), $requestId]);
        } else {
            $pdo->prepare("INSERT INTO access_requests (post_id, requester_id, status, created_at) VALUES (?, ?, 'pending', ?)")->execute([$postId, $userId, gmdate('c')]);
        }

        return $this->json(['message' => 'Запрос отправлен автору.'] + $this->postState($request, $pdo));
    }

    private function updateAccessRequest(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $requestId = (int) ($data['request_id'] ?? 0);
        $status = ($data['status'] ?? '') === 'approved' ? 'approved' : 'rejected';
        $check = $pdo->prepare('SELECT ar.id FROM access_requests ar JOIN posts p ON p.id = ar.post_id WHERE ar.id = ? AND p.author_id = ?');
        $check->execute([$requestId, $userId]);
        if (! $check->fetchColumn()) {
            return $this->fail('Запрос не найден или вы не являетесь автором публикации.', 403);
        }
        $pdo->prepare('UPDATE access_requests SET status = ? WHERE id = ?')->execute([$status, $requestId]);

        return $this->json(['message' => $status === 'approved' ? 'Доступ открыт.' : 'Запрос отклонён.'] + $this->postState($request, $pdo));
    }

    private function comment(Request $request, PDO $pdo, array $data): JsonResponse
    {
        $userId = $this->requireUser($request);
        $postId = (int) ($data['post_id'] ?? 0);
        $text = trim((string) ($data['text'] ?? ''));
        $postStmt = $pdo->prepare('SELECT * FROM posts WHERE id = ?');
        $postStmt->execute([$postId]);
        $post = $postStmt->fetch();
        if (! $post || ! $this->canReadPost($pdo, $post, $userId)) {
            return $this->fail('Сначала получите доступ к этой публикации.', 403);
        }
        if ($text === '' || mb_strlen($text) > 240) {
            return $this->fail('Комментарий должен содержать от 1 до 240 символов.');
        }
        $pdo->prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')->execute([$postId, $userId, $text, gmdate('c')]);

        return $this->json(['message' => 'Комментарий добавлен.'] + $this->postState($request, $pdo));
    }

    private function postState(Request $request, PDO $pdo): array
    {
        $viewerId = $this->currentUserId($request);
        $users = $pdo->query('SELECT * FROM users ORDER BY id')->fetchAll();
        $followingByUser = [];
        foreach ($pdo->query('SELECT follower_id, following_id FROM follows')->fetchAll() as $row) {
            $followingByUser[(int) $row['follower_id']][] = (int) $row['following_id'];
        }

        $userMap = [];
        foreach ($users as $user) {
            $userMap[(int) $user['id']] = $this->userPublic($user, $followingByUser[(int) $user['id']] ?? []);
        }

        $posts = [];
        $postRows = $pdo->query('SELECT * FROM posts ORDER BY datetime(created_at) DESC, id DESC')->fetchAll();
        $commentStmt = $pdo->prepare('SELECT c.*, u.name, u.handle, u.avatar, u.tone FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY datetime(c.created_at) ASC, c.id ASC');
        $requestStmt = $pdo->prepare('SELECT status FROM access_requests WHERE post_id = ? AND requester_id = ? LIMIT 1');
        foreach ($postRows as $post) {
            $readable = $this->canReadPost($pdo, $post, $viewerId);
            $requestStatus = null;
            if ($viewerId !== null) {
                $requestStmt->execute([(int) $post['id'], $viewerId]);
                $requestStatus = $requestStmt->fetchColumn() ?: null;
            }
            $comments = [];
            if ($readable) {
                $commentStmt->execute([(int) $post['id']]);
                foreach ($commentStmt->fetchAll() as $comment) {
                    $comments[] = ['id' => (int) $comment['id'], 'userId' => (int) $comment['user_id'], 'text' => $comment['body'], 'createdAt' => $comment['created_at']];
                }
            }
            $posts[] = [
                'id' => (int) $post['id'], 'authorId' => (int) $post['author_id'], 'title' => $post['title'],
                'body' => $readable ? $post['body'] : $post['excerpt'],
                'excerpt' => $post['excerpt'], 'tags' => $this->getTags($pdo, (int) $post['id']), 'visibility' => $post['visibility'],
                'createdAt' => $post['created_at'], 'comments' => $comments, 'canRead' => $readable, 'requestStatus' => $requestStatus,
            ];
        }

        $accessRequests = [];
        if ($viewerId !== null) {
            $requestStmt = $pdo->prepare("SELECT ar.id, ar.post_id, ar.requester_id, ar.status, ar.created_at, p.title FROM access_requests ar JOIN posts p ON p.id = ar.post_id WHERE p.author_id = ? AND ar.status = 'pending' ORDER BY datetime(ar.created_at) DESC");
            $requestStmt->execute([$viewerId]);
            foreach ($requestStmt->fetchAll() as $accessRequest) {
                $accessRequests[] = ['id' => (int) $accessRequest['id'], 'postId' => (int) $accessRequest['post_id'], 'requesterId' => (int) $accessRequest['requester_id'], 'status' => $accessRequest['status'], 'createdAt' => $accessRequest['created_at'], 'postTitle' => $accessRequest['title']];
            }
        }

        return ['csrf' => $request->session()->get('csrf'), 'currentUserId' => $viewerId, 'users' => array_values($userMap), 'posts' => $posts, 'accessRequests' => $accessRequests];
    }

    private function userPublic(array $user, array $following = []): array
    {
        return ['id' => (int) $user['id'], 'name' => $user['name'], 'handle' => $user['handle'], 'bio' => $user['bio'], 'avatar' => $user['avatar'], 'tone' => $user['tone'], 'following' => array_map('intval', $following)];
    }

    private function userByLogin(PDO $pdo, string $login): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE lower(handle) = lower(?) OR lower(name) = lower(?) LIMIT 1');
        $stmt->execute([$login, $login]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    private function getTags(PDO $pdo, int $postId): array
    {
        $stmt = $pdo->prepare('SELECT t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ? ORDER BY t.name');
        $stmt->execute([$postId]);

        return array_column($stmt->fetchAll(), 'name');
    }

    private function canReadPost(PDO $pdo, array $post, ?int $viewerId): bool
    {
        if ($post['visibility'] === 'public') {
            return true;
        }
        if ($viewerId !== null && (int) $post['author_id'] === $viewerId) {
            return true;
        }
        if ($viewerId === null) {
            return false;
        }
        $stmt = $pdo->prepare("SELECT 1 FROM access_requests WHERE post_id = ? AND requester_id = ? AND status = 'approved'");
        $stmt->execute([(int) $post['id'], $viewerId]);

        return (bool) $stmt->fetchColumn();
    }

    private function syncTags(PDO $pdo, int $postId, mixed $tags): void
    {
        $normalized = [];
        foreach (is_array($tags) ? $tags : [] as $tag) {
            $tag = trim(ltrim((string) $tag, '#'));
            if ($tag !== '') {
                $normalized[mb_strtolower($tag)] = $tag;
            }
        }
        $pdo->prepare('DELETE FROM post_tags WHERE post_id = ?')->execute([$postId]);
        $insertTag = $pdo->prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
        $findTag = $pdo->prepare('SELECT id FROM tags WHERE name = ?');
        $linkTag = $pdo->prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)');
        foreach (array_values($normalized) as $tag) {
            $insertTag->execute([$tag]);
            $findTag->execute([$tag]);
            $linkTag->execute([$postId, (int) $findTag->fetchColumn()]);
        }
    }

    private function currentUserId(Request $request): ?int
    {
        $id = $request->session()->get('user_id');

        return $id === null ? null : (int) $id;
    }

    private function requireUser(Request $request): int
    {
        $id = $this->currentUserId($request);
        if ($id === null) {
            $this->fail('Для этого действия нужно войти в аккаунт.', 401);
        }

        return $id;
    }

    private function json(array $payload, int $status = 200): JsonResponse
    {
        return response()->json($payload, $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function fail(string $message, int $status = 400): never
    {
        throw new HttpResponseException($this->json(['error' => $message], $status));
    }
}
