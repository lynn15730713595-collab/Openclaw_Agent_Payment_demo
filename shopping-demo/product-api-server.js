/**
 * 商品API服务器
 * 返回402状态码和购物车详情，模拟需要支付的场景
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// 商品数据
const PRODUCTS = {
    1: { id: 1, name: 'Premium Widget', price: '1000000000000000' },     // 0.001 ETH
    2: { id: 2, name: 'Gadget Pro', price: '2000000000000000' },         // 0.002 ETH
    3: { id: 3, name: 'Super Device', price: '3000000000000000' },       // 0.003 ETH
    4: { id: 4, name: 'Basic Widget', price: '500000000000000' },        // 0.0005 ETH
    5: { id: 5, name: 'Mega Gadget', price: '5000000000000000' },        // 0.005 ETH
    6: { id: 6, name: 'Mini Device', price: '1500000000000000' },        // 0.0015 ETH
    7: { id: 7, name: 'Ultra Widget', price: '2500000000000000' },       // 0.0025 ETH
    8: { id: 8, name: 'Pro Device', price: '4000000000000000' },         // 0.004 ETH
};

// 商户配置
const MERCHANT_CONFIG = {
    address: process.env.MERCHANT_ADDRESS || '0x1234567890123456789012345678901234567890',
    name: 'AI Shopping Demo Store'
};

// 获取所有商品
app.get('/api/products', (req, res) => {
    res.json({
        success: true,
        merchant: MERCHANT_CONFIG,
        products: Object.values(PRODUCTS)
    });
});

// 搜索商品
app.get('/api/products/search', (req, res) => {
    const { q } = req.query;
    const results = Object.values(PRODUCTS).filter(p => 
        p.name.toLowerCase().includes((q || '').toLowerCase())
    );
    res.json({
        success: true,
        merchant: MERCHANT_CONFIG,
        products: results
    });
});

// 购买商品 - 返回402 Payment Required
app.post('/api/purchase', (req, res) => {
    const { productIds, sessionId } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Invalid product IDs' });
    }
    
    // 构建购物车
    const cart = {
        cartId: crypto.randomUUID(),
        sessionId: sessionId || crypto.randomUUID(),
        merchant: MERCHANT_CONFIG,
        items: [],
        totalAmount: '0',
        totalWei: BigInt(0),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
    
    for (const id of productIds) {
        const product = PRODUCTS[id];
        if (product) {
            cart.items.push({
                productId: id,
                name: product.name,
                price: product.price,
                priceEth: (Number(product.price) / 1e18).toFixed(6) + ' ETH'
            });
            cart.totalWei += BigInt(product.price);
        }
    }
    
    cart.totalAmount = cart.totalWei.toString();
    cart.totalEth = (Number(cart.totalWei) / 1e18).toFixed(6) + ' ETH';
    cart.totalWei = cart.totalWei.toString(); // 转为字符串以便JSON序列化
    
    // 生成购物车哈希
    cart.cartHash = '0x' + crypto.createHash('sha256')
        .update(JSON.stringify({
            cartId: cart.cartId,
            merchant: cart.merchant.address,
            items: cart.items.map(i => ({ id: i.productId, price: i.price })),
            total: cart.totalAmount
        }))
        .digest('hex');
    
    // 返回402 Payment Required - 需要支付
    res.status(402).json({
        status: 402,
        message: 'Payment Required',
        error: 'PAYMENT_REQUIRED',
        cart: cart,
        authorization: {
            type: 'session_key_payment',
            required: true,
            contractAddress: process.env.ACCOUNT_ADDRESS,
            proxyAddress: process.env.PROXY_ADDRESS,
            merchantAddress: MERCHANT_CONFIG.address,
            instructions: {
                step1: 'Generate a session key pair',
                step2: 'Grant session key with spending limit',
                step3: 'Sign cart details with session key',
                step4: 'Execute payment via proxy contract'
            },
            paymentData: {
                merchant: MERCHANT_CONFIG.address,
                amount: cart.totalAmount,
                paymentId: cart.cartId,
                cartHash: cart.cartHash
            }
        }
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🛒 Product API Server running on port ${PORT}`);
    console.log(`📦 Merchant: ${MERCHANT_CONFIG.name}`);
    console.log(`📍 Merchant Address: ${MERCHANT_CONFIG.address}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /api/products        - List all products`);
    console.log(`  GET  /api/products/search?q=widget - Search products`);
    console.log(`  POST /api/purchase        - Purchase (returns 402)`);
});

module.exports = { app, PRODUCTS };
