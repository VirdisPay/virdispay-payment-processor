import React, { useState } from 'react';

interface RegisterFormProps {
  onRegister: (user: any, token: string) => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    businessName: '',
    businessType: 'hemp',
    country: 'GB', // Default to UK for CBD market
    state: '',
    licenseNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [licenseRequired, setLicenseRequired] = useState(false); // Default false: UK + hemp doesn't require license

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Check if license is required based on country and business type
    // UK: No licenses needed for CBD/hemp
    // US: Hemp is federally legal, no licenses needed for CBD/hemp
    if (name === 'country' || name === 'businessType') {
      const newFormData = { ...formData, [name]: value };
      // Only require licenses for cannabis in US/CA, not for hemp/CBD
      const requiresLicense = ['US', 'CA'].includes(newFormData.country) && 
                             newFormData.businessType === 'cannabis';
      setLicenseRequired(requiresLicense);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // VALIDATION: Block cannabis in UK (illegal)
    if (formData.country === 'GB' && formData.businessType === 'cannabis') {
      setError('⚠️ Cannabis is illegal in the UK. Please select "Hemp" or "CBD" for UK-based businesses.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              firstName: formData.firstName,
              lastName: formData.lastName,
              businessName: formData.businessName,
              businessType: formData.businessType,
              country: formData.country,
              state: formData.state || undefined,
              licenseNumber: formData.licenseNumber || undefined
            })
      });

      const data = await response.json();

      if (response.ok) {
        onRegister(data.user, data.token);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
            <div className="auth-header">
              <h2>Join VirdisPay</h2>
              <p>Create your merchant account</p>
            </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="First name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm password"
                minLength={8}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="businessName">Business Name</label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
              placeholder="Your business name"
            />
          </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  >
                    <option value="GB">🇬🇧 United Kingdom (CBD Market)</option>
                    <option value="US">🇺🇸 United States (Hemp Market)</option>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="DE">🇩🇪 Germany</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="ES">🇪🇸 Spain</option>
                    <option value="IT">🇮🇹 Italy</option>
                    <option value="NL">🇳🇱 Netherlands</option>
                    <option value="AU">🇦🇺 Australia</option>
                    <option value="NZ">🇳🇿 New Zealand</option>
                    <option value="MX">🇲🇽 Mexico</option>
                    <option value="OTHER">🌍 Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="businessType">Business Type</label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    required
                  >
                    <optgroup label="Cannabis & Hemp">
                      <option value="cannabis">Cannabis (Licensed - US/Canada Only)</option>
                      <option value="cbd">CBD Products</option>
                      <option value="hemp">Hemp Products</option>
                    </optgroup>
                    <optgroup label="Other High-Risk Industries">
                      <option value="vaping">Vaping & E-Liquids</option>
                      <option value="nutraceuticals">Nutraceuticals & Supplements</option>
                      <option value="adult">Adult Content</option>
                      <option value="gambling">Gaming & Gambling</option>
                      <option value="forex">Forex & Trading</option>
                      <option value="crypto">Crypto Services</option>
                      <option value="other">Other High-Risk Industry</option>
                    </optgroup>
                  </select>
                  {formData.country === 'GB' && formData.businessType === 'cannabis' && (
                    <small style={{color: '#c33', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', fontWeight: 600}}>
                      ⚠️ Cannabis is illegal in the UK. Select "Hemp" or "CBD" for UK businesses.
                    </small>
                  )}
                  {formData.country === 'GB' && (
                    <small style={{color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block'}}>
                      💡 UK merchants: Choose "Hemp" or "CBD" (both are legal in UK)
                    </small>
                  )}
                </div>
              </div>

              {formData.country === 'US' && (
                <div className="form-group">
                  <label htmlFor="state">US State</label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select State</option>
                    <option value="AL">Alabama</option>
                    <option value="AK">Alaska</option>
                    <option value="AZ">Arizona</option>
                    <option value="AR">Arkansas</option>
                    <option value="CA">California</option>
                    <option value="CO">Colorado</option>
                    <option value="CT">Connecticut</option>
                    <option value="DE">Delaware</option>
                    <option value="FL">Florida</option>
                    <option value="GA">Georgia</option>
                    <option value="HI">Hawaii</option>
                    <option value="ID">Idaho</option>
                    <option value="IL">Illinois</option>
                    <option value="IN">Indiana</option>
                    <option value="IA">Iowa</option>
                    <option value="KS">Kansas</option>
                    <option value="KY">Kentucky</option>
                    <option value="LA">Louisiana</option>
                    <option value="ME">Maine</option>
                    <option value="MD">Maryland</option>
                    <option value="MA">Massachusetts</option>
                    <option value="MI">Michigan</option>
                    <option value="MN">Minnesota</option>
                    <option value="MS">Mississippi</option>
                    <option value="MO">Missouri</option>
                    <option value="MT">Montana</option>
                    <option value="NE">Nebraska</option>
                    <option value="NV">Nevada</option>
                    <option value="NH">New Hampshire</option>
                    <option value="NJ">New Jersey</option>
                    <option value="NM">New Mexico</option>
                    <option value="NY">New York</option>
                    <option value="NC">North Carolina</option>
                    <option value="ND">North Dakota</option>
                    <option value="OH">Ohio</option>
                    <option value="OK">Oklahoma</option>
                    <option value="OR">Oregon</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="RI">Rhode Island</option>
                    <option value="SC">South Carolina</option>
                    <option value="SD">South Dakota</option>
                    <option value="TN">Tennessee</option>
                    <option value="TX">Texas</option>
                    <option value="UT">Utah</option>
                    <option value="VT">Vermont</option>
                    <option value="VA">Virginia</option>
                    <option value="WA">Washington</option>
                    <option value="WV">West Virginia</option>
                    <option value="WI">Wisconsin</option>
                    <option value="WY">Wyoming</option>
                  </select>
                </div>
              )}

          <div className="form-group">
            <label htmlFor="licenseNumber">
              License Number 
              {!licenseRequired && <span style={{color: '#6b7280', fontSize: '14px', fontWeight: 'normal'}}> (Optional)</span>}
              {licenseRequired && <span style={{color: '#ef4444', fontSize: '14px'}}> *</span>}
            </label>
            <input
              type="text"
              id="licenseNumber"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              required={licenseRequired}
              placeholder={licenseRequired ? "Business license number (required)" : "Business license number (optional)"}
            />
                {!licenseRequired && (
                  <small style={{color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                    💡 No license required for CBD/hemp businesses in UK/US. Leave blank if not applicable.
                  </small>
                )}
                {licenseRequired && (
                  <small style={{color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                    ⚠️ Required for cannabis businesses in US/Canada only
                  </small>
                )}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <button type="button" onClick={onSwitchToLogin} className="link-button">Sign in</button></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
