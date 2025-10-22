import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setEmail('');
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', padding: '20px' }}>
      <div style={{ maxWidth: '450px', width: '100%', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo.png" alt="VirdisPay" style={{ maxHeight: '50px', marginBottom: '10px' }} />
          <h2 style={{ margin: '10px 0 5px 0', fontSize: '24px', color: '#2c3e50' }}>Forgot Password?</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#7f8c8d' }}>Enter your email to reset your password</p>
        </div>

        {/* Success Message */}
        {message && (
          <div style={{ 
            padding: '15px', 
            background: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: '6px', 
            marginBottom: '20px',
            color: '#155724',
            fontSize: '14px'
          }}>
            ✅ {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '15px', 
            background: '#f8d7da', 
            border: '1px solid #f5c6cb', 
            borderRadius: '6px', 
            marginBottom: '20px',
            color: '#721c24',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box',
                transition: 'border-color 0.3s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s',
              marginBottom: '15px'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#2980b9';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#3498db';
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          {/* Back to Login */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#3498db',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'none',
                padding: '5px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              ← Back to Login
            </button>
          </div>
        </form>

        {/* Security Note */}
        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '6px',
          fontSize: '13px',
          color: '#6c757d',
          lineHeight: '1.6'
        }}>
          🔒 For security reasons, we'll send a password reset link to your email address. The link will expire in 1 hour.
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;


