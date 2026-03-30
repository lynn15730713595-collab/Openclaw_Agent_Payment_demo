# OpenClaw Agent Payment Demo

基于会话密钥(Session Key)的AI代理支付演示项目。

## 📖 项目简介

本Demo展示了如何使用**会话密钥(Session Key)**实现AI代理的安全支付：

- AI代理可以代表用户执行支付
- 用户通过授权会话密钥，限制AI的支付权限
- 支持多重限制：有效期、调用次数、消费额度、目标地址
- 防篡改、防重放攻击
- **支持OpenClaw对话框直接交互**

## 🏗️ 项目结构

```
Openclaw_Agent_Payment_demo/
├── .gitignore                              # Git忽略配置
├── README.md                               # 本文件
│
├── contracts/                              # 智能合约
│   ├── .env.example                        # 部署环境变量模板
│   ├── foundry.toml                        # Foundry配置
│   ├── foundry.lock                        # Foundry依赖锁定
│   ├── src/
│   │   └── ModularAccount.sol              # 模块化智能账户合约
│   └── script/
│       └── DeployModular.s.sol             # 部署脚本
│
├── shopping-demo/                          # 交互演示
│   ├── .env.example                        # Demo环境变量模板
│   ├── openclaw-bridge.js                  # ⭐ OpenClaw交互脚本
│   ├── multi-shopping-cli.js               # 终端交互式CLI
│   ├── package.json                        # Node.js依赖
│   └── session-keys.json                   # 会话密钥存储
│
└── skills/                                 # OpenClaw Skill
    └── openclaw-agent-payment-demo/
        └── SKILL.md                        # ⭐ 交互指南
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lynn15730713595-collab/Openclaw_Agent_Payment_demo.git
cd Openclaw_Agent_Payment_demo
```

### 2. 安装依赖

```bash
cd shopping-demo
npm install
cd ..
```

### 3. 配置环境变量

```bash
cp shopping-demo/.env.example shopping-demo/.env
```

编辑 `shopping-demo/.env`：

```bash
# 网络配置
RPC_URL=https://ethereum-sepolia.publicnode.com
CHAIN_ID=11155111

# 用户私钥 (⚠️ 请替换为你自己的私钥，不要使用真实资产!)
PRIVATE_KEY=0x你的私钥

# 模块化账户地址 (使用已部署的合约或自己部署后填入)
ACCOUNT_ADDRESS=0xE3D2f53C5Bee435715A38493cc792676Ed09B4f5

# 商户收款地址 (已预设，可修改)
MERCHANT_ADDRESS=0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb
```

⚠️ **安全提醒:**
- 不要在 `.env` 文件中存储有真实资产的私钥
- 建议使用测试网专用钱包
- `.env` 文件已添加到 `.gitignore`，不会被上传到GitHub

### 4. 获取测试ETH

**如果使用已部署的合约，需要向合约地址充值 ETH：**

```bash
# 合约地址
0xE3D2f53C5Bee435715A38493cc792676Ed09B4f5
```

**获取Sepolia测试ETH:**
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

**充值方式：** 使用 MetaMask 或其他钱包，将测试 ETH 发送到合约地址。

### 5. 运行Demo

```bash
cd shopping-demo
node multi-shopping-cli.js
```

脚本会自动启动API服务（端口 3000-3008），然后显示交互菜单。

---

## 📋 使用方式

### 方式一：终端交互式CLI

```bash
cd shopping-demo
node multi-shopping-cli.js
```

菜单选项：

```
╔════════════════════════════════════════════════════════════╗
║            🏪 AI购物会话密钥Demo                           ║
╠════════════════════════════════════════════════════════════╣
║  1. 📦 查看商品目录                                         ║
║  2. 🛒 购买商品                                             ║
║  3. 💰 查询余额                                             ║
║  4. 🔑 查询会话密钥                                         ║
║  5. 🗑️  删除会话密钥                                        ║
║  q. 🚪 退出                                                 ║
╚════════════════════════════════════════════════════════════╝
```

### 方式二：OpenClaw对话框交互

```bash
cd shopping-demo
node openclaw-bridge.js <command>
```

支持的命令：

| 命令 | 说明 |
|------|------|
| `products` | 查看商品列表 |
| `balance` | 查询余额 |
| `keys` | 列出会话密钥 |
| `purchase <productId>` | 发起购买 |
| `pay <productId> <keyIndex>` | 执行支付 |
| `key-create [calls] [eth]` | 创建会话密钥 |
| `key-delete <index>` | 删除会话密钥 |

---

## 🛒 商品列表

