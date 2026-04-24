// UI Helper Functions for Modal and View Management

const UI = {
    views: {},
    overlays: {},
    inputs: {},
    lists: {}
};

/**
 * Open a view or bottom sheet overlay
 * @param {HTMLElement} viewEl 
 */
function openView(viewEl) {
    if (!viewEl) return;
    
    // Check if it's a bottom sheet overlay or standard app view
    if (viewEl.classList.contains('bottom-sheet-overlay')) {
        viewEl.classList.add('active');
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    } else {
        viewEl.classList.add('active');
    }
}

/**
 * Close a view or bottom sheet overlay
 * @param {HTMLElement} viewEl 
 */
function closeView(viewEl) {
    if (!viewEl) return;
    
    if (viewEl.classList.contains('bottom-sheet-overlay')) {
        viewEl.classList.remove('active');
        // Restore body scrolling
        document.body.style.overflow = '';
    } else {
        viewEl.classList.remove('active');
    }
}

/**
 * Sync UI components based on state
 * (Placeholder function, can be expanded)
 */
function syncUIs() {
    // Implement global UI sync logic here
}

/**
 * Show a toast notification bubble
 * @param {string} message 
 */
function showToast(message) {
    let toast = document.getElementById('global-toast-bubble');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast-bubble';
        toast.className = 'toast-bubble';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    // Remove after 2.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Make sure close functions can be bound to sheet overlays when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    // Close bottom sheets when clicking on the overlay background
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('bottom-sheet-overlay')) {
            closeView(e.target);
        }
    });
});

// Expose globally
window.openView = openView;
window.closeView = closeView;
window.syncUIs = syncUIs;
window.showToast = showToast;
