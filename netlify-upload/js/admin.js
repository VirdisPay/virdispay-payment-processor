// VirdisPay Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all nav items and tab contents
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding tab
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Sidebar Toggle (Mobile)
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Initialize Charts
    initializeCharts();
    
    // Auto-refresh data every 30 seconds
    setInterval(refreshData, 30000);
    
    // Initialize real-time updates
    initializeRealTimeUpdates();
});

// Chart Initialization
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [8500, 9200, 9800, 11200, 10800, 12450],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Transaction Chart
    const transactionCtx = document.getElementById('transactionChart');
    if (transactionCtx) {
        new Chart(transactionCtx, {
            type: 'bar',
            data: {
                labels: ['Polygon', 'Ethereum', 'BSC', 'Arbitrum'],
                datasets: [{
                    label: 'Transactions',
                    data: [2150, 450, 200, 47],
                    backgroundColor: [
                        'rgba(130, 71, 229, 0.8)',
                        'rgba(98, 126, 234, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        '#8247e5',
                        '#627eea',
                        '#f59e0b',
                        '#10b981'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx) {
        new Chart(trafficCtx, {
            type: 'doughnut',
            data: {
                labels: ['Organic Search', 'Direct', 'Social Media', 'Referrals'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    // Growth Chart
    const growthCtx = document.getElementById('growthChart');
    if (growthCtx) {
        new Chart(growthCtx, {
            type: 'line',
            data: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: [{
                    label: 'Growth %',
                    data: [15, 28, 35, 42],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Data Refresh
function refreshData() {
    // Simulate data refresh
    updateStats();
    updateRecentActivity();
}

// Update Stats
function updateStats() {
    const statValues = document.querySelectorAll('.stat-card h3');
    statValues.forEach(stat => {
        // Add a subtle animation to indicate data refresh
        stat.style.transform = 'scale(1.05)';
        setTimeout(() => {
            stat.style.transform = 'scale(1)';
        }, 200);
    });
}

// Update Recent Activity
function updateRecentActivity() {
    const activityList = document.querySelector('.activity-list');
    if (activityList) {
        // Add a new activity item
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item';
        newActivity.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-sync"></i>
            </div>
            <div class="activity-content">
                <p><strong>System</strong> data refreshed</p>
                <span class="activity-time">Just now</span>
            </div>
        `;
        
        // Add to top of list
        activityList.insertBefore(newActivity, activityList.firstChild);
        
        // Remove oldest item if more than 5
        const items = activityList.querySelectorAll('.activity-item');
        if (items.length > 5) {
            items[items.length - 1].remove();
        }
    }
}

// Real-time Updates
function initializeRealTimeUpdates() {
    // Simulate real-time transaction updates
    setInterval(() => {
        const transactionRows = document.querySelectorAll('.data-table tbody tr');
        if (transactionRows.length > 0) {
            // Randomly highlight a row to show new transaction
            const randomRow = transactionRows[Math.floor(Math.random() * transactionRows.length)];
            randomRow.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
            setTimeout(() => {
                randomRow.style.backgroundColor = '';
            }, 2000);
        }
    }, 10000);
}

// Export Data Functionality
function exportData(type) {
    // Simulate data export
    const data = generateExportData(type);
    downloadCSV(data, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
}

// Generate Export Data
function generateExportData(type) {
    const baseData = {
        transactions: [
            ['Transaction ID', 'Merchant', 'Amount', 'Network', 'Fee', 'Status', 'Date'],
            ['TX-001234', 'CBD Store London', '$99.99', 'Polygon', '$0.05', 'Completed', '2024-01-15 14:30'],
            ['TX-001235', 'Hemp Co UK', '$250.00', 'Ethereum', '$0.05', 'Completed', '2024-01-15 14:25']
        ],
        merchants: [
            ['Merchant ID', 'Business Name', 'Plan', 'Status', 'Transactions', 'Volume'],
            ['MERCH-001', 'CBD Store London', 'Professional', 'Active', '247', '$12,450'],
            ['MERCH-002', 'Hemp Co UK', 'Starter', 'Pending', '89', '$4,250']
        ]
    };
    
    return baseData[type] || [];
}

// Download CSV
function downloadCSV(data, filename) {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Search and Filter Functions
function filterTransactions() {
    const networkFilter = document.querySelector('select').value;
    const statusFilter = document.querySelectorAll('select')[1].value;
    const dateFilter = document.querySelector('input[type="date"]').value;
    
    const rows = document.querySelectorAll('.data-table tbody tr');
    
    rows.forEach(row => {
        const network = row.cells[3].textContent.trim();
        const status = row.cells[5].textContent.trim();
        const date = row.cells[6].textContent.trim();
        
        let showRow = true;
        
        if (networkFilter !== 'All Networks' && !network.includes(networkFilter)) {
            showRow = false;
        }
        
        if (statusFilter !== 'All Status' && !status.includes(statusFilter)) {
            showRow = false;
        }
        
        if (dateFilter && !date.includes(dateFilter)) {
            showRow = false;
        }
        
        row.style.display = showRow ? '' : 'none';
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add notification styles if not already added
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                max-width: 400px;
                animation: slideInRight 0.3s ease-out;
            }
            
            .notification-success {
                border-left: 4px solid #10b981;
            }
            
            .notification-error {
                border-left: 4px solid #ef4444;
            }
            
            .notification-info {
                border-left: 4px solid #667eea;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
            }
            
            .notification-content i:first-child {
                color: #10b981;
            }
            
            .notification-error .notification-content i:first-child {
                color: #ef4444;
            }
            
            .notification-info .notification-content i:first-child {
                color: #667eea;
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #666;
                margin-left: auto;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// Event Listeners
document.addEventListener('click', function(e) {
    // Export button functionality
    if (e.target.closest('.btn') && e.target.textContent.includes('Export')) {
        e.preventDefault();
        exportData('transactions');
        showNotification('Data exported successfully!', 'success');
    }
    
    // Generate report functionality
    if (e.target.closest('.btn') && e.target.textContent.includes('Generate Report')) {
        e.preventDefault();
        showNotification('Report generated successfully!', 'success');
    }
    
    // Add merchant functionality
    if (e.target.closest('.btn') && e.target.textContent.includes('Add Merchant')) {
        e.preventDefault();
        showNotification('Add merchant form would open here', 'info');
    }
    
    // Logout functionality
    if (e.target.closest('.logout-btn')) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            showNotification('Logged out successfully', 'info');
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + E for export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportData('transactions');
        showNotification('Data exported via keyboard shortcut!', 'success');
    }
    
    // Ctrl/Cmd + R for refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
        showNotification('Data refreshed!', 'info');
    }
});

// Initialize filters
document.addEventListener('DOMContentLoaded', function() {
    const filterSelects = document.querySelectorAll('.filter-select, .filter-date');
    filterSelects.forEach(filter => {
        filter.addEventListener('change', filterTransactions);
    });
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Admin dashboard load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }
        }, 0);
    });
}

console.log('VirdisPay Admin Dashboard initialized successfully!');

