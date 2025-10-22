import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  merchants: {
    total: number;
    active: number;
    pendingVerification: number;
  };
  payments: {
    total: number;
    volume: number;
    averageSize: string;
    growth: string;
  };
  revenue: {
    platformFees: number;
    projectedMonthly: string;
  };
  compliance: {
    pendingKYC: number;
  };
}

interface Merchant {
  _id: string;
  email: string;
  businessName: string;
  businessType: string;
  kycStatus: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  stats: {
    totalPayments: number;
    totalVolume: number;
    platformFeesGenerated: number;
    lastPayment: string | null;
  };
}

interface KYCSubmission {
  _id: string;
  userId: {
    _id: string;
    email: string;
    businessName: string;
    businessType: string;
    country: string;
  };
  status: string;
  documents: any[];
  submittedAt: string;
  riskLevel: string;
  documentsSubmitted?: number;
  documentsVerified?: number;
  sanctionsScreening?: {
    checkedAt: Date;
    isMatch: boolean;
    matchDetails: any[];
    riskScore: number;
    requiresManualReview: boolean;
  };
}

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [pendingKYC, setPendingKYC] = useState<KYCSubmission[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedKYCIds, setSelectedKYCIds] = useState<string[]>([]);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([]);
  
  // Search & Filter States
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantFilter, setMerchantFilter] = useState({ businessType: '', kycStatus: '', verified: '' });
  const [kycSearch, setKycSearch] = useState('');
  const [kycFilter, setKycFilter] = useState({ riskLevel: '', status: '' });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Suspend/Unsuspend merchant
  const suspendMerchant = async (merchantId: string) => {
    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/merchants/${merchantId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Merchant account suspended');
        fetchMerchants(); // Refresh list
        setSelectedMerchant(null);
      } else {
        alert('❌ Failed to suspend merchant: ' + data.message);
      }
    } catch (error) {
      console.error('Error suspending merchant:', error);
      alert('❌ Error suspending merchant');
    }
  };

  const unsuspendMerchant = async (merchantId: string) => {
    if (!window.confirm('Are you sure you want to reactivate this merchant account?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/merchants/${merchantId}/unsuspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Merchant account reactivated');
        fetchMerchants(); // Refresh list
        setSelectedMerchant(null);
      } else {
        alert('❌ Failed to unsuspend merchant: ' + data.message);
      }
    } catch (error) {
      console.error('Error unsuspending merchant:', error);
      alert('❌ Error unsuspending merchant');
    }
  };

  // Approve KYC
  const approveKYC = async (kycId: string) => {
    const notes = prompt('Add approval notes (optional):');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/kyc/${kycId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: notes || 'Approved by admin' })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ KYC approved successfully!');
        fetchPendingKYC(); // Refresh KYC list
        fetchMerchants(); // Refresh merchant list to show updated status
      } else {
        alert('❌ Failed to approve KYC: ' + data.message);
      }
    } catch (error) {
      console.error('Error approving KYC:', error);
      alert('❌ Error approving KYC');
    }
  };

  // Reject KYC
  const rejectKYC = async (kycId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/kyc/${kycId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ KYC rejected');
        fetchPendingKYC(); // Refresh KYC list
        fetchMerchants(); // Refresh merchant list to show updated status
      } else {
        alert('❌ Failed to reject KYC: ' + data.message);
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      alert('❌ Error rejecting KYC');
    }
  };

  // Export to CSV function
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    // Convert data to CSV format
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    
    // Create CSV blob
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Download file
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMerchantsToCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/export/merchants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merchants-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('✅ Merchants exported successfully!');
      } else {
        alert('❌ Failed to export merchants');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export merchants');
    }
  };

  const exportKYCToCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/export/kyc`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kyc-submissions-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('✅ KYC data exported successfully!');
      } else {
        alert('❌ Failed to export KYC data');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export KYC data');
    }
  };

  // Bulk KYC approval
  const bulkApproveKYC = async () => {
    if (selectedKYCIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to approve ${selectedKYCIds.length} KYC submission(s)?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/admin/kyc/bulk-approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          kycIds: selectedKYCIds,
          notes: 'Bulk approved'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        setSelectedKYCIds([]);
        fetchPendingKYC();
        fetchMerchants();
      } else {
        alert('❌ Failed to bulk approve: ' + data.message);
      }
    } catch (error) {
      console.error('Bulk approval error:', error);
      alert('❌ Error during bulk approval');
    }
  };

  // Bulk email to merchants
  const bulkEmailMerchants = async () => {
    if (selectedMerchantIds.length === 0) {
      alert('Please select merchants first');
      return;
    }
    
    const subject = prompt('Email subject:');
    if (!subject) return;
    
    const message = prompt('Email message:');
    if (!message) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/bulk-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantIds: selectedMerchantIds,
          subject,
          message
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`✅ Email sent to ${selectedMerchantIds.length} merchant(s)`);
        setSelectedMerchantIds([]);
      } else {
        alert('❌ Failed to send emails: ' + data.message);
      }
    } catch (error) {
      console.error('Bulk email error:', error);
      alert('❌ Error sending bulk emails');
    }
  };

  // Toggle selection
  const toggleKYCSelection = (kycId: string) => {
    setSelectedKYCIds(prev => 
      prev.includes(kycId) ? prev.filter(id => id !== kycId) : [...prev, kycId]
    );
  };

  const toggleMerchantSelection = (merchantId: string) => {
    setSelectedMerchantIds(prev => 
      prev.includes(merchantId) ? prev.filter(id => id !== merchantId) : [...prev, merchantId]
    );
  };

  const selectAllKYC = () => {
    if (selectedKYCIds.length === filteredKYC.length) {
      setSelectedKYCIds([]);
    } else {
      setSelectedKYCIds(filteredKYC.map(k => k._id));
    }
  };

  const selectAllMerchants = () => {
    if (selectedMerchantIds.length === filteredMerchants.length) {
      setSelectedMerchantIds([]);
    } else {
      setSelectedMerchantIds(filteredMerchants.map(m => m._id));
    }
  };

  // Filter merchants based on search and filters
  const filteredMerchants = (merchants || []).filter(merchant => {
    const matchesSearch = !merchantSearch || 
      merchant.businessName.toLowerCase().includes(merchantSearch.toLowerCase()) ||
      merchant.email.toLowerCase().includes(merchantSearch.toLowerCase());
    
    const matchesType = !merchantFilter.businessType || merchant.businessType === merchantFilter.businessType;
    const matchesKYC = !merchantFilter.kycStatus || merchant.kycStatus === merchantFilter.kycStatus;
    const matchesVerified = !merchantFilter.verified || 
      (merchantFilter.verified === 'true' ? merchant.isVerified : !merchant.isVerified);
    
    return matchesSearch && matchesType && matchesKYC && matchesVerified;
  });

  // Filter KYC submissions based on search and filters
  const filteredKYC = (pendingKYC || []).filter(kyc => {
    const matchesSearch = !kycSearch ||
      kyc.userId.businessName.toLowerCase().includes(kycSearch.toLowerCase()) ||
      kyc.userId.email.toLowerCase().includes(kycSearch.toLowerCase());
    
    const matchesRisk = !kycFilter.riskLevel || kyc.riskLevel === kycFilter.riskLevel;
    const matchesStatus = !kycFilter.status || kyc.status === kycFilter.status;
    
    return matchesSearch && matchesRisk && matchesStatus;
  });

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'merchants') {
      fetchMerchants();
    } else if (activeTab === 'kyc') {
      fetchPendingKYC();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (activeTab === 'dashboard') {
        fetchDashboardStats();
      } else if (activeTab === 'merchants') {
        fetchMerchants();
      } else if (activeTab === 'kyc') {
        fetchPendingKYC();
      }
      checkForNewNotifications();
    }, 30000); // 30 seconds

    // Cleanup on unmount
    return () => clearInterval(refreshInterval);
  }, [activeTab]);

  // Check for notifications when data changes
  useEffect(() => {
    checkForNewNotifications();
  }, [pendingKYC, merchants]);

  const checkForNewNotifications = () => {
    // Generate notifications based on current data
    const newNotifications = [];
    
    // Check for new KYC submissions
    if (pendingKYC && pendingKYC.length > 0) {
      newNotifications.push({
        id: 'kyc-pending',
        type: 'kyc',
        priority: 'medium',
        title: `${pendingKYC.length} Pending KYC Review${pendingKYC.length > 1 ? 's' : ''}`,
        message: 'New merchants waiting for verification',
        timestamp: new Date(),
        read: false
      });
    }

    // Check for flagged KYC (sanctions matches)
    const flaggedKYC = pendingKYC ? pendingKYC.filter(k => k.sanctionsScreening?.isMatch) : [];
    if (flaggedKYC && flaggedKYC.length > 0) {
      newNotifications.push({
        id: 'kyc-flagged',
        type: 'alert',
        priority: 'high',
        title: '🚨 Sanctions Match Detected',
        message: `${flaggedKYC.length} merchant${flaggedKYC.length > 1 ? 's' : ''} flagged for sanctions screening`,
        timestamp: new Date(),
        read: false
      });
    }

    // Check for unverified merchants
    const unverifiedMerchants = merchants ? merchants.filter(m => !m.isVerified) : [];
    if (unverifiedMerchants && unverifiedMerchants.length > 3) {
      newNotifications.push({
        id: 'unverified-merchants',
        type: 'info',
        priority: 'low',
        title: `${unverifiedMerchants.length} Unverified Merchants`,
        message: 'Merchants awaiting verification',
        timestamp: new Date(),
        read: false
      });
    }

    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(notifications.filter(n => !n.read && n.id !== notificationId).length);
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/merchants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMerchants(data.merchants);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingKYC = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/kyc/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPendingKYC(data.kyc);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/audit-logs?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.logs);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // STYLES - All defined once, no CSS file needed
  const sidebarStyle: React.CSSProperties = {
    width: '280px',
    background: '#2c3e50',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0
  };

  const navButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '20px 24px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  };

  const activeNavButtonStyle: React.CSSProperties = {
    ...navButtonStyle,
    background: 'rgba(52, 152, 219, 0.2)',
    color: 'white',
    borderLeft: '4px solid #3498db'
  };

  const contentStyle: React.CSSProperties = {
    marginLeft: '280px',
    flex: 1,
    padding: '20px',
    width: 'calc(100% - 280px)',
    minHeight: '100vh',
    boxSizing: 'border-box',
    background: 'white'
  };

  // THIS IS THE KEY - ONE style used by ALL empty states
  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '100px 40px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const tabContainerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ textAlign: 'center' }}>
            <img src="/logo.png" alt="VirdisPay Admin" style={{ height: '60px', width: 'auto', maxWidth: '100%' }} />
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Admin Panel</p>
          </div>
          
          {/* Notification Bell */}
          <div style={{ position: 'relative', marginTop: '15px' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              🔔 Notifications
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#e74c3c',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '16px 0' }}>
          <button style={activeTab === 'dashboard' ? activeNavButtonStyle : navButtonStyle} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </button>
          <button style={activeTab === 'merchants' ? activeNavButtonStyle : navButtonStyle} onClick={() => setActiveTab('merchants')}>
            🏪 Merchants
          </button>
          <button style={activeTab === 'kyc' ? activeNavButtonStyle : navButtonStyle} onClick={() => setActiveTab('kyc')}>
            🛡️ KYC Review
          </button>
          <button style={activeTab === 'payments' ? activeNavButtonStyle : navButtonStyle} onClick={() => setActiveTab('payments')}>
            💳 Payments
          </button>
          <button style={activeTab === 'revenue' ? activeNavButtonStyle : navButtonStyle} onClick={() => setActiveTab('revenue')}>
            💰 Revenue
          </button>
          <button style={activeTab === 'audit' ? activeNavButtonStyle : navButtonStyle} onClick={() => setActiveTab('audit')}>
            📋 Audit Log
          </button>
        </nav>
        
        <div style={{ padding: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            <strong>Admin:</strong> {user?.email || 'admin@virdispay.com'}
          </p>
          <button 
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid rgba(231, 76, 60, 0.5)',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* NOTIFICATION PANEL */}
      {showNotifications && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '290px',
          width: '400px',
          maxHeight: '500px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#95a5a6'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => {
                    markNotificationAsRead(notification.id);
                    if (notification.type === 'kyc') setActiveTab('kyc');
                    if (notification.type === 'merchant') setActiveTab('merchants');
                    setShowNotifications(false);
                  }}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: notification.read ? 'white' : '#f8f9fa',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8f4f8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? 'white' : '#f8f9fa'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <strong style={{ 
                      fontSize: '14px', 
                      color: notification.priority === 'high' ? '#e74c3c' : '#2c3e50',
                      flex: 1
                    }}>
                      {notification.title}
                    </strong>
                    {!notification.read && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3498db',
                        marginLeft: '10px',
                        marginTop: '4px'
                      }} />
                    )}
                  </div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#666' }}>
                    {notification.message}
                  </p>
                  <small style={{ fontSize: '12px', color: '#95a5a6' }}>
                    {notification.timestamp.toLocaleTimeString()}
                  </small>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#95a5a6' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔕</div>
                <p style={{ margin: 0 }}>No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div style={contentStyle}>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={tabContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#2c3e50' }}>Admin Dashboard</h1>
              <div style={{ fontSize: '13px', color: '#95a5a6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔄 Auto-refresh: 30s</span>
                <span>•</span>
                <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
            {loading ? (
              <div style={emptyStateStyle}>Loading...</div>
            ) : stats ? (
              <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏪</div>
                  <h3 style={{ fontSize: '28px', margin: '0 0 5px 0' }}>{stats.merchants.total}</h3>
                  <p style={{ margin: 0, color: '#666' }}>Total Merchants</p>
                  <small style={{ color: '#999' }}>{stats.merchants.active} active</small>
                </div>
                
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>💳</div>
                  <h3 style={{ fontSize: '28px', margin: '0 0 5px 0' }}>{stats.payments.total}</h3>
                  <p style={{ margin: 0, color: '#666' }}>Total Payments</p>
                </div>
                
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>💰</div>
                  <h3 style={{ fontSize: '28px', margin: '0 0 5px 0' }}>${stats.payments.volume.toFixed(2)}</h3>
                  <p style={{ margin: 0, color: '#666' }}>Total Volume</p>
                </div>
                
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎯</div>
                  <h3 style={{ fontSize: '28px', margin: '0 0 5px 0' }}>${stats.revenue.platformFees.toFixed(2)}</h3>
                  <p style={{ margin: 0 }}>Platform Fees</p>
                </div>
              </div>

              {/* Analytics Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginTop: '30px' }}>
                
                {/* Revenue Chart */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50' }}>📊 Revenue Trend (Last 7 Days)</h3>
                  <div style={{ width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
                      <p style={{ margin: 0 }}>No revenue data yet</p>
                    </div>
                  </div>
                </div>

                {/* Merchant by Industry */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50' }}>🏢 Merchants by Industry</h3>
                  <div style={{ width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏢</div>
                      <p style={{ margin: 0 }}>No merchant data yet</p>
                    </div>
                  </div>
                </div>

                {/* Payment Activity */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50' }}>💳 Payment Activity (Last 7 Days)</h3>
                  <div style={{ width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>💳</div>
                      <p style={{ margin: 0 }}>No payment data yet</p>
                    </div>
                  </div>
                </div>

                {/* KYC Status Overview */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50' }}>✅ KYC Status Overview</h3>
                  <div style={{ width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#95a5a6' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                      <p style={{ margin: 0 }}>No KYC data yet</p>
                    </div>
                  </div>
                </div>

              </div>
              </>
            ) : (
              <div style={emptyStateStyle}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2c3e50' }}>No Data Available</h2>
              </div>
            )}
          </div>
        )}

        {/* MERCHANTS TAB */}
        {activeTab === 'merchants' && (
          <div style={tabContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#2c3e50' }}>Merchants</h1>
              <div style={{ fontSize: '13px', color: '#95a5a6' }}>
                🔄 Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
            
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Search by name or email..."
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
              
              <select
                value={merchantFilter.businessType}
                onChange={(e) => setMerchantFilter({...merchantFilter, businessType: e.target.value})}
                style={{
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Industries</option>
                <option value="cannabis">Cannabis</option>
                <option value="hemp">Hemp & CBD</option>
                <option value="vaping">Vaping</option>
                <option value="nutraceuticals">Nutraceuticals</option>
                <option value="adult">Adult Content</option>
                <option value="gambling">Gambling</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto Services</option>
              </select>
              
              <select
                value={merchantFilter.kycStatus}
                onChange={(e) => setMerchantFilter({...merchantFilter, kycStatus: e.target.value})}
                style={{
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All KYC Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={merchantFilter.verified}
                onChange={(e) => setMerchantFilter({...merchantFilter, verified: e.target.value})}
                style={{
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Verification</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
              
              {(merchantSearch || merchantFilter.businessType || merchantFilter.kycStatus || merchantFilter.verified) && (
                <button
                  onClick={() => {
                    setMerchantSearch('');
                    setMerchantFilter({ businessType: '', kycStatus: '', verified: '' });
                  }}
                  style={{
                    padding: '12px 20px',
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {selectedMerchant && (
              <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                background: 'rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 1000
              }} onClick={() => setSelectedMerchant(null)}>
                <div style={{ 
                  background: 'white', 
                  padding: '40px', 
                  borderRadius: '12px', 
                  maxWidth: '600px', 
                  width: '90%',
                  maxHeight: '80vh',
                  overflowY: 'auto'
                }} onClick={(e) => e.stopPropagation()}>
                  <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>{selectedMerchant.businessName}</h2>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Email:</strong> {selectedMerchant.email}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Business Type:</strong> {selectedMerchant.businessType}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>KYC Status:</strong> <span style={{ 
                      padding: '6px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      background: selectedMerchant.kycStatus === 'approved' ? '#d4edda' : '#fff3cd',
                      color: selectedMerchant.kycStatus === 'approved' ? '#155724' : '#856404'
                    }}>{selectedMerchant.kycStatus}</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Verified:</strong> {selectedMerchant.isVerified ? '✅ Yes' : '❌ No'}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Registered:</strong> {new Date(selectedMerchant.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Account Status:</strong> {selectedMerchant.isActive ? (
                      <span style={{ color: '#27ae60', fontWeight: '600' }}>✅ Active</span>
                    ) : (
                      <span style={{ color: '#e74c3c', fontWeight: '600' }}>🚫 Suspended</span>
                    )}
                  </div>
                  {!selectedMerchant.isActive && (selectedMerchant as any).suspensionReason && (
                    <div style={{ 
                      marginBottom: '15px', 
                      padding: '15px', 
                      background: '#fff3cd', 
                      borderLeft: '4px solid #ffc107',
                      borderRadius: '4px'
                    }}>
                      <strong style={{ color: '#856404' }}>Suspension Reason:</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#856404' }}>{(selectedMerchant as any).suspensionReason}</p>
                    </div>
                  )}
                  <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Payment Statistics</h3>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Total Payments:</strong> {selectedMerchant.stats.totalPayments}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Total Volume:</strong> ${selectedMerchant.stats.totalVolume.toFixed(2)}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Platform Fees Generated:</strong> ${selectedMerchant.stats.platformFeesGenerated.toFixed(2)}
                    </div>
                    {selectedMerchant.stats.lastPayment && (
                      <div>
                        <strong>Last Payment:</strong> {new Date(selectedMerchant.stats.lastPayment).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    {selectedMerchant.isActive ? (
                      <button 
                        onClick={() => suspendMerchant(selectedMerchant._id)}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}
                      >
                        🚫 Suspend Account
                      </button>
                    ) : (
                      <button 
                        onClick={() => unsuspendMerchant(selectedMerchant._id)}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          background: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}
                      >
                        ✅ Reactivate Account
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setSelectedMerchant(null)}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        background: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Showing {filteredMerchants.length} of {merchants?.length || 0} merchants
                {selectedMerchantIds.length > 0 && ` • ${selectedMerchantIds.length} selected`}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedMerchantIds.length > 0 && (
                  <button
                    onClick={bulkEmailMerchants}
                    style={{
                      padding: '10px 20px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    📧 Email Selected ({selectedMerchantIds.length})
                  </button>
                )}
                {filteredMerchants.length > 0 && (
                  <>
                    <button
                      onClick={selectAllMerchants}
                      style={{
                        padding: '10px 20px',
                        background: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {selectedMerchantIds.length === filteredMerchants.length ? '☐ Deselect All' : '☑ Select All'}
                    </button>
                    <button
                      onClick={exportMerchantsToCSV}
                      style={{
                        padding: '10px 20px',
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      📥 Export CSV
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {loading ? (
              <div style={emptyStateStyle}>Loading merchants...</div>
            ) : filteredMerchants.length > 0 ? (
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', width: '50px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedMerchantIds.length === filteredMerchants.length && filteredMerchants.length > 0}
                          onChange={selectAllMerchants}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Business</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>KYC Status</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Verified</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Payments</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.map(merchant => (
                      <tr key={merchant._id} style={{ 
                        borderBottom: '1px solid #eee',
                        background: merchant.isActive ? (selectedMerchantIds.includes(merchant._id) ? '#e8f4f8' : 'transparent') : '#fff3cd',
                        opacity: merchant.isActive ? 1 : 0.7
                      }}>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedMerchantIds.includes(merchant._id)}
                            onChange={() => toggleMerchantSelection(merchant._id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                        </td>
                        <td style={{ padding: '16px' }}>
                          {merchant.businessName}
                          {!merchant.isActive && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#856404' }}>🚫 SUSPENDED</span>}
                        </td>
                        <td style={{ padding: '16px' }}>{merchant.email}</td>
                        <td style={{ padding: '16px' }}>{merchant.businessType}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            background: merchant.kycStatus === 'approved' ? '#d4edda' : '#fff3cd',
                            color: merchant.kycStatus === 'approved' ? '#155724' : '#856404'
                          }}>
                            {merchant.kycStatus}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>{merchant.isVerified ? '✅' : '❌'}</td>
                        <td style={{ padding: '16px' }}>{merchant.stats.totalPayments}</td>
                        <td style={{ padding: '16px' }}>
                          <button 
                            onClick={() => setSelectedMerchant(merchant)}
                            style={{
                              padding: '8px 16px',
                              background: '#3498db',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={emptyStateStyle}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏪</div>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2c3e50' }}>No Merchants Yet</h2>
                <p style={{ margin: 0, fontSize: '18px', color: '#7f8c8d' }}>Merchants will appear here once they register</p>
              </div>
            )}
          </div>
        )}

        {/* KYC TAB */}
        {activeTab === 'kyc' && (
          <div style={tabContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#2c3e50' }}>KYC Review</h1>
              <div style={{ fontSize: '13px', color: '#95a5a6' }}>
                🔄 Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
            
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Search by business name or email..."
                value={kycSearch}
                onChange={(e) => setKycSearch(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
              
              <select
                value={kycFilter.riskLevel}
                onChange={(e) => setKycFilter({...kycFilter, riskLevel: e.target.value})}
                style={{
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
              
              <select
                value={kycFilter.status}
                onChange={(e) => setKycFilter({...kycFilter, status: e.target.value})}
                style={{
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="flagged">Flagged</option>
                <option value="under_review">Under Review</option>
              </select>
              
              {(kycSearch || kycFilter.riskLevel || kycFilter.status) && (
                <button
                  onClick={() => {
                    setKycSearch('');
                    setKycFilter({ riskLevel: '', status: '' });
                  }}
                  style={{
                    padding: '12px 20px',
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Showing {filteredKYC.length} of {pendingKYC?.length || 0} submissions
                {selectedKYCIds.length > 0 && ` • ${selectedKYCIds.length} selected`}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedKYCIds.length > 0 && (
                  <button
                    onClick={bulkApproveKYC}
                    style={{
                      padding: '10px 20px',
                      background: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ✅ Approve Selected ({selectedKYCIds.length})
                  </button>
                )}
                {filteredKYC.length > 0 && (
                  <>
                    <button
                      onClick={selectAllKYC}
                      style={{
                        padding: '10px 20px',
                        background: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {selectedKYCIds.length === filteredKYC.length ? '☐ Deselect All' : '☑ Select All'}
                    </button>
                    <button
                      onClick={exportKYCToCSV}
                      style={{
                        padding: '10px 20px',
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      📥 Export CSV
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {loading ? (
              <div style={emptyStateStyle}>Loading KYC submissions...</div>
            ) : filteredKYC.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredKYC.map(kyc => (
                  <div key={kyc._id} style={{ 
                    background: selectedKYCIds.includes(kyc._id) ? '#e8f4f8' : 'white', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                    cursor: 'pointer',
                    border: selectedKYCIds.includes(kyc._id) ? '2px solid #3498db' : '2px solid transparent',
                    position: 'relative'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedKYCIds.includes(kyc._id)}
                      onChange={() => toggleKYCSelection(kyc._id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        cursor: 'pointer',
                        width: '20px',
                        height: '20px'
                      }}
                    />
                    <h3 style={{ margin: '0 0 10px 0', paddingRight: '35px', fontSize: '20px', fontWeight: '700' }}>
                      {kyc.userId.businessName || 'Unknown Business'}
                    </h3>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      📧 <strong>Email:</strong> {kyc.userId.email}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      🏢 <strong>Type:</strong> {kyc.userId.businessType?.replace('_', ' ').toUpperCase() || 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      🌍 <strong>Country:</strong> {kyc.userId.country === 'GB' ? 'United Kingdom' : kyc.userId.country === 'US' ? 'United States' : kyc.userId.country}
                    </p>
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                      <strong>Risk:</strong> <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        background: kyc.riskLevel === 'high' ? '#f8d7da' : '#fff3cd',
                        color: kyc.riskLevel === 'high' ? '#721c24' : '#856404'
                      }}>{kyc.riskLevel}</span>
                    </p>
                    {kyc.sanctionsScreening && kyc.sanctionsScreening.isMatch && (
                      <div style={{ 
                        marginTop: '15px', 
                        padding: '12px', 
                        background: '#f8d7da', 
                        borderLeft: '4px solid #e74c3c',
                        borderRadius: '4px'
                      }}>
                        <strong style={{ color: '#721c24', fontSize: '13px' }}>⚠️ SANCTIONS MATCH</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#721c24' }}>
                          Immediate manual review required
                        </p>
                      </div>
                    )}
                    
                    {/* Document Count */}
                    <p style={{ margin: '15px 0 5px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Documents:</strong> {kyc.documentsSubmitted || 0} submitted, {kyc.documentsVerified || 0} verified
                    </p>
                    
                    {/* Document List */}
                    {kyc.documents && kyc.documents.length > 0 && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        background: '#f8f9fa', 
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <strong style={{ fontSize: '13px', color: '#555' }}>📎 Uploaded Documents:</strong>
                        {kyc.documents.map((doc: any, idx: number) => (
                          <div key={doc.id || idx} style={{ 
                            marginTop: '8px', 
                            padding: '8px', 
                            background: 'white', 
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                                {doc.type.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                                {doc.originalName}
                              </div>
                              <div style={{ color: '#999', fontSize: '11px', marginTop: '2px' }}>
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${API_URL}/api/admin/kyc/document/${doc.id}`, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                      // Clean up after a delay
                                      setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                    } else {
                                      const data = await response.json();
                                      alert(`❌ Failed to load document: ${data.message || 'Unknown error'}`);
                                    }
                                  } catch (error) {
                                    console.error('View document error:', error);
                                    alert('❌ Failed to load document');
                                  }
                                }}
                                style={{
                                  padding: '4px 10px',
                                  background: '#3498db',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}
                                title="View document"
                              >
                                👁️ View
                              </button>
                              {!doc.verified && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await fetch(`${API_URL}/api/admin/kyc/document/${doc.id}/verify`, {
                                        method: 'POST',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ verified: true, verificationScore: 100 })
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        alert('✅ Document verified!');
                                        await fetchPendingKYC();
                                      } else {
                                        alert('❌ Failed to verify document');
                                      }
                                    } catch (error) {
                                      console.error('Verify error:', error);
                                      alert('❌ Failed to verify document');
                                    }
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    background: '#27ae60',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                  }}
                                  title="Verify document"
                                >
                                  ✓ Verify
                                </button>
                              )}
                              <span style={{ 
                                padding: '3px 8px', 
                                borderRadius: '10px', 
                                fontSize: '11px',
                                fontWeight: '600',
                                background: doc.verified ? '#d4edda' : '#fff3cd',
                                color: doc.verified ? '#155724' : '#856404'
                              }}>
                                {doc.verified ? '✓ Verified' : '⏳ Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Submitted Date */}
                    <p style={{ margin: '10px 0 5px 0', fontSize: '13px', color: '#999' }}>
                      Submitted: {kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : 'Not submitted'}
                    </p>
                    
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          approveKYC(kyc._id);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          background: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#229954'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#27ae60'}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectKYC(kyc._id);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#c0392b'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#e74c3c'}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2c3e50' }}>No Pending KYC Reviews</h2>
                <p style={{ margin: 0, fontSize: '18px', color: '#7f8c8d' }}>All submissions have been processed</p>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div style={tabContainerStyle}>
            <h1 style={{ margin: '0 0 30px 0', fontSize: '32px', color: '#2c3e50' }}>All Payments</h1>
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>💳</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2c3e50' }}>No Payments Yet</h2>
              <p style={{ margin: 0, fontSize: '18px', color: '#7f8c8d' }}>Payment data will appear here once merchants start processing transactions</p>
            </div>
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <div style={tabContainerStyle}>
            <h1 style={{ margin: '0 0 30px 0', fontSize: '32px', color: '#2c3e50' }}>Platform Revenue</h1>
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>💰</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2c3e50' }}>No Revenue Yet</h2>
              <p style={{ margin: 0, fontSize: '18px', color: '#7f8c8d' }}>Platform fee analytics will appear here once payments are processed</p>
            </div>
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div style={tabContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#2c3e50' }}>Audit Log</h1>
              <div style={{ fontSize: '13px', color: '#95a5a6' }}>
                🔄 Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
            
            {loading ? (
              <div style={emptyStateStyle}>Loading audit logs...</div>
            ) : auditLogs.length > 0 ? (
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Timestamp</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Admin</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Action</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Target</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {log.adminEmail}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: log.action.includes('approved') ? '#d4edda' : 
                                       log.action.includes('rejected') || log.action.includes('suspended') ? '#f8d7da' : '#e8f4f8',
                            color: log.action.includes('approved') ? '#155724' :
                                   log.action.includes('rejected') || log.action.includes('suspended') ? '#721c24' : '#004085',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {log.action.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {log.targetName || log.targetEmail || log.targetId || '-'}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: log.severity === 'high' ? '#f8d7da' : 
                                       log.severity === 'medium' ? '#fff3cd' : '#d4edda',
                            color: log.severity === 'high' ? '#721c24' :
                                   log.severity === 'medium' ? '#856404' : '#155724'
                          }}>
                            {log.severity?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={emptyStateStyle}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2c3e50' }}>No Audit Logs Yet</h2>
                <p style={{ margin: 0, fontSize: '18px', color: '#7f8c8d' }}>Admin actions will be logged here for compliance tracking</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
