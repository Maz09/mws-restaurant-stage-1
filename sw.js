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

const fetchURL = `http://localhost:1337/restaurants`;
let ArrayOfRestaurants = [];

function createDB(fetchingURL) {
    fetch(fetchingURL)
    .then(response => response.json())
    .then(function(responses) {
        ArrayOfRestaurants = responses.slice();
    })
    .catch(function(err) {
        console.log('Fetch Error :-S', err);
    });

    idb.open('restaurants-reviews', 1, function(upgradeDB) {
        let store = upgradeDB.createObjectStore('restaurants', { keyPath: 'id'});
        ArrayOfRestaurants.forEach(function(restaurant) {
            store.put(restaurant);
          });
        });
}

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

self.addEventListener('activate', e => {
    e.waitUntil(
        createDB(fetchURL)
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url === fetchURL){
        event.respondWith(
            idb.open('restaurants-reviews', 1).then(function(db) {
                let tx = db.transaction(['restaurants'], 'readonly');
                let store = tx.objectStore('restaurants');
                return store.getAll();
            })
            .then(function(items) {
                if (!items.length) {
                    return fetch(event.request)
                    .then(function (response) {
                        return response.clone().json()
                        .then(json => {
                            console.log('fetched from net');
                            ArrayOfRestaurants = json.slice();
                            idb.open('restaurants-reviews', 1, function(upgradeDB) {
                                let store = upgradeDB.createObjectStore('restaurants', { keyPath: 'id'});
                                ArrayOfRestaurants.forEach(function(restaurant) {
                                    store.put(restaurant);
                                });
                            });
                            return response;
                        })
                    });
                } else {
                    console.log('event responds from DB');
                    let response = new Response(JSON.stringify(items), {
                        headers: new Headers({
                            'Content-type': 'application/json',
                            'Access-Control-Allow-Credentials': 'true'
                        }),
                        type: 'cors',
                        status: 200
                    });
                    return response;
                }
            })
        );
        return;
    }
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
