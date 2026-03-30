#!/usr/bin/env node
/**
 * AI购物会话密钥Demo - 整合版本
 * 一键启动API服务和交互界面
 */

const readline = require('readline');
const crypto = require('crypto');
const { ethers } = require('ethers');
const express = require('express');
require('dotenv').config({ path: '.env' });

// ============ 配置 ============
const CONFIG = {
    rpcUrl: process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    privateKey: process.env.PRIVATE_KEY,
    accountAddress: process.env.ACCOUNT_ADDRESS,
    merchantAddress: process.env.MERCHANT_ADDRESS || '0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb',
    chainId: parseInt(process.env.CHAIN_ID || '11155111')
};

// ============ 商品配置 ============
const PRODUCTS = [
    { id: 1, name: 'AI API Package', description: '1000次 GPT-4 API calls', price: '500000000000000', port: 3001 },
    { id: 2, name: 'Data Cleaning Service', description: 'Professional data cleaning', price: '1000000000000000', port: 3002 },
    { id: 3, name: 'Model Training Time', description: '24 hours GPU training', price: '1500000000000000', port: 3003 },
    { id: 4, name: 'Business Analysis Report', description: 'Professional analysis', price: '2000000000000000', port: 3004 },
    { id: 5, name: 'System Monitoring Service', description: '7 days 24/7 monitoring', price: '2500000000000000', port: 3005 },
    { id: 6, name: 'Expert Technical Consulting', description: '1 hour consulting', price: '3000000000000000', port: 3006 },
    { id: 7, name: 'API Documentation', description: 'Auto documentation', price: '3500000000000000', port: 3007 },
    { id: 8, name: 'Data Backup Service', description: '1TB backup service', price: '4000000000000000', port: 3008 }
];

// ============ 模块化账户ABI ============
const MODULAR_ACCOUNT_ABI = [
    "function grantSessionKey(address key, uint64 expiresAt, uint32 maxCalls, uint256 maxSpending, address allowedTarget) external",
    "function revokeSessionKey(address key) external",
    "function sessionKeys(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function payWithSessionKey(address sessionKey, address merchant, uint256 amount, bytes32 paymentId, bytes32 cartHash, bytes calldata signature) external",
    "function owner() view returns (address)",
    "function usedPayments(bytes32) view returns (bool)"
];

// ============ 会话密钥管理 ============
class SessionKeyManager {
    constructor() {
        this.sessionKeyPair = null;
        this.createdKeys = []; // 存储已创建的会话密钥列表
    }
    
    generateSessionKey() {
        const wallet = ethers.Wallet.createRandom();
        this.sessionKeyPair = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            wallet: wallet,
            createdAt: new Date().toISOString()
        };
        // 添加到已创建列表
        this.createdKeys.push(this.sessionKeyPair);
        return this.sessionKeyPair;
    }
    
    // 使用已有的会话密钥
    useExistingKey(address, privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        this.sessionKeyPair = {
            address: address,
            privateKey: privateKey,
            wallet: wallet
        };
        return this.sessionKeyPair;
    }
    
    async signMessage(messageHash) {
        if (!this.sessionKeyPair) {
            throw new Error('Session key not generated');
        }
        return await this.sessionKeyPair.wallet.signMessage(ethers.getBytes(messageHash));
    }
    
    // 获取已创建的会话密钥列表
    getCreatedKeys() {
        return this.createdKeys;
    }
}

// ============ API服务器 ============
const servers = [];

function createProductServer(product) {
    const app = express();
    app.use(express.json());

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
            merchant: CONFIG.merchantAddress
        });
    });

    app.post('/purchase', (req, res) => {
        const { sessionId } = req.body;
        const paymentId = '0x' + crypto.randomBytes(32).toString('hex');
        const cartHash = '0x' + crypto.randomBytes(32).toString('hex');

        res.status(402).json({
            status: 'payment_required',
            code: 402,
            message: `请支付 ${(parseInt(product.price) / 1e18).toFixed(6)} ETH`,
            cart: {
                items: [{ 
                    id: product.id, name: product.name, 
                    price: product.price, priceEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH'
                }],
                totalWei: product.price,
                totalEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                itemCount: 1
            },
            payment: {
                merchant: CONFIG.merchantAddress,
                amount: product.price,
                amountEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                paymentId, cartHash,
                sessionId: sessionId || 'unknown'
            }
        });
    });

    return app;
}

