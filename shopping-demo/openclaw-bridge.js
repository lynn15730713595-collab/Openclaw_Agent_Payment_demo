#!/usr/bin/env node
/**
 * OpenClaw Bridge - 支持命令行参数调用
 * 用法:
 *   node openclaw-bridge.js start                    - 启动API服务
 *   node openclaw-bridge.js products                 - 获取商品列表
 *   node openclaw-bridge.js balance                  - 查询余额
 *   node openclaw-bridge.js keys                     - 列出会话密钥
 *   node openclaw-bridge.js key-query <address>      - 查询会话密钥状态
 *   node openclaw-bridge.js key-create [maxCalls] [maxSpending] - 创建会话密钥
 *   node openclaw-bridge.js key-delete <index>       - 删除会话密钥
 *   node openclaw-bridge.js purchase <productId>     - 发起购买请求
 *   node openclaw-bridge.js pay <productId> <keyIndex> - 执行支付
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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

// = ABI ============
const MODULAR_ACCOUNT_ABI = [
    "function grantSessionKey(address key, uint64 expiresAt, uint32 maxCalls, uint256 maxSpending, address allowedTarget) external",
    "function revokeSessionKey(address key) external",
    "function sessionKeys(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function payWithSessionKey(address sessionKey, address merchant, uint256 amount, bytes32 paymentId, bytes32 cartHash, bytes calldata signature) external",
    "function owner() view returns (address)",
    "function usedPayments(bytes32) view returns (bool)"
];

// ============ 工具函数 ============
const SESSION_KEYS_FILE = path.join(__dirname, 'session-keys.json');

function loadKeys() {
    try {
        if (fs.existsSync(SESSION_KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(SESSION_KEYS_FILE, 'utf8'));
        }
    } catch (error) {}
    return [];
}

function saveKeys(keys) {
    fs.writeFileSync(SESSION_KEYS_FILE, JSON.stringify(keys, null, 2));
}

function getProvider() {
    return new ethers.JsonRpcProvider(CONFIG.rpcUrl);
}

function getWallet() {
    return new ethers.Wallet(CONFIG.privateKey, getProvider());
}

function getAccount() {
    return new ethers.Contract(CONFIG.accountAddress, MODULAR_ACCOUNT_ABI, getWallet());
}

// ============ API服务 ============
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

async function startApiServers() {
    return new Promise((resolve) => {
        // 主路由
        const mainApp = createMainRouter();
        const mainServer = mainApp.listen(3000, () => {});
        servers.push(mainServer);

        // 商品服务
        PRODUCTS.forEach((product) => {
            const app = createProductServer(product);
            const server = app.listen(product.port, () => {});
            servers.push(server);
        });

        setTimeout(resolve, 500);
    });
}

// ============ 命令处理 ============

async function cmdStart() {
    await startApiServers();
    console.log(JSON.stringify({ success: true, message: 'API服务已启动 (端口 3000-3008)' }));
}

async function cmdProducts() {
    // 检查API服务是否运行
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        // 返回静态商品列表
        console.log(JSON.stringify({
            success: true,
            merchant: CONFIG.merchantAddress,
            products: PRODUCTS.map(p => ({
                id: p.id, name: p.name, description: p.description,
                price: p.price, priceEth: (parseInt(p.price) / 1e18).toFixed(6) + ' ETH',
                port: p.port
            }))
        }, null, 2));
    }
}

async function cmdBalance() {
    try {
        const provider = getProvider();
        const wallet = getWallet();
        
        const userBalance = await provider.getBalance(wallet.address);
        const accountBalance = await provider.getBalance(CONFIG.accountAddress);
        const merchantBalance = await provider.getBalance(CONFIG.merchantAddress);

        console.log(JSON.stringify({
            success: true,
            balances: {
                userWallet: {
                    address: wallet.address,
                    balance: ethers.formatEther(userBalance) + ' ETH'
                },
                smartAccount: {
                    address: CONFIG.accountAddress,
                    balance: ethers.formatEther(accountBalance) + ' ETH'
                },
                merchant: {
                    address: CONFIG.merchantAddress,
                    balance: ethers.formatEther(merchantBalance) + ' ETH'
                }
            }
        }, null, 2));
    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
    }
}

async function cmdKeys() {
    const keys = loadKeys();
    const account = getAccount();
    
    const result = [];
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
            const keyInfo = await account.sessionKeys(key.address);
            const remainingCalls = Number(keyInfo.maxCalls) - Number(keyInfo.usedCalls);
            const remainingSpending = keyInfo.maxSpending - keyInfo.usedSpending;
            
            result.push({
                index: i + 1,
                address: key.address,
                isActive: keyInfo.isActive,
                remainingCalls,
                remainingSpending: ethers.formatEther(remainingSpending) + ' ETH',
                createdAt: key.createdAt
            });
        } catch (e) {
            result.push({
                index: i + 1,
                address: key.address,
                isActive: false,
                error: '未授权或查询失败'
            });
        }
    }
    
    console.log(JSON.stringify({ success: true, keys: result }, null, 2));
}

async function cmdKeyQuery(address) {
    if (!address) {
        console.log(JSON.stringify({ success: false, error: '请提供会话密钥地址' }));
        return;
    }
    
    try {
        const account = getAccount();
        const keyInfo = await account.sessionKeys(address);
        
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now > Number(keyInfo.expiresAt);
        const remainingCalls = Number(keyInfo.maxCalls) - Number(keyInfo.usedCalls);
        const remainingSpending = keyInfo.maxSpending - keyInfo.usedSpending;
        
        console.log(JSON.stringify({
            success: true,
            key: {
                address,
                isActive: keyInfo.isActive,
                expiresAt: new Date(Number(keyInfo.expiresAt) * 1000).toISOString(),
                isExpired,
                usedCalls: Number(keyInfo.usedCalls),
                maxCalls: Number(keyInfo.maxCalls),
                remainingCalls,
                usedSpending: ethers.formatEther(keyInfo.usedSpending) + ' ETH',
                maxSpending: ethers.formatEther(keyInfo.maxSpending) + ' ETH',
                remainingSpending: ethers.formatEther(remainingSpending) + ' ETH',
                canUse: keyInfo.isActive && !isExpired && remainingCalls > 0 && remainingSpending > 0n
            }
        }, null, 2));
    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
    }
}

async function cmdKeyCreate(maxCalls = 5, maxSpendingEth = null) {
    try {
        const wallet = ethers.Wallet.createRandom();
        const keys = loadKeys();
        
        // 保存到本地
        keys.push({
            address: wallet.address,
            privateKey: wallet.privateKey,
            createdAt: new Date().toISOString()
        });
        saveKeys(keys);
        
        // 授权到合约
        const account = getAccount();
        const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1小时
        
        // 如果没有指定额度，使用默认值
        const maxSpending = maxSpendingEth 
            ? ethers.parseEther(maxSpendingEth)
            : ethers.parseEther('0.001');
        
        console.log('正在授权会话密钥...', wallet.address);
        
        const tx = await account.grantSessionKey(
            wallet.address, expiresAt, maxCalls, maxSpending, ethers.ZeroAddress
        );
        
        console.log(JSON.stringify({
            success: true,
            key: {
                address: wallet.address,
                privateKey: wallet.privateKey,
                maxCalls,
                maxSpending: ethers.formatEther(maxSpending) + ' ETH',
                expiresAt: new Date(expiresAt * 1000).toISOString()
            },
            txHash: tx.hash,
            explorer: `https://sepolia.etherscan.io/tx/${tx.hash}`
        }, null, 2));
        
        await tx.wait();
        console.log('\n授权成功!');
        
    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
    }
}

async function cmdKeyDelete(index) {
    const idx = parseInt(index) - 1;
    const keys = loadKeys();
    
    if (idx < 0 || idx >= keys.length) {
        console.log(JSON.stringify({ success: false, error: '无效的序号' }));
        return;
    }
    
    const keyToDelete = keys[idx];
    
    try {
        const account = getAccount();
        
        // 从合约撤销
        const keyInfo = await account.sessionKeys(keyToDelete.address);
        if (keyInfo.isActive) {
            const tx = await account.revokeSessionKey(keyToDelete.address);
            console.log(`撤销交易: ${tx.hash}`);
            await tx.wait();
        }
        
        // 从本地删除
        keys.splice(idx, 1);
        saveKeys(keys);
        
        console.log(JSON.stringify({
            success: true,
            message: '会话密钥已删除',
            deletedAddress: keyToDelete.address
        }));
    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
    }
}

async function cmdPurchase(productId) {
    const id = parseInt(productId);
    const product = PRODUCTS.find(p => p.id === id);
    
    if (!product) {
        console.log(JSON.stringify({ success: false, error: '无效的商品ID' }));
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:${product.port}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        // API服务未启动，返回模拟数据
        const paymentId = '0x' + crypto.randomBytes(32).toString('hex');
        const cartHash = '0x' + crypto.randomBytes(32).toString('hex');
        
        console.log(JSON.stringify({
            status: 'payment_required',
            code: 402,
            message: `请支付 ${(parseInt(product.price) / 1e18).toFixed(6)} ETH`,
            cart: {
                items: [{ id: product.id, name: product.name, price: product.price }],
                totalEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH'
            },
            payment: {
                merchant: CONFIG.merchantAddress,
                amount: product.price,
                amountEth: (parseInt(product.price) / 1e18).toFixed(6) + ' ETH',
                paymentId, cartHash
            }
        }, null, 2));
    }
}

async function cmdPay(productId, keyIndex) {
    const id = parseInt(productId);
    const idx = parseInt(keyIndex) - 1;
    
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) {
        console.log(JSON.stringify({ success: false, error: '无效的商品ID' }));
        return;
    }
    
    const keys = loadKeys();
    if (idx < 0 || idx >= keys.length) {
        console.log(JSON.stringify({ success: false, error: '无效的会话密钥序号' }));
        return;
    }
    
    const keyInfo = keys[idx];
    
    try {
        // 获取购买数据
        let purchaseData;
        try {
            const response = await fetch(`http://localhost:${product.port}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            purchaseData = await response.json();
        } catch (e) {
            // 模拟数据
            purchaseData = {
                payment: {
                    merchant: CONFIG.merchantAddress,
                    amount: product.price,
                    paymentId: '0x' + crypto.randomBytes(32).toString('hex'),
                    cartHash: '0x' + crypto.randomBytes(32).toString('hex')
                }
            };
        }
        
        // 签名
        const sessionWallet = new ethers.Wallet(keyInfo.privateKey);
        const messageHash = ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'address', 'uint256', 'bytes32', 'bytes32'],
                [CONFIG.accountAddress, purchaseData.payment.merchant,
                 purchaseData.payment.amount, purchaseData.payment.paymentId,
                 purchaseData.payment.cartHash]
            )
        );
        const signature = await sessionWallet.signMessage(ethers.getBytes(messageHash));
        
        // 执行支付
        const account = getAccount();
        const tx = await account.payWithSessionKey(
            keyInfo.address,
            purchaseData.payment.merchant,
            purchaseData.payment.amount,
            purchaseData.payment.paymentId,
            purchaseData.payment.cartHash,
            signature
        );
        
        console.log(JSON.stringify({
            success: true,
            payment: {
                amount: ethers.formatEther(purchaseData.payment.amount) + ' ETH',
                merchant: purchaseData.payment.merchant,
                sessionKey: keyInfo.address
            },
            txHash: tx.hash,
            explorer: `https://sepolia.etherscan.io/tx/${tx.hash}`
        }, null, 2));
        
        await tx.wait();
        console.log('\n支付成功!');
        
    } catch (error) {
        console.log(JSON.stringify({ success: false, error: error.message }));
    }
}

// ============ 主入口 ============
async function main() {
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    switch (command) {
        case 'start':
            await cmdStart();
            break;
        case 'products':
            await cmdProducts();
            break;
        case 'balance':
            await cmdBalance();
            break;
        case 'keys':
            await cmdKeys();
            break;
        case 'key-query':
            await cmdKeyQuery(arg1);
            break;
        case 'key-create':
            await cmdKeyCreate(arg1 ? parseInt(arg1) : 5, arg2);
            break;
        case 'key-delete':
            await cmdKeyDelete(arg1);
            break;
        case 'purchase':
            await cmdPurchase(arg1);
            break;
        case 'pay':
            await cmdPay(arg1, arg2);
            break;
        default:
            console.log('用法:');
            console.log('  node openclaw-bridge.js start                    - 启动API服务');
            console.log('  node openclaw-bridge.js products                 - 获取商品列表');
            console.log('  node openclaw-bridge.js balance                  - 查询余额');
            console.log('  node openclaw-bridge.js keys                     - 列出会话密钥');
            console.log('  node openclaw-bridge.js key-query <address>      - 查询会话密钥状态');
            console.log('  node openclaw-bridge.js key-create [calls] [eth] - 创建会话密钥');
            console.log('  node openclaw-bridge.js key-delete <index>       - 删除会话密钥');
            console.log('  node openclaw-bridge.js purchase <productId>     - 发起购买请求');
            console.log('  node openclaw-bridge.js pay <productId> <keyIdx> - 执行支付');
    }
}

main().catch(console.error);
