import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
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
          <h2 style={{ margin: '10px 0 5px 0', fontSize: '24px', color: '#2c3e50' }}>Reset Your Password</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#7f8c8d' }}>Enter your new password below</p>
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
            <br />
            <small>Redirecting to login...</small>
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
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter new password"
              disabled={loading || !!message}
              minLength={8}
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
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>Must be at least 8 characters</small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              disabled={loading || !!message}
              minLength={8}
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
            disabled={loading || !!message}
            style={{
              width: '100%',
              padding: '14px',
              background: (loading || !!message) ? '#95a5a6' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (loading || !!message) ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s',
              marginBottom: '15px'
            }}
            onMouseEnter={(e) => {
              if (!loading && !message) e.currentTarget.style.background = '#229954';
            }}
            onMouseLeave={(e) => {
              if (!loading && !message) e.currentTarget.style.background = '#27ae60';
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          {/* Back to Login */}
          {!message && (
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
          )}
        </form>

        {/* Password Requirements */}
        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '6px',
          fontSize: '13px',
          color: '#6c757d',
          lineHeight: '1.6'
        }}>
          <strong>Password Requirements:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>At least 8 characters long</li>
            <li>Mix of letters and numbers recommended</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


