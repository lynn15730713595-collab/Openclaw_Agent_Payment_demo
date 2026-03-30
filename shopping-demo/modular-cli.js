#!/usr/bin/env node
/**
 * AI购物会话密钥Demo - 模块化账户版本
 * 会话密钥管理内置在账户合约中 (类似ERC-4337风格)
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
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    chainId: parseInt(process.env.CHAIN_ID || '11155111')
};

// ============ 模块化账户ABI ============
const MODULAR_ACCOUNT_ABI = [
    // 会话密钥管理
    "function grantSessionKey(address key, uint64 expiresAt, uint32 maxCalls, uint256 maxSpending, address allowedTarget) external",
    "function revokeSessionKey(address key) external",
    "function sessionKeys(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function getSessionKey(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function getRemainingLimit(address) view returns (uint256)",
    "function isSessionKeyValid(address) view returns (bool)",
    
    // 支付执行 - 代付模式 (用户EOA支付Gas)
    "function payWithSessionKey(address sessionKey, address merchant, uint256 amount, bytes32 paymentId, bytes32 cartHash, bytes calldata signature) external",
    
    // Owner操作
    "function execute(address target, uint256 value, bytes data) external returns (bytes)",
    "function withdraw(uint256 amount) external",
    "function owner() view returns (address)",
    
    // 查询
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
function formatCartCard(cart) {
    const width = 60;
    const line = '═'.repeat(width);
    
    let output = '\n';
    output += '╔' + line + '╗\n';
    output += '║' + centerText('🛒 购物车详情', width) + '║\n';
    output += '╠' + line + '╠\n';
    output += '║' + ` 商户: ${cart.merchant.name}`.padEnd(width) + '║\n';
    output += '╠' + line + '╠\n';
    output += '║' + ' 商品列表:'.padEnd(width) + '║\n';
    
    for (const item of cart.items) {
        const price = (Number(item.price) / 1e18).toFixed(6);
        output += '║' + `   • ${item.name.padEnd(28)} ${price.padStart(10)} ETH`.padEnd(width) + '║\n';
    }
    
    output += '╠' + line + '╠\n';
    output += '║' + ` 总计: ${cart.totalEth}`.padEnd(width) + '║\n';
    output += '║' + ` 购物车ID: ${cart.cartId.substring(0, 36)}`.padEnd(width) + '║\n';
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
class ModularAccountDemo {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
        
        if (CONFIG.privateKey) {
            this.userWallet = new ethers.Wallet(CONFIG.privateKey, this.provider);
        }
        
        if (CONFIG.accountAddress) {
            this.account = new ethers.Contract(CONFIG.accountAddress, MODULAR_ACCOUNT_ABI, this.userWallet);
        }
        
        this.sessionKeyManager = new SessionKeyManager();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async start() {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║     🤖 模块化账户会话密钥Demo (ERC-4337风格)               ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        
        if (!this.userWallet) {
            console.log('\n⚠️  请设置环境变量 PRIVATE_KEY');
            return;
        }
        
        console.log(`\n📍 配置信息:`);
        console.log(`   用户地址: ${this.userWallet.address}`);
        console.log(`   模块化账户: ${CONFIG.accountAddress || '未设置'}`);
        console.log(`   商户地址: ${CONFIG.merchantAddress}`);
        
        await this.interactiveLoop();
    }
    
    async interactiveLoop() {
        while (true) {
            this.showMenu();
            const answer = await this.question('\n请选择操作: ');
            
            switch (answer.trim()) {
                case '1':
                    await this.listProducts();
                    break;
                case '2':
                    await this.purchaseFlow();
                    break;
                case '3':
                    await this.checkBalance();
                    break;
                case '4':
                    await this.checkSessionKey();
                    break;
                case '5':
                    await this.grantSessionKey();
                    break;
                case '6':
                    await this.revokeSessionKey();
                    break;
                case 'h':
                case 'H':
                    this.showHelp();
                    break;
                case 'q':
                case 'Q':
                    console.log('\n👋 再见!');
                    this.rl.close();
                    return;
                default:
                    console.log('❌ 无效选择');
            }
        }
    }
    
    showMenu() {
        console.log('\n┌─────────────────────────────────────┐');
        console.log('│           可用操作                   │');
        console.log('├─────────────────────────────────────┤');
        console.log('│ 1. 📦 查看商品目录                   │');
        console.log('│ 2. 🛒 购买商品 (完整流程)            │');
        console.log('│ 3. 💰 查询实时余额                   │');
        console.log('│ 4. 📊 查看会话密钥状态               │');
        console.log('│ 5. 🔑 授权会话密钥                   │');
        console.log('│ 6. ❌ 撤销会话密钥                   │');
        console.log('│ h. ❓ 帮助                          │');
        console.log('│ q. 🚪 退出                          │');
        console.log('└─────────────────────────────────────┘');
    }
    
    showHelp() {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                    模块化账户架构                          ║
╠════════════════════════════════════════════════════════════╣
║  ┌────────────────────────────────────────────────────┐    ║
║  │              ModularAccount (单合约)               │    ║
║  │  ┌──────────────┐  ┌──────────────┐               │    ║
║  │  │   资金存储    │  │会话密钥模块  │               │    ║
║  │  └──────────────┘  └──────────────┘               │    ║
║  │  ┌──────────────┐  ┌──────────────┐               │    ║
║  │  │ 执行函数     │  │ 支付函数     │               │    ║
║  │  └──────────────┘  └──────────────┘               │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                             ║
║  特点: 会话密钥管理内置在账户合约中                         ║
║        类似 ERC-4337 / ERC-6900 模块化设计                 ║
╚════════════════════════════════════════════════════════════╝
        `);
    }
    
    async listProducts() {
        console.log('\n📦 商品目录');
        console.log('═'.repeat(60));
        
        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}/api/products`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`\n🏪 商户: ${data.merchant.name}`);
                console.log(`📍 商户地址: ${data.merchant.address}`);
                
                console.log('\n┌────┬────────────────────────┬──────────────────┐');
                console.log('│ ID │ 商品名称               │ 价格 (ETH)       │');
                console.log('├────┼────────────────────────┼──────────────────┤');
                
                for (const p of data.products) {
                    const priceEth = (Number(p.price) / 1e18).toFixed(6);
                    console.log(`│ ${String(p.id).padEnd(2)} │ ${p.name.padEnd(22)} │ ${priceEth.padStart(14)} │`);
                }
                
                console.log('└────┴────────────────────────┴──────────────────┘');
            }
        } catch (error) {
            console.log('❌ 连接失败:', error.message);
        }
    }
    
    async purchaseFlow() {
        console.log('\n🛒 开始购买流程 (模块化账户版本)');
        console.log('─'.repeat(50));
        
        const intent = await this.question('请描述你想购买的商品: ');
        const productIds = await this.parseIntent(intent);
        
        if (productIds.length === 0) {
            console.log('❌ 未能识别商品');
            return;
        }
        
        // 请求API
        console.log('\n📡 正在请求商品API...');
        let cart;
        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}/api/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds })
            });
            
            if (response.status !== 402) {
                console.log('❌ 意外的响应状态:', response.status);
                return;
            }
            
            const data = await response.json();
            cart = data.cart;
            console.log('✅ 收到402 Payment Required响应');
        } catch (error) {
            console.log('❌ API请求失败:', error.message);
            return;
        }
        
        // 显示购物车
        console.log(formatCartCard(cart));
        
        // 确认购买
        const confirm = await this.question('\n确认购买? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ 取消购买');
            return;
        }
        
        // 生成会话密钥
        const sessionKey = this.sessionKeyManager.generateSessionKey();
        console.log(`\n🔑 生成会话密钥: ${sessionKey.address}`);
        
        // 准备授权参数
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const maxCalls = 5;
        const maxSpending = BigInt(cart.totalWei) * BigInt(12) / BigInt(10);
        
        console.log('\n📋 会话密钥授权详情:');
        console.log('─'.repeat(50));
        console.log(`   过期时间: ${new Date(expiresAt * 1000).toISOString()}`);
        console.log(`   最大调用次数: ${maxCalls}`);
        console.log(`   最大消费额度: ${(Number(maxSpending) / 1e18).toFixed(6)} ETH`);
        
        // 授权会话密钥 (直接调用账户合约)
        console.log('\n📤 授权会话密钥 (账户合约内部)...');
        try {
            const grantTx = await this.account.grantSessionKey(
                sessionKey.address,
                expiresAt,
                maxCalls,
                maxSpending,
                ethers.ZeroAddress // 允许任意商户
            );
            console.log(`   交易哈希: ${grantTx.hash}`);
            await grantTx.wait();
            console.log('✅ 会话密钥授权成功!');
        } catch (error) {
            console.log('❌ 授权失败:', error.message);
            return;
        }
        
        // 签名购物车
        console.log('\n✍️  用会话密钥签署购物车...');
        const paymentId = ethers.id(cart.cartId);
        const cartHash = cart.cartHash;
        
        const messageHash = ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'address', 'uint256', 'bytes32', 'bytes32'],
                [CONFIG.accountAddress, CONFIG.merchantAddress, cart.totalWei, paymentId, cartHash]
            )
        );
        
        const sessionSignature = await this.sessionKeyManager.signMessage(messageHash);
        console.log('✅ 会话密钥签名完成');
        
        // 执行支付 (直接调用账户合约)
        console.log('\n💸 执行链上支付...');
        console.log(`   从模块化账户: ${CONFIG.accountAddress}`);
        console.log(`   到商户: ${CONFIG.merchantAddress}`);
        console.log(`   金额: ${cart.totalEth}`);
        
        try {
            // 使用用户EOA发送交易 (代付Gas模式)
            // 会话密钥只负责签名，Gas由用户EOA支付
            const payTx = await this.account.payWithSessionKey(
                sessionKey.address,  // 会话密钥地址
                CONFIG.merchantAddress,
                cart.totalWei,
                paymentId,
                cartHash,
                sessionSignature
            );
            
            console.log(`   交易哈希: ${payTx.hash}`);
            console.log('⏳ 等待确认...');
            
            const receipt = await payTx.wait();
            console.log('\n✅ 支付成功!');
            console.log('─'.repeat(50));
            console.log(`   区块号: ${receipt.blockNumber}`);
            console.log(`   Gas使用: ${receipt.gasUsed.toString()}`);
            console.log(`   💡 Gas由用户EOA支付，商品款从智能账户扣除`);
            console.log('');
            console.log('🔗 查看交易详情:');
            console.log(`   https://sepolia.etherscan.io/tx/${payTx.hash}`);
            
            console.log('\n🎉 购买完成! (模块化账户版本)');
            
        } catch (error) {
            console.log('❌ 支付失败:', error.message);
        }
    }
    
    async parseIntent(intent) {
        const products = {
            'premium widget': 1, 'gadget pro': 2, 'super device': 3,
            'basic widget': 4, 'mega gadget': 5, 'mini device': 6,
            'ultra widget': 7, 'pro device': 8
        };
        
        const intentLower = intent.toLowerCase();
        const found = [];
        
        for (const [name, id] of Object.entries(products)) {
            if (intentLower.includes(name)) found.push(id);
        }
        
        if (found.length === 0) {
            const ids = await this.question('请输入商品ID: ');
            return ids.split(',').map(id => parseInt(id.trim())).filter(id => id > 0 && id <= 8);
        }
        
        return found;
    }
    
    async checkBalance() {
        console.log('\n💰 实时余额查询');
        console.log('═'.repeat(60));
        
        try {
            const blockNumber = await this.provider.getBlockNumber();
            console.log(`\n📦 当前区块: ${blockNumber}`);
            
            const userBalance = await this.provider.getBalance(this.userWallet.address);
            const accountBalance = await this.provider.getBalance(CONFIG.accountAddress);
            const merchantBalance = await this.provider.getBalance(CONFIG.merchantAddress);
            
            console.log('\n┌────────────────────────────────────────────────────────┐');
            console.log('│                    账户余额详情                         │');
            console.log('├────────────────────────────────────────────────────────┤');
            console.log(`│ 👤 用户钱包 (Owner)                                    │`);
            console.log(`│    ${this.userWallet.address}`);
            console.log(`│    余额: ${parseFloat(ethers.formatEther(userBalance)).toFixed(6).padStart(10)} ETH`);
            console.log('├────────────────────────────────────────────────────────┤');
            console.log('│ 🏦 模块化账户 (内置会话密钥)                           │');
            console.log(`│    ${CONFIG.accountAddress}`);
            console.log(`│    余额: ${parseFloat(ethers.formatEther(accountBalance)).toFixed(6).padStart(10)} ETH`);
            console.log('├────────────────────────────────────────────────────────┤');
            console.log('│ 🏪 商户收款地址                                        │');
            console.log(`│    ${CONFIG.merchantAddress}`);
            console.log(`│    余额: ${parseFloat(ethers.formatEther(merchantBalance)).toFixed(6).padStart(10)} ETH`);
            console.log('└────────────────────────────────────────────────────────┘');
            
        } catch (error) {
            console.log('❌ 查询失败:', error.message);
        }
    }
    
    async checkSessionKey() {
        const sessionAddress = await this.question('输入会话公钥地址: ');
        
        try {
            const keyInfo = await this.account.getSessionKey(sessionAddress);
            
            if (!keyInfo.isActive) {
                console.log('❌ 该会话密钥不存在或已撤销');
                return;
            }
            
            const remaining = await this.account.getRemainingLimit(sessionAddress);
            const isValid = await this.account.isSessionKeyValid(sessionAddress);
            
            console.log('\n🔑 会话密钥状态:');
            console.log('─'.repeat(50));
            console.log(`   状态: ${isValid ? '✅ 有效' : '❌ 无效'}`);
            console.log(`   过期时间: ${new Date(Number(keyInfo.expiresAt) * 1000).toISOString()}`);
            console.log(`   调用次数: ${keyInfo.usedCalls}/${keyInfo.maxCalls}`);
            console.log(`   消费额度: ${ethers.formatEther(keyInfo.usedSpending)}/${ethers.formatEther(keyInfo.maxSpending)} ETH`);
            console.log(`   剩余额度: ${ethers.formatEther(remaining)} ETH`);
            
        } catch (error) {
            console.log('❌ 查询失败:', error.message);
        }
    }
    
    async grantSessionKey() {
        const keyAddress = await this.question('输入会话公钥地址: ');
        const duration = await this.question('有效期 (分钟, 默认60): ') || '60';
        const spending = await this.question('最大消费额度 (ETH, 默认0.01): ') || '0.01';
        
        const expiresAt = Math.floor(Date.now() / 1000) + parseInt(duration) * 60;
        const maxSpending = ethers.parseEther(spending);
        
        try {
            console.log('\n📤 授权会话密钥...');
            const tx = await this.account.grantSessionKey(
                keyAddress, expiresAt, 5, maxSpending, ethers.ZeroAddress
            );
            console.log(`   交易哈希: ${tx.hash}`);
            await tx.wait();
            console.log('✅ 授权成功!');
        } catch (error) {
            console.log('❌ 授权失败:', error.message);
        }
    }
    
    async revokeSessionKey() {
        const keyAddress = await this.question('输入要撤销的会话公钥地址: ');
        
        try {
            console.log('\n📤 撤销会话密钥...');
            const tx = await this.account.revokeSessionKey(keyAddress);
            console.log(`   交易哈希: ${tx.hash}`);
            await tx.wait();
            console.log('✅ 撤销成功!');
        } catch (error) {
            console.log('❌ 撤销失败:', error.message);
        }
    }
    
    question(prompt) {
        return new Promise(resolve => {
            this.rl.question(prompt, resolve);
        });
    }
}

// ============ 启动 ============
async function main() {
    const demo = new ModularAccountDemo();
    await demo.start();
}

main().catch(console.error);
