class IndexController {
  constructor(container) {

    this._container = container;
    this._loadFromDB = false;
    this._storedCurrencyList = null;
    this._dbPromise = this.openDatabase();
    this.registerServiceWorker();

    //get currencies and populate the 'from' and 'to' drop-down lists
    if (!this.getDBCurrencyList()) { //try load from idb first
      this.getAPICurrencyList(); //loading from db failed, fetch from API - and store in idb
    }

  }

  openDatabase() {
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

  registerServiceWorker() {
    if (!navigator.serviceWorker) return;

    const indexController = this;

    navigator.serviceWorker.register('./sw.js').then(reg => {
      if (!navigator.serviceWorker.controller) {
        return;
      }

      if (reg.waiting) {
        indexController.updateReady(reg.waiting);
        return;
      }

      if (reg.installing) {
        indexController.trackInstalling(reg.installing);
        return;
      }

      reg.addEventListener('updatefound', function () {
        indexController.trackInstalling(reg.installing);
      });
    }).catch(error => console.log("SW not registered: ", error));

  }


  trackInstalling(worker) {
    const indexController = this;
    worker.addEventListener('statechange', function () {
      if (worker.state == 'installed') {
        indexController.updateReady(worker);
      }
    });
  }


  updateReady(worker) {
    const ok = confirm("New version available online. Do you want to refresh? ");
    if (ok) {
      worker.postMessage({ action: 'skipWaiting' });
      //this.loadFromDB = false;
    };
  }


  storeCurrencyList() {
    const currencyList = this.currencyList;
    if (!currencyList) {
      console.log('store in db failed: local currency list not defined.');
      return;
    }


    this._dbPromise.then(db => {
      if (!db) return;


      //store currencies in idb
      const tx = db.transaction('currencyList', 'readwrite');
      const store = tx.objectStore('currencyList');
      Object.keys(currencyList).forEach(currency => {
        store.put(currencyList[currency]);
      });

    }).catch(error => console.log('db error: ', error));
  }


  getDBCurrencyList() {
    const indexController = this;
    this._dbPromise.then(db => {
      if (!db) return false;

      //read currencies from idb
      const tx = db.transaction('currencyList');
      const store = tx.objectStore('currencyList');
      store.getAll().then(currencyList => {
        console.log('>>>Populating lists from idb ...');
        indexController.populateLists(currencyList);
        indexController.loadFromDB = true;
        return true;
      }).catch(() => false);
    }).catch(error => {
      console.log('db error: ', error);
      return false;
    });
  }

  getAPICurrencyList() {
    const indexController = this;
    fetch("https://free.currencyconverterapi.com/api/v5/currencies")
      .then(
        response => {
          this.currencyList = response.json();
          console.log("first then: ", this.currencyList);
          return this.currencyList;
        },
        fetchError => {
          console.log("fetch error: ", fetchError);
        },
    ).then(
      response => {
        if (response) {
          this.currencyList = response.results;
          console.log("local currency list loaded: ", this.currencyList);

          indexController.storeCurrencyList();

          console.log('>>>Populating lists from API ...');
          indexController.populateLists(this.currencyList);
        } else {
          console.log("Fecth error: no response");
        }
      },
      parseError => {
        console.log("parsing Error", parseError);
      },
    );
  }

  populateLists(currencyList) {
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


  convertCurrency(amount, fromCurrency, toCurrency) {
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
          indexController.storeConversionRate(query, data);
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
      indexController.convertCurrencyFromDB(query, amount);
    });

  }

  storeConversionRate(from_to, rateValue) {

    this._dbPromise.then(db => {
      if (!db) return;

      //store conversion rate in idb
      const tx = db.transaction('conv_rates', 'readwrite');
      const store = tx.objectStore('conv_rates');
      store.put({
        id: from_to,
        value: rateValue
      });
    }).catch(error => console.log('db error: ', error));
  }


  convertCurrencyFromDB(from_to, amount) {

    this._dbPromise.then(db => {
      if (!db) return;

      //store conversion rate in idb
      const tx = db.transaction('conv_rates', 'readwrite');
      const store = tx.objectStore('conv_rates');
      store.get(from_to).then(rate => {
        if (rate) {
          const result = Math.round(rate.value[from_to] * amount * 100) / 100;
          document.getElementById("CURR_VAL").value = result;//'Failed to fetch online.';
        } else {
          document.getElementById("CURR_VAL").value = 'Value not available. Go online and refresh.';
        }
      });
    }).catch(error => console.log('db error: ', error));

  }

}//end of class


// Sorts an array of objects "in place". (Meaning that the original array will be modified and nothing gets returned.)
function sortOn(arr, prop) {
  arr.sort(
    function (a, b) {
      if (a[prop] < b[prop]) {
        return -1;
      } else if (a[prop] > b[prop]) {
        return 1;
      } else {
        return 0;
      }
    }
  );
}