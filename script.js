const CONFIG = {
    API_KEYS: {
        NEWS: '2a30f11831msh083b77c667c7fc6p1e9c54jsn265a6b90f82d',
        CRYPTO: 'CG-MVqHLpYvZgHRmZPd5H2t8rHv',
        STOCKS: '2a30f11831msh083b77c667c7fc6p1e9c54jsn265a6b90f82d'
    },
    ENDPOINTS: {
        PRICE: 'https://api.coingecko.com/api/v3/simple/price',
        NEWS: 'https://cryptocurrency-news2.p.rapidapi.com/v1/coindesk',
        WEBSOCKET: 'wss://ws.coincap.io/prices?assets=bitcoin',
        STOCKS: 'https://latest-stock-price.p.rapidapi.com/price?Indices=NIFTY 50'
    }
};

function logout() {
    // Show confirmation dialog
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <div class="confirm-content">
            <h3>127.0.0.1:5500 says</h3>
            <p>You have logged out!</p>
            <button onclick="confirmLogout()" class="ok-button">OK</button>
        </div>
    `;
    document.body.appendChild(confirmDialog);
}

function confirmLogout() {
    // Clear any stored data
    localStorage.removeItem('theme');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Redirect to register page
    window.location.href = 'register.html';
}

    // Function to populate the table or handle the parsed data
    function populateTable(data) {console.log("Parsed Data:", data)}// Logs the data into the console
    ; // Logs the data into the console
    // Additional logic to populate the table or chart

    // Load the CSV dataset using PapaParse
Papa.parse('data/bitcoin_dataset.csv', {
    download: true,
    header: true,
    complete: function(results) {
        console.log("Data parsing complete!");
        populateTable(results.data);
    },
    error: function(error) {
        console.error("Error parsing the CSV file:", error);
    }
});

// Image loading handling
document.querySelector('.profile-image').addEventListener('load', function() {
    this.classList.remove('loading');
});

document.querySelector('.profile-image').addEventListener('error', function() {
    this.classList.remove('loading');
    console.log('Error loading profile image');
});

// Theme switching functionality
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-switch i');
    
    body.classList.toggle('light-theme');
    
    // Toggle icon
    if (body.classList.contains('light-theme')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
    
    // Save theme preference
    const isDark = !body.classList.contains('light-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load saved theme preference
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.theme-switch i').classList.replace('fa-moon', 'fa-sun');
    }
});

// Cache management
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// API endpoints
const API = {
    PRICE: 'https://api.coingecko.com/api/v3/simple/price',
    MARKET: 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart',
    NEWS: 'https://newsapi.org/v2/everything'
};

// Improve LoadingManager
const LoadingManager = {
    loaders: new Set(),
    maxRetries: 3,
    
    async load(task, callback) {
        this.add(task);
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                const result = await callback();
                this.remove(task);
                return result;
    } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    this.handleError(task, error);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
        this.remove(task);
    },

    handleError(task, error) {
        console.error(`Failed to load ${task}:`, error);
        showError(`Failed to load ${task}. Using cached data if available.`);
        this.loadFallbackData(task);
    },

    loadFallbackData(task) {
        const cached = localStorage.getItem(`${task}_fallback`);
        if (cached) {
            const data = JSON.parse(cached);
            updateUI(task, data);
        }
    }
};

// Add immediate UI feedback
function showLoadingState() {
    document.querySelectorAll('[data-type]').forEach(element => {
        element.innerHTML = `
            <div class="loading-skeleton">
                <div class="skeleton-text"></div>
            </div>
        `;
    });
}

// Add performance optimizations
const DataLoader = {
    cache: new Map(),
    worker: new Worker('dataWorker.js'),
    pendingRequests: new Map(),
    
    async fetch(endpoint, options = {}) {
        const cacheKey = endpoint + JSON.stringify(options);
        
        // Check memory cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30000) { // 30 seconds cache
                return cached.data;
            }
        }
        
        // Check if request is already pending
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        
        // Make new request
        const promise = this._fetchWithFallback(endpoint, options);
        this.pendingRequests.set(cacheKey, promise);
        
        try {
            const data = await promise;
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            return data;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    },
    
    async _fetchWithFallback(endpoint, options) {
        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    ...options.headers,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
    } catch (error) {
            return this._loadFromIndexedDB(endpoint) || this._loadFromLocalStorage(endpoint);
        }
    }
};

// Create a Web Worker for data processing
const workerCode = `
    self.onmessage = async function(e) {
        const { data, type } = e.data;
        
        switch(type) {
            case 'process_price':
                const processed = await processPrice(data);
                self.postMessage({ type: 'price_processed', data: processed });
                break;
            // Add other cases as needed
        }
    };

    async function processPrice(data) {
        // Process data in background
        return data.map(item => ({
            ...item,
            formatted: new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(item.price)
        }));
    }
`;

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(workerBlob));

// Optimize the main data fetching function
async function loadBitcoinPrice() {
    const pricePromise = DataLoader.fetch(
        `${CONFIG.ENDPOINTS.PRICE}?ids=bitcoin&vs_currencies=inr`,
        {
            headers: {
                'X-CG-Pro-API-Key': CONFIG.API_KEYS.CRYPTO
            }
        }
    );

    // Show loading skeleton immediately
    showLoadingSkeleton();

    try {
        const data = await Promise.race([
            pricePromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 3000)
            )
        ]);

        // Process data in background
        worker.postMessage({ type: 'process_price', data });
        
        // Update UI immediately with raw data
        updatePriceUI(data);
        
        return data;
    } catch (error) {
        console.error('Error loading price:', error);
        return loadFallbackData();
    } finally {
        hideLoadingSkeleton();
    }
}

// Add preloading for next update
function preloadNextData() {
    const preloadPromise = DataLoader.fetch(CONFIG.ENDPOINTS.PRICE);
    preloadPromise.catch(() => {}); // Silently handle preload errors
}

// Optimize UI updates
const UIUpdater = {
    pendingUpdates: new Map(),
    
    schedule(key, updateFn) {
        if (this.pendingUpdates.has(key)) {
            cancelAnimationFrame(this.pendingUpdates.get(key));
        }
        
        const frameId = requestAnimationFrame(() => {
            updateFn();
            this.pendingUpdates.delete(key);
        });
        
        this.pendingUpdates.set(key, frameId);
    }
};

// Initialize everything efficiently
async function initialize() {
    // Load critical data first
    const criticalData = await Promise.all([
        loadBitcoinPrice(),
        loadMarketStatus()
    ]);

    // Then load non-critical data
    Promise.all([
        loadNews(),
        loadMarketInsights()
    ]).catch(console.error);

    // Setup real-time updates
    setupWebSocket();
    
    // Preload next data
    preloadNextData();
}

// Add this to your event listeners
document.addEventListener('DOMContentLoaded', initialize);

// Add periodic updates with smart timing
let updateInterval = 30000; // Start with 30 seconds

function setupSmartUpdates() {
    const updateData = async () => {
        const startTime = performance.now();
        await loadBitcoinPrice();
        const endTime = performance.now();
        
        // Adjust interval based on performance
        const loadTime = endTime - startTime;
        updateInterval = Math.max(5000, Math.min(60000, loadTime * 10));
        
        setTimeout(updateData, updateInterval);
    };
    
    updateData();
}

// Load news with worker
const newsWorker = new Worker('newsWorker.js');
newsWorker.onmessage = (event) => {
    updateNewsUI(event.data);
};

function loadNews() {
    LoadingManager.add('news');
    newsWorker.postMessage({ type: 'fetchNews' });
}

// Update UI functions
function updatePriceUI(data) {
    requestAnimationFrame(() => {
        document.querySelector('[data-type="current-price"]').textContent = 
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.inr);
        // Update other price elements...
    });
}

function updateRealtimePrice(price) {
    requestAnimationFrame(() => {
        const priceElement = document.querySelector('[data-type="current-price"]');
        const currentPrice = parseFloat(priceElement.textContent.replace(/[^0-9.-]+/g, ""));
        
        if (price > currentPrice) {
            priceElement.classList.add('price-up');
        } else {
            priceElement.classList.add('price-down');
        }
        
        priceElement.textContent = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR' 
        }).format(price);
        
        setTimeout(() => {
            priceElement.classList.remove('price-up', 'price-down');
        }, 1000);
    });
}

// Add this to your initialization
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState();
    
    // Load critical data first
    try {
        const priceData = await loadBitcoinPrice();
        updatePriceUI(priceData);
    } catch (error) {
        ErrorHandler.handle(error, 'price loading');
    }
    
    // Load non-critical data
    Promise.all([
        setupWebSocket(),
        startNewsRefresh(),
        initializeServiceWorker(),
        startStockUpdates()
    ]).catch(error => {
        ErrorHandler.handle(error, 'initialization');
    });
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('ServiceWorker registered'))
        .catch(error => console.log('ServiceWorker registration failed:', error));
}

// Add these styles to your CSS
const styles = `
    .loading-skeleton {
        background: linear-gradient(90deg, #2c2c2c 25%, #3c3c3c 50%, #2c2c2c 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
        height: 24px;
        width: 100%;
    }

    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;

// Add this to your head
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Add news fetching with RapidAPI
async function fetchNews() {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': CONFIG.API_KEYS.NEWS,
            'X-RapidAPI-Host': 'cryptocurrency-news2.p.rapidapi.com'
        }
    };

    try {
        const response = await fetch(CONFIG.ENDPOINTS.NEWS, options);
        const data = await response.json();
        return data.data.slice(0, 6); // Get latest 6 news items
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

// Update news UI
function updateNewsUI(newsItems) {
    const newsContainer = document.getElementById('newsContainer');
    if (!newsContainer) return;

    newsContainer.innerHTML = newsItems.map(news => `
        <div class="news-item" onclick="window.open('${news.url}', '_blank')">
            <div class="news-content">
                <h3 class="news-title">${news.title}</h3>
                <p class="news-description">${news.description.slice(0, 100)}...</p>
                <div class="news-meta">
                    <span class="news-date">${new Date(news.published_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Add news auto-refresh
function startNewsRefresh() {
    loadNews();
    setInterval(loadNews, 5 * 60 * 1000); // Refresh every 5 minutes
}

// Add loading state management
const LoadingStates = {
    states: new Map(),
    
    start(id) {
        this.states.set(id, true);
        this.updateUI(id, true);
    },
    
    finish(id) {
        this.states.set(id, false);
        this.updateUI(id, false);
    },
    
    updateUI(id, isLoading) {
        const element = document.querySelector(`[data-loading="${id}"]`);
        if (element) {
            element.classList.toggle('loading', isLoading);
        }
    }
};

// Add these helper functions
function hideLoadingState() {
    document.querySelectorAll('.loading-skeleton').forEach(skeleton => {
        skeleton.remove();
    });
}

// Add these constants
const STOCK_SYMBOLS = [
    { symbol: 'RELIANCE', name: 'Reliance Industries' },
    { symbol: 'TCS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank' },
    { symbol: 'INFY', name: 'Infosys' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors' },
    { symbol: 'WIPRO', name: 'Wipro Ltd' }
];

// Optimize stock data fetching
async function fetchIndianStocks() {
    try {
        // Use Promise.all to fetch data in parallel
        const [stocksResponse, indicesResponse] = await Promise.all([
            fetch(CONFIG.ENDPOINTS.STOCKS, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': CONFIG.API_KEYS.STOCKS,
                    'X-RapidAPI-Host': 'latest-stock-price.p.rapidapi.com'
                },
                cache: 'no-cache'
            }),
            fetch('https://api.example.com/indices', {  // Replace with actual indices API
                headers: { 'Authorization': CONFIG.API_KEYS.STOCKS }
            })
        ]);

        const [stocksData, indicesData] = await Promise.all([
            stocksResponse.json(),
            indicesResponse.json()
        ]);

        // Update cache
        await CacheManager.set('stocks', stocksData);
        await CacheManager.set('indices', indicesData);

        // Update UI with new data
        updateStocksUI(stocksData);
        updateIndicesUI(indicesData);

        // Setup WebSocket for real-time updates
        const ws = await ConnectionPool.getConnection(SOCKET_ENDPOINTS.STOCKS);
        setupStockWebSocket(ws);

    } catch (error) {
        console.error('Error fetching stocks:', error);
        
        // Fallback to cached data
        const cachedStocks = await CacheManager.get('stocks', 'all');
        const cachedIndices = await CacheManager.get('indices', 'all');
        
        if (cachedStocks) updateStocksUI(cachedStocks);
        if (cachedIndices) updateIndicesUI(cachedIndices);
    }
}

// WebSocket handler for real-time updates
function setupStockWebSocket(ws) {
    const symbols = STOCK_SYMBOLS.map(s => s.symbol).join(',');
    
    ws.send(JSON.stringify({
        type: 'subscribe',
        symbols: symbols
    }));

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateRealtimeStockPrice(data);
    };
}

// Optimize the UI updates
function updateRealtimeStockPrice(data) {
    requestAnimationFrame(() => {
        const stockCard = document.querySelector(`[data-symbol="${data.symbol}"]`);
        if (!stockCard) return;

        const priceElement = stockCard.querySelector('.stock-price');
        const oldPrice = parseFloat(priceElement.textContent.replace(/[^0-9.-]+/g, ""));
        const newPrice = parseFloat(data.price);

        if (oldPrice !== newPrice) {
            priceElement.textContent = `₹${newPrice.toFixed(2)}`;
            stockCard.classList.add(newPrice > oldPrice ? 'price-up' : 'price-down');
            setTimeout(() => stockCard.classList.remove('price-up', 'price-down'), 1000);
        }
    });
}

// Initialize everything
async function initializeMarket() {
    await CacheManager.init();
    await fetchIndianStocks();
    
    // Update market status every minute
    setInterval(() => {
        updateMarketStatus();
        if (isMarketOpen()) fetchIndianStocks();
    }, 60000);
}

// Add this to your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', initializeMarket);

// Add these functions to your existing script.js
function updateMarketIndices() {
    // Simulated data - replace with actual API calls
    const indices = {
        sensex: {
            value: 65432.10,
            change: 1.25
        },
        nifty: {
            value: 19876.54,
            change: 0.95
        }
    };

    document.getElementById('sensex-value').textContent = `₹${indices.sensex.value.toFixed(2)}`;
    document.getElementById('nifty-value').textContent = `₹${indices.nifty.value.toFixed(2)}`;
    
    const sensexChange = document.getElementById('sensex-change');
    const niftyChange = document.getElementById('nifty-change');
    
    sensexChange.textContent = `${indices.sensex.change > 0 ? '↑' : '↓'} ${Math.abs(indices.sensex.change)}%`;
    niftyChange.textContent = `${indices.nifty.change > 0 ? '↑' : '↓'} ${Math.abs(indices.nifty.change)}%`;
    
    sensexChange.className = indices.sensex.change > 0 ? 'positive' : 'negative';
    niftyChange.className = indices.nifty.change > 0 ? 'positive' : 'negative';
}

function updateMarketStatus() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isMarketOpen = (hours >= 9 && hours < 15) || (hours === 15 && minutes <= 30);
    
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    statusIndicator.classList.toggle('closed', !isMarketOpen);
    statusText.textContent = isMarketOpen ? 'Market is Open' : 'Market is Closed';
    
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
}

// Add filter functionality
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.dataset.filter;
        filterStocks(filter);
    });
});

function filterStocks(filter) {
    const stocks = document.querySelectorAll('.stock-card');
    stocks.forEach(stock => {
        const change = parseFloat(stock.querySelector('.change-percent').textContent);
        switch(filter) {
            case 'gainers':
                stock.style.display = change > 0 ? 'block' : 'none';
                break;
            case 'losers':
                stock.style.display = change < 0 ? 'block' : 'none';
                break;
            default:
                stock.style.display = 'block';
        }
    });
}

// Initialize new features
function initializeMarketFeatures() {
    updateMarketIndices();
    updateMarketStatus();
    setInterval(updateMarketIndices, 60000); // Update every minute
    setInterval(updateMarketStatus, 60000);
}

// Add to your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    initializeMarketFeatures();
    // ... your existing initialization code
});

// Login functionality
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Basic validation
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    // Simple login check (replace with your actual authentication logic)
    if (username && password) {
        // Store user info
        localStorage.setItem('user', username);
        
        // Create success dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-content">
                <h3>Login Successful!</h3>
                <p>Welcome back, ${username}!</p>
                <button onclick="redirectToBitcoin()" class="ok-button">OK</button>
            </div>
        `;
        document.body.appendChild(dialog);
    }
}

// Redirect function
function redirectToBitcoin() {
    // Using window.location for redirect
    window.location.href = './bitcoin.html';
}

// Error handling
function showError(message) {
    alert(message);
}

// Add these constants
const COINBASE_API = 'https://api.coinbase.com/v2';
const MOCK_WALLET = {
    balance: 1000000, // Initial balance in INR
    transactions: []
};

// Bitcoin purchase functionality
async function purchaseBitcoin(amount) {
    try {
        // Get current BTC price
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=inr');
        const data = await response.json();
        const btcPrice = data.bitcoin.inr;
        
        // Calculate BTC amount
        const btcAmount = amount / btcPrice;
        
        // Check if user has enough balance
        if (amount > MOCK_WALLET.balance) {
            throw new Error('Insufficient balance');
        }
        
        // Process transaction
        const transaction = {
            type: 'purchase',
            amount: amount,
            btcAmount: btcAmount,
            price: btcPrice,
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        // Update wallet
        MOCK_WALLET.balance -= amount;
        MOCK_WALLET.transactions.unshift(transaction);
        
        // Save to localStorage
        localStorage.setItem('wallet', JSON.stringify(MOCK_WALLET));
        
        // Update UI
        updateWalletUI();
        showTransactionSuccess(btcAmount);
        
    } catch (error) {
        showTransactionError(error.message);
    }
}

// Add this HTML to your bitcoin.html

// Initialize wallet
function initializeWallet() {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet) {
        Object.assign(MOCK_WALLET, JSON.parse(savedWallet));
    }
    updateWalletUI();
}

// Update wallet UI
function updateWalletUI() {
    document.getElementById('walletBalance').textContent = 
        formatNumber(MOCK_WALLET.balance);
    
    const transactionsList = document.getElementById('transactionsList');
    transactionsList.innerHTML = MOCK_WALLET.transactions
        .map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-amount">
                        ${transaction.type === 'purchase' ? '-' : '+'}₹${formatNumber(transaction.amount)}
                        (${transaction.btcAmount.toFixed(8)} BTC)
                    </div>
                    <div class="transaction-date">
                        ${new Date(transaction.timestamp).toLocaleString()}
                    </div>
                </div>
                <span class="transaction-status status-${transaction.status}">
                    ${transaction.status}
                </span>
            </div>
        `).join('');
}

// Handle purchase button click
function handlePurchase() {
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    if (isNaN(amount) || amount <= 0) {
        showTransactionError('Please enter a valid amount');
        return;
    }
    purchaseBitcoin(amount);
}

// Show success message
function showTransactionSuccess(btcAmount) {
    const message = `Successfully purchased ${btcAmount.toFixed(8)} BTC`;
    showNotification(message, 'success');
}

// Show error message
function showTransactionError(message) {
    showNotification(message, 'error');
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize wallet when page loads
document.addEventListener('DOMContentLoaded', initializeWallet);

// Add this function to create floating Bitcoin symbols
function createFloatingSymbols() {
    const container = document.querySelector('.bitcoin-symbols');
    const symbolCount = 20; // Number of symbols to create

    for (let i = 0; i < symbolCount; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'btc-symbol';
        symbol.innerHTML = '₿';
        
        // Random size class
        const sizeClass = Math.random() < 0.3 ? 'large' : 
                         Math.random() < 0.6 ? 'small' : '';
        if (sizeClass) symbol.classList.add(sizeClass);

        // Random starting position
        symbol.style.left = `${Math.random() * 100}%`;
        
        // Random delay
        symbol.style.animationDelay = `${Math.random() * 15}s`;
        
        // Random duration variation
        const duration = 10 + Math.random() * 10;
        symbol.style.animationDuration = `${duration}s`;

        container.appendChild(symbol);

        // Remove and recreate symbol when animation ends
        symbol.addEventListener('animationend', () => {
            symbol.remove();
            createSymbol();
        });
    }
}

// Function to create a single new symbol
function createSymbol() {
    const container = document.querySelector('.bitcoin-symbols');
    const symbol = document.createElement('div');
    symbol.className = 'btc-symbol';
    symbol.innerHTML = '₿';
    
    // Random size class
    const sizeClass = Math.random() < 0.3 ? 'large' : 
                     Math.random() < 0.6 ? 'small' : '';
    if (sizeClass) symbol.classList.add(sizeClass);

    // Random starting position
    symbol.style.left = `${Math.random() * 100}%`;
    
    // Random duration
    const duration = 10 + Math.random() * 10;
    symbol.style.animationDuration = `${duration}s`;

    container.appendChild(symbol);

    // Remove and recreate symbol when animation ends
    symbol.addEventListener('animationend', () => {
        symbol.remove();
        createSymbol();
    });
}

// Initialize the floating symbols when the page loads
document.addEventListener('DOMContentLoaded', () => {
    createFloatingSymbols();
});

// Add this to your existing script.js
function updateProfileWallet() {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet) {
        const walletData = JSON.parse(savedWallet);
        
        // Update balance
        const balanceElement = document.getElementById('profileWalletBalance');
        if (balanceElement) {
            balanceElement.textContent = new Intl.NumberFormat('en-IN').format(walletData.balance);
        }
        
        // Update transactions
        const transactionsList = document.getElementById('profileTransactionsList');
        if (transactionsList && walletData.transactions) {
            transactionsList.innerHTML = walletData.transactions
                .map(transaction => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-amount">
                                -₹${new Intl.NumberFormat('en-IN').format(transaction.amount)}
                                (${transaction.btcAmount.toFixed(8)} BTC)
                            </div>
                            <div class="transaction-date">
                                ${new Date(transaction.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <span class="transaction-status status-${transaction.status}">
                            ${transaction.status}
                        </span>
                    </div>
                `).join('');
        }
        
        // Create balance chart
        if (document.getElementById('balanceChart')) {
            createBalanceChart(walletData.transactions);
        }
    }
}

function createBalanceChart(transactions) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    
    // Process data for chart
    const chartData = transactions.reduce((acc, transaction) => {
        const date = new Date(transaction.timestamp).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += transaction.amount;
        return acc;
    }, {});
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(chartData).reverse(),
            datasets: [{
                label: 'Transaction Amount (INR)',
                data: Object.values(chartData).reverse(),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Call this function when the profile page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profileWalletBalance')) {
        updateProfileWallet();
    }
});

// Theme Toggle Functionality
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    // Set initial theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Initialize theme when DOM loads
document.addEventListener('DOMContentLoaded', initializeTheme);

function showWalletDetails() {
    alert("Wallet Balance: ₹9,99,900\nAvailable for withdrawal: ₹9,89,900");
}
