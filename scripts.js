const apiURL_currencyList = 'https://www.currencyconverterapi.com/api/v5/currencies';

const app = document.getElementById('root');

const logo = document.createElement('img');
logo.src = 'logo.png';

const container = document.createElement('div');
container.setAttribute('class', 'container');

app.appendChild(logo);
app.appendChild(container);

var request = new XMLHttpRequest();
request.open('GET', apiURL_currencyList, true);

serveCurrencies();

request.onload = function () {

  // Begin accessing JSON data here
  var data = JSON.parse(this.response);
  serveCurrencies();

  if (request.status <= 0) {
    data.forEach(currency => {
      // const card = document.createElement('div');
      // card.setAttribute('class', 'card');

      // const h1 = document.createElement('h1');
      // h1.textContent = movie.title;

      // const p = document.createElement('p');
      // movie.description = movie.description.substring(0, 300);
      // p.textContent = `${movie.description}...`;

      // container.appendChild(card);
      // card.appendChild(h1);
      // card.appendChild(p);

      let listFrom = document.getElementById("CURR_FROM");
      listFrom.innerHTML += `<option value="${currency.id}">${currency.id}</option>`;

    });
  } else {
    const errorMessage = document.createElement('marquee');
    errorMessage.textContent = `Gah, it's not working!`;
    app.appendChild(errorMessage);
  }
}

//request.send();

function serveCurrencies() {

  // const data = fetch("https://free.currencyconverterapi.com/api/v5/currencies")
  //   .then(response => response.json())
  // console.log(data);
  // let listFrom = document.getElementById("CURR_FROM");
  // const currency = data.currencyName;
  // for (let key in currency) {
  //   listFrom.innerHTML += `<option value="${currency.id}">${currency.id}</option>`;
  //   console.log(currency.id);
  // }
  fetch("https://free.currencyconverterapi.com/api/v5/currencies")
    .then(
      response => {
        return response.json();
      },
      fetchError => {
        console.log("fetch error: ", fetchError);
      },
  ).then(
    response => {
      console.log(`result : ${response}`);
      let listFrom = document.getElementById("CURR_FROM");
      for(var key in response.results) 
      {
        listFrom.innerHTML += `<option value="${key}">${key}</option>`;
      }
    },
    parseError => {
      console.log("parsing Error", parseError);
    },
  );

}






