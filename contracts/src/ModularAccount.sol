// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ModularAccount
 * @dev 模块化智能账户 - 内置会话密钥管理
 * 类似 ERC-4337 / ERC-6900 的模块化设计
 */
contract ModularAccount {
    address public owner;
    
    // ============ 会话密钥模块 (内置) ============
    struct SessionKey {
        bool isActive;
        uint64 expiresAt;
        uint32 maxCalls;
        uint32 usedCalls;
        uint256 maxSpending;
        uint256 usedSpending;
        address allowedTarget;
    }
    
    mapping(address => SessionKey) public sessionKeys;
    mapping(bytes32 => bool) public usedPayments;
    
    // ============ 事件 ============
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event SessionKeyGranted(
        address indexed key, 
        uint64 expiresAt, 
        uint256 maxSpending, 
        address allowedTarget
    );
    event SessionKeyRevoked(address indexed key);
    event PaymentExecuted(
        address indexed sessionKey,
        address indexed merchant,
        uint256 amount,
        bytes32 paymentId
    );
    
    // ============ 修饰符 ============
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(address _owner) {
        owner = _owner;
    }
    
    // ============ 接收ETH ============
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
    
    // ============ 会话密钥管理模块 ============
    
    function grantSessionKey(
        address key,
        uint64 expiresAt,
        uint32 maxCalls,
        uint256 maxSpending,
        address allowedTarget
    ) external onlyOwner {
        require(key != address(0), "invalid key");
        sessionKeys[key] = SessionKey({
            isActive: true,
            expiresAt: expiresAt,
            maxCalls: maxCalls,
            usedCalls: 0,
            maxSpending: maxSpending,
            usedSpending: 0,
            allowedTarget: allowedTarget
        });
        emit SessionKeyGranted(key, expiresAt, maxSpending, allowedTarget);
    }
    
    function revokeSessionKey(address key) external onlyOwner {
        delete sessionKeys[key];
        emit SessionKeyRevoked(key);
    }
    
    // ============ 支付执行模块 ============
    
    /**
     * @notice 代付模式：用户EOA代会话密钥发送支付
     * @dev Gas由用户EOA支付，资金从智能账户扣除
     * @param sessionKey 会话密钥地址
     * @param merchant 商户地址
     * @param amount 支付金额
     * @param paymentId 支付ID
     * @param cartHash 购物车哈希
     * @param signature 会话密钥签名
     */
    function payWithSessionKey(
        address sessionKey,
        address merchant,
        uint256 amount,
        bytes32 paymentId,
        bytes32 cartHash,
        bytes calldata signature
    ) external {
        SessionKey storage sk = sessionKeys[sessionKey];
        require(sk.isActive, "session key not active");
        
        // 1. 验证有效期
        require(block.timestamp <= sk.expiresAt, "session expired");
        
        // 2. 验证调用次数
        require(sk.usedCalls < sk.maxCalls, "max calls exceeded");
        
        // 3. 验证消费额度
        require(sk.usedSpending + amount <= sk.maxSpending, "exceeds spending limit");
        
        // 4. 验证目标地址
        require(
            sk.allowedTarget == address(0) || sk.allowedTarget == merchant,
            "target not allowed"
        );
        
        // 5. 验证签名 - 签名者必须是会话密钥
        bytes32 messageHash = keccak256(
            abi.encodePacked(address(this), merchant, amount, paymentId, cartHash)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address signer = _recoverSigner(ethSignedHash, signature);
        require(signer == sessionKey, "invalid signature");
        
        // 6. 防止重放
        require(!usedPayments[paymentId], "payment already processed");
        usedPayments[paymentId] = true;
        
        // 7. 更新状态
        sk.usedCalls += 1;
        sk.usedSpending += amount;
        
        // 8. 执行转账
        (bool ok, ) = merchant.call{value: amount}("");
        require(ok, "transfer failed");
        
        emit PaymentExecuted(sessionKey, merchant, amount, paymentId);
    }
    
    // ============ Owner操作 ============
    
    function execute(
        address target, 
        uint256 value, 
        bytes calldata data
    ) external onlyOwner returns (bytes memory) {
        (bool ok, bytes memory res) = target.call{value: value}(data);
        require(ok, "call failed");
        return res;
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(owner, amount);
    }
    
    // ============ 查询函数 ============
    
    function getSessionKey(address key) external view returns (
        bool isActive,
        uint64 expiresAt,
        uint32 maxCalls,
        uint32 usedCalls,
        uint256 maxSpending,
        uint256 usedSpending,
        address allowedTarget
    ) {
        SessionKey storage sk = sessionKeys[key];
        return (
            sk.isActive,
            sk.expiresAt,
            sk.maxCalls,
            sk.usedCalls,
            sk.maxSpending,
            sk.usedSpending,
            sk.allowedTarget
        );
    }
    
    function getRemainingLimit(address key) external view returns (uint256) {
        SessionKey storage sk = sessionKeys[key];
        if (sk.maxSpending > sk.usedSpending) {
            return sk.maxSpending - sk.usedSpending;
        }
        return 0;
    }
    
    function isSessionKeyValid(address key) external view returns (bool) {
        SessionKey storage sk = sessionKeys[key];
        return sk.isActive && 
               block.timestamp <= sk.expiresAt &&
               sk.usedCalls < sk.maxCalls;
    }
    
    // ============ 内部函数 ============
    
    function _recoverSigner(
        bytes32 ethSignedMessageHash, 
        bytes calldata signature
    ) internal pure returns (address) {
        require(signature.length == 65, "invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
}
