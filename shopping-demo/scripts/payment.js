#!/usr/bin/env node
/**
 * 执行支付流程
 * 用法:
 *   node payment.js purchase <port>           - 发起购买请求
 *   node payment.js pay <port> <sessionKeyAddress> - 使用指定密钥支付
 *   node payment.js create-key <maxCalls> <maxSpending> - 创建新会话密钥
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: '../.env' });

const SESSION_KEYS_FILE = path.join(__dirname, '..', 'session-keys.json');
const MODULAR_ACCOUNT_ABI = [
    "function grantSessionKey(address key, uint64 expiresAt, uint32 maxCalls, uint256 maxSpending, address allowedTarget) external",
    "function sessionKeys(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function payWithSessionKey(address sessionKey, address merchant, uint256 amount, bytes32 paymentId, bytes32 cartHash, bytes calldata signature) external"
];

function loadKeys() {
    try {
        if (fs.existsSync(SESSION_KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(SESSION_KEYS_FILE, 'utf8'));
        }
    } catch (error) {
        console.log('⚠️  加载会话密钥文件失败');
    }
    return [];
}

function saveKeys(keys) {
    fs.writeFileSync(SESSION_KEYS_FILE, JSON.stringify(keys, null, 2));
}

async function main() {
    const command = process.argv[2];
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const account = new ethers.Contract(process.env.ACCOUNT_ADDRESS, MODULAR_ACCOUNT_ABI, wallet);

    if (command === 'purchase') {
        const port = process.argv[3] || '3001';
        
        const response = await fetch(`http://localhost:${port}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
        
    } else if (command === 'create-key') {
        const maxCalls = parseInt(process.argv[3]) || 5;
        const maxSpendingEth = process.argv[4] || '0.001';
        const maxSpending = ethers.parseEther(maxSpendingEth);
        
        // 生成新密钥
        const newWallet = ethers.Wallet.createRandom();
        
        // 保存到本地
        const keys = loadKeys();
        keys.push({
            address: newWallet.address,
            privateKey: newWallet.privateKey,
            createdAt: new Date().toISOString()
        });
        saveKeys(keys);
        
        // 授权到合约
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const tx = await account.grantSessionKey(
            newWallet.address, expiresAt, maxCalls, maxSpending, ethers.ZeroAddress
        );
        
        console.log('\n🔑 会话密钥已创建:\n');
        console.log(`地址: ${newWallet.address}`);
        console.log(`私钥: ${newWallet.privateKey}`);
        console.log(`最大调用次数: ${maxCalls}`);
        console.log(`最大额度: ${maxSpendingEth} ETH`);
        console.log(`授权交易: ${tx.hash}`);
        console.log(`🔗 https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        await tx.wait();
        console.log('✅ 授权成功');
        
    } else if (command === 'pay') {
        const port = process.argv[3] || '3001';
        const sessionKeyAddress = process.argv[4];
        const maxCalls = parseInt(process.argv[5]) || 5;
        
        if (!sessionKeyAddress) {
            console.log('❌ 请提供会话密钥地址');
            return;
        }
        
        // 获取购买数据
        const response = await fetch(`http://localhost:${port}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const purchaseData = await response.json();
        
        // 查找私钥
        const keys = loadKeys();
        const keyInfo = keys.find(k => k.address.toLowerCase() === sessionKeyAddress.toLowerCase());
        if (!keyInfo) {
            console.log('❌ 未找到对应的会话密钥私钥');
            return;
        }
        
        // 签名
        const sessionWallet = new ethers.Wallet(keyInfo.privateKey);
        const messageHash = ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'address', 'uint256', 'bytes32', 'bytes32'],
                [process.env.ACCOUNT_ADDRESS, purchaseData.payment.merchant,
                 purchaseData.payment.amount, purchaseData.payment.paymentId,
                 purchaseData.payment.cartHash]
            )
        );
        const signature = await sessionWallet.signMessage(ethers.getBytes(messageHash));
        
        // 执行支付
        const tx = await account.payWithSessionKey(
            sessionKeyAddress,
            purchaseData.payment.merchant,
            purchaseData.payment.amount,
            purchaseData.payment.paymentId,
            purchaseData.payment.cartHash,
            signature
        );
        
        console.log('\n💸 支付交易:\n');
        console.log(`金额: ${ethers.formatEther(purchaseData.payment.amount)} ETH`);
        console.log(`商户: ${purchaseData.payment.merchant}`);
        console.log(`交易: ${tx.hash}`);
        console.log(`🔗 https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        await tx.wait();
        console.log('✅ 支付成功');
        
    } else {
        console.log('用法:');
        console.log('  node payment.js purchase <port>           - 发起购买请求');
        console.log('  node payment.js create-key <maxCalls> <maxSpending> - 创建新会话密钥');
        console.log('  node payment.js pay <port> <sessionKeyAddress> [maxCalls] - 使用指定密钥支付');
    }
}

main().catch(console.error);
