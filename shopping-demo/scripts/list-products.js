#!/usr/bin/env node
/**
 * 列出所有商品
 */

async function main() {
    const response = await fetch('http://localhost:3000/api/products');
    const data = await response.json();
    
    console.log('\n📦 商品目录:\n');
    
    if (data.products && data.products.length > 0) {
        data.products.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   价格: ${product.price} ETH`);
            console.log(`   端口: ${product.port}`);
            console.log(`   描述: ${product.description || '无'}`);
            console.log('');
        });
    } else {
        console.log('暂无商品');
    }
}

main().catch(console.error);
