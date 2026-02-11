## MWPSolver-KS

增强型 LLMs 驱动的数学应用题求解系统（前端 Web 应用）。

MWPSolver-KS 通过「知识点标注」和「语义情境分析」两类专用模型，对数学应用题进行结构化理解，再结合大模型完成解题与讲解，适用于教学辅助、练习解析等场景。

---

### 特性概览

- **智能解题流程**
  - 题目输入后，系统会先调用「知识点识别模型」与「语义情境识别模型」，理解题目所涉及的数学概念与应用场景。
  - 在此基础上，构造增强型 prompt 调用解题大模型，生成逐步推理与最终答案。
- **知识点标注**
  - 自动提取题目背后的数学知识点（如：代数、几何、概率等）。
  - 以标签形式展示，便于学生理解题目涉及的知识范围。
- **语义情境分析**
  - 自动识别题目语境（如：鸡兔同笼、工程问题、行程问题等）。
  - 帮助建立「真实情境 → 数学模型」的桥梁。
- **解题记录与收藏**
  - 自动保存每次解题的题目、步骤与答案。
  - 支持「我的解题记录」「我的收藏」查看与管理。
- **管理后台**
  - 用户管理：新增 / 编辑 / 删除用户，头像管理，管理员重置密码。
  - 解题大模型管理：配置前端可选的解题模型列表。
  - 知识点识别模型管理：配置「知识点标注」所用模型。
  - 语义情境识别模型管理：配置「语义情境识别」所用模型。
  - 解题记录管理、收藏记录管理。
- **前端技术栈**
  - React 18 + TypeScript + React Router 7
  - Vite 6 构建
  - Tailwind CSS 风格的现代 UI（配合自定义样式）
  - `lucide-react` 图标、`sonner` 消息提示、`recharts` 数据可视化（如需要）

---

### 技术栈

- **语言与框架**
  - React 18
  - TypeScript
  - React Router DOM 7
- **构建工具**
  - Vite 6
  - vite-tsconfig-paths（支持 `@/` 路径别名）
- **UI 与交互**
  - Tailwind CSS（通过 `index.css` 及工具类实现）
  - lucide-react（图标）
  - framer-motion（动画，可用于动效）
  - sonner（全局消息 / Toast）
- **内容展示与数学公式**
  - react-markdown + remark-gfm（渲染模型输出的 Markdown 解答）
  - remark-math + rehype-katex + KaTeX（渲染题解中的 LaTeX 数学公式）
- **数据与校验**
  - zod（数据结构与校验）
  - recharts（图表展示，若有用到统计可视化）
- **包管理**
  - pnpm

---

### 目录结构（核心部分）

仅列出与业务密切相关的主要目录，便于快速理解：

```text
MathPro_Web/
├─ package.json          # 项目依赖与脚本
├─ vite.config.ts        # Vite 配置（请勿修改）
├─ tsconfig.json         # TypeScript 配置（请勿修改）
├─ src/
│  ├─ main.tsx           # 应用入口，挂载到 #root
│  ├─ App.tsx            # 路由配置（用户端 + 管理端）
│  ├─ index.css          # 全局样式（整合 Tailwind 风格）
│  ├─ components/
│  │  ├─ Layout.tsx      # 用户端主布局（头部、内容区域等）
│  │  └─ ...             # 其它复用 UI 组件
│  ├─ contexts/
│  │  └─ authContext.tsx # 登录态上下文，管理用户认证状态
│  ├─ lib/
│  │  ├─ api.ts          # 后端 API 封装、BASE_URL / getApiUrl / token 等
│  │  └─ utils.ts        # 通用工具函数
│  ├─ services/          # 与后端交互的 API 封装
│  │  ├─ auth.ts         # 登录 / 注册 / Token 相关 API
│  │  ├─ solve.ts        # 解题相关：获取模型列表、分析、解题
│  │  ├─ records.ts      # 解题记录列表、详情、保存
│  │  ├─ favorites.ts    # 收藏增删查
│  │  └─ admin.ts        # 管理端相关 API（用户、模型配置等）
│  ├─ pages/
│  │  ├─ user/           # 用户端页面
│  │  │  ├─ Home.tsx             # 首页：系统介绍 + 快捷入口 + 最近解题
│  │  │  ├─ ProblemInput.tsx     # 解题页：输入题目，选择大模型，查看对话流
│  │  │  ├─ ProblemResult.tsx    # 解题结果详情：题目 + 步骤 + 答案 + 标签
│  │  │  ├─ ProblemRecords.tsx   # 解题记录列表
│  │  │  ├─ MyFavorites.tsx      # 收藏列表
│  │  │  ├─ MyPage.tsx           # 个人中心（如有）
│  │  │  ├─ Login.tsx            # 用户登录
│  │  │  └─ Register.tsx         # 用户注册
│  │  └─ admin/         # 管理后台页面
│  │     ├─ AdminLayout.tsx          # 管理端布局（左侧菜单 + 主内容）
│  │     ├─ AdminLogin.tsx           # 管理员登录
│  │     ├─ AdminUsers.tsx           # 用户管理
│  │     ├─ AdminModels.tsx          # 解题大模型管理 + UniAPI 接口配置
│  │     ├─ AdminKnowledgeModels.tsx # 知识点识别模型管理
│  │     ├─ AdminSemanticModels.tsx  # 语义情境识别模型管理
│  │     ├─ AdminRecords.tsx         # 解题记录管理
│  │     ├─ AdminRecordResultModal.tsx # 记录详情弹窗（管理端查看）
│  │     └─ AdminFavorites.tsx       # 收藏记录管理
│  └─ types/
│     └─ problem.ts       # 题目 / 记录相关的类型定义
└─ ...
```

