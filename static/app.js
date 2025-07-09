// Financial Detective Frontend JavaScript

const API_BASE = window.location.origin;

// Utility function to show/hide loading
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

// Utility function to display results
function displayResults(data, title = "Results") {
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    
    let html = `<h3 class="text-xl font-bold mb-4">${title}</h3>`;
    
    if (data.summary) {
        html += `
            <div class="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 class="font-bold text-blue-800 mb-2">🤖 AI Summary</h4>
                <p class="text-blue-700">${data.summary}</p>
            </div>
        `;
    }
    
    if (data.detailed_results && Array.isArray(data.detailed_results)) {
        html += '<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">';
        
        data.detailed_results.forEach(stock => {
            const fundamentals = stock.fundamentals;
            const marketCap = fundamentals.marketCap ? 
                (fundamentals.marketCap / 1e12).toFixed(2) + 'T' : 'N/A';
            const sector = fundamentals.sector || 'N/A';
            const pe = fundamentals.trailingPE ? fundamentals.trailingPE.toFixed(2) : 'N/A';
            
            html += `
                <div class="bg-white border rounded-lg p-6 card-hover">
                    <h4 class="text-lg font-bold text-gray-800 mb-3">
                        ${stock.ticker}
                        <span class="text-sm text-gray-500 font-normal">${fundamentals.longName || ''}</span>
                    </h4>
                    
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Market Cap:</span>
                            <span class="font-semibold">₹${marketCap}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Sector:</span>
                            <span class="font-semibold">${sector}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">P/E Ratio:</span>
                            <span class="font-semibold">${pe}</span>
                        </div>
                    </div>
                    
                    <div class="border-t pt-3">
                        <h5 class="font-semibold text-gray-700 mb-2">📰 Recent News:</h5>
                        <div class="space-y-1 max-h-32 overflow-y-auto">
            `;
            
            if (stock.news && Array.isArray(stock.news) && stock.news.length > 0) {
                stock.news.slice(0, 3).forEach(article => {
                    if (article.title && article.link) {
                        html += `
                            <a href="${article.link}" target="_blank" 
                               class="block text-sm text-blue-600 hover:text-blue-800 truncate">
                                • ${article.title}
                            </a>
                        `;
                    }
                });
            } else {
                html += '<p class="text-sm text-gray-500">No recent news available</p>';
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    } else if (Array.isArray(data)) {
        // Handle screener results (array of tickers)
        html += `
            <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-bold text-green-800 mb-2">📊 Stocks Found:</h4>
                <div class="flex flex-wrap gap-2">
        `;
        data.forEach(ticker => {
            html += `<span class="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm">${ticker}</span>`;
        });
        html += '</div></div>';
    } else {
        // Handle individual stock data
        html += `<pre class="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">${JSON.stringify(data, null, 2)}</pre>`;
    }
    
    resultsContent.innerHTML = html;
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// AI-powered analysis
async function analyzeWithAI() {
    const query = document.getElementById('naturalQuery').value.trim();
    
    if (!query) {
        alert('Please enter a query');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/financial_detective_ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });
        
        const data = await response.json();
        displayResults(data, `AI Analysis: "${query}"`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error analyzing query. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Manual screener
async function runScreener() {
    const marketCap = document.getElementById('marketCap').value;
    
    const criteria = {
        market_cap_gt: marketCap ? parseFloat(marketCap) : null
    };
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/screener`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(criteria)
        });
        
        const data = await response.json();
        displayResults(data, "Screening Results");
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error running screener. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Get stock fundamentals
async function getStockFundamentals() {
    const ticker = document.getElementById('stockTicker').value.trim();
    
    if (!ticker) {
        alert('Please enter a stock ticker');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/stock_fundamentals/${ticker}`);
        const data = await response.json();
        displayResults(data, `${ticker} Fundamentals`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching stock data. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Get stock news
async function getStockNews() {
    const ticker = document.getElementById('stockTicker').value.trim();
    
    if (!ticker) {
        alert('Please enter a stock ticker');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/stock_news/${ticker}`);
        const data = await response.json();
        displayResults(data, `${ticker} News`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching news. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Add enter key support for inputs
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('naturalQuery').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            analyzeWithAI();
        }
    });
    
    document.getElementById('marketCap').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            runScreener();
        }
    });
    
    document.getElementById('stockTicker').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            getStockFundamentals();
        }
    });
});
