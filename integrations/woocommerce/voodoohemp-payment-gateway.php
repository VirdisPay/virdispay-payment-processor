<?php
/**
 * Plugin Name: VoodooHemp Payment Gateway for WooCommerce
 * Plugin URI: https://voodoohemp.com
 * Description: Accept crypto payments with ultra-low gas fees (~$0.01) for your hemp/cannabis products
 * Version: 1.0.0
 * Author: VoodooHemp
 * Author URI: https://voodoohemp.com
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: voodoohemp-wc
 * Domain Path: /languages
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Check if WooCommerce is active
if (in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    
    add_action('plugins_loaded', 'voodoohemp_init_gateway');
    
    function voodoohemp_init_gateway() {
        
        class WC_Gateway_VoodooHemp extends WC_Payment_Gateway {
            
            /**
             * Constructor
             */
            public function __construct() {
                $this->id = 'voodoohemp';
                $this->icon = plugins_url('assets/voodoohemp-icon.png', __FILE__);
                $this->has_fields = false;
                $this->method_title = __('VoodooHemp Crypto Payments', 'voodoohemp-wc');
                $this->method_description = __('Accept cryptocurrency payments with ultra-low gas fees (~$0.01) on Polygon network. Perfect for hemp/cannabis businesses.', 'voodoohemp-wc');
                
                // Load the settings
                $this->init_form_fields();
                $this->init_settings();
                
                // Define user set variables
                $this->title = $this->get_option('title');
                $this->description = $this->get_option('description');
                $this->merchant_id = $this->get_option('merchant_id');
                $this->api_key = $this->get_option('api_key');
                $this->testmode = 'yes' === $this->get_option('testmode');
                $this->auto_complete = 'yes' === $this->get_option('auto_complete');
                
                // Actions
                add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
                add_action('woocommerce_api_wc_gateway_voodoohemp', array($this, 'webhook'));
                add_action('woocommerce_receipt_' . $this->id, array($this, 'receipt_page'));
            }
            
            /**
             * Initialize Gateway Settings Form Fields
             */
            public function init_form_fields() {
                $this->form_fields = array(
                    'enabled' => array(
                        'title' => __('Enable/Disable', 'voodoohemp-wc'),
                        'type' => 'checkbox',
                        'label' => __('Enable VoodooHemp Crypto Payments', 'voodoohemp-wc'),
                        'default' => 'yes'
                    ),
                    'title' => array(
                        'title' => __('Title', 'voodoohemp-wc'),
                        'type' => 'text',
                        'description' => __('Payment method title that customers see during checkout.', 'voodoohemp-wc'),
                        'default' => __('Pay with Cryptocurrency', 'voodoohemp-wc'),
                        'desc_tip' => true,
                    ),
                    'description' => array(
                        'title' => __('Description', 'voodoohemp-wc'),
                        'type' => 'textarea',
                        'description' => __('Payment method description that customers see during checkout.', 'voodoohemp-wc'),
                        'default' => __('Pay securely with cryptocurrency (USDC, USDT, DAI). Ultra-low transaction fees (~$0.01) on Polygon network.', 'voodoohemp-wc'),
                        'desc_tip' => true,
                    ),
                    'merchant_id' => array(
                        'title' => __('Merchant ID', 'voodoohemp-wc'),
                        'type' => 'text',
                        'description' => __('Get your Merchant ID from your VoodooHemp dashboard.', 'voodoohemp-wc'),
                        'default' => '',
                        'desc_tip' => true,
                    ),
                    'api_key' => array(
                        'title' => __('API Key', 'voodoohemp-wc'),
                        'type' => 'password',
                        'description' => __('Get your API Key from your VoodooHemp dashboard.', 'voodoohemp-wc'),
                        'default' => '',
                        'desc_tip' => true,
                    ),
                    'testmode' => array(
                        'title' => __('Test Mode', 'voodoohemp-wc'),
                        'type' => 'checkbox',
                        'label' => __('Enable Test Mode', 'voodoohemp-wc'),
                        'default' => 'yes',
                        'description' => __('Use Polygon Mumbai testnet for testing. Disable for production.', 'voodoohemp-wc'),
                    ),
                    'auto_complete' => array(
                        'title' => __('Auto Complete Orders', 'voodoohemp-wc'),
                        'type' => 'checkbox',
                        'label' => __('Automatically mark orders as completed when payment is confirmed', 'voodoohemp-wc'),
                        'default' => 'yes',
                        'description' => __('Orders will automatically be set to completed status when crypto payment is confirmed.', 'voodoohemp-wc'),
                    ),
                );
            }
            
            /**
             * Process the payment
             */
            public function process_payment($order_id) {
                $order = wc_get_order($order_id);
                
                // Create payment session with VoodooHemp API
                $payment_data = array(
                    'merchantId' => $this->merchant_id,
                    'amount' => $order->get_total(),
                    'currency' => $order->get_currency(),
                    'description' => 'Order #' . $order->get_order_number(),
                    'orderId' => $order_id,
                    'customerEmail' => $order->get_billing_email(),
                    'metadata' => array(
                        'order_number' => $order->get_order_number(),
                        'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                        'items' => $this->get_order_items($order)
                    )
                );
                
                $api_url = $this->testmode 
                    ? 'https://api-testnet.voodoohemp.com/api/payments/create-session'
                    : 'https://api.voodoohemp.com/api/payments/create-session';
                
                $response = wp_remote_post($api_url, array(
                    'headers' => array(
                        'Authorization' => 'Bearer ' . $this->api_key,
                        'Content-Type' => 'application/json',
                    ),
                    'body' => json_encode($payment_data),
                    'timeout' => 30,
                ));
                
                if (is_wp_error($response)) {
                    wc_add_notice(__('Payment error: Unable to connect to payment gateway. Please try again.', 'voodoohemp-wc'), 'error');
                    return array(
                        'result' => 'fail',
                        'redirect' => ''
                    );
                }
                
                $body = json_decode(wp_remote_retrieve_body($response), true);
                
                if (!isset($body['sessionId'])) {
                    wc_add_notice(__('Payment error: Invalid response from payment gateway.', 'voodoohemp-wc'), 'error');
                    return array(
                        'result' => 'fail',
                        'redirect' => ''
                    );
                }
                
                // Save session ID to order meta
                $order->update_meta_data('_voodoohemp_session_id', $body['sessionId']);
                $order->update_meta_data('_voodoohemp_payment_status', 'pending');
                $order->save();
                
                // Mark as pending payment
                $order->update_status('pending', __('Awaiting crypto payment.', 'voodoohemp-wc'));
                
                // Reduce stock levels
                wc_reduce_stock_levels($order_id);
                
                // Remove cart
                WC()->cart->empty_cart();
                
                // Redirect to payment page
                $payment_url = $this->testmode
                    ? 'https://pay-testnet.voodoohemp.com/payment/' . $body['sessionId']
                    : 'https://pay.voodoohemp.com/payment/' . $body['sessionId'];
                
                return array(
                    'result' => 'success',
                    'redirect' => $payment_url . '?return_url=' . urlencode($this->get_return_url($order))
                );
            }
            
            /**
             * Get order items for metadata
             */
            private function get_order_items($order) {
                $items = array();
                foreach ($order->get_items() as $item) {
                    $items[] = array(
                        'name' => $item->get_name(),
                        'quantity' => $item->get_quantity(),
                        'price' => $item->get_total()
                    );
                }
                return $items;
            }
            
            /**
             * Webhook handler
             */
            public function webhook() {
                $raw_body = file_get_contents('php://input');
                $data = json_decode($raw_body, true);
                
                // Verify webhook signature (implement signature verification)
                
                if (isset($data['type']) && $data['type'] === 'payment.completed') {
                    $order_id = $data['data']['orderId'];
                    $transaction_id = $data['data']['transactionId'];
                    $amount = $data['data']['amount'];
                    
                    $order = wc_get_order($order_id);
                    
                    if ($order) {
                        // Verify amount matches
                        if (floatval($amount) === floatval($order->get_total())) {
                            // Mark payment complete
                            $order->payment_complete($transaction_id);
                            $order->add_order_note(sprintf(
                                __('VoodooHemp payment completed. Transaction ID: %s. Gas fee: ~$0.01', 'voodoohemp-wc'),
                                $transaction_id
                            ));
                            
                            // Auto complete order if enabled
                            if ($this->auto_complete) {
                                $order->update_status('completed');
                            }
                            
                            $order->update_meta_data('_voodoohemp_transaction_id', $transaction_id);
                            $order->update_meta_data('_voodoohemp_payment_status', 'completed');
                            $order->save();
                        }
                    }
                }
                
                status_header(200);
                die();
            }
        }
        
        /**
         * Add the gateway to WooCommerce
         */
        function add_voodoohemp_gateway($methods) {
            $methods[] = 'WC_Gateway_VoodooHemp';
            return $methods;
        }
        add_filter('woocommerce_payment_gateways', 'add_voodoohemp_gateway');
    }
    
    /**
     * Add settings link to plugin page
     */
    function voodoohemp_plugin_links($links) {
        $settings_link = '<a href="admin.php?page=wc-settings&tab=checkout&section=voodoohemp">' . __('Settings', 'voodoohemp-wc') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'voodoohemp_plugin_links');
    
    /**
     * Display admin notice if WooCommerce is not active
     */
} else {
    add_action('admin_notices', 'voodoohemp_wc_missing_notice');
    
    function voodoohemp_wc_missing_notice() {
        echo '<div class="error"><p>';
        echo sprintf(
            __('VoodooHemp Payment Gateway requires WooCommerce to be installed and active. You can download %s here.', 'voodoohemp-wc'),
            '<a href="https://woocommerce.com/" target="_blank">WooCommerce</a>'
        );
        echo '</p></div>';
    }
}