---

### 路由与页面说明

#### 用户端路由（`/` 前缀）

- `/`  
  - 首页，展示系统简介、核心特点、快速入口（解题 / 解题记录 / 我的收藏）以及最近几条解题记录。
- `/problem-input`（需登录）  
  - 输入题目文本，选择解题大模型，点击「开始解题」。
  - 页面中间以类似 Chat 的对话流展示：
    - 用户问题
    - 「正在识别知识点与语义情境」阶段
    - 标注结果（知识点 + 语义情境）
    - 「正在解题」阶段
    - 解答卡片（可点击「查看完整解析」跳到详情页）
- `/problem-result/:id`（需登录）  
  - 展示单条解题记录详情：
    - 左侧：题目内容 + 知识点标签 + 语义情境标签（支持吸顶）
    - 右侧：按步骤展示的解题过程 + 最终答案区域
    - 顶部：返回、收藏 / 取消收藏、复制题目与解答、预留的分享按钮
- `/problem-records`（需登录）  
  - 列表视图，展示当前用户的解题记录。
- `/my-favorites`（需登录）  
  - 列出当前用户收藏的题目记录，可点击进入详情。
- `/mypage`（需登录）  
  - 个人中心（视实现情况展示基本信息 / 统计等）。
- `/login`  
  - 用户登录页。
- `/register`  
  - 用户注册页。

> 说明：用户端受保护的路由由 `App.tsx` 中的 `ProtectedRoute` 组件实现，依赖 `AuthContext` 中的 `isAuthenticated` / `authReady` 状态。

#### 管理端路由（`/admin` 前缀）

- `/admin/login`  
  - 管理员登录。
- `/admin` + 子路由（均需管理员 Token）：
  - `/admin/users`  
    - 用户管理：列表、搜索、分页、编辑、删除、新增用户。
    - 编辑支持：昵称、头像 URL 或上传头像、重置密码。
  - `/admin/models`  
    - 解题大模型管理：
      - 上半部分：UniAPI 接口配置（Base URL、Token）。
      - 下半部分：可供前端选择的「解题大模型」列表（模型 ID / 展示名称 / 排序 / 启用状态）。
  - `/admin/knowledge-models`  
    - 知识点识别模型列表管理（类似 `AdminModels`）。
  - `/admin/semantic-models`  
    - 语义情境识别模型列表管理。
  - `/admin/records`  
    - 全局解题记录管理：支持管理员查看所有用户的解题记录，并通过弹窗查看详情。
  - `/admin/favorites`  
    - 收藏记录管理。

---

### 接口与认证约定（前端视角）

#### API 基础配置

在 `src/lib/api.ts` 中定义：

- **基础地址**：  
  - `BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'`
- **统一前缀**：  
  - `API_PREFIX = '/api'`

常用封装方法：

- `apiGet(path, params?)`
- `apiPost(path, body)`
- `apiPatch(path, body)`
- `apiDelete(path, params?)`

> 示例：`/api/solve/analyze`、`/api/solve/models`、`/api/records/list` 等均会在此基础上拼接请求。

#### 身份认证

- 前端使用 `localStorage` 存储用户 token：
  - 键名：`mathpro_token`（见 `AUTH_TOKEN_KEY`）。
- 每次请求时自动在 Header 中附带：
  - `Authorization: Bearer <token>`
- `AuthProvider` + `AuthContext` 负责：
  - 在应用初始化时读取本地 Token，校验登录状态。
  - 提供 `isAuthenticated` / `authReady` 给路由守卫 `ProtectedRoute` 使用。

---

### 环境变量

在运行 / 构建项目前，可通过 `.env` 或环境变量配置：

- **`VITE_API_BASE_URL`**（推荐配置）
  - 类型：字符串
  - 示例：`http://localhost:8000` 或后端线上地址
  - 作用：
    - 决定所有 `/api/...` 请求的后端服务地址。
    - 影响头像等静态资源 `getAssetUrl` 的完整 URL 拼接。

如果未配置，则默认使用 `http://localhost:8000` 作为后端地址。

---

### 本地开发

#### 环境准备

