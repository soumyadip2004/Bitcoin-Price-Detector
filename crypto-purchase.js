// Constants
const MOCK_WALLET = {
    balance: 85000,
    totalTransactions: 156,
    bitcoinHoldings: 2.45,
    transactions: [
        {
            type: 'buy',
            amount: 40000,
            timestamp: new Date().toISOString(),
            status: 'completed',
            direction: 'Bought BTC'
        },
        {
            type: 'sell',
            amount: 35000,
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            status: 'completed',
            direction: 'Sold BTC'
        },
        {
            type: 'buy',
            amount: 25000,
            timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            status: 'completed',
            direction: 'Bought BTC'
        }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeWallet();
    setupPriceCalculator();
});

// Initialize wallet
function initializeWallet() {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet) {
        Object.assign(MOCK_WALLET, JSON.parse(savedWallet));
    }
    updateWalletUI();
}

// Setup real-time price calculator
function setupPriceCalculator() {
    const amountInput = document.getElementById('purchaseAmount');
    const btcOutput = document.getElementById('btcAmount');

    amountInput.addEventListener('input', async () => {
        const amount = parseFloat(amountInput.value);
        if (!amount) {
            btcOutput.value = '';
            return;
        }

        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=inr');
            const data = await response.json();
            const btcPrice = data.bitcoin.inr;
            const btcAmount = amount / btcPrice;
            btcOutput.value = btcAmount.toFixed(8);
        } catch (error) {
            btcOutput.value = 'Error fetching price';
        }
    });
}

// Handle purchase
async function handlePurchase() {
    const amount = parseFloat(document.getElementById('purchaseAmount').value);
    const btcAmount = parseFloat(document.getElementById('btcAmount').value);

    if (!amount || !btcAmount) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    if (amount > MOCK_WALLET.balance) {
        showNotification('Insufficient balance', 'error');
        return;
    }

    // Process transaction
    const transaction = {
        type: 'purchase',
        amount: amount,
        btcAmount: btcAmount,
        timestamp: new Date().toISOString(),
        status: 'completed'
    };

    // Update wallet
    MOCK_WALLET.balance -= amount;
    MOCK_WALLET.transactions.unshift(transaction);
    localStorage.setItem('wallet', JSON.stringify(MOCK_WALLET));

    // Update UI
    updateWalletUI();
    showNotification('Purchase successful!', 'success');
    document.getElementById('purchaseAmount').value = '';
    document.getElementById('btcAmount').value = '';
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
                        -₹${formatNumber(transaction.amount)}
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

// Helper function to format numbers
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
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

// Add this new function
function setAmount(amount) {
    const amountInput = document.getElementById('purchaseAmount');
    amountInput.value = amount;
    // Trigger the input event to calculate BTC amount
    const event = new Event('input', { bubbles: true });
    amountInput.dispatchEvent(event);
} 