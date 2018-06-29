

const indexController = new IndexController(document.querySelector('.main'));



function btnConvertCurrency()
{
    let amount = document.getElementById("CURR_FR_VAL").value;
    let fromSelect = document.getElementById("CURR_FROM");
    let fromCurrency = fromSelect.options[fromSelect.selectedIndex].value;
    let toSelect = document.getElementById("CURR_TO");
    let toCurrency = toSelect.options[toSelect.selectedIndex].value;
    document.getElementById("CURR_VAL").value = 0;

    indexController._convertCurrency(amount, fromCurrency, toCurrency);
  
}



