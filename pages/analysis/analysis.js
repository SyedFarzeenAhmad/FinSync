let db;

// Open IndexedDB
const request = indexedDB.open("BudgetDB", 2);

request.onsuccess = function(event) {
    db = event.target.result;
    loadAnalysisData();
};

request.onerror = function(event) {
    console.error("IndexedDB error:", event.target.errorCode);
};

// Load transaction data for charts
function loadAnalysisData() {
    let categoryTotals = {};
    let monthlyTotals = {};

    let tx = db.transaction("transactions", "readonly");
    let store = tx.objectStore("transactions");
    let request = store.openCursor();

    request.onsuccess = function(event) {
        let cursor = event.target.result;
        if (cursor) {
            let { amount, category } = cursor.value;
            let date = new Date(cursor.value.date || Date.now());
            let monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

            // Update category totals
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount);

            // Update monthly totals
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Math.abs(amount);

            cursor.continue();
        } else {
            renderCategoryChart(categoryTotals);
            renderMonthlyChart(monthlyTotals);
        }
    };
}

// Render category-wise expense chart
function renderCategoryChart(data) {
    let ctx = document.getElementById("categoryChart").getContext("2d");
    new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff"]
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: "Expenses by Category" }
        }
    });
}

// Render monthly spending trend chart
function renderMonthlyChart(data) {
    let ctx = document.getElementById("monthlyChart").getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: "Monthly Expenses",
                data: Object.values(data),
                borderColor: "#007bff",
                fill: false
            }]
        },
        options: {
            responsive: true,
            title: { display: true, text: "Monthly Spending Trend" },
            scales: { x: { title: { display: true, text: "Month" } } }
        }
    });
}