| ID | 商品名称 | 描述 | 价格 (ETH) |
|----|---------|------|-----------|
| 1 | AI API Package | 1000次 GPT-4 API calls | 0.0005 |
| 2 | Data Cleaning Service | 数据清洗服务 | 0.001 |
| 3 | Model Training Time | 模型训练时间 | 0.0015 |
| 4 | Business Analysis Report | 商业分析报告 | 0.002 |
| 5 | System Monitoring Service | 系统监控服务 | 0.0025 |
| 6 | Expert Technical Consulting | 专家技术咨询 | 0.003 |
| 7 | API Documentation | API文档服务 | 0.0035 |
| 8 | Data Backup Service | 数据备份服务 | 0.004 |

---

## 🔧 部署自己的合约（可选）

如果你想自己部署合约，需要安装 Foundry。

### 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

或参考官方文档: https://book.getfoundry.sh/getting-started/installation

### 部署步骤

**步骤1：配置环境变量**

```bash
cp contracts/.env.example contracts/.env
```

编辑 `contracts/.env`：

```bash
PRIVATE_KEY=0x你的私钥
```

**步骤2：编译合约**

```bash
cd contracts
forge build
```

**步骤3：部署合约**

```bash
forge script script/DeployModular.s.sol \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --broadcast
```

**步骤4：记录合约地址**

部署成功后会输出：

```
✅  [Success]Hash: 0xabc123...
Contract Address: 0x你的合约地址
✅  Funded account with 0.05 ETH
```

**部署脚本会自动充值 0.05 ETH 到合约账户。**

**步骤5：更新配置**

将合约地址更新到 `shopping-demo/.env`：

```bash
ACCOUNT_ADDRESS=0x你的合约地址
```

---

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

---

## 🔐 核心合约

### ModularAccount.sol

模块化智能账户合约，内置会话密钥管理功能：

```solidity
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

### 允许的目标地址 (allowedTarget)

| 值 | 含义 | 使用场景 |
|-----|------|---------|
| `address(0)` (零地址) | 可以向**任意地址**支付 | 灵活支付 |
| 特定商户地址 | **只能向该地址**支付 | 更安全 |

**安全意义**：即使会话密钥私钥泄露，资金也只能流向指定地址。

**本 Demo 设置为零地址**，可以向任意商户支付。

### 核心函数

| 函数 | 说明 |
|------|------|
| `grantSessionKey()` | 授权会话密钥 |
| `revokeSessionKey()` | 撤销会话密钥 |
| `payWithSessionKey()` | 用会话密钥支付 |
| `withdraw()` | 提取ETH |

---

## 🔒 安全特性

| 特性 | 说明 |
|------|------|
| 有效期限制 | 会话密钥过期后自动失效 |
| 次数限制 | 限制会话密钥可使用次数 |
| 额度限制 | 限制会话密钥最大消费金额 |
| 目标限制 | 限制会话密钥只能支付给指定地址 |
| 签名验证 | 防止交易内容被篡改 |
| 防重放 | 每笔支付只能执行一次 |
| 可撤销 | 用户可随时撤销会话密钥 |

---

## 🎮 OpenClaw集成

本项目已集成到OpenClaw，可以在对话框中直接进行购物交互。

### 交互流程示例

```
用户: 商品列表
OpenClaw: 返回8个商品目录

用户: 我要购买AI API Package
OpenClaw: 显示购物车，确认购买? (y/n)

用户: y
OpenClaw: 选择会话密钥方式 (1.已有 2.新建)

用户: 2
OpenClaw: 创建新会话密钥，执行支付...

🎉 购买完成！交易: 0x...
```

---

## 📁 核心文件说明

| 文件 | 说明 |
|------|------|
| `contracts/src/ModularAccount.sol` | 模块化账户智能合约 |
| `contracts/script/DeployModular.s.sol` | 合约部署脚本 |
| `shopping-demo/openclaw-bridge.js` | OpenClaw对话框调用脚本 |
| `shopping-demo/multi-shopping-cli.js` | 终端交互式CLI |
| `skills/openclaw-agent-payment-demo/SKILL.md` | OpenClaw Skill交互指南 |

---

## ❓ 常见问题

### Q: 如何获取测试ETH?

访问Sepolia测试网水龙头:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### Q: 支付交易失败?

检查:
1. 智能账户有足够余额
2. 会话密钥已授权
3. 会话密钥未过期、未超次数/额度

### Q: 合约部署失败?

确保:
1. 钱包有足够的Sepolia ETH
2. RPC_URL正确且可访问
3. 私钥格式正确 (以 `0x` 开头)

---

## 📝 License

MIT

## 🙏 致谢

- [Foundry](https://getfoundry.sh/) - 智能合约开发框架
- [ethers.js](https://docs.ethers.org/) - 以太坊JavaScript库
- [OpenClaw](https://openclaw.ai) - AI代理框架
