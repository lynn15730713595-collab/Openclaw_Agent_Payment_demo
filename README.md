# AI Agent Payment Demo

基于会话密钥(Session Key)的AI代理支付演示项目。

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
│   ├── modular-cli.js             # 单端口购物演示
│   ├── product-api-server.js      # 单端口商品API服务
│   ├── multi-shopping-cli.js      # 多端口购物演示 ⭐
│   ├── multi-product-api-server.js # 多端口商品API服务 ⭐
│   ├── package.json               # Node.js依赖
│   └── start.sh                   # 启动脚本
│
└── README.md                       # 本文件
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lynn15730713595-collab/Openclaw_Agent_Payment_demo.git
cd Openclaw_Agent_Payment_demo
```

### 2. 安装依赖

#### 安装Foundry (用于编译部署合约)

**Linux/macOS:**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

**Windows:**
```powershell
# 使用 PowerShell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

或者参考官方文档: https://book.getfoundry.sh/getting-started/installation

#### 安装Node.js依赖

```bash
cd shopping-demo
npm install
```

### 3. 配置环境变量

#### Linux/macOS:
```bash
cp shopping-demo/.env.example shopping-demo/.env
nano shopping-demo/.env  # 或使用你喜欢的编辑器
```

#### Windows PowerShell:
```powershell
cp shopping-demo/.env.example shopping-demo/.env
notepad shopping-demo/.env
```

#### 配置内容说明:

```bash
# 网络配置
RPC_URL=https://ethereum-sepolia.publicnode.com
CHAIN_ID=11155111

# 用户私钥 (⚠️ 请替换为你自己的私钥，不要使用真实资产!)
PRIVATE_KEY=0x你的私钥

# 模块化账户地址 (部署后填入)
ACCOUNT_ADDRESS=0x部署的合约地址

# 商户收款地址 (可以是任意地址，用于接收支付)
MERCHANT_ADDRESS=0x商户收款地址

# 商品API服务
API_BASE_URL=http://localhost:3000
PORT=3000
```

⚠️ **安全提醒:**
- 不要在 `.env` 文件中存储有真实资产的私钥
- 建议使用测试网专用钱包
- `.env` 文件已添加到 `.gitignore`，不会被上传到GitHub

### 4. 部署合约 (可选)

如果你想自己部署合约:

```bash
cd contracts

# 安装依赖
forge install

# 编译
forge build

# 部署到Sepolia测试网
forge script script/DeployModular.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# 记录输出的合约地址，更新到 shopping-demo/.env 中的 ACCOUNT_ADDRESS
```

**获取Sepolia测试ETH:**
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### 5. 运行Demo

#### 终端1: 启动API服务

```bash
cd shopping-demo
node product-api-server.js
```

#### 终端2: 运行交互脚本

```bash
cd shopping-demo
node modular-cli.js
```

## 🎮 Demo操作流程

### 模式选择

本Demo提供两种运行模式：

| 模式 | API服务 | 交互脚本 | 端口 |
|------|---------|----------|------|
| **单端口模式** | `product-api-server.js` | `modular-cli.js` | 3000 |
| **多端口模式** ⭐ | `multi-product-api-server.js` | `multi-shopping-cli.js` | 3000-3008 |

---

### 单端口模式

```
终端1: node product-api-server.js    # 端口3000
终端2: node modular-cli.js
```

---

### 多端口模式 ⭐ 推荐

**启动服务:**

```powershell
# 终端1: 启动多端口API服务
node multi-product-api-server.js

# 终端2: 运行交互脚本
node multi-shopping-cli.js
```

**端口分配:**

| 商品 | 端口 | 价格 |
|------|------|------|
| Premium Widget | 3001 | 0.001 ETH |
| Gadget Pro | 3002 | 0.002 ETH |
| Super Device | 3003 | 0.003 ETH |
| Basic Widget | 3004 | 0.0005 ETH |
| Mega Gadget | 3005 | 0.005 ETH |
| Mini Device | 3006 | 0.0015 ETH |
| Ultra Widget | 3007 | 0.0025 ETH |
| Pro Device | 3008 | 0.004 ETH |
| 主路由服务 | 3000 | 商品目录 |

**测试单个商品API:**

```bash
# 查看商品信息
curl http://localhost:3001/

# 发起购买
curl -X POST http://localhost:3001/purchase
```

---

### 菜单选项

```
┌─────────────────────────────────────────────────────────────────┐
│                    交互脚本菜单                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. 📦 查看所有商品                                              │
│  2. 🛒 购买商品                                                  │
│  3. 💰 查询实时余额                                              │
│  4. 📊 查看服务状态                                              │
│  h. ❓ 帮助                                                      │
│  q. 🚪 退出                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 完整购物流程:

1. 选择 `2` → 购买商品
2. 输入商品名称（如 `premium widget`）
3. 确认购物车
4. 自动生成会话密钥并授权
5. 会话密钥签名支付消息
6. 交易上链，商户收款

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

## 🛠️ 常见问题

### Q: 如何获取测试ETH?

访问Sepolia测试网水龙头:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### Q: 合约部署失败?

确保:
1. 钱包有足够的Sepolia ETH
2. RPC_URL正确且可访问
3. 私钥格式正确 (以 `0x` 开头)

### Q: 支付交易失败?

检查:
1. 智能账户有足够余额
2. 会话密钥已授权
3. 会话密钥未过期、未超次数/额度
4. 签名验证通过

### Q: Windows上如何编辑.env?

```powershell
notepad shopping-demo/.env
```

## 📝 License

MIT

## 🙏 致谢

- [Foundry](https://getfoundry.sh/) - 智能合约开发框架
- [ethers.js](https://docs.ethers.org/) - 以太坊JavaScript库
