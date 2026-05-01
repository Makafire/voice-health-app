// Service Worker для PWA
const CACHE_NAME = 'voice-health-v1';
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'css/style.css',
    'js/app.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// Установка
self.addEventListener('install', (event) => {
    console.log('SW: Установка');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Кэширование ресурсов');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(err => console.log('SW: Ошибка кэширования', err))
    );
});

// Активация
self.addEventListener('activate', (event) => {
    console.log('SW: Активация');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
