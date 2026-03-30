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
├── contracts/                              # 智能合约
│   ├── foundry.toml                        # Foundry配置
│   ├── src/
│   │   └── ModularAccount.sol              # 模块化智能账户合约
│   └── script/
│       └── DeployModular.s.sol             # 部署脚本
│
├── shopping-demo/                          # 交互演示
│   ├── .env.example                        # 配置模板
│   ├── openclaw-bridge.js                  # ⭐ OpenClaw交互脚本
│   ├── multi-shopping-cli.js               # 终端交互式CLI
│   ├── package.json                        # Node.js依赖
│   └── session-keys.json                   # 会话密钥存储
│
├── skills/                                 # OpenClaw Skill
│   └── openclaw-agent-payment-demo/
│       └── SKILL.md                        # ⭐ 交互指南
│
└── README.md                               # 本文件
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lynn15730713595-collab/Openclaw_Agent_Payment_demo.git
cd Openclaw_Agent_Payment_demo
```

### 2. 安装依赖

#### 安装Node.js依赖（必需）

```bash
cd shopping-demo
npm install
```

#### 安装Foundry（可选，仅用于编译/部署合约）

Foundry 是一个 Solidity 智能合约开发框架，用于编译和部署合约。

**什么时候需要安装 Foundry？**

| 场景 | 是否需要 Foundry |
|------|-----------------|
| ✅ 只运行购物Demo（使用已部署的合约） | **不需要** |
| ✅ 修改合约代码后重新编译 | **需要** |
| ✅ 自己部署新合约到测试网 | **需要** |

当前 Demo 已部署好合约到 Sepolia 测试网，你可以直接运行 `node multi-shopping-cli.js`，无需安装 Foundry。

如果你需要自己编译或部署合约：

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

或参考官方文档: https://book.getfoundry.sh/getting-started/installation

### 3. 配置环境变量

```bash
cp shopping-demo/.env.example shopping-demo/.env
nano shopping-demo/.env  # 或使用你喜欢的编辑器
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

# 商户收款地址
MERCHANT_ADDRESS=0x商户收款地址
```

⚠️ **安全提醒:**
- 不要在 `.env` 文件中存储有真实资产的私钥
- 建议使用测试网专用钱包
- `.env` 文件已添加到 `.gitignore`，不会被上传到GitHub

### 4. 部署合约 (可选)

如果你想自己部署合约:

```bash
cd contracts

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

#### 方式一：终端交互式CLI

```bash
cd shopping-demo
node multi-shopping-cli.js
```

#### 方式二：OpenClaw对话框交互

```bash
cd shopping-demo
node openclaw-bridge.js <command>
```

支持的命令：
```bash
node openclaw-bridge.js products              # 查看商品列表
node openclaw-bridge.js balance               # 查询余额
node openclaw-bridge.js keys                  # 列出会话密钥
node openclaw-bridge.js purchase <productId>  # 发起购买
node openclaw-bridge.js pay <productId> <keyIndex>  # 执行支付
node openclaw-bridge.js key-create [calls] [eth]    # 创建会话密钥
node openclaw-bridge.js key-delete <index>          # 删除会话密钥
```

## 🎮 OpenClaw集成

本项目已集成到OpenClaw，可以在对话框中直接进行购物交互。

### 交互流程

```
用户: 商品列表
OpenClaw: 返回8个商品目录

用户: 我要购买AI API Package
OpenClaw: 显示购物车，确认购买? (y/n)

用户: y
OpenClaw: 选择会话密钥方式 (1.已有 2.新建)

用户: 1
OpenClaw: 显示会话密钥列表，标注额度是否充足

用户: 2
OpenClaw: 执行支付，返回交易链接

🎉 购买完成！
```

### 商品列表

| ID | 商品名称 | 价格 (ETH) |
|----|---------|-----------|
| 1 | AI API Package | 0.0005 |
| 2 | Data Cleaning Service | 0.001 |
| 3 | Model Training Time | 0.0015 |
| 4 | Business Analysis Report | 0.002 |
| 5 | System Monitoring Service | 0.0025 |
| 6 | Expert Technical Consulting | 0.003 |
| 7 | API Documentation | 0.0035 |
| 8 | Data Backup Service | 0.004 |

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

#### 允许的目标地址 (allowedTarget)

`allowedTarget` 字段用于限制会话密钥只能向特定地址支付：

| 值 | 含义 | 使用场景 |
|-----|------|---------|
| `address(0)` (零地址) | 可以向**任意地址**支付 | 灵活支付，不限制目标 |
| 特定商户地址 | **只能向该地址**支付 | 更安全，限制支付目标 |

**安全意义**：
- 防止会话密钥被盗后转账到攻击者地址
- 限制 AI 代理只能向指定商户付款
- 即使会话密钥私钥泄露，资金也只能流向指定地址

**本 Demo 设置为零地址**，表示可以向任意商户支付。

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

## 📁 核心文件说明

| 文件 | 说明 |
|------|------|
| `shopping-demo/openclaw-bridge.js` | OpenClaw对话框调用的主脚本，支持命令行参数 |
| `shopping-demo/multi-shopping-cli.js` | 终端交互式CLI，带菜单界面 |
| `skills/openclaw-agent-payment-demo/SKILL.md` | OpenClaw Skill交互指南 |
| `contracts/src/ModularAccount.sol` | 模块化账户智能合约 |

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

## 📝 License

MIT

## 🙏 致谢

- [Foundry](https://getfoundry.sh/) - 智能合约开发框架
- [ethers.js](https://docs.ethers.org/) - 以太坊JavaScript库
- [OpenClaw](https://openclaw.ai) - AI代理框架
