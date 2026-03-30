#!/usr/bin/env node
/**
 * AI购物会话密钥Demo - 多端口版本
 * 每个商品有独立的API端口
 */

const readline = require('readline');
const crypto = require('crypto');
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env' });

// ============ 配置 ============
const CONFIG = {
    rpcUrl: process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    privateKey: process.env.PRIVATE_KEY,
    accountAddress: process.env.ACCOUNT_ADDRESS,
    merchantAddress: process.env.MERCHANT_ADDRESS || '0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb',
    mainApiUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    chainId: parseInt(process.env.CHAIN_ID || '11155111')
};

// ============ 模块化账户ABI ============
const MODULAR_ACCOUNT_ABI = [
    "function grantSessionKey(address key, uint64 expiresAt, uint32 maxCalls, uint256 maxSpending, address allowedTarget) external",
    "function revokeSessionKey(address key) external",
    "function sessionKeys(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function getSessionKey(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function getRemainingLimit(address) view returns (uint256)",
    "function isSessionKeyValid(address) view returns (bool)",
    "function payWithSessionKey(address sessionKey, address merchant, uint256 amount, bytes32 paymentId, bytes32 cartHash, bytes calldata signature) external",
    "function execute(address target, uint256 value, bytes data) external returns (bytes)",
    "function withdraw(uint256 amount) external",
    "function owner() view returns (address)",
    "function usedPayments(bytes32) view returns (bool)"
];

// ============ 会话密钥管理 ============
class SessionKeyManager {
    constructor() {
        this.sessionKeyPair = null;
    }
    
