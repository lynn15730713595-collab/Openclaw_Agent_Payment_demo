# AI购物会话密钥Demo

基于 [aa-session-keys-demo](https://github.com/onurnaim/aa-session-keys-demo) 修改，实现完整的购物支付流程。

## 🎯 功能特性

- **会话密钥授权**: 用户可授权临时会话密钥进行支付
- **消费限额控制**: 设置最大消费额度和有效期
- **商户限制**: 限制会话密钥只对特定商户有效
- **真实链上支付**: 所有交易都在Sepolia测试网真实执行
- **交互式购物车**: 收到402响应后显示格式化购物车确认

## 📋 完整流程

```
用户输入购买意图
        ↓
AI检索商品并请求商品API
        ↓
商品API返回402 + 购物车详情
        ↓
AI生成购物车卡片请求用户确认
        ↓
用户确认后，AI生成会话密钥对
        ↓
用用户私钥签署授权信息
        ↓
提交授权到会话管理器链上合约
        ↓
用会话私钥签署购物车详情
        ↓
支付代理验证签名后执行ETH转账
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd shopping-demo
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑.env文件
```

### 3. 编译合约

```bash
cd ../contracts
forge install foundry-rs/forge-std
forge build
```

### 4. 部署合约

```bash
forge script script/DeployShopping.s.sol --rpc-url $RPC_URL --broadcast
```

### 5. 启动服务

```bash
# 终端1: 启动API服务
node product-api-server.js

# 终端2: 启动交互脚本
node shopping-cli.js
```

## 📁 项目结构

```
shopping-demo/
├── contracts/
│   ├── src/
│   │   ├── ShoppingSessionAccount.sol    # 智能账户
│   │   ├── ShoppingSessionKeyManager.sol # 会话管理器
│   │   ├── ShoppingPaymentProxy.sol      # 支付代理
│   │   └── MerchantShop.sol              # 商户合约
│   └── script/
│       └── DeployShopping.s.sol          # 部署脚本
├── shopping-demo/
│   ├── shopping-cli.js                   # 交互脚本 ⭐
│   ├── product-api-server.js             # API服务
│   ├── .env.example
│   └── start.sh
└── README.md
```

## 🛒 商品列表

| ID | 商品名称 | 价格 (ETH) |
|----|---------|-----------|
| 1 | Premium Widget | 0.001 |
| 2 | Gadget Pro | 0.002 |
| 3 | Super Device | 0.003 |
| 4 | Basic Widget | 0.0005 |
| 5 | Mega Gadget | 0.005 |
| 6 | Mini Device | 0.0015 |
| 7 | Ultra Widget | 0.0025 |
| 8 | Pro Device | 0.004 |

## 🔐 安全说明

- 本Demo仅供学习和测试使用
- 仅使用Sepolia测试网
- 会话密钥有过期时间和消费限额保护
