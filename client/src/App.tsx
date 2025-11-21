import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import PaymentForm from './components/PaymentForm';
import PublicPaymentPage from './components/PublicPaymentPage';
import MerchantDashboard from './components/MerchantDashboard';
import AdminDashboard from './components/AdminDashboard';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import WidgetPage from './components/WidgetPage';
import OnboardingFlow from './components/OnboardingFlow';

interface User {
  id: string;
  email: string;
  businessName: string;
  isVerified: boolean;
  kycStatus: string;
  role: string;
  walletAddress?: string;
  subscriptionTier?: string;
  walletMethod?: string;
  hasCompletedOnboarding?: boolean;
}

// Wrapper component to access navigate
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing auth token
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data
      fetchUserData(token);
    }
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        navigate('/dashboard');
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('token');
    }
  };

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('token', token);
    
    // Skip onboarding for admin users
    if (userData.role === 'admin') {
      navigate('/dashboard');
      return;
    }
    
    // Check if user needs onboarding
    if (!userData.hasCompletedOnboarding && !userData.subscriptionTier) {
      setShowOnboarding(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleOnboardingComplete = (updatedUser: User) => {
    setUser(updatedUser);
    setShowOnboarding(false);
    navigate('/dashboard');
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handlePaymentRequest = (paymentData: any) => {
    setPaymentData(paymentData);
    navigate('/payment');
  };

  // Admin dashboard needs full-screen layout without header/footer
  const isAdminRoute = user?.role === 'admin' && window.location.pathname === '/dashboard';
  // Public payment page also needs full-screen layout
  const isPublicPaymentRoute = window.location.pathname.startsWith('/pay/');
  // Widget page also needs full-screen layout
  const isWidgetRoute = window.location.pathname === '/widget';

  // Show onboarding if needed
  if (showOnboarding && user) {
    return (
      <OnboardingFlow
        user={user}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return (
    <div className="App">
      {!isAdminRoute && !isPublicPaymentRoute && !isWidgetRoute && (
        <header className="app-header">
          <div className="header-content">
            <img src="/logo.png" alt="VirdisPay" style={{maxHeight: '50px', maxWidth: '400px', width: 'auto', height: 'auto', marginBottom: '8px'}} />
            <p>Professional Crypto Payments for High-Risk Industries</p>
          </div>
        </header>
      )}
      
      <main className={isAdminRoute || isPublicPaymentRoute || isWidgetRoute ? '' : 'app-main'}>
        <Routes>
          {/* Public Routes (No Auth Required) */}
          <Route path="/pay/:paymentId" element={<PublicPaymentPage />} />
          <Route path="/widget" element={<WidgetPage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginForm onLogin={handleLogin} onSwitchToRegister={() => navigate('/register')} />} />
          <Route path="/register" element={<RegisterForm onRegister={handleLogin} onSwitchToLogin={() => navigate('/login')} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              user ? (
                user.role === 'admin' ? (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <MerchantDashboard user={user} onLogout={handleLogout} onPaymentRequest={handlePaymentRequest} onUpdateUser={setUser} />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/payment" 
            element={
              paymentData ? (
                <PaymentForm paymentData={paymentData} onBack={() => navigate('/dashboard')} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      
      {!isAdminRoute && !isPublicPaymentRoute && !isWidgetRoute && (
        <footer className="app-footer">
          <p>&copy; 2025 VirdisPay. All rights reserved.</p>
          <p>Non-Custodial • Secure • Compliant</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
