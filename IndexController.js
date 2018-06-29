
function openDatabase() {
  // If the browser doesn't support service worker,
  // we don't care about having a database
  if (!navigator.serviceWorker) {
    return Promise.resolve();
  }

  return idb.open('cc-db', 1, function (upgradeDb) {
    const store1 = upgradeDb.createObjectStore('currencyList', { keyPath: 'id' });
    const store2 = upgradeDb.createObjectStore('conv_rates', { keyPath: 'id' });
  });
}


function IndexController(container) {
  this._container = container;
  this._loadFromDB = false;
  this._storedCurrencyList = null;
  this._dbPromise = openDatabase();
  this._registerServiceWorker();

  const indexController = this;

  //get currencies and populate the 'from' and 'to' drop-down lists
  if (!indexController._getDBCurrencyList()) { //try load from idb first
    indexController._getAPICurrencyList(); //loading from db failed, fetch from API - and store in idb
  }



  // this._showCachedMessages().then(function () {
  //     indexController._openSocket();
  // });
}



IndexController.prototype._registerServiceWorker = function () {
  if (!navigator.serviceWorker) return;

  const indexController = this;

  navigator.serviceWorker.register('./sw.js').then(function (reg) {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    if (reg.waiting) {
      indexController._updateReady(reg.waiting);
      return;
    }

    if (reg.installing) {
      indexController._trackInstalling(reg.installing);
      return;
    }

    reg.addEventListener('updatefound', function () {
      indexController._trackInstalling(reg.installing);
    });
  }).catch(function (error) {
    console.log("SW not registered: ", error);
  });

  // Ensure refresh is only called once.
  // This works around a bug in "force update on reload".
  // var refreshing;
  // navigator.serviceWorker.addEventListener('controllerchange', function () {
  //   if (refreshing) return;
  //   window.location.reload();
  //   refreshing = true;
  // });
};


IndexController.prototype._trackInstalling = function (worker) {
  const indexController = this;
  worker.addEventListener('statechange', function () {
    if (worker.state == 'installed') {
      indexController._updateReady(worker);
    }
  });
};


IndexController.prototype._updateReady = function (worker) {
  var ok = confirm("New version available online. Do you want to refresh? ");
  if (ok) {
    worker.postMessage({ action: 'skipWaiting' });
    this._loadFromDB = false;
  };
};

// open a connection to the server for live updates
// IndexController.prototype._openSocket = function () {
//   var indexController = this;
//   var latestPostDate = this._postsView.getLatestPostDate();

//   // create a url pointing to /updates with the ws protocol
//   var socketUrl = new URL('/updates', window.location);
//   socketUrl.protocol = 'ws';

//   if (latestPostDate) {
//     socketUrl.search = 'since=' + latestPostDate.valueOf();
//   }

//   // this is a little hack for the settings page's tests,
//   // it isn't needed for Wittr
//   socketUrl.search += '&' + location.search.slice(1);

//   var ws = new WebSocket(socketUrl.href);

//   // add listeners
//   ws.addEventListener('open', function () {
//     if (indexController._lostConnectionToast) {
//       indexController._lostConnectionToast.hide();
//     }
//   });

//   ws.addEventListener('message', function (event) {
//     requestAnimationFrame(function () {
//       indexController._onSocketMessage(event.data);
//     });
//   });

//   ws.addEventListener('close', function () {
//     // tell the user
//     if (!indexController._lostConnectionToast) {
//       indexController._lostConnectionToast = indexController._toastsView.show("Unable to connect. Retrying…");
//     }

//     // try and reconnect in 5 seconds
//     setTimeout(function () {
//       indexController._openSocket();
//     }, 5000);
//   });
// };

// IndexController.prototype._showCachedMessages = function () {
//   var indexController = this;

//   return this._dbPromise.then(function (db) {
//     // if we're already showing posts, eg shift-refresh
//     // or the very first load, there's no point fetching
//     // posts from IDB
//     if (!db) return;

//     var index = db.transaction('currencyList')
//       .objectStore('currencyList').index('by-date');

//     return index.getAll().then(function (messages) {
//       indexController._postsView.addPosts(messages.reverse());
//     });
//   });
// };





IndexController.prototype._storeCurrencyList = function () {
  const currencyList = this._currencyList;
  if (!currencyList) {
    console.log('store in db failed: local currency list not defined.');
    return;
  }


  this._dbPromise.then(function (db) {
    if (!db) return;


    //store currencies in idb
    var tx = db.transaction('currencyList', 'readwrite');
    var store = tx.objectStore('currencyList');
    Object.keys(currencyList).forEach(currency => {
      store.put(currencyList[currency]);
    });

  }).catch(error => {
    console.log('db error: ', error);
  });
}


