importScripts('idb.js');

let cacheName = 'restaurant-cache-v2';
let urlsToCache = [
    './',
    './index.html',
    './restaurant.html',
    './css/styles.css',
    './js/main.js',
    './js/restaurant_info.js',
    './js/dbhelper.js',
    './data/restaurants.json',
    './img/1.jpg',
    './img/2.jpg',
    './img/3.jpg',
    './img/4.jpg',
    './img/5.jpg',
    './img/6.jpg',
    './img/7.jpg',
    './img/8.jpg',
    './img/9.jpg',
    './img/10.jpg'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(cacheNames.map(thisCacheName => {
                if(thisCacheName !== cacheName) {
                    caches.delete(thisCacheName);
                }
            }))      
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
      caches.match(event.request)
      .then(response => {
        return response || fetchAndCache(event.request);
      })
    );
  });

  function fetchAndCache(url) {
    return fetch(url)
    .then(response => {
      return caches.open(cacheName)
      .then(cache => {
        cache.put(url, response.clone());
        return response;
      });
    })
    .catch(error => {
      console.log('Request failed:', error);
    });
  }
