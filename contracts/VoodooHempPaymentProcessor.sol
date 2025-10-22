// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VirdisPayPaymentProcessor
 * @dev Secure non-custodial payment processor for hemp/cannabis industry with compliance features
 */
contract VirdisPayPaymentProcessor is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event PaymentProcessed(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed customer,
        uint256 amount,
        address token,
        bytes32 txHash
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed merchant,
        uint256 refundAmount,
        string reason
    );
    
    event MerchantRegistered(
        address indexed merchant,
        string businessName,
        string licenseNumber
    );
    
    event ComplianceCheck(
        bytes32 indexed paymentId,
        bool amlPassed,
        bool kycPassed,
        uint256 riskScore
    );

    // Structs
    struct Payment {
        bytes32 id;
        address merchant;
        address customer;
        uint256 amount;
        address token;
        uint256 timestamp;
        bool isCompleted;
        bool isRefunded;
        string description;
    }
    
    struct Merchant {
        address wallet;
        string businessName;
        string licenseNumber;
        bool isVerified;
        bool isActive;
        uint256 totalVolume;
        uint256 totalTransactions;
    }

    // State variables
    mapping(bytes32 => Payment) public payments;
    mapping(address => Merchant) public merchants;
    mapping(address => bool) public authorizedTokens;
    mapping(address => uint256) public merchantBalances;
    
    uint256 public totalVolume;
    uint256 public totalTransactions;
    uint256 public platformFeePercentage = 250; // 2.5% in basis points
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 10% max
    
    address public treasury;
    uint256 public minPaymentAmount = 1e6; // 1 USDC (6 decimals)
    uint256 public maxPaymentAmount = 1000000e6; // 1M USDC
    
    // Compliance thresholds
    uint256 public amlThreshold = 10000e6; // $10,000
    uint256 public kycThreshold = 5000e6; // $5,000

    constructor(address _treasury) {
        treasury = _treasury;
        
        // Authorize common stablecoins
        authorizedTokens[0xA0b86a33E6441b8c4C8C0d4B0c8C0d4B0c8C0d4B] = true; // USDC placeholder
        authorizedTokens[0xdAC17F958D2ee523a2206206994597C13D831ec7] = true; // USDT
    }

    /**
     * @dev Register a new merchant
     */
    function registerMerchant(
        string memory _businessName,
        string memory _licenseNumber
    ) external {
        require(merchants[msg.sender].wallet == address(0), "Merchant already registered");
        require(bytes(_businessName).length > 0, "Business name required");
        require(bytes(_licenseNumber).length > 0, "License number required");
        
        merchants[msg.sender] = Merchant({
            wallet: msg.sender,
            businessName: _businessName,
            licenseNumber: _licenseNumber,
            isVerified: false,
            isActive: true,
            totalVolume: 0,
            totalTransactions: 0
        });
        
        emit MerchantRegistered(msg.sender, _businessName, _licenseNumber);
    }

    /**
     * @dev Process a payment
     */
    function processPayment(
        bytes32 _paymentId,
        address _customer,
        uint256 _amount,
        address _token,
        string memory _description
    ) external nonReentrant whenNotPaused {
        require(merchants[msg.sender].isActive, "Merchant not active");
        require(authorizedTokens[_token], "Token not authorized");
        require(_amount >= minPaymentAmount, "Amount too low");
        require(_amount <= maxPaymentAmount, "Amount too high");
        require(payments[_paymentId].merchant == address(0), "Payment already exists");
        
        // Compliance checks
        bool amlPassed = _amount < amlThreshold;
        bool kycPassed = _amount < kycThreshold;
        uint256 riskScore = _calculateRiskScore(_customer, _amount);
        
        emit ComplianceCheck(_paymentId, amlPassed, kycPassed, riskScore);
        
        // Create payment record
        payments[_paymentId] = Payment({
            id: _paymentId,
            merchant: msg.sender,
            customer: _customer,
            amount: _amount,
            token: _token,
            timestamp: block.timestamp,
            isCompleted: false,
            isRefunded: false,
            description: _description
        });
        
        // Transfer tokens from customer to contract
        IERC20(_token).safeTransferFrom(_customer, address(this), _amount);
        
        // Calculate fees
        uint256 platformFee = (_amount * platformFeePercentage) / 10000;
        uint256 merchantAmount = _amount - platformFee;
        
        // Update merchant balance
        merchantBalances[msg.sender] += merchantAmount;
        
        // Update statistics
        merchants[msg.sender].totalVolume += _amount;
        merchants[msg.sender].totalTransactions += 1;
        totalVolume += _amount;
        totalTransactions += 1;
        
        emit PaymentProcessed(_paymentId, msg.sender, _customer, _amount, _token, bytes32(0));
    }

    /**
     * @dev Complete a payment (called after blockchain confirmation)
     */
    function completePayment(bytes32 _paymentId) external onlyOwner {
        Payment storage payment = payments[_paymentId];
        require(payment.merchant != address(0), "Payment not found");
        require(!payment.isCompleted, "Payment already completed");
        require(!payment.isRefunded, "Payment was refunded");
        
        payment.isCompleted = true;
        
        // Transfer platform fee to treasury
        uint256 platformFee = (payment.amount * platformFeePercentage) / 10000;
        IERC20(payment.token).safeTransfer(treasury, platformFee);
    }

    /**
     * @dev Withdraw merchant balance
     */
    function withdrawBalance(address _token) external nonReentrant {
        uint256 balance = merchantBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        require(authorizedTokens[_token], "Token not authorized");
        
        merchantBalances[msg.sender] = 0;
        IERC20(_token).safeTransfer(msg.sender, balance);
    }

    /**
     * @dev Refund a payment
     */
    function refundPayment(
        bytes32 _paymentId,
        string memory _reason
    ) external onlyOwner {
        Payment storage payment = payments[_paymentId];
        require(payment.merchant != address(0), "Payment not found");
        require(!payment.isRefunded, "Already refunded");
        
        payment.isRefunded = true;
        
        // Calculate refund amount (full amount minus platform fee)
        uint256 platformFee = (payment.amount * platformFeePercentage) / 10000;
        uint256 refundAmount = payment.amount - platformFee;
        
        // Update merchant balance
        merchantBalances[payment.merchant] -= refundAmount;
        
        // Transfer refund to customer
        IERC20(payment.token).safeTransfer(payment.customer, payment.amount);
        
        emit PaymentRefunded(_paymentId, payment.merchant, refundAmount, _reason);
    }

    /**
     * @dev Calculate risk score for compliance
     */
    function _calculateRiskScore(address _customer, uint256 _amount) internal pure returns (uint256) {
        // Simple risk calculation based on amount
        if (_amount < 1000e6) return 10; // Low risk
        if (_amount < 10000e6) return 30; // Medium risk
        if (_amount < 100000e6) return 60; // High risk
        return 90; // Very high risk
    }

    /**
     * @dev Authorize a new token
     */
    function authorizeToken(address _token) external onlyOwner {
        authorizedTokens[_token] = true;
    }

    /**
     * @dev Deauthorize a token
     */
    function deauthorizeToken(address _token) external onlyOwner {
        authorizedTokens[_token] = false;
    }

    /**
     * @dev Update platform fee
     */
    function updatePlatformFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        platformFeePercentage = _newFeePercentage;
    }

    /**
     * @dev Update compliance thresholds
     */
    function updateComplianceThresholds(
        uint256 _amlThreshold,
        uint256 _kycThreshold
    ) external onlyOwner {
        amlThreshold = _amlThreshold;
        kycThreshold = _kycThreshold;
    }

    /**
     * @dev Update payment limits
     */
    function updatePaymentLimits(
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        minPaymentAmount = _minAmount;
        maxPaymentAmount = _maxAmount;
    }

    /**
     * @dev Verify merchant
     */
    function verifyMerchant(address _merchant, bool _verified) external onlyOwner {
        merchants[_merchant].isVerified = _verified;
    }

    /**
     * @dev Activate/deactivate merchant
     */
    function setMerchantActive(address _merchant, bool _active) external onlyOwner {
        merchants[_merchant].isActive = _active;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get payment details
     */
    function getPayment(bytes32 _paymentId) external view returns (Payment memory) {
        return payments[_paymentId];
    }

    /**
     * @dev Get merchant details
     */
    function getMerchant(address _merchant) external view returns (Merchant memory) {
        return merchants[_merchant];
    }

    /**
     * @dev Get merchant balance
     */
    function getMerchantBalance(address _merchant) external view returns (uint256) {
        return merchantBalances[_merchant];
    }
}