    generateSessionKey() {
        const wallet = ethers.Wallet.createRandom();
        this.sessionKeyPair = {
            address: wallet.address,
            privateKey: wallet.privateKey,
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
}

// ============ 购物车格式化 ============
function formatCartCard(cart, productPort) {
    const width = 60;
    const line = '═'.repeat(width);
    
    let output = '\n';
    output += '╔' + line + '╗\n';
    output += '║' + centerText('🛒 购物车详情', width) + '║\n';
    output += '╠' + line + '╠\n';
    output += '║' + ` 商品端口: ${productPort}`.padEnd(width) + '║\n';
    output += '╠' + line + '╠\n';
    
    for (const item of cart.items) {
        output += '║' + `   • ${item.name.padEnd(28)} ${item.priceEth.padStart(10)}`.padEnd(width) + '║\n';
    }
    
    output += '╠' + line + '╠\n';
    output += '║' + ` 总计: ${cart.totalEth}`.padEnd(width) + '║\n';
    output += '╚' + line + '╝\n';
    
    return output;
}

function centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
}

// ============ 主程序 ============
async function main() {
    // 检查配置
    if (!CONFIG.privateKey || !CONFIG.accountAddress) {
        console.error('❌ 请先配置 .env 文件');
        process.exit(1);
    }

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
        console.log('║            🏪 多端口商品购物演示                           ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║  1. 📦 查看所有商品（多端口）                               ║');
        console.log('║  2. 🛒 购买商品（输入端口号）                               ║');
        console.log('║  3. 💰 查询余额                                            ║');
        console.log('║  4. 📊 查看服务状态                                        ║');
        console.log('║  h. ❓ 帮助                                                ║');
        console.log('║  q. 🚪 退出                                                ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    }

    // 查看所有商品
    async function viewAllProducts() {
        try {
            const response = await fetch(`${CONFIG.mainApiUrl}/api/products`);
            const data = await response.json();
            
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║                    📦 商品目录                              ║');
            console.log('╠════════════════════════════════════════════════════════════╣');
            
            for (const product of data.products) {
                console.log(`║  商品 #${product.id}: ${product.name.padEnd(24)}      ║`);
                console.log(`║    价格: ${product.priceEth.padEnd(12)}  端口: ${product.port}          ║`);
                console.log(`║    描述: ${product.description.substring(0, 30).padEnd(30)}║`);
                console.log(`║    URL: http://localhost:${product.port}/                   ║`);
                console.log('╠────────────────────────────────────────────────────────────╣');
            }
            
            console.log('╚════════════════════════════════════════════════════════════╝');
        } catch (error) {
            console.error('❌ 获取商品失败:', error.message);
        }
    }

    // 购买商品
    async function purchaseProduct() {
        console.log('\n商品端口列表:');
        console.log('  3001 - AI API Package - 0.0005 ETH');
        console.log('  3002 - Data Cleaning Service - 0.001 ETH');
        console.log('  3003 - Model Training Time - 0.0015 ETH');
        console.log('  3004 - Business Analysis Report - 0.002 ETH');
        console.log('  3005 - System Monitoring Service - 0.0025 ETH');
        console.log('  3006 - Expert Technical Consulting - 0.003 ETH');
        console.log('  3007 - API Documentation - 0.0035 ETH');
        console.log('  3008 - Data Backup Service - 0.004 ETH');
        
        const portInput = await question('\n请输入商品端口 (如 3001): ');
        const port = parseInt(portInput);
        
        if (isNaN(port) || port < 3001 || port > 3008) {
            console.log('❌ 无效端口，请输入 3001-3008');
            return;
        }

        try {
            // 获取商品信息
            const infoResponse = await fetch(`http://localhost:${port}/`);
            const productData = await infoResponse.json();
            
            console.log('\n商品信息:');
            console.log(`  名称: ${productData.product.name}`);
            console.log(`  描述: ${productData.product.description}`);
            console.log(`  价格: ${productData.product.priceEth}`);
            
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

            if (purchaseResponse.status !== 402) {
                console.log('❌ 购买请求失败');
                return;
            }

            const purchaseData = await purchaseResponse.json();
            console.log(formatCartCard(purchaseData.cart, port));

            // 生成会话密钥
            const sessionKey = sessionKeyManager.generateSessionKey();
            console.log(`\n🔑 会话密钥: ${sessionKey.address}`);

            // 授权会话密钥
            console.log('\n📝 授权会话密钥...');
            const expiresAt = Math.floor(Date.now() / 1000) + 3600;
            const maxCalls = 5;
            const maxSpending = BigInt(purchaseData.payment.amount) * 12n / 10n;

            const grantTx = await account.grantSessionKey(
                sessionKey.address,
                expiresAt,
                maxCalls,
                maxSpending,
                ethers.ZeroAddress
            );
            await grantTx.wait();
            console.log('✅ 会话密钥已授权');

            // 签名支付消息
            console.log('\n✍️  签名支付消息...');
            const messageHash = ethers.keccak256(
                ethers.solidityPacked(
                    ['address', 'address', 'uint256', 'bytes32', 'bytes32'],
                    [
                        CONFIG.accountAddress,
                        purchaseData.payment.merchant,
                        purchaseData.payment.amount,
                        purchaseData.payment.paymentId,
                        purchaseData.payment.cartHash
                    ]
                )
            );

            const signature = await sessionKeyManager.signMessage(messageHash);

            // 执行支付
            console.log('\n💸 执行支付...');
            const payTx = await account.payWithSessionKey(
                sessionKey.address,
                purchaseData.payment.merchant,
                purchaseData.payment.amount,
                purchaseData.payment.paymentId,
                purchaseData.payment.cartHash,
                signature
            );

            console.log(`交易哈希: ${payTx.hash}`);
            const receipt = await payTx.wait();

            if (receipt.status === 1) {
                console.log('\n✅ 支付成功！');
                console.log(`区块: ${receipt.blockNumber}`);
                console.log(`Gas: ${receipt.gasUsed.toString()}`);
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
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    💰 账户余额                              ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║  用户钱包: ${ethers.formatEther(userBalance).padEnd(10)} ETH`.padEnd(61) + '║');
        console.log(`║  智能账户: ${ethers.formatEther(accountBalance).padEnd(10)} ETH`.padEnd(61) + '║');
        console.log(`║  商户收款: ${ethers.formatEther(merchantBalance).padEnd(10)} ETH`.padEnd(61) + '║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    }

    // 查看服务状态
    async function checkStatus() {
        try {
            const response = await fetch(`${CONFIG.mainApiUrl}/api/status`);
            const data = await response.json();
            
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║                    📊 服务状态                              ║');
            console.log('╠════════════════════════════════════════════════════════════╣');
            console.log(`║  主路由服务: 端口 ${data.mainRouter.port} - ${data.mainRouter.status}`.padEnd(61) + '║');
            console.log('╠────────────────────────────────────────────────────────────╣');
            
            for (const service of data.productServices) {
                console.log(`║  ${service.name.padEnd(20)} - 端口 ${service.port}`.padEnd(61) + '║');
            }
            
            console.log('╚════════════════════════════════════════════════════════════╝');
        } catch (error) {
            console.error('❌ 无法获取服务状态:', error.message);
        }
    }

    // 主循环
    while (true) {
        await showMenu();
        const choice = await question('请选择操作: ');

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
                await checkStatus();
                break;
            case 'h':
                console.log('\n帮助信息...');
                break;
            case 'q':
                console.log('再见！');
                rl.close();
                process.exit(0);
            default:
                console.log('无效选择');
        }
    }
}

main().catch(console.error);