function createMainRouter() {
    const app = express();
    app.use(express.json());

    app.get('/api/products', (req, res) => {
        res.json({
            success: true,
            merchant: CONFIG.merchantAddress,
            products: PRODUCTS.map(p => ({
                id: p.id, name: p.name, description: p.description,
                price: p.price, priceEth: (parseInt(p.price) / 1e18).toFixed(6) + ' ETH',
                port: p.port, url: `http://localhost:${p.port}/`
            }))
        });
    });

    app.get('/api/status', (req, res) => {
        res.json({ success: true, status: 'running' });
    });

    return app;
}

function startApiServers() {
    return new Promise((resolve) => {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║          🚀 启动商品API服务...                              ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        
        // 主路由
        const mainApp = createMainRouter();
        const mainServer = mainApp.listen(3000, () => {
            console.log('   ✅ 主路由服务: 端口 3000');
        });
        servers.push(mainServer);

        // 商品服务
        PRODUCTS.forEach((product) => {
            const app = createProductServer(product);
            const server = app.listen(product.port, () => {
                console.log(`   ✅ ${product.name}: 端口 ${product.port}`);
            });
            servers.push(server);
        });

        setTimeout(() => {
            console.log('');
            console.log('════════════════════════════════════════════════════════════');
            console.log('   ✅ API服务已启动 (9个端口: 3000-3008)');
            console.log('════════════════════════════════════════════════════════════');
            resolve();
        }, 500);
    });
}

