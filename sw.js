const staticCacheName = 'cc-static-v1';

const allCaches = [
    staticCacheName
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll([
                './index.html',
                './style.css',
                './idb.js',
                './index.js',
                './IndexController.js'
            ]);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('cc-') && 
                        !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    if (cacheName === staticCacheName) return Promise.resolve();
                    return caches.delete(cacheName);
                })
            );
        })
    );

});

self.addEventListener('fetch', function (event) {
    var requestUrl = new URL(event.request.url);

        if (requestUrl.origin === location.origin) {
            if (requestUrl.pathname === '/') {
                event.respondWith(caches.match('index.html'));
                return;
            }
            if (requestUrl.pathname === '/Currency-Converter/') {
                event.respondWith(caches.match('Currency-Converter/index.html'));
                return;
            }
            if (requestUrl.pathname.endsWith('style.css')) {
                event.respondWith(caches.match(requestUrl.pathname.replace('/', '')));
                return;
            }
            if (requestUrl.pathname.endsWith('.js')) {
                //event.respondWith(caches.match(requestUrl.pathname.replace('/','')));
                const index = requestUrl.pathname.indexOf("Currency-Converter/") + 1;
                console.log('index = ', index)
                event.respondWith(caches.match(requestUrl.pathname.substring(index)));
                return;
            
            }
        }    
    

    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});


self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});


function serveCurrency(request) {
    var storageUrl = request.url;

    return caches.open(staticCacheName).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}