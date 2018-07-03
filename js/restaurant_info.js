let restaurant;
let reviews;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      putReviewsInIndexedDB(id);
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/// put this restaurant's reviews in indexedDB
putReviewsInIndexedDB = (id) => {
  DBHelper.insertRestaurantReviews(id);
}


/*
 * fetch reviews
 */
fetchReviews = () => {
  const id = getParameterByName('id');
  if (!id) {
    console.log('No ID in URL');
    return;
  }
  DBHelper.fetchReviewsForCertainRestaurant(id, (err, reviews) => {
    self.reviews = reviews;
    if (err || !reviews) {
      console.log('reviews fetch error', err);
      return;
    }
    fillReviewsHTML();
  });
}

/*
 * set favorite button
 */
setFavoriteButton = (status) => { 
  const favorite = document.getElementById("favBtn");
  const strs = document.getElementById("stars");
  if (status === 'true') {
    favorite.title = 'Restaurant is Favorite';
    favorite.innerHTML = 'Unfavorite this restaurant'; // ⭐️⭐️⭐️⭐️⭐️
    strs.style.display = "inline";
  } else if (status === 'false'){
    favorite.title = 'Restaurant is not Favorite';
    favorite.innerHTML = 'Favorite this restaurant'; //☆☆☆☆☆
    strs.style.display = "none";
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favorite = document.getElementById("favBtn");
  const strs = document.getElementById("stars");
  if (self.restaurant.is_favorite === 'true') {
    favorite.title = 'Restaurant is Favorite';
    favorite.innerHTML = 'Unfavorite this restaurant';
    strs.style.display = "inline";
  } else if (self.restaurant.is_favorite === 'false'){
    favorite.title = 'Restaurant is not Favorite';
    favorite.innerHTML = 'Favorite this restaurant';
    strs.style.display = "none";
  }

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "The " + restaurant.name + " Restaurant";

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  //fillReviewsHTML();
  fetchReviews();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = getreadableDate(review.createdAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

getreadableDate = (ts) => {
  let date = new Date(ts);
  return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

/* Dealing with reviews */
navigator.serviceWorker.ready.then(function (swRegistration) {
  let form = document.querySelector('#review-form');
  // listen to submit event
  form.addEventListener('submit', e => {
    e.preventDefault();
    let rating = form.querySelector('#rating');
    let review = {
      restaurant_id: getParameterByName('id'),
      name: form.querySelector('#name').value,
      rating: rating.options[rating.selectedIndex].value,
      comments: form.querySelector('#comment').value
    };
    console.log(review);
    //save to DataBase
    let db;
    let openRequest = indexedDB.open('review', 1);
    
    openRequest.onupgradeneeded = function(e) {
      let db = e.target.result;
      console.log('running onupgradeneeded');
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', {autoIncrement: true, keyPath: 'id'});
      }
    };
    
    openRequest.onsuccess = function(e) {
      console.log('running onsuccess');
      db = e.target.result;
      let transaction = db.transaction('outbox', 'readwrite');
      let store = transaction.objectStore('outbox');
      let request = store.put(review);
      request.onerror = function(e) {
        console.log('Error', e.target.error.name);
      };
      request.onsuccess = function() {
        form.reset();
        return swRegistration.sync.register('sync').then(() => {
          console.log('sync was registered');
        })
      };
    };
  });
});

/* Dealing with favorites */
navigator.serviceWorker.ready.then(function (swRegistration) {
  let btn = document.getElementById('favBtn');
  // listen to click event
  btn.addEventListener('click', e => {
    let opposite;
    if(self.restaurant.is_favorite === 'true'){
      opposite = 'false';
    }else{
      opposite = 'true';
    };
    console.log('clicked');
    let res = {
      resId: getParameterByName('id'),
      favorite: opposite
    };
    
    // save to DataBase
    let db;
    let openRequest = indexedDB.open('favorite', 1);
    
    openRequest.onupgradeneeded = function(e) {
      let db = e.target.result;
      console.log('running onupgradeneeded');
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', {autoIncrement: true, keyPath: 'id'});
      }
    };
    
    openRequest.onsuccess = function(e) {
      console.log('running onsuccess');
      db = e.target.result;
      let transaction = db.transaction('outbox', 'readwrite');
      let store = transaction.objectStore('outbox');
      let request = store.put(res);
      request.onerror = function(e) {
        console.log('Error', e.target.error.name);
      };
      request.onsuccess = function() {
        setFavoriteButton(opposite);
        self.restaurant.is_favorite = opposite;
        console.log('restaurant.is_favorite', self.restaurant.is_favorite);
        return swRegistration.sync.register('favorite').then(() => {
          console.log('Favorite Sync registered');
        })
      };
    };
    // update restaurants indexedDB
    let restaurants_db;
    let openRequest2 = indexedDB.open('Restaurant Reviews', 1);
    openRequest2.onsuccess = function(e) {
      console.log('running onsuccess to update restaurants indexedDB');
      restaurants_db = e.target.result;
      let transaction2 = restaurants_db.transaction('restaurants', 'readwrite');
      let store2 = transaction2.objectStore('restaurants');
      let restaurant_id = parseInt(getParameterByName('id'));
      let request2 = store2.get(restaurant_id);
      request2.onerror = function(e) {
        console.log('Error', e.target.error.name);
      };
      request2.onsuccess = function() {
        var data = request2.result;
        data.is_favorite = opposite;
        var request3 = store2.put(data);
        request3.onsuccess = function(){
          console.log("data after: ",data);
        };
      };
    };
  });
});

