# MathPro 后端服务（FastAPI + MySQL）

MWPSolver-KS 的后端 API 服务，提供：

- 用户端：注册/登录（JWT）、解题（UniAPI）、解题记录、收藏
- 管理端：用户管理、解题模型管理、UniAPI 配置管理、记录与收藏管理

---

## 技术栈

- **框架**：FastAPI
- **数据库**：MySQL（PyMySQL 驱动）
- **ORM**：SQLAlchemy 2
- **数据校验**：Pydantic 2
- **HTTP 客户端**：httpx（调用 UniAPI 大模型）
- **认证**：JWT（PyJWT）
- **环境配置**：python-dotenv
- **密码哈希**：bcrypt
- **表单/文件上传解析**：python-multipart（用于头像上传等接口）

---

## 目录结构（与当前版本保持一致）

```text
backend/
├─ main.py                 # FastAPI 入口，注册路由，挂载 uploads，启动时可 seed 模型表
├─ config.py               # 配置（DB、JWT、UniAPI、CORS、管理员密钥等）
├─ database.py             # SQLAlchemy engine/session/base
├─ init_db.sql             # MySQL 初始化脚本（表结构 + 外键约束）
├─ requirements.txt        # Python 依赖
├─ .env.example            # 环境变量示例（不要提交真实 .env）
├─ models/                 # ORM 模型
│  ├─ user.py              # users
│  ├─ record.py            # solution_records
│  ├─ favorite.py          # favorites
│  ├─ solve_model.py       # solve_models
│  └─ system_setting.py    # system_settings
├─ schemas/                # Pydantic schemas
│  ├─ auth.py
│  ├─ solve.py
│  ├─ record.py
│  ├─ favorite.py
│  └─ admin.py
└─ routers/                # API 路由
   ├─ auth.py              # /api/auth/*
   ├─ solve.py             # /api/solve/*
   ├─ records.py           # /api/records/*
   ├─ favorites.py         # /api/favorites/*
   └─ admin.py             # /api/admin/*
```

---

## 环境要求

- Python 3.10+（推荐）
- MySQL 5.7+ / 8.0+

---

## 配置（.env）

复制示例文件并修改：

```bash
cd backend
cp .env.example .env
```

关键配置项（见 `config.py`）：

- **数据库**
  - `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
- **UniAPI**
  - `UNIAPI_BASE_URL`（可选）
  - `UNIAPI_TOKEN`（必填，否则解题/分析接口会返回提示）
  - `UNIAPI_MODEL`（默认解题模型）
  - `UNIAPI_MODEL_KNOWLEDGE` / `UNIAPI_MODEL_SEMANTIC`（可选：专用识别模型）
  - `UNIAPI_SOLVE_MODELS`（可选：当 DB 的 `solve_models` 为空时，用它回退/seed）
- **JWT**
  - `JWT_SECRET`（生产环境必须修改）
  - `JWT_EXPIRE_MINUTES`
- **管理员**
  - `ADMIN_SECRET`（访问管理端 API 的密钥）

> 说明：UniAPI 的 Base URL / Token / 默认模型等在运行时**优先从 `system_settings` 表读取**；环境变量作为默认值/回退值。

---

## 初始化数据库

在 MySQL 中执行 `init_db.sql`：

```bash
cd backend
mysql -u root -p < init_db.sql
```

当前版本 `init_db.sql` 会创建并维护以下表：

- `users`：用户（用户名、密码哈希、昵称、头像等）
- `solution_records`：解题记录（含 `user_id` 外键，用户删除后 `SET NULL`）
- `favorites`：收藏（含 `user_id` 与 `record_id` 外键，且 `(user_id, record_id)` 唯一）
- `solve_models`：解题可选模型（供用户端下拉与管理端维护）
- `system_settings`：系统配置（UniAPI Base URL/Token/默认模型等）

---

## 启动服务

安装依赖：

```bash
cd backend
pip install -r requirements.txt
```

启动（开发推荐）：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

启动后：

- 健康检查：`GET /health`
- API 文档：`/docs`

---

## 接口总览（简版）

### 用户端

- **认证**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/profile`（需登录）
  - `PATCH /api/auth/profile`（需登录）
  - `POST /api/auth/avatar/upload`（需登录）
- **解题**
  - `GET /api/solve/models`：获取可选解题大模型列表（优先 DB，空则回退 env）
  - `POST /api/solve/analyze`：识别知识点与语义情境
  - `POST /api/solve`：解题（可携带 model/knowledge_points/semantic_contexts）
- **记录**
  - `POST /api/records/save`（需登录）
  - `GET /api/records/list`
  - `GET /api/records/detail?id=...`
  - `DELETE /api/records/remove?id=...`
- **收藏**
  - `POST /api/favorites/add`（需登录）
  - `DELETE /api/favorites/remove?record_id=...`（需登录）
  - `GET /api/favorites/list`（需登录）
  - `GET /api/favorites/check?record_id=...`

### 管理端（需管理员密钥）

管理员认证方式：

- Header `X-Admin-Token: <ADMIN_SECRET>` 或
- Header `Authorization: Bearer <ADMIN_SECRET>`

主要接口（见 `routers/admin.py`）：

- 用户管理：列表/新增/编辑/删除/重置密码/上传头像
- UniAPI 配置：读取/更新（写入 `system_settings`）
- 解题模型表：CRUD（`solve_models`）
- 记录与收藏：列表/详情/删除

---

## CORS

默认允许常见的本地开发来源（见 `config.py` 的 `CORS_ORIGINS` 与 `CORS_ORIGIN_REGEX`）。
前端默认端口为 **3000**。

---

## 说明与注意事项

- 生产环境务必修改 `.env` 中的 `JWT_SECRET` 与 `ADMIN_SECRET`
- 不要将真实 `backend/.env` 提交到仓库
- 头像等上传文件会存放在 `backend/uploads/`，并通过 `/api/uploads/...` 提供静态访问

