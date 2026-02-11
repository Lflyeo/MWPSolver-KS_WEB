-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS mathpro_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mathpro_db;

-- 用户表（登录/注册）
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(64) NOT NULL COMMENT '用户名',
    password_hash VARCHAR(128) NOT NULL COMMENT '密码哈希',
    nickname VARCHAR(64) COMMENT '昵称/显示名',
    avatar_url VARCHAR(512) COMMENT '头像URL',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 若表已存在且缺少新字段，可执行以下语句（按需执行一次）
-- ALTER TABLE users ADD COLUMN nickname VARCHAR(64) COMMENT '昵称/显示名';
-- ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) COMMENT '头像URL';

-- 创建解题记录表
CREATE TABLE IF NOT EXISTS solution_records (
    id VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
    question TEXT NOT NULL COMMENT '题目原文',
    answer VARCHAR(500) COMMENT '简短答案',
    solution LONGTEXT COMMENT '完整解题过程(Markdown)',
    knowledge_points JSON COMMENT '知识点列表',
    semantic_contexts JSON COMMENT '语义情境列表',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    user_id VARCHAR(36) COMMENT '用户ID',
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    CONSTRAINT fk_solution_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解题记录表';

-- 创建收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id VARCHAR(36) PRIMARY KEY COMMENT '收藏ID',
    record_id VARCHAR(36) NOT NULL COMMENT '解题记录ID',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    UNIQUE KEY uk_user_record (user_id, record_id),
    INDEX idx_record_id (record_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_favorites_record_id FOREIGN KEY (record_id) REFERENCES solution_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- 解题模型配置表（管理员可增删改，前端 /solve/models 从此表读取，实现实时更新）
CREATE TABLE IF NOT EXISTS solve_models (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    model_id VARCHAR(128) NOT NULL COMMENT '模型ID，如 gpt-5.2',
    display_name VARCHAR(128) NOT NULL COMMENT '展示名称',
    sort_order INT DEFAULT 0 COMMENT '排序，越小越靠前',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用 1=是 0=否',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_model_id (model_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解题可选模型表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_settings (
    `key`   VARCHAR(64) PRIMARY KEY COMMENT '配置键，如 UNIAPI_BASE_URL',
    `value` TEXT COMMENT '配置值，文本格式'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';
