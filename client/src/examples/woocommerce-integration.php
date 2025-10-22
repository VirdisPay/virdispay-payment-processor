<?php
/**
 * WooCommerce VirdisPay Integration
 * Add crypto payment option to WooCommerce checkout
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class VirdisPay_WooCommerce {
    
    public function __construct() {
        add_action('woocommerce_payment_gateways', array($this, 'add_virdispay_gateway'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('woocommerce_checkout_process', array($this, 'process_payment'));
    }
    
    /**
     * Add VirdisPay as a payment gateway
     */
    public function add_virdispay_gateway($gateways) {
        $gateways[] = 'WC_Gateway_VirdisPay';
        return $gateways;
    }
    
    /**
     * Enqueue VirdisPay SDK
     */
    public function enqueue_scripts() {
        if (is_checkout()) {
            wp_enqueue_script('virdispay-sdk', 'https://cdn.virdispay.com/sdk/VirdisPaySDK.js', array(), '1.0.0', true);
        }
    }
}

/**
 * VirdisPay Payment Gateway Class
 */
class WC_Gateway_VirdisPay extends WC_Payment_Gateway {
    
    public function __construct() {
        $this->id = 'virdispay';
        $this->icon = 'https://virdispay.com/logo.png';
        $this->has_fields = true;
        $this->method_title = 'VirdisPay Crypto';
        $this->method_description = 'Accept crypto payments with VirdisPay';
        
        $this->init_form_fields();
        $this->init_settings();
        
        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');
        $this->enabled = $this->get_option('enabled');
        $this->api_key = $this->get_option('api_key');
        $this->merchant_id = $this->get_option('merchant_id');
        
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_thankyou_' . $this->id, array($this, 'thankyou_page'));
    }
    
    /**
     * Initialize gateway settings form fields
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title' => 'Enable/Disable',
                'type' => 'checkbox',
                'label' => 'Enable VirdisPay',
                'default' => 'yes'
            ),
            'title' => array(
                'title' => 'Title',
                'type' => 'text',
                'description' => 'This controls the title which the user sees during checkout.',
                'default' => 'Pay with Crypto',
                'desc_tip' => true,
            ),
            'description' => array(
                'title' => 'Description',
                'type' => 'textarea',
                'description' => 'This controls the description which the user sees during checkout.',
                'default' => 'Pay securely with cryptocurrency using VirdisPay.',
            ),
            'api_key' => array(
                'title' => 'API Key',
                'type' => 'text',
                'description' => 'Your VirdisPay API key',
                'default' => '',
            ),
            'merchant_id' => array(
                'title' => 'Merchant ID',
                'type' => 'text',
                'description' => 'Your VirdisPay merchant ID',
                'default' => '',
            ),
        );
    }
    
    /**
     * Payment fields on checkout page
     */
    public function payment_fields() {
        if ($this->description) {
            echo wpautop(wptexturize($this->description));
        }
        
        // Get order total
        $order_total = WC()->cart->get_total('raw');
        
        // VirdisPay widget container
        echo '<div id="virdispay-checkout-widget"></div>';
        
        // JavaScript to initialize VirdisPay
        ?>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof VirdisPaySDK !== 'undefined') {
                const virdisPay = new VirdisPaySDK({
                    apiKey: '<?php echo esc_js($this->api_key); ?>',
                    merchantId: '<?php echo esc_js($this->merchant_id); ?>',
                    baseUrl: 'https://api.virdispay.com',
                    widgetUrl: 'https://checkout.virdispay.com'
                });
                
                virdisPay.init({
                    containerId: 'virdispay-checkout-widget',
                    amount: <?php echo $order_total; ?>,
                    currency: 'USDC',
                    orderId: 'wc-order-' + Date.now(),
                    customerEmail: '<?php echo esc_js(WC()->customer->get_email()); ?>',
                    onPaymentComplete: function(paymentId) {
                        // Set hidden field and submit form
                        document.getElementById('virdispay_payment_id').value = paymentId;
                        document.getElementById('place_order').click();
                    },
                    onPaymentError: function(error) {
                        alert('Payment failed: ' + error);
                    }
                });
            }
        });
        </script>
        
        <input type="hidden" id="virdispay_payment_id" name="virdispay_payment_id" value="">
        <?php
    }
    
    /**
     * Process the payment
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        
        // Get payment ID from form
        $payment_id = sanitize_text_field($_POST['virdispay_payment_id']);
        
        if (empty($payment_id)) {
            wc_add_notice('Payment ID is required', 'error');
            return array(
                'result' => 'fail',
                'redirect' => ''
            );
        }
        
        // Verify payment with VirdisPay API
        $payment_verified = $this->verify_payment($payment_id);
        
        if ($payment_verified) {
            // Mark order as paid
            $order->payment_complete($payment_id);
            $order->add_order_note('Payment completed via VirdisPay. Payment ID: ' . $payment_id);
            
            // Reduce stock levels
            wc_reduce_stock_levels($order_id);
            
            // Remove cart
            WC()->cart->empty_cart();
            
            // Return success
            return array(
                'result' => 'success',
                'redirect' => $this->get_return_url($order)
            );
        } else {
            wc_add_notice('Payment verification failed', 'error');
            return array(
                'result' => 'fail',
                'redirect' => ''
            );
        }
    }
    
    /**
     * Verify payment with VirdisPay API
     */
    private function verify_payment($payment_id) {
        $response = wp_remote_get('https://api.virdispay.com/api/payments/status/' . $payment_id, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key
            )
        ));
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        return isset($data['payment']['status']) && $data['payment']['status'] === 'completed';
    }
    
    /**
     * Thank you page
     */
    public function thankyou_page($order_id) {
        $order = wc_get_order($order_id);
        echo '<div class="virdispay-thankyou">';
        echo '<h3>✅ Payment Successful!</h3>';
        echo '<p>Your crypto payment has been processed successfully.</p>';
        echo '<p>Order ID: ' . $order->get_order_number() . '</p>';
        echo '</div>';
    }
}

// Initialize the integration
new VirdisPay_WooCommerce();

// Register the gateway
add_filter('woocommerce_payment_gateways', function($gateways) {
    $gateways[] = 'WC_Gateway_VirdisPay';
    return $gateways;
});
?>

