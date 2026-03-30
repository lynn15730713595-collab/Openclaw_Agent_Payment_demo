#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       AI购物会话密钥Demo - 基于 aa-session-keys-demo       ║"
echo "╚════════════════════════════════════════════════════════════╝"

cd "$(dirname "$0")"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，从示例创建..."
    cp .env.example .env
    echo "✅ 已创建.env文件，请编辑填入配置"
    echo ""
    echo "必需的配置项："
    echo "  - PRIVATE_KEY: 你的钱包私钥"
    echo "  - RPC_URL: Sepolia RPC URL"
    echo "  - ACCOUNT_ADDRESS: 智能账户地址"
    echo "  - MANAGER_ADDRESS: 会话管理器地址"
    echo "  - PROXY_ADDRESS: 支付代理地址"
    echo "  - MERCHANT_ADDRESS: 商户地址"
    echo ""
    echo "配置完成后，重新运行此脚本。"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 显示菜单
echo ""
echo "请选择操作："
echo "  1) 启动商品API服务"
echo "  2) 启动交互式购物脚本"
echo "  3) 部署合约到Sepolia"
echo "  4) 显示帮助"
echo "  q) 退出"
echo ""
read -p "请输入选项: " choice

case $choice in
    1)
        echo "🚀 启动商品API服务..."
        node product-api-server.js
        ;;
    2)
        echo "🛒 启动交互式购物脚本..."
        node shopping-cli.js
        ;;
    3)
        echo "📤 部署合约..."
        cd ../contracts
        export PATH="$HOME/.foundry/bin:$PATH"
        source ../shopping-demo/.env
        forge script script/DeployShopping.s.sol --rpc-url "$RPC_URL" --broadcast
        echo ""
        echo "✅ 部署完成！请将输出的合约地址填入 shopping-demo/.env 文件"
        ;;
    4)
        cat README.md 2>/dev/null || echo "请查看项目 README.md"
        ;;
    q|Q)
        echo "👋 再见!"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
