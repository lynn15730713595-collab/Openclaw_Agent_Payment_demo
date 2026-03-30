#!/usr/bin/env node
/**
 * 查询账户余额
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com');
    
    const userAddress = process.env.USER_ADDRESS || '0xbe0E4364C61E072781C008b8Cd4CdBa49C4b710C';
    const accountAddress = process.env.ACCOUNT_ADDRESS;
    const merchantAddress = process.env.MERCHANT_ADDRESS || '0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb';

    const userBalance = await provider.getBalance(userAddress);
    const accountBalance = await provider.getBalance(accountAddress);
    const merchantBalance = await provider.getBalance(merchantAddress);

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                         💰 账户余额                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log(`║  用户钱包:   ${ethers.formatEther(userBalance).padEnd(12)} ETH                      ║`);
    console.log(`║  地址:       ${userAddress}                            ║`);
    console.log('╠──────────────────────────────────────────────────────────────────────╣');
    console.log(`║  智能账户:   ${ethers.formatEther(accountBalance).padEnd(12)} ETH                      ║`);
    console.log(`║  地址:       ${accountAddress}                            ║`);
    console.log('╠──────────────────────────────────────────────────────────────────────╣');
    console.log(`║  商户收款:   ${ethers.formatEther(merchantBalance).padEnd(12)} ETH                      ║`);
    console.log(`║  地址:       ${merchantAddress}                            ║`);
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