IndexController.prototype._getDBCurrencyList = function () {
  const indexController = this;
  this._dbPromise.then(function (db) {
    if (!db) return false;

    //read currencies from idb
    var tx = db.transaction('currencyList');
    var store = tx.objectStore('currencyList');
    store.getAll().then(currencyList => {
      console.log('>>>Populating lists from idb ...');
      populateLists(currencyList);
      indexController._loadFromDB = true;
      return true;
    }).catch(() => false);
  }).catch(error => {
    console.log('db error: ', error);
    return false;
  });
}

IndexController.prototype._getAPICurrencyList = function () {
  const indexController = this;
  fetch("https://free.currencyconverterapi.com/api/v5/currencies")
    .then(
      response => {
        this._currencyList = response.json();
        console.log("first then: ", this._currencyList);
        return this._currencyList;
      },
      fetchError => {
        console.log("fetch error: ", fetchError);
      },
  ).then(
    response => {
      if (response) {
      this._currencyList = response.results;
      console.log("local currency list loaded: ", this._currencyList);

      indexController._storeCurrencyList();
      console.log('>>>Populating lists from API ...');
      populateLists(this._currencyList);
      } else {
        console.log("Fecth error: no response");
      }
    },
    parseError => {
      console.log("parsing Error", parseError);
    },
  );
}

function populateLists(currencyList) {
  console.log('from populate list : list loaded  = ', currencyList);


  if (!currencyList) {
    console.log('populate list error: nothing returned from db.');
    return;
  }
  let listFrom = document.getElementById("CURR_FROM");
  let listTo = document.getElementById("CURR_TO");

  for (let key in currencyList) {
    let currency = currencyList[key];
    listFrom.innerHTML += `<option value="${currency.id}"> ${currency.id} - ${currency.currencyName} (${currency.currencySymbol}) </option>`;
    listTo.innerHTML += `<option value="${currency.id}"> ${currency.id} - ${currency.currencyName} (${currency.currencySymbol}) </option>`;
  }

  //set default value selected
  listFrom.value = 'USD';
  listTo.value = 'USD';
}


IndexController.prototype._convertCurrency = function (amount, fromCurrency, toCurrency) {
  const indexController = this;
  fromCurrency = encodeURIComponent(fromCurrency);
  toCurrency = encodeURIComponent(toCurrency);
  const query = fromCurrency + '_' + toCurrency;

  const url = 'https://free.currencyconverterapi.com/api/v5/convert?q='
    + query + '&compact=ultra';

  console.log(url);
  fetch(url).then(response => {
    response.json().then(data => {
      console.log('data = ', data);
      let result = data[query];
      if (result) {
        result = Math.round(result * amount * 100) / 100;
        indexController._storeConversionRate(query, data);
      } else {
        const error = new Error("Value not found for " + query);
        console.log(error);
        result = error;
      } 
      console.log('result  =', result);
      document.getElementById("CURR_VAL").value = result;
    }).catch(error => document.getElementById("CURR_VAL").value = error);
  }).catch(error => {
      //try to get from idb
    indexController._convertCurrencyFromDB(query, amount);
  });


}

IndexController.prototype._storeConversionRate = function (from_to, rateValue) {

  this._dbPromise.then(function (db) {
    if (!db) return;

    //store conversion rate in idb
    var tx = db.transaction('conv_rates', 'readwrite');
    var store = tx.objectStore('conv_rates');
    store.put({
      id: from_to,
      value: rateValue
    });
  }).catch(error => console.log('db error: ', error));

}

IndexController.prototype._convertCurrencyFromDB = function (from_to, amount) {

  this._dbPromise.then(function (db) {
    if (!db) return;

    //store conversion rate in idb
    var tx = db.transaction('conv_rates', 'readwrite');
    var store = tx.objectStore('conv_rates');
    store.get(from_to).then(rate => {
      if(rate) {
        result = Math.round(rate.value[from_to] * amount * 100) / 100;
        document.getElementById("CURR_VAL").value = result;//'Failed to fetch online.';
      } else {
        document.getElementById("CURR_VAL").value = 'Value not available. Go online and refresh.';
      }
    });
  }).catch(error => console.log('db error: ', error));

}