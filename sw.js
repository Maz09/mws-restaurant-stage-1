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

///========= synchronization for reviews and favorites ================/

self.addEventListener('sync', function (event) {
    if (event.tag === 'sync') {
        event.waitUntil(
            getAllMessages().then(reviews => {
                return Promise.all(
                    reviews.map(review => sendAndDeleteMessage(review.id))
                )
            }).then(() => {
                console.log('synced');
            }).catch(err => {
                console.log(err, 'error while syncing');
            })
        );
    }else if (event.tag === 'favorite') {
        event.waitUntil(
            getAllFavorites().then(favorites => {
                return Promise.all(
                    favorites.map(favorite => sendAndDeleteFavorite(favorite.id))
                )
            }).then(() => {
                console.log('favorites were synced');
            }).catch(err => {
                console.log(err, 'error while syncing favorites');
            })
        );
    }
});

function openDataBase() {
    return new Promise(function(resolve, reject) {
        let req = indexedDB.open('review', 1);
        req.onsuccess = function (event) { resolve(req.result); }
        req.onerror = reject;
      });
  }

  function sendAndDeleteMessage(id) {
    return getMessage(id).then(sendRequest).then(function() {
      return deleteMessage(id);
    });
  }

  function getMessage(id) {
    return openDataBase().then(function(db) {
        return new Promise(function(resolve, reject) {
            let transaction = db.transaction('outbox', 'readonly');
            let store = transaction.objectStore('outbox');
            let req = store.get(id);
            req.onsuccess = function() { resolve(req.result); }
            req.onerror = reject;
        });
      });
  }

  function getAllMessages() {
    return openDataBase().then(function(db) {
        return new Promise(function(resolve, reject) {
            let transaction = db.transaction('outbox', 'readonly');
            let store = transaction.objectStore('outbox');
            let req = store.getAll();
            req.onsuccess = function() { resolve(req.result); }
            req.onerror = reject;
        });
      });
  }

  function sendRequest(request) {
    if (!request)
      return Promise.resolve();
    return fetch('http://localhost:1337/reviews', {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
             }
            })
  }

  function deleteMessage(id) {
    return openDataBase().then(function(db) {
        return new Promise(function(resolve, reject) {
          let transaction = db.transaction('outbox', 'readwrite');
          let store = transaction.objectStore('outbox');
          let req = store.delete(id);
          req.onsuccess = resolve;
          req.onerror = reject;
        });
      });
  }
