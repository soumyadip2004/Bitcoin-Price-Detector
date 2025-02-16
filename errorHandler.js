class ErrorHandler {
    static handle(error, context) {
        console.error(`Error in ${context}:`, error);
        
        if (error.name === 'AbortError') {
            showError('Request timed out. Retrying...');
            return true;
        }
        
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            showError('Network error. Check your connection.');
            return false;
        }
        
        showError('An unexpected error occurred.');
        return false;
    }
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-toast';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.classList.add('fade-out');
        setTimeout(() => errorElement.remove(), 300);
    }, 3000);
} 