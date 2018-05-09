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


function createData(){
    const openRequest = indexedDB.open("Restaurant Reviews", 1);
    openRequest.onupgradeneeded = event => {
        const db = event.target.result;
        const store = db.createObjectStore('restaurants', { keyPath: 'id' });
    };
    
    let db;
    openRequest.onsuccess = event => {
        db = event.target.result;
        db.onerror = event => {
            console.log(event);
        };
        
        db.transaction('restaurants', 'readonly')
        .objectStore('restaurants')
        .count().onsuccess = e => {
            //const count = e.target.result;
            console.log('fetching and inserting data');
            insertData();
        };
    };
    function insertData() {
        fetch(fetchURL)
        .then(response => response.json())
        .then(json => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction('restaurants', 'readwrite');
                const store = tx.objectStore('restaurants');
                json.forEach(p => store.put(p));
                tx.oncomplete = e => resolve();
            });
        })
    }
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


self.addEventListener("activate", e => {
    e.waitUntil(
        createData()
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