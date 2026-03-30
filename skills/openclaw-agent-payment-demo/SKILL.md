---
name: openclaw-agent-payment-demo
description: OpenClaw Agent Payment Demo - 会话密钥支付助手。在OpenClaw对话框里直接购物，支持商品浏览、余额查询、会话密钥管理、链上支付。
read_when:
  - 用户提到购物、购买、买东西
  - 用户查询余额、会话密钥
  - 用户提到AI支付、会话密钥支付
  - 用户确认购买(y/n)
  - 用户选择会话密钥方式(1/2)
  - 用户输入会话密钥序号
metadata:
  category: payment
  version: 2.0.0
---

# OpenClaw Agent Payment Demo - 会话密钥支付助手

在OpenClaw对话框里直接实现AI支付购物交互。

## 项目路径

```
/root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo/
```

## 核心脚本

```
openclaw-bridge.js  - 主交互脚本，支持命令行参数调用
```

---

## 交互流程（严格遵循 multi-shopping-cli.js）

### 1️⃣ 查看商品目录

**用户意图**: "商品列表"、"有什么商品"、"查看商品"

**执行**:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js products
```

**返回格式**:
```
📦 商品目录:

1. AI API Package - 0.0005 ETH
2. Data Cleaning Service - 0.001 ETH
...
```

---

### 2️⃣ 购买商品流程（逐步确认）

#### 步骤1: 用户发起购买

**用户意图**: "购买商品X"、"我要买X"

**执行**（获取商品信息）:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js purchase <productId>
```

**OpenClaw 返回购物车卡片**:
```
🛒 购物车:

商品: Data Cleaning Service
价格: 0.001 ETH
商户: 0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb

确认购买? (y/n)
```

#### 步骤2: 用户确认

**用户回复**: "y" 或 "n"

- 如果 "n" → 取消，结束流程
- 如果 "y" → 继续

**OpenClaw 返回**:
```
🔐 选择会话密钥方式:

1. 使用已有的会话密钥
2. 创建新的会话密钥

请选择 (1/2):
```

#### 步骤3a: 用户选择"1" - 使用已有密钥

**执行**（列出密钥并检查额度）:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js keys
```

**OpenClaw 返回**:
```
💰 当前支付金额: 0.001 ETH

📋 已创建的会话密钥:
────────────────────────────────────────────────────────────
1. 地址: 0x51Fc7dc37Acec51163149b93E1379732a48346d3
   状态: 激活
   剩余次数: 1 | 剩余额度: 0.0002 ETH
   ❌ 额度不足，无法支付当前金额

2. 地址: 0xa4D0bd75953B50381bF6AC8493a9F1AB7B72F8F7
   状态: 激活
   剩余次数: 5 | 剩余额度: 0.002 ETH
   ✅ 额度充足，可以使用
────────────────────────────────────────────────────────────

请输入序号选择会话密钥 (或输入 0 创建新的):
```

**用户输入**: 序号或"0"

- 如果输入 "0" → 跳转到步骤3b（创建新密钥）
- 如果输入序号 → 继续支付流程

#### 步骤3b: 用户选择"2" - 创建新密钥

**OpenClaw 返回**:
```
🔑 生成会话密钥...

地址: 0xNewKey1234...
私钥: 0xabc123... (仅显示前20字符)
⚠️  这是临时密钥，仅用于本次交易

请输入最大调用次数 (默认5):
```

**用户输入**: 调用次数（如"5"）

**OpenClaw 返回**:
```
💡 当前支付金额: 0.001 ETH
   建议额度: 0.0012 ETH (当前金额的1.2倍)

请输入最大额度 ETH (直接回车使用建议值):
```

**用户输入**: 额度（如"0.002"或直接回车）

**执行**（创建并授权密钥）:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js key-create <maxCalls> <maxSpending>
```

**OpenClaw 返回**:
```
📝 授权会话密钥到智能账户...

有效期: 1小时
最大调用次数: 5
最大额度: 0.002 ETH

⏳ 授权交易: 0xabc123...
✅ 授权成功！
🔗 https://sepolia.etherscan.io/tx/0xabc123...
```

