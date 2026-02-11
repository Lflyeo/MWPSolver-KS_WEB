# 本地 MySQL 配置指南

## 1. 检查 MySQL 服务是否启动

### Windows

**方法一：服务管理器**
1. 按 `Win + R`，输入 `services.msc`，回车
2. 找到 `MySQL` 或 `MySQL80` 服务
3. 确认状态为"正在运行"
4. 如果未运行，右键点击 -> "启动"

**方法二：命令行**
```powershell
# 检查 MySQL 服务状态
net start | findstr MySQL

# 如果未启动，启动 MySQL（需要管理员权限）
net start MySQL
# 或
net start MySQL80
```

### 检查 MySQL 是否正常运行

```bash
# 测试连接（会提示输入密码）
mysql -u root -p

# 如果连接成功，说明 MySQL 服务正常
```

## 2. 配置 .env 文件

确保 `backend/.env` 文件配置正确：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=mathpro_db
```

**注意**：
- `DB_HOST` 必须是 `localhost` 或 `127.0.0.1`
- `DB_PORT` 默认是 `3306`，如果 MySQL 使用其他端口需要修改
- `DB_PASSWORD` 是你的 MySQL root 密码（不是空密码）
- `DB_NAME` 是数据库名称，可以保持 `mathpro_db`

## 3. 创建数据库和表

### 方法一：使用 MySQL 命令行

```bash
# 1. 连接到 MySQL
mysql -u root -p

# 2. 执行 SQL（复制 init_db.sql 的内容）
CREATE DATABASE IF NOT EXISTS mathpro_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mathpro_db;

CREATE TABLE IF NOT EXISTS solution_records (
    id VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
    question TEXT NOT NULL COMMENT '题目原文',
    answer VARCHAR(500) COMMENT '简短答案',
    solution LONGTEXT COMMENT '完整解题过程(Markdown)',
    knowledge_points JSON COMMENT '知识点列表',
    semantic_contexts JSON COMMENT '语义情境列表',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    user_id VARCHAR(36) COMMENT '用户ID(预留)',
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解题记录表';

# 3. 退出
exit;
```

### 方法二：直接执行 SQL 文件

```bash
# 在项目根目录执行
mysql -u root -p < backend/init_db.sql
```

### 方法三：使用数据库管理工具

使用 Navicat、DBeaver、MySQL Workbench、phpMyAdmin 等工具：

1. 连接到本地 MySQL
2. 执行 `backend/init_db.sql` 文件中的 SQL

## 4. 测试数据库连接

运行测试脚本：

```bash
cd backend
python test_db_connection.py
```

**期望输出**：
```
==================================================
数据库连接测试
==================================================
数据库主机: localhost
数据库端口: 3306
数据库用户: root
数据库名称: mathpro_db
密码: ******
--------------------------------------------------
正在尝试连接 MySQL...
✅ MySQL 连接成功！
✅ 数据库 'mathpro_db' 已存在
```

## 5. 常见问题排查

### 问题 1：MySQL 服务未启动

**错误信息**：
```
(2003, "Can't connect to MySQL server on 'localhost'")
```

**解决方案**：
1. 启动 MySQL 服务（见步骤 1）
2. 检查 MySQL 是否安装正确

### 问题 2：数据库不存在

**错误信息**：
```
(1049, "Unknown database 'mathpro_db'")
```

**解决方案**：
1. 执行 `init_db.sql` 创建数据库（见步骤 3）
2. 或手动创建数据库：
   ```sql
   CREATE DATABASE mathpro_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 问题 3：密码错误

**错误信息**：
```
(1045, "Access denied for user 'root'@'localhost'")
```

**解决方案**：
1. 检查 `.env` 文件中的 `DB_PASSWORD` 是否正确
2. 如果忘记密码，可以重置 MySQL root 密码

### 问题 4：端口错误

**错误信息**：
```
(2003, "Can't connect to MySQL server")
```

**解决方案**：
1. 检查 MySQL 实际使用的端口：
   ```sql
   SHOW VARIABLES LIKE 'port';
   ```
2. 如果端口不是 3306，修改 `.env` 中的 `DB_PORT`

### 问题 5：MySQL 未安装

**解决方案**：
1. 下载安装 MySQL：
   - 官网：https://dev.mysql.com/downloads/mysql/
   - 或使用 XAMPP/WAMP（包含 MySQL）
2. 安装完成后，设置 root 密码
3. 启动 MySQL 服务

## 6. 验证配置

完成以上步骤后，启动后端服务：

```bash
cd backend
python main.py
```

访问 `http://localhost:8000/health` 检查服务是否正常。

然后在前端测试保存功能，应该可以正常保存数据了。

## 7. 快速检查清单

- [ ] MySQL 服务已启动
- [ ] `.env` 文件配置正确（主机、端口、用户名、密码）
- [ ] 数据库 `mathpro_db` 已创建
- [ ] 表 `solution_records` 已创建
- [ ] `test_db_connection.py` 测试通过
- [ ] 后端服务可以正常启动
