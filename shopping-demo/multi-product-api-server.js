/**
 * 多端口商品API服务器
 * 每个商品运行在独立的端口上
 */

const express = require('express');
const crypto = require('crypto');

// 商品配置 (来自 ai-agent-payment-demo 项目)
const PRODUCTS = [
    { 
        id: 1, 
        name: 'AI API Package', 
        description: '1000次 GPT-4 API calls',
        price: '500000000000000',  // 0.0005 ETH
        port: 3001
    },
    { 
        id: 2, 
        name: 'Data Cleaning Service', 
        description: 'Professional data cleaning for 10GB',
        price: '1000000000000000',  // 0.001 ETH
        port: 3002
    },
    { 
        id: 3, 
        name: 'Model Training Time', 
        description: '24 hours GPU training time',
        price: '1500000000000000',  // 0.0015 ETH
        port: 3003
    },
    { 
        id: 4, 
        name: 'Business Analysis Report', 
        description: 'Professional business analysis',
        price: '2000000000000000',  // 0.002 ETH
        port: 3004
    },
    { 
        id: 5, 
        name: 'System Monitoring Service', 
        description: '7 days 24/7 monitoring',
        price: '2500000000000000',  // 0.0025 ETH
        port: 3005
    },
    { 
        id: 6, 
        name: 'Expert Technical Consulting', 
        description: '1 hour expert consulting',
        price: '3000000000000000',  // 0.003 ETH
        port: 3006
    },
    { 
        id: 7, 
        name: 'API Documentation', 
        description: 'Auto API documentation generation',
        price: '3500000000000000',  // 0.0035 ETH
        port: 3007
    },
    { 
        id: 8, 
        name: 'Data Backup Service', 
        description: '1TB enterprise backup service',
        price: '4000000000000000',  // 0.004 ETH
        port: 3008
    }
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
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                priceEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                port: product.port
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
            message: `请支付 ${(parseInt(product.price) / 1e18).toFixed(6)} ETH 以购买 ${product.name}`,
            cart: {
                items: [{ 
                    id: product.id,
                    name: product.name, 
                    description: product.description,
                    price: product.price, 
                    priceEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH'
                }],
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
                description: p.description,
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
        let results = PRODUCTS;
        
        if (q) {
            results = results.filter(p => 
                p.name.toLowerCase().includes(q.toLowerCase()) ||
                p.description.toLowerCase().includes(q.toLowerCase())
            );
        }
        
        res.json({
            success: true,
            products: results.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                priceEth: (parseInt(p.price) / 1e18).toFixed(6) + ' ETH',
                port: p.port,
                url: `http://localhost:${p.port}/`
            })),
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
                id: p.id,
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
    console.log('║          Multi-Port Product API Server                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // 启动主路由服务 (端口3000)
    const mainApp = createMainRouter();
    const mainServer = mainApp.listen(3000, () => {
        console.log('📡 主路由服务 (Main Router): http://localhost:3000');
        console.log('   ├── GET /api/products      - 获取所有商品');
        console.log('   ├── GET /api/products/:id  - 获取单个商品');
        console.log('   ├── GET /api/categories    - 获取分类列表');
        console.log('   ├── GET /api/products/search?q=xxx&category=xxx - 搜索');
        console.log('   └── GET /api/status        - 服务状态');
        console.log('');
    });
    servers.push(mainServer);

    // 启动每个商品的API服务
    PRODUCTS.forEach((product, index) => {
        const app = createProductServer(product);
        const server = app.listen(product.port, () => {
            console.log(`📦 商品 #${product.id}: ${product.name}`);
            console.log(`   ├── 端口: ${product.port}`);
            console.log(`   ├── 价格: ${(parseInt(product.price) / 1e18).toFixed(6)} ETH`);
            console.log(`   ├── GET  http://localhost:${product.port}/`);
            console.log(`   └── POST http://localhost:${product.port}/purchase`);
            console.log('');
        });
        servers.push(server);
    });

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`✅ 已启动 ${PRODUCTS.length + 1} 个服务 (1主路由 + ${PRODUCTS.length}商品)`);
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');
    console.log('💡 使用方式:');
    console.log('   1. 访问 http://localhost:3000/api/products 查看所有商品');
    console.log('   2. 访问 http://localhost:300X/ 查看单个商品详情');
    console.log('   3. POST http://localhost:300X/purchase 发起购买');
    console.log('');
    console.log('📋 商品列表:');
    console.log('   端口  商品名称                          价格');
    console.log('   ────  ────────────────────────────────  ──────────');
    PRODUCTS.forEach(p => {
        console.log(`   ${p.port}  ${p.name.padEnd(32)}  ${(parseInt(p.price) / 1e18).toFixed(6)} ETH`);
    });
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
