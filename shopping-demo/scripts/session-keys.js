#!/usr/bin/env node
/**
 * 会话密钥管理
 * 用法:
 *   node session-keys.js list           - 列出所有会话密钥
 *   node session-keys.js query <address> - 查询指定密钥
 *   node session-keys.js delete <index>  - 删除指定密钥
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const SESSION_KEYS_FILE = path.join(__dirname, '..', 'session-keys.json');
const MODULAR_ACCOUNT_ABI = [
    "function sessionKeys(address) view returns (bool isActive, uint64 expiresAt, uint32 maxCalls, uint32 usedCalls, uint256 maxSpending, uint256 usedSpending, address allowedTarget)",
    "function revokeSessionKey(address key) external"
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
    
    const keys = loadKeys();

    if (command === 'list') {
        console.log('\n📋 已创建的会话密钥:\n');
        
        if (keys.length === 0) {
            console.log('暂无会话密钥');
            return;
        }

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            try {
                const keyInfo = await account.sessionKeys(key.address);
                const isActive = keyInfo.isActive;
                const remainingCalls = Number(keyInfo.maxCalls) - Number(keyInfo.usedCalls);
                const remainingSpending = keyInfo.maxSpending - keyInfo.usedSpending;
                
                console.log(`${i + 1}. 地址: ${key.address}`);
                console.log(`   状态: ${isActive ? '激活' : '未激活'}`);
                console.log(`   剩余次数: ${remainingCalls} | 剩余额度: ${ethers.formatEther(remainingSpending)} ETH`);
                console.log(`   创建时间: ${key.createdAt}`);
            } catch (e) {
                console.log(`${i + 1}. 地址: ${key.address}`);
                console.log(`   状态: 未授权或查询失败`);
            }
            console.log('─'.repeat(60));
        }
        
    } else if (command === 'query') {
        const address = process.argv[3];
        if (!address) {
            console.log('❌ 请输入会话密钥地址');
            return;
        }

        try {
            const keyInfo = await account.sessionKeys(address);
            
            console.log('\n🔑 会话密钥状态:\n');
            console.log(`地址: ${address}`);
            console.log(`状态: ${keyInfo.isActive ? '✅ 已激活' : '❌ 未激活'}`);
            console.log(`过期时间: ${new Date(Number(keyInfo.expiresAt) * 1000).toISOString()}`);
            console.log(`调用次数: ${keyInfo.usedCalls} / ${keyInfo.maxCalls}`);
            console.log(`消费额度: ${ethers.formatEther(keyInfo.usedSpending)} / ${ethers.formatEther(keyInfo.maxSpending)} ETH`);
            
        } catch (error) {
            console.log('❌ 查询失败:', error.message);
        }
        
    } else if (command === 'delete') {
        const index = parseInt(process.argv[3]) - 1;
        
        if (index < 0 || index >= keys.length) {
            console.log('❌ 无效的序号');
            return;
        }

        const keyToDelete = keys[index];
        console.log(`\n🗑️  即将删除会话密钥: ${keyToDelete.address}`);

        try {
            // 从合约撤销
            const keyInfo = await account.sessionKeys(keyToDelete.address);
            if (keyInfo.isActive) {
                console.log('正在从合约撤销...');
                const tx = await account.revokeSessionKey(keyToDelete.address);
                console.log(`交易: ${tx.hash}`);
                await tx.wait();
                console.log('✅ 合约撤销成功');
            }

            // 从本地删除
            keys.splice(index, 1);
            saveKeys(keys);
            console.log('✅ 本地删除成功');

        } catch (error) {
            console.log('❌ 删除失败:', error.message);
        }
        
    } else {
        console.log('用法:');
        console.log('  node session-keys.js list           - 列出所有会话密钥');
        console.log('  node session-keys.js query <address> - 查询指定密钥');
        console.log('  node session-keys.js delete <index>  - 删除指定密钥');
    }
}

main().catch(console.error);
