// VirDisPay Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile Navigation
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }));
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Pricing toggle
    const pricingToggle = document.getElementById('pricing-toggle');
    const pricingPrices = document.querySelectorAll('.pricing-price .amount');
    
    if (pricingToggle) {
        const monthlyPrices = ['29', '99', '299'];
        const annualPrices = ['23', '79', '239'];
        
        pricingToggle.addEventListener('change', function() {
            if (this.checked) {
                // Annual pricing (with 20% discount)
                pricingPrices.forEach((price, index) => {
                    price.textContent = annualPrices[index];
                });
            } else {
                // Monthly pricing
                pricingPrices.forEach((price, index) => {
                    price.textContent = monthlyPrices[index];
                });
            }
        });
    }
    
    // Integration tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked button and corresponding panel
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Contact form handling (FormSpree)
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitButton.disabled = true;
            
            // Submit to FormSpree
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    // Reset button
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                    
                    // Show success message
                    showNotification('✅ Message sent successfully! We\'ll get back to you within 24 hours.', 'success');
                    
                    // Reset form
                    this.reset();
                } else {
                    response.json().then(data => {
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                        showNotification('❌ Oops! There was a problem sending your message. Please email us directly at hello@virdispay.com', 'error');
                    });
                }
            })
            .catch(error => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
                showNotification('❌ Network error. Please email us directly at hello@virdispay.com', 'error');
            });
        });
    }
    
    // Demo payment button
    const demoButton = document.querySelector('.demo-button');
    
    if (demoButton) {
        demoButton.addEventListener('click', function() {
            showNotification('This is a demo button. In production, this would open the VirDisPay payment modal.', 'info');
        });
    }
    
    // Notification system
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
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.feature-card, .pricing-card, .comparison-row').forEach(el => {
        observer.observe(el);
    });
    
    // Gas savings calculator
    function createGasCalculator() {
        const calculator = document.createElement('div');
        calculator.className = 'gas-calculator';
        calculator.innerHTML = `
            <div class="calculator-content">
                <h3>Calculate Your Savings</h3>
                <div class="calculator-inputs">
                    <div class="input-group">
                        <label for="monthly-volume">Monthly Transaction Volume ($)</label>
                        <input type="number" id="monthly-volume" placeholder="10000" min="0">
                    </div>
                    <div class="input-group">
                        <label for="transaction-size">Average Transaction Size ($)</label>
                        <input type="number" id="transaction-size" placeholder="100" min="0">
                    </div>
                </div>
                <div class="calculator-results">
                    <div class="result-item">
                        <span class="result-label">Current Fees (Ethereum):</span>
                        <span class="result-value" id="current-fees">$0</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">VirDisPay Fees (Polygon):</span>
                        <span class="result-value" id="virdis-fees">$0</span>
                    </div>
                    <div class="result-item savings">
                        <span class="result-label">Monthly Savings:</span>
                        <span class="result-value" id="savings">$0</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add calculator styles
        const styles = document.createElement('style');
        styles.textContent = `
            .gas-calculator {
                background: white;
                border-radius: 16px;
                padding: 2rem;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                margin-top: 2rem;
            }
            
            .calculator-content h3 {
                text-align: center;
                margin-bottom: 2rem;
                color: #333;
            }
            
            .calculator-inputs {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .input-group {
                display: flex;
                flex-direction: column;
            }
            
            .input-group label {
                margin-bottom: 0.5rem;
                font-weight: 500;
                color: #333;
            }
            
            .input-group input {
                padding: 12px 16px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
            }
            
            .input-group input:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .calculator-results {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .result-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .result-item.savings {
                background: rgba(16, 185, 129, 0.1);
                border: 2px solid #10b981;
            }
            
            .result-label {
                font-weight: 500;
                color: #333;
            }
            
            .result-value {
                font-weight: 700;
                font-size: 1.2rem;
                color: #667eea;
            }
            
            .result-item.savings .result-value {
                color: #10b981;
            }
            
            @media (max-width: 768px) {
                .calculator-inputs {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(styles);
        
        // Add calculation logic
        const volumeInput = calculator.querySelector('#monthly-volume');
        const sizeInput = calculator.querySelector('#transaction-size');
        
        function calculateSavings() {
            const volume = parseFloat(volumeInput.value) || 0;
            const size = parseFloat(sizeInput.value) || 0;
            
            if (volume > 0 && size > 0) {
                const transactions = volume / size;
                const currentFees = transactions * 50; // $50 average Ethereum fee
                const virdisFees = transactions * 0.01; // $0.01 Polygon fee
                const savings = currentFees - virdisFees;
                
                calculator.querySelector('#current-fees').textContent = `$${currentFees.toFixed(2)}`;
                calculator.querySelector('#virdis-fees').textContent = `$${virdisFees.toFixed(2)}`;
                calculator.querySelector('#savings').textContent = `$${savings.toFixed(2)}`;
            }
        }
        
        volumeInput.addEventListener('input', calculateSavings);
        sizeInput.addEventListener('input', calculateSavings);
        
        return calculator;
    }
    
    // Add calculator to comparison section
    const calculatorLink = document.querySelector('a[href="#calculator"]');
    if (calculatorLink) {
        calculatorLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            const comparison = document.querySelector('.comparison');
            const existingCalculator = comparison.querySelector('.gas-calculator');
            
            if (existingCalculator) {
                existingCalculator.remove();
            } else {
                const calculator = createGasCalculator();
                comparison.appendChild(calculator);
                
                // Scroll to calculator
                calculator.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    }
    
    // Demo modal functionality
    let currentStep = 1;
    const totalSteps = 4;
    
    window.openDemoModal = function() {
        document.getElementById('demo-modal').classList.add('show');
        currentStep = 1;
        updateStep();
    };
    
    window.closeDemoModal = function() {
        document.getElementById('demo-modal').classList.remove('show');
    };
    
    window.nextStep = function() {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStep();
        }
    };
    
    window.previousStep = function() {
        if (currentStep > 1) {
            currentStep--;
            updateStep();
        }
    };
    
    window.autoPlay = function() {
        const button = document.getElementById('auto-btn');
        if (button.textContent.includes('Auto Play')) {
            button.textContent = '⏸️ Stop';
            autoPlayInterval = setInterval(() => {
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateStep();
                } else {
                    currentStep = 1;
                    updateStep();
                }
            }, 4000);
        } else {
            button.textContent = '▶️ Auto Play';
            clearInterval(autoPlayInterval);
        }
    };
    
    function updateStep() {
        // Hide all steps
        document.querySelectorAll('.demo-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        document.getElementById(`step${currentStep}`).classList.add('active');
        
        // Update button states
        document.getElementById('prev-btn').disabled = currentStep === 1;
        document.getElementById('next-btn').textContent = currentStep === totalSteps ? 'Restart →' : 'Next →';
        
        if (currentStep === totalSteps) {
            document.getElementById('next-btn').onclick = () => {
                currentStep = 1;
                updateStep();
            };
        } else {
            document.getElementById('next-btn').onclick = nextStep;
        }
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDemoModal();
        }
    });
    
    // Scroll to top button
    function createScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollBtn.setAttribute('aria-label', 'Scroll to top');
        
        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            .scroll-to-top {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .scroll-to-top.visible {
                opacity: 1;
                visibility: visible;
            }
            
            .scroll-to-top:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
            }
        `;
        
        document.head.appendChild(styles);
        document.body.appendChild(scrollBtn);
        
        // Show/hide based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });
        
        // Scroll to top functionality
        scrollBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    createScrollToTop();
    
    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                }
            }, 0);
        });
    }
    
    // Error handling
    window.addEventListener('error', function(e) {
        console.error('JavaScript error:', e.error);
        // In production, you might want to send this to an error tracking service
    });
    
    // Initialize tooltips (if using a tooltip library)
    function initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', function() {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = this.getAttribute('data-tooltip');
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
            });
            
            element.addEventListener('mouseleave', function() {
                const tooltip = document.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.remove();
                }
            });
        });
    }
    
    initTooltips();
    
    // E-commerce demo tabs functionality
    const demoTabs = document.querySelectorAll('.demo-tab');
    const demoPanels = document.querySelectorAll('.demo-panel');
    
    if (demoTabs) {
        demoTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetDemo = this.getAttribute('data-demo');
                
                // Remove active class from all tabs and panels
                document.querySelectorAll('.demo-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.demo-panel').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding panel
                const targetPanel = document.getElementById(targetDemo + '-demo');
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }
    
    console.log('VirDisPay website initialized successfully!');
});
