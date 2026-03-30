/**
 * 多端口商品API服务器
 * 每个商品运行在独立的端口上
 */

const express = require('express');
const crypto = require('require');

// 商品配置 (每个商品一个端口)
const PRODUCTS = [
    { id: 1, name: 'Premium Widget', price: '1000000000000000', port: 3001 },     // 0.001 ETH
    { id: 2, name: 'Gadget Pro', price: '2000000000000000', port: 3002 },         // 0.002 ETH
    { id: 3, name: 'Super Device', price: '3000000000000000', port: 3003 },       // 0.003 ETH
    { id: 4, name: 'Basic Widget', price: '500000000000000', port: 3004 },        // 0.0005 ETH
    { id: 5, name: 'Mega Gadget', price: '5000000000000000', port: 3005 },        // 0.005 ETH
    { id: 6, name: 'Mini Device', price: '1500000000000000', port: 3006 },        // 0.0015 ETH
    { id: 7, name: 'Ultra Widget', price: '2500000000000000', port: 3007 },       // 0.0025 ETH
    { id: 8, name: 'Pro Device', price: '4000000000000000', port: 3008 },         // 0.004 ETH
];

// 商户配置
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb';

// 存储所有服务实例
const servers = [];

/**
 * 为单个商品创建API服务
 */
function createProductServer(product) {
    const app = express();
    app.use(express.json());

    // 商品信息端点
    app.get('/', (req, res) => {
        res.json({
            success: true,
            product: {
                ...product,
                priceEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH'
            },
            merchant: MERCHANT_ADDRESS,
            endpoints: {
                info: `GET http://localhost:${product.port}/`,
                purchase: `POST http://localhost:${product.port}/purchase`
            }
        });
    });

    // 购买端点 - 返回402
    app.post('/purchase', (req, res) => {
        const { sessionId } = req.body;
        
        const paymentId = '0x' + crypto.randomBytes(32).toString('hex');
        const cartHash = '0x' + crypto.randomBytes(32).toString('hex');

        res.status(402).json({
            status: 'payment_required',
            code: 402,
            message: `请支付 ${product.priceEth} 以购买 ${product.name}`,
            cart: {
                items: [{ ...product, priceEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH' }],
                totalWei: product.price,
                totalEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                itemCount: 1
            },
            payment: {
                merchant: MERCHANT_ADDRESS,
                amount: product.price,
                amountEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                paymentId,
                cartHash,
                sessionId: sessionId || 'unknown'
            },
            timestamp: new Date().toISOString()
        });
    });

    // 健康检查
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', product: product.name, port: product.port });
    });

    return app;
}

/**
 * 创建主路由服务 (端口3000)
 */
function createMainRouter() {
    const app = express();
    app.use(express.json());

    // 商品目录
    app.get('/api/products', (req, res) => {
        res.json({
            success: true,
            merchant: MERCHANT_ADDRESS,
            products: PRODUCTS.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                priceEth: (parseInt(p.price) / 1e18).toFixed(6) + ' ETH',
                port: p.port,
                url: `http://localhost:${p.port}/`
            })),
            totalProducts: PRODUCTS.length
        });
    });

    // 搜索商品
    app.get('/api/products/search', (req, res) => {
        const { q } = req.query;
        const results = PRODUCTS.filter(p => 
            p.name.toLowerCase().includes((q || '').toLowerCase())
        ).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            priceEth: (parseInt(p.price) / 1e18).toFixed(6) + ' ETH',
            port: p.port,
            url: `http://localhost:${p.port}/`
        }));

        res.json({
            success: true,
            products: results,
            count: results.length
        });
    });

    // 根据商品ID获取端口信息
    app.get('/api/products/:id', (req, res) => {
        const product = PRODUCTS.find(p => p.id === parseInt(req.params.id));
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            product: {
                ...product,
                priceEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                url: `http://localhost:${product.port}/`
            }
        });
    });

    // 服务状态
    app.get('/api/status', (req, res) => {
        res.json({
            success: true,
            mainRouter: { port: 3000, status: 'running' },
            productServices: PRODUCTS.map(p => ({
                name: p.name,
                port: p.port,
                url: `http://localhost:${p.port}/`
            }))
        });
    });

    return app;
}

/**
 * 启动所有服务
 */
function startAllServers() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          🏪 多端口商品API服务启动                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // 启动主路由服务 (端口3000)
    const mainApp = createMainRouter();
    const mainServer = mainApp.listen(3000, () => {
        console.log('📡 主路由服务: http://localhost:3000');
        console.log('   ├── GET /api/products      - 获取所有商品');
        console.log('   ├── GET /api/products/:id  - 获取单个商品');
        console.log('   └── GET /api/status        - 服务状态');
        console.log('');
    });
    servers.push(mainServer);

    // 启动每个商品的API服务
    PRODUCTS.forEach((product, index) => {
        const app = createProductServer(product);
        const server = app.listen(product.port, () => {
            console.log(`📦 商品 #${product.id} "${product.name}"`);
            console.log(`   ├── 端口: ${product.port}`);
            console.log(`   ├── 价格: ${(parseInt(product.price) / 1e18).toFixed(6)} ETH`);
            console.log(`   ├── GET  http://localhost:${product.port}/`);
            console.log(`   └── POST http://localhost:${product.port}/purchase`);
            console.log('');
        });
        servers.push(server);
    });

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`✅ 已启动 ${PRODUCTS.length + 1} 个服务`);
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');
    console.log('💡 使用方式:');
    console.log('   1. 访问 http://localhost:3000/api/products 查看所有商品');
    console.log('   2. 访问 http://localhost:300X/ 查看单个商品详情');
    console.log('   3. POST http://localhost:300X/purchase 发起购买');
    console.log('');
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭所有服务...');
    servers.forEach(server => server.close());
    process.exit(0);
});

// 启动
startAllServers();