#### 步骤4: 执行支付

**执行**:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js pay <productId> <keyIndex>
```

**OpenClaw 返回**:
```
✍️ 签名支付消息...
✅ 签名完成

💸 执行链上支付...
──────────────────────────────────────────────────
金额: 0.001 ETH
商户: 0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb
──────────────────────────────────────────────────

⏳ 支付交易: 0xdef456...
✅ 支付成功！
🔗 https://sepolia.etherscan.io/tx/0xdef456...

🎉 购买完成！
```

---

### 3️⃣ 查询余额

**用户意图**: "余额"、"查询余额"、"我的余额"

**执行**:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js balance
```

**返回格式**:
```
💰 账户余额:

用户钱包:   0.678 ETH
地址:       0xbe0E4364C61E072781C008b8Cd4CdBa49C4b710C

智能账户:   0.026 ETH
地址:       0xE3D2f53C5Bee435715A38493cc792676Ed09B4f5

商户收款:   0.106 ETH
地址:       0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb
```

---

### 4️⃣ 查询会话密钥

**用户意图**: "会话密钥"、"列出密钥"、"查看密钥"

**执行**:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js keys
```

**返回格式**:
```
📋 已创建的会话密钥:

1. 地址: 0x51Fc...
   状态: 激活 | 剩余次数: 1 | 剩余额度: 0.0002 ETH

2. 地址: 0xa4D0...
   状态: 激活 | 剩余次数: 5 | 剩余额度: 0.002 ETH
```

---

### 5️⃣ 查询单个密钥状态

**用户意图**: "查询密钥 0x地址"

**执行**:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js key-query <address>
```

---

### 6️⃣ 删除会话密钥

**用户意图**: "删除密钥 <序号>"

**执行**:
```bash
cd /root/.openclaw/workspace/Openclaw_Agent_Payment_demo/shopping-demo && node openclaw-bridge.js key-delete <index>
```

---

## 商品列表

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

---

## 重要规则

1. **逐步确认**: 购买流程必须逐步确认，不能跳过
2. **显示详情**: 显示交易哈希和Etherscan链接
3. **错误处理**: 发生错误时清晰说明原因
4. **状态检查**: 使用已有密钥前检查额度和次数
5. **安全提示**: 创建新密钥时提示这是临时密钥
6. **额度检查**: 显示密钥列表时标注"✅额度充足"或"❌额度不足"

---

## 完整对话示例

**用户**: 我要购买Data Cleaning Service

**OpenClaw**:
```
🛒 购物车:

商品: Data Cleaning Service
价格: 0.001 ETH
商户: 0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb

确认购买? (y/n)
```

**用户**: y

**OpenClaw**:
```
🔐 选择会话密钥方式:

1. 使用已有的会话密钥
2. 创建新的会话密钥

请选择 (1/2):
```

**用户**: 1

**OpenClaw**:
```
💰 当前支付金额: 0.001 ETH

📋 已创建的会话密钥:
────────────────────────────────────────────────────────────
1. 地址: 0x51Fc...
   状态: 激活
   剩余次数: 1 | 剩余额度: 0.0002 ETH
   ❌ 额度不足，无法支付当前金额

2. 地址: 0xa4D0...
   状态: 激活
   剩余次数: 5 | 剩余额度: 0.002 ETH
   ✅ 额度充足，可以使用
────────────────────────────────────────────────────────────

请输入序号选择会话密钥:
```

**用户**: 2

**OpenClaw**:
```
✅ 已选择会话密钥: 0xa4D0...
   最大调用次数: 5

✅ 使用已有的会话密钥，跳过授权步骤

✍️ 签名支付消息...
✅ 签名完成

💸 执行链上支付...
──────────────────────────────────────────────────
金额: 0.001 ETH
商户: 0x1ef391d266f3BCdF0d9b30660FDc4032B868cDeb
──────────────────────────────────────────────────

⏳ 支付交易: 0xdef456...
✅ 支付成功！
🔗 https://sepolia.etherscan.io/tx/0xdef456...

🎉 购买完成！
```