// ============ 交互界面 ============
async function main() {
    // 检查配置
    if (!CONFIG.privateKey || !CONFIG.accountAddress) {
        console.error('❌ 请先配置 .env 文件');
        process.exit(1);
    }

    // 启动API服务
    await startApiServers();

    // 初始化
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
    const account = new ethers.Contract(CONFIG.accountAddress, MODULAR_ACCOUNT_ABI, wallet);
    const sessionKeyManager = new SessionKeyManager();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    // 显示主菜单
    async function showMenu() {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║            🏪 AI购物会话密钥Demo                           ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║  1. 📦 查看商品目录                                         ║');
        console.log('║  2. 🛒 购买商品                                             ║');
        console.log('║  3. 💰 查询余额                                             ║');
        console.log('║  4. 🔑 查询会话密钥                                         ║');
        console.log('║  q. 🚪 退出                                                 ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    }

    // 查看所有商品
    async function viewAllProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            const data = await response.json();
            
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║                    📦 商品目录                              ║');
            console.log('╠════════════════════════════════════════════════════════════╣');
            
            for (const product of data.products) {
                console.log(`║  #${product.id} ${product.name.padEnd(20)} ${product.priceEth.padStart(10)}     ║`);
            }
            
            console.log('╚════════════════════════════════════════════════════════════╝');
        } catch (error) {
            console.error('❌ 获取商品失败:', error.message);
        }
    }

    // 购买商品
    async function purchaseProduct() {
        console.log('\n商品列表:');
        PRODUCTS.forEach(p => {
            console.log(`   ${p.id}. ${p.name} - ${(parseInt(p.price) / 1e18).toFixed(6)} ETH`);
        });
        
        const idInput = await question('\n请输入商品ID (1-8): ');
        const productId = parseInt(idInput);
        
        if (isNaN(productId) || productId < 1 || productId > 8) {
            console.log('❌ 无效商品ID');
            return;
        }

        const product = PRODUCTS.find(p => p.id === productId);
        const port = product.port;

        try {
            // 获取商品信息
            const infoResponse = await fetch(`http://localhost:${port}/`);
            const productData = await infoResponse.json();
            
            console.log('\n商品信息:');
            console.log(`   名称: ${productData.product.name}`);
            console.log(`   价格: ${productData.product.priceEth}`);
            
            const confirm = await question('\n确认购买? (y/n): ');
            if (confirm.toLowerCase() !== 'y') {
                console.log('已取消');
                return;
            }

            // 发起购买请求
            const purchaseResponse = await fetch(`http://localhost:${port}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const purchaseData = await purchaseResponse.json();

            // 询问用户选择会话密钥方式
            console.log('\n🔐 选择会话密钥方式:');
            console.log('   1. 使用已有的会话密钥');
            console.log('   2. 创建新的会话密钥');
            const keyChoice = await question('\n请选择 (1/2): ');
            
            let sessionKey, maxCalls, isNewKey = false;
            
            if (keyChoice.trim() === '1') {
                // 使用已有的会话密钥
                const createdKeys = sessionKeyManager.getCreatedKeys();
                
                if (createdKeys.length === 0) {
                    console.log('❌ 没有已创建的会话密钥，将创建新的');
                    isNewKey = true;
                } else {
                    // 显示已创建的会话密钥列表
                    console.log('\n📋 已创建的会话密钥:');
                    console.log('─'.repeat(60));
                    
                    for (let i = 0; i < createdKeys.length; i++) {
                        const key = createdKeys[i];
                        // 查询该密钥的状态
                        try {
                            const keyInfo = await account.getSessionKey(key.address);
                            const isActive = keyInfo.isActive;
                            const usedCalls = Number(keyInfo.usedCalls);
                            const maxCallsVal = Number(keyInfo.maxCalls);
                            const remaining = maxCallsVal - usedCalls;
                            
                            console.log(`   ${i + 1}. 地址: ${key.address}`);
                            console.log(`      状态: ${isActive ? '激活' : '未激活'} | 剩余次数: ${remaining}`);
                            console.log(`      创建时间: ${key.createdAt}`);
                        } catch (e) {
                            console.log(`   ${i + 1}. 地址: ${key.address}`);
                            console.log(`      状态: 无法查询`);
                        }
                        console.log('─'.repeat(60));
                    }
                    
                    const selectInput = await question('\n请输入要使用的会话密钥序号 (或输入 0 创建新的): ');
                    const selectIndex = parseInt(selectInput) - 1;
                    
                    if (selectIndex >= 0 && selectIndex < createdKeys.length) {
                        const selectedKey = createdKeys[selectIndex];
                        sessionKey = sessionKeyManager.useExistingKey(selectedKey.address, selectedKey.privateKey);
                        
                        // 查询该密钥的最大调用次数
                        const keyInfo = await account.getSessionKey(selectedKey.address);
                        maxCalls = Number(keyInfo.maxCalls);
                        
                        console.log(`\n✅ 已选择会话密钥: ${sessionKey.address}`);
                        console.log(`   最大调用次数: ${maxCalls}`);
                    } else {
                        console.log('将创建新的会话密钥');
                        isNewKey = true;
                    }
                }
            } else {
                isNewKey = true;
            }
            
            // 创建新的会话密钥
            if (isNewKey) {
                console.log('\n🔑 生成会话密钥...');
                console.log('─'.repeat(50));
                sessionKey = sessionKeyManager.generateSessionKey();
                console.log(`   地址: ${sessionKey.address}`);
                console.log(`   私钥: ${sessionKey.privateKey.substring(0, 20)}...`);
                console.log('   ⚠️  这是临时密钥，仅用于本次交易');
                console.log('─'.repeat(50));

                // 让用户输入最大调用次数
                const maxCallsInput = await question('\n请输入最大调用次数 (默认5): ');
                maxCalls = parseInt(maxCallsInput) || 5;
                
                if (maxCalls < 1 || maxCalls > 100) {
                    console.log('⚠️  调用次数超出范围，使用默认值 5');
                }
                maxCalls = (maxCalls >= 1 && maxCalls <= 100) ? maxCalls : 5;
            }
            const finalMaxCalls = (maxCalls >= 1 && maxCalls <= 100) ? maxCalls : 5;

            // 授权会话密钥 (只有新创建的才需要授权)
            if (isNewKey) {
                console.log('\n📝 授权会话密钥到智能账户...');
                console.log('─'.repeat(50));
                const expiresAt = Math.floor(Date.now() / 1000) + 3600;
                const maxSpending = BigInt(purchaseData.payment.amount) * 12n / 10n;
                
                console.log(`   有效期: 1小时`);
                console.log(`   最大调用次数: ${maxCalls}`);
                console.log(`   最大额度: ${ethers.formatEther(maxSpending)} ETH`);
                console.log('─'.repeat(50));

                const grantTx = await account.grantSessionKey(
                    sessionKey.address, expiresAt, maxCalls, maxSpending, ethers.ZeroAddress
                );
                console.log(`\n⏳ 授权交易: ${grantTx.hash}`);
                await grantTx.wait();
                console.log('✅ 授权成功！');
                console.log(`🔗 https://sepolia.etherscan.io/tx/${grantTx.hash}`);
            } else {
                console.log('\n✅ 使用已有的会话密钥，跳过授权步骤');
            }

            // 签名
            console.log('\n✍️  签名支付消息...');
            const messageHash = ethers.keccak256(
                ethers.solidityPacked(
                    ['address', 'address', 'uint256', 'bytes32', 'bytes32'],
                    [CONFIG.accountAddress, purchaseData.payment.merchant,
                     purchaseData.payment.amount, purchaseData.payment.paymentId,
                     purchaseData.payment.cartHash]
                )
            );
            const signature = await sessionKeyManager.signMessage(messageHash);
            console.log(`✅ 签名完成`);

            // 执行支付
            console.log('\n💸 执行链上支付...');
            console.log('─'.repeat(50));
            console.log(`   金额: ${purchaseData.payment.amountEth}`);
            console.log(`   商户: ${purchaseData.payment.merchant}`);
            console.log('─'.repeat(50));

            const payTx = await account.payWithSessionKey(
                sessionKey.address, purchaseData.payment.merchant,
                purchaseData.payment.amount, purchaseData.payment.paymentId,
                purchaseData.payment.cartHash, signature
            );

            console.log(`\n⏳ 支付交易: ${payTx.hash}`);
            console.log('   等待确认...');
            const receipt = await payTx.wait();

            if (receipt.status === 1) {
                console.log('\n');
                console.log('╔════════════════════════════════════════════════════════════╗');
                console.log('║                     ✅ 支付成功！                          ║');
                console.log('╚════════════════════════════════════════════════════════════╝');
                console.log(`   区块: ${receipt.blockNumber}`);
                console.log(`   Gas: ${receipt.gasUsed.toString()}`);
                console.log('');
                console.log('🔗 查看交易:');
                console.log(`   https://sepolia.etherscan.io/tx/${payTx.hash}`);
            } else {
                console.log('\n❌ 支付失败');
            }

        } catch (error) {
            console.error('❌ 错误:', error.message);
        }
    }

    // 查询余额
    async function checkBalance() {
        const userBalance = await provider.getBalance(wallet.address);
        const accountBalance = await provider.getBalance(CONFIG.accountAddress);
        const merchantBalance = await provider.getBalance(CONFIG.merchantAddress);

        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║                         💰 账户余额                                   ║');
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        console.log(`║  用户钱包:   ${ethers.formatEther(userBalance).padEnd(12)} ETH                      ║`);
        console.log(`║  地址:       ${wallet.address}                            ║`);
        console.log('╠──────────────────────────────────────────────────────────────────────╣');
        console.log(`║  智能账户:   ${ethers.formatEther(accountBalance).padEnd(12)} ETH                      ║`);
        console.log(`║  地址:       ${CONFIG.accountAddress}                            ║`);
        console.log('╠──────────────────────────────────────────────────────────────────────╣');
        console.log(`║  商户收款:   ${ethers.formatEther(merchantBalance).padEnd(12)} ETH                      ║`);
        console.log(`║  地址:       ${CONFIG.merchantAddress}                            ║`);
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
    }

    // 查询会话密钥
    async function querySessionKey() {
        const addressInput = await question('\n请输入会话密钥地址: ');
        const sessionKeyAddress = addressInput.trim();
        
        if (!ethers.isAddress(sessionKeyAddress)) {
            console.log('❌ 无效的地址格式');
            return;
        }

        try {
            const keyInfo = await account.getSessionKey(sessionKeyAddress);
            
            const isActive = keyInfo.isActive;
            const expiresAt = Number(keyInfo.expiresAt);
            const maxCalls = Number(keyInfo.maxCalls);
            const usedCalls = Number(keyInfo.usedCalls);
            const maxSpending = keyInfo.maxSpending;
            const usedSpending = keyInfo.usedSpending;
            const allowedTarget = keyInfo.allowedTarget;

            const now = Math.floor(Date.now() / 1000);
            const isExpired = now > expiresAt;
            const callsRemaining = maxCalls - usedCalls;
            const spendingRemaining = maxSpending - usedSpending;

            console.log('\n');
            console.log('╔══════════════════════════════════════════════════════════════════════╗');
            console.log('║                      🔑 会话密钥状态                                  ║');
            console.log('╠══════════════════════════════════════════════════════════════════════╣');
            console.log(`║  地址:       ${sessionKeyAddress}                            ║`);
            console.log('╠──────────────────────────────────────────────────────────────────────╣');
            console.log(`║  状态:       ${isActive ? '✅ 已激活' : '❌ 未激活'}                                         ║`);
            console.log(`║  过期时间:   ${new Date(expiresAt * 1000).toISOString()}`);
            console.log(`║  是否过期:   ${isExpired ? '❌ 已过期' : '✅ 未过期'}                                         ║`);
            console.log('╠──────────────────────────────────────────────────────────────────────╣');
            console.log(`║  调用次数:   ${usedCalls} / ${maxCalls} (剩余 ${callsRemaining} 次)                           ║`);
            console.log(`║  消费额度:   ${ethers.formatEther(usedSpending)} / ${ethers.formatEther(maxSpending)} ETH`);
            console.log(`║  剩余额度:   ${ethers.formatEther(spendingRemaining)} ETH`);
            console.log('╠──────────────────────────────────────────────────────────────────────╣');
            console.log(`║  目标限制:   ${allowedTarget === ethers.ZeroAddress ? '任意地址' : allowedTarget}`);
            console.log('╚══════════════════════════════════════════════════════════════════════╝');
            
            // 总结可用性
            const canUse = isActive && !isExpired && callsRemaining > 0 && spendingRemaining > 0n;
            console.log(`\n📊 可用性: ${canUse ? '✅ 可以使用' : '❌ 不可使用'}`);
            
            if (!canUse) {
                console.log('   原因:');
                if (!isActive) console.log('   • 未激活或已撤销');
                if (isExpired) console.log('   • 已过期');
                if (callsRemaining <= 0) console.log('   • 调用次数已用完');
                if (spendingRemaining <= 0n) console.log('   • 消费额度已用完');
            }

        } catch (error) {
            console.log('❌ 查询失败:', error.message);
        }
    }

    // 主循环
    while (true) {
        await showMenu();
        const choice = await question('请选择: ');

        switch (choice.trim()) {
            case '1':
                await viewAllProducts();
                break;
            case '2':
                await purchaseProduct();
                break;
            case '3':
                await checkBalance();
                break;
            case '4':
                await querySessionKey();
                break;
            case 'q':
                console.log('\n正在关闭服务...');
                servers.forEach(s => s.close());
                rl.close();
                process.exit(0);
            default:
                console.log('无效选择');
        }
    }
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭...');
    servers.forEach(s => s.close());
    process.exit(0);
});

main().catch(console.error);
