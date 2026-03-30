# AI Agent Payment Demo

基于会话密钥的AI代理支付演示项目。

## 📖 项目简介

本Demo展示了如何使用**会话密钥(Session Key)**实现AI代理的安全支付：

- AI代理可以代表用户执行支付
- 用户通过授权会话密钥，限制AI的支付权限
- 支持多重限制：有效期、调用次数、消费额度、目标地址
- 防篡改、防重放攻击

## 🏗️ 项目结构

```
Openclaw_Agent_Payment_demo/
├── contracts/                      # 智能合约
│   ├── foundry.toml               # Foundry配置
│   ├── src/
│   │   └── ModularAccount.sol     # 模块化智能账户合约
│   └── script/
│       └── DeployModular.s.sol    # 部署脚本
│
├── shopping-demo/                  # 交互演示
│   ├── .env.example               # 配置模板
│   ├── modular-cli.js             # 交互式购物演示
│   ├── product-api-server.js      # 商品API服务
│   ├── package.json               # Node.js依赖
│   └── start.sh                   # 启动脚本
│
└── README.md                       # 本文件
```

## 🔧 核心合约

### ModularAccount.sol

模块化智能账户合约，内置会话密钥管理功能：

```solidity
// 会话密钥结构
struct SessionKey {
    bool isActive;        // 是否激活
    uint64 expiresAt;     // 过期时间
    uint32 maxCalls;      // 最大调用次数
    uint32 usedCalls;     // 已调用次数
    uint256 maxSpending;  // 最大消费额度
    uint256 usedSpending; // 已消费额度
    address allowedTarget;// 允许的目标地址
}
```

**核心功能：**

| 函数 | 说明 |
|------|------|
| `grantSessionKey()` | 授权会话密钥 |
| `revokeSessionKey()` | 撤销会话密钥 |
| `payWithSessionKey()` | 用会话密钥支付 |
| `withdraw()` | 提取ETH |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lynn15730713595-collab/Openclaw_Agent_Payment_demo.git
cd Openclaw_Agent_Payment_demo
```

### 2. 安装依赖

```bash
# 安装Foundry (如果未安装)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 安装Node.js依赖
cd shopping-demo
npm install
```

### 3. 配置环境

```bash
cp .env.example .env
# 编辑.env文件，填入你的私钥和地址
```

### 4. 部署合约

```bash
cd ../contracts
forge install
forge script script/DeployModular.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

### 5. 运行Demo

```bash
cd ../shopping-demo

# 终端1: 启动API服务
node product-api-server.js

# 终端2: 运行交互脚本
node modular-cli.js
```

## 📊 支付流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      会话密钥支付流程                            │
│                                                                 │
│  1. 用户确认购买                                                │
│     │                                                           │
│     ▼                                                           │
│  2. 生成临时会话密钥 (EOA地址)                                   │
│     │                                                           │
│     ▼                                                           │
│  3. 授权会话密钥到智能账户                                       │
│     grantSessionKey(会话密钥地址, 有效期, 次数, 额度)             │
│     │                                                           │
│     ▼                                                           │
│  4. 会话密钥签名支付消息                                         │
│     signature = sign(支付详情, 会话密钥私钥)                     │
│     │                                                           │
│     ▼                                                           │
│  5. 提交支付交易                                                 │
│     payWithSessionKey(..., signature)                           │
│     │                                                           │
│     ▼                                                           │
│  6. 合约验证并执行                                               │
│     • 验证签名                                                   │
│     • 验证规则 (时间/次数/额度)                                  │
│     • 转账到商户                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 安全特性

| 特性 | 说明 |
|------|------|
| 有效期限制 | 会话密钥过期后自动失效 |
| 次数限制 | 限制会话密钥可使用次数 |
| 额度限制 | 限制会话密钥最大消费金额 |
| 目标限制 | 限制会话密钥只能支付给指定地址 |
| 签名验证 | 防止交易内容被篡改 |
| 防重放 | 每笔支付只能执行一次 |
| 可撤销 | 用户可随时撤销会话密钥 |

## 📝 License

MIT
