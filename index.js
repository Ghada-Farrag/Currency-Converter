const indexController = new IndexController(document.querySelector('.main'));


function btnConvertCurrency() {
    let amount = document.getElementById("CURR_FR_VAL").value;
    if (document.getElementById('CURR_FR_VAL').validity.valid) {
        const fromSelect = document.getElementById("CURR_FROM");
        const fromCurrency = fromSelect.options[fromSelect.selectedIndex].value;
        const toSelect = document.getElementById("CURR_TO");
        const toCurrency = toSelect.options[toSelect.selectedIndex].value;
        document.getElementById("CURR_VAL").value = '';

        indexController.convertCurrency(amount, fromCurrency, toCurrency);
    } else {
        document.getElementById("CURR_VAL").value = 'No amount entered!';
    }
}                                                               