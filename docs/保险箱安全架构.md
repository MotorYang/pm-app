# 本地零信任密码保险箱安全架构

---

## 1. 系统总体设计

本系统是一个**本地零信任密码保险箱（Zero-Knowledge Password Vault）**，采用如下技术栈：

| 层    | 技术          |
| ---- | ----------- |
| UI   | Vue + Pinia |
| 桥接   | Tauri IPC   |
| 加密核心 | Rust        |
| 密钥派生 | Argon2id    |
| 数据加密 | AES-256-GCM |
| 存储   | SQLite      |

设计目标：

> 即使数据库被偷、源码泄露、程序被反编译，也**无法解密用户数据**，除非知道用户的主密码。

---

## 2. 安全边界（Trust Boundary）

```
┌──────────────────────────────┐
│ 用户输入（键盘 / UI）         │  不可信
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Vue + Pinia（前端）           │  半可信
│ masterPassword 仅存在内存     │
└──────────────┬───────────────┘
               ▼  Tauri IPC
┌──────────────────────────────┐
│ Rust 加密核心                 │  唯一可信
│ Argon2 + AES-256-GCM           │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ SQLite（pm-app.db）           │  不可信
└──────────────────────────────┘
```

> 只有 Rust 层可以看到明文数据。

---

## 3. 主密码的安全处理

### 3.1 初始化保险箱

Vue 调用：

```js
invoke('vault_hash_password', { password })
```

Rust 内部执行：

```
Argon2id(密码 + 随机salt) → password_hash
```

数据库存储：

```
vault_master
 ├ project_id
 ├ password_hash
 └ salt
```

⚠ 主密码本身**永远不会存入数据库**

---

### 3.2 解锁保险箱

Vue：

```js
invoke('vault_verify_master', {
  masterPassword,
  passwordHash
})
```

Rust：

```
Argon2id(输入密码) == 数据库 hash ?
```

验证成功后：

* Vue 将 masterPassword 存入内存
* 数据库仍然没有任何密钥

---

## 4. 每条密码的独立加密模型

每一条密码都有自己的加密环境：

```
主密码 + 条目 salt
        ↓ Argon2 KDF
    AES-256 Key
        ↓
AES-GCM(密码, nonce)
```

数据库中存的是：

```
encrypted_password
encrypted_notes
salt
nonce
```

这样做的好处：

* 即使两个网站密码相同 → 密文也不同
* 泄露一个条目 → 不能影响其它条目

---

## 5. 加密流程（创建 / 更新密码）

Vue：

```js
invoke('vault_encrypt_entry', {
  password,
  notes,
  masterPassword
})
```

Rust：

```
1. 生成随机 salt
2. key = Argon2(masterPassword, salt)
3. 生成随机 nonce
4. AES-256-GCM(key).encrypt(data, nonce)
5. 返回 {ciphertext, salt, nonce}
```

SQLite：

```
vault_entries:
  encrypted_password
  encrypted_notes
  salt
  nonce
```

---

## 6. 解密流程（查看密码）

Vue：

```js
invoke('vault_decrypt_entry', {
  encryptedPassword,
  nonce,
  salt,
  masterPassword
})
```

Rust：

```
key = Argon2(masterPassword, salt)
AES-GCM(key).decrypt(ciphertext, nonce)
```

如果：

* 密码错
* salt 或 nonce 被改
* 数据被篡改

AES-GCM 会直接报错。

---

## 7. AES-GCM 的安全性

AES-GCM 同时提供：

| 能力  | 作用       |
| --- | -------- |
| 加密  | 数据不可读    |
| 认证  | 密码错自动失败  |
| 防篡改 | 数据被改直接报错 |

没有 padding oracle
没有 silent corruption
没有伪造密文

---

## 8. Argon2id 的作用

Argon2 被用于：

* 主密码哈希（登录）
* AES 密钥派生（加密）

它具备：

* GPU 抵抗
* 内存硬化
* 防彩虹表
* 防 ASIC

攻击者每猜一次密码，都要付出高昂成本。

---

## 9. 威胁模型（Threat Model）

| 攻击方式    | 结果           |
| ------- | ------------ |
| 数据库被偷   | 只有 AES 密文    |
| 源码泄露    | 无法解密         |
| 云同步被盗   | 无法解密         |
| 离线暴力破解  | 被 Argon2 拖慢  |
| 前端被反编译  | 拿不到密钥        |
| 内存 dump | 仅在解锁时可能      |
| 电脑被完全入侵 | 无法防（所有软件都一样） |

---

## 10. 零信任保证

这个系统是**零信任**的，因为：

* 数据库里没有密钥
* 前端不能解密
* Rust 只在运行时短暂处理明文
* 开发者也无法解密用户数据

---

## 11. 安全等级结论

你的系统在安全模型上等同于：

* Bitwarden
* 1Password
* KeePassXC

实现的是：

> **本地零信任加密密码保险库，工业级密码学架构**。