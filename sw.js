const staticCacheName = 'cc-static-4000';
const allCaches = [
    staticCacheName
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(cache => {
            return cache.addAll([
                './index.html',
                './style.css',
                './icon.png',
                './bg.jpg',
                './idb.js',
                './index.js',
                './IndexController.js'
            ]);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName.startsWith('cc-') &&
                        !allCaches.includes(cacheName);
                }).map(cacheName => caches.delete(cacheName))
            );
        })
    );

});

//new version of fetch listener
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        event.respondWith(caches.match(event.request)
            .then(response => response || fetch(event.request)
                .then(response => caches.open(staticCacheName)
                    .then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    })
                ).catch(event => console.log('Fetching online or from cache error ', event))
            )
        );
    } else {
        return fetch(event.request).then(response => caches.open(staticCacheName)
            .then(cache => {
                //cache.put(requestUrl.href, response.clone());
                return response;
            }
        )).catch(event => console.log('Fetching online or from cache error ', event));
    }
});

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});