- 安装 [Node.js](https://nodejs.org/en)（建议 18+）
- 安装 [pnpm](https://pnpm.io/installation)

#### 安装依赖

```sh
pnpm install
```

#### 启动开发服务器

```sh
# 简写
pnpm dev

# 等价于
pnpm dev:client
```

默认会在 `http://localhost:3000` 启动前端开发服务器。

> 提示：请确保后端 API 服务也已在 `VITE_API_BASE_URL` 指向的地址启动（默认为 `http://localhost:8000`），否则前端的解题 / 登录等请求会失败。

---

### 构建与部署

#### 构建前端静态资源

```sh
# 仅构建前端
pnpm build:client

# 或使用完整构建（包含少量打包产物辅助文件）
pnpm build
```

- `pnpm build:client`：
  - 使用 Vite 构建前端，输出到 `dist/static`。
- `pnpm build`：
  - 清空 `dist` 目录。
  - 构建前端到 `dist/static`。
  - 复制 `package.json` 到 `dist`。
  - 创建 `dist/build.flag` 文件（可被后端或部署脚本用作“已构建”标记）。

#### 部署建议

- 将前端构建产物 `dist/static` 作为静态资源目录，由后端或静态服务器（如 Nginx）托管。
- 所有非静态资源路由（如 `/problem-input`、`/admin/users` 等）应回退到 `index.html`，由前端路由（React Router）接管。
- 确保部署环境中设置了正确的 `VITE_API_BASE_URL`，指向后端 API 服务地址。

---

### 解题流程（业务视角）

以用户在 `/problem-input` 页面发起一次解题为例：

1. **用户输入题目文本**，并选择一个解题大模型（前端从 `/api/solve/models` 拉取模型列表）。
2. **前端调用分析接口**（如：`/api/solve/analyze`）：
   - 得到：`knowledge_points`（知识点数组）、`semantic_contexts`（语义情境数组）。
   - 前端在对话流中以「识别结果」卡片展示这些标签。
3. **前端调用解题接口**（如：`/api/solve`）：
   - 请求体中会携带题目文本 + 上一步识别到的知识点 / 语义情境。
   - 后端根据配置的大模型，构造增强型 prompt，调用大模型完成解题。
4. **前端展示解答**：
   - 对话流中以「解答」卡片形式展示解题过程（部分内容，如果比较长会有滚动区域或入口）。
5. **自动保存解题记录**：
   - 调用 `/api/records/save`（在 `recordSave` 中封装），将题目、步骤、知识点、语义情境等保存到数据库。
   - 保存成功后返回记录 ID，用户可以通过「查看完整解析」跳转到 `/problem-result/:id` 查看完整详情。

---

### 管理端配置与运维要点

- **UniAPI 配置（解题大模型接口）**
  - 在「解题模型管理」页（`/admin/models`）上方卡片中配置：
    - `API Base URL`：大模型统一接口地址（UniAPI 服务地址）。
    - `API Token`：访问大模型接口所需的密钥。
  - 保存后前端会调用 `/api/admin/uniapi-config` 相关接口，更新后端配置，通常无需重启服务即可生效。

- **解题大模型列表**
  - 同一页面下方的表格配置：
    - `模型 ID`：对接 UniAPI / 后端的大模型标识，如 `gpt-5.2`、`deepseek-v3`。
    - `展示名称`：前端下拉列表中展示的名称。
    - `排序`：数字越小排序越靠前。
    - `启用`：控制是否在用户端下拉列表中出现。
  - 如果数据库为空，前端会回退到环境变量（如 `UNIAPI_SOLVE_MODELS`）配置的默认模型集合（由后端实现）。

- **知识点 / 语义情境模型列表**
  - 对应 `/admin/knowledge-models`、`/admin/semantic-models` 页面：
    - 用于配置不同的专用识别模型，便于替换或 A/B 测试。

- **用户管理**
  - 管理员可在 `/admin/users`：
    - 创建新用户（用户名 + 密码）。
    - 为用户上传 / 修改头像。
    - 重置用户密码。
    - 删除用户（通常保留其解题记录，但不再关联）。

---

### 常见问题（FAQ）

- **Q：前端启动后访问页面接口报错 / 白屏？**  
  A：
  1. 确认后端 API 服务已启动。
  2. 确认本地或部署环境中设置了正确的 `VITE_API_BASE_URL`。
  3. 检查浏览器控制台的网络请求是否指向了正确的地址。

- **Q：登录状态丢失？**  
  A：
  1. 前端使用 `localStorage` 存储 token，如果清理浏览器存储会导致需要重新登录。
  2. 如后端对 token 做了失效处理（如过期 / 手动注销），也会要求重新登录。

- **Q：构建后如何部署？**  
  A：
  1. 执行 `pnpm build`。
  2. 将 `dist/static` 作为前端静态目录。
  3. 配置服务器将所有未命中的路由回退到 `index.html`，由前端路由接管。

---

### 致谢

- 感谢开源社区提供的优秀工具链（React、Vite、TypeScript、Tailwind、lucide-react、sonner 等）。

