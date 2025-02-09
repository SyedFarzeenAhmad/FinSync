let db;
let balance = 0;
const API_KEY = "945af12da05a26aab7dde2a3"; // Replace with your API key
const BASE_CURRENCY = "INR";
let currentCurrency = BASE_CURRENCY;
let exchangeRates = {};
let categoryTotals = {}; // Store total expenses per category

// Open IndexedDB database
const request = indexedDB.open("BudgetDB", 2); // Version incremented for new category field

request.onupgradeneeded = function(event) {
    db = event.target.result;
    let store = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
    store.createIndex("desc", "desc", { unique: false });
    store.createIndex("amount", "amount", { unique: false });
    store.createIndex("category", "category", { unique: false });
};

request.onsuccess = function(event) {
    db = event.target.result;
    fetchExchangeRates().then(loadTransactions);
};

request.onerror = function(event) {
    console.error("IndexedDB error:", event.target.errorCode);
};

// Fetch exchange rates
async function fetchExchangeRates() {
    try {
        let response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${BASE_CURRENCY}`);
        let data = await response.json();
        exchangeRates = data.conversion_rates;
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
    }
}

// Function to add transactions
function addTransaction(type) {
    let desc = document.getElementById("desc").value.trim();
    let amount = parseFloat(document.getElementById("amount").value);
    let category = document.getElementById("category").value;

    if (desc === "" || isNaN(amount) || amount <= 0) {
        alert("Enter valid details!");
        return;
    }

    amount = type * amount;
    balance += amount;

    let transaction = { desc, amount, category };

    let tx = db.transaction("transactions", "readwrite");
    let store = tx.objectStore("transactions");
    store.add(transaction);

    tx.oncomplete = function() {
        loadTransactions();
    };

    document.getElementById("desc").value = "";
    document.getElementById("amount").value = "";
}

// Function to load transactions and update history
function loadTransactions() {
    balance = 0;
    categoryTotals = {}; // Reset category totals
    let historyList = document.getElementById("history");
    let categorySummary = document.getElementById("category-summary");

    historyList.innerHTML = "";
    categorySummary.innerHTML = "";

    let tx = db.transaction("transactions", "readonly");
    let store = tx.objectStore("transactions");
    let request = store.openCursor();

    request.onsuccess = function(event) {
        let cursor = event.target.result;
        if (cursor) {
            let convertedAmount = convertAmount(cursor.value.amount);
            let li = document.createElement("li");
            li.innerHTML = `${cursor.value.desc} - ${getCurrencySymbol(currentCurrency)}${convertedAmount} 
                            (${cursor.value.category}) 
                            <button onclick="deleteTransaction(${cursor.key})">❌</button>`;
            li.style.color = cursor.value.amount > 0 ? "green" : "red";
            historyList.appendChild(li);

            // Update balance
            balance += cursor.value.amount;

            // Update category totals
            if (!categoryTotals[cursor.value.category]) {
                categoryTotals[cursor.value.category] = 0;
            }
            categoryTotals[cursor.value.category] += cursor.value.amount;

            cursor.continue();
        } else {
            document.getElementById("balance").innerText = convertAmount(balance);
            document.getElementById("currency-symbol").innerText = getCurrencySymbol(currentCurrency);
            updateCategorySummary();
        }
    };
}

// Function to update category summary
function updateCategorySummary() {
    let categorySummary = document.getElementById("category-summary");
    categorySummary.innerHTML = "";
    
    for (let category in categoryTotals) {
        let convertedTotal = convertAmount(categoryTotals[category]);
        let li = document.createElement("li");
        li.innerHTML = `${category}: ${getCurrencySymbol(currentCurrency)}${convertedTotal}`;
        li.style.fontWeight = "bold";
        categorySummary.appendChild(li);
    }
}

// Function to delete transactions
function deleteTransaction(id) {
    let tx = db.transaction("transactions", "readwrite");
    let store = tx.objectStore("transactions");
    store.delete(id);

    tx.oncomplete = function() {
        loadTransactions();
    };
}

// Function to convert currency and update history
function convertCurrency() {
    let selectedCurrency = document.getElementById("currency").value;
    if (exchangeRates[selectedCurrency]) {
        currentCurrency = selectedCurrency;
        loadTransactions();
    } else {
        alert("Exchange rate not available. Try again later.");
    }
}

// Helper function to convert amount based on selected currency
function convertAmount(amount) {
    return (amount * (exchangeRates[currentCurrency] || 1)).toFixed(2);
}

// Helper function to get currency symbols
function getCurrencySymbol(currency) {
    const symbols = {
        "INR": "₹",
        "USD": "$",
        "EUR": "€",
        "GBP": "£"
    };
    return symbols[currency] || currency;
}
