<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#55a7f4" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <meta name="description" content="Кейс №3 — веб-приложение для блога на Laravel." />
    <title>Кейс №3 · блог на Laravel</title>
    <link rel="stylesheet" href="{{ asset('styles.css') }}" />
  </head>
  <body>
    <div id="app" class="app-shell"></div>
    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
    <div id="modal-root"></div>
    <script src="{{ asset('app.js') }}?v=laravel1"></script>
  </body>
</html>
