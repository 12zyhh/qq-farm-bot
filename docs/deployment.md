# QQ经典农场助手 - 部署文档

## 1. 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | v18+ (推荐 v20+) |
| 操作系统 | Windows 10/11 |
| 包管理器 | npm |

## 2. 开发环境

### 2.1 安装依赖

```bash
npm install
```

### 2.2 启动开发模式

**CLI 模式**（原始命令行脚本）：

```bash
node client.js --code <你的code> --platform qq
```

**Electron 桌面应用**（开发模式）：

```bash
# 先构建前端，再启动 Electron
npm run electron:dev
```

### 2.3 仅构建前端

```bash
npx vite build
```

## 3. 打包发布

### 3.1 构建 exe 安装包

```bash
npm run electron:build
```

构建产物位于 `release/` 目录：

| 文件 | 说明 |
|------|------|
| `QQ经典农场助手 Setup 2.0.0.exe` | NSIS 安装程序 |
| `win-unpacked/QQ经典农场助手.exe` | 免安装版，可直接运行 |

### 3.2 免安装部署

将 `release/win-unpacked/` 整个文件夹复制到目标电脑即可运行，无需安装 Node.js。

## 4. 使用说明

### 4.1 获取 code

1. 手机安装 Fiddler 证书（需 root 安装为系统证书）
2. 电脑开启 Fiddler Classic，手机设置代理
3. 手机打开 QQ → 农场小程序
4. 在 Fiddler 中找到 `gate-obt.nqf.qq.com` 请求，提取 URL 中的 `code` 参数

详细步骤参见 `docs/fiddler-capture-guide.md`。

### 4.2 启动应用

1. 运行 `QQ经典农场助手.exe`
2. 在首页输入 code，选择平台（QQ/微信），点击「连接」
3. 连接成功后，功能自动开始运行
4. 关闭窗口会最小化到系统托盘，后台持续运行
5. 右键托盘图标可选择「显示窗口」或「退出」

### 4.3 功能说明

| 功能 | 说明 |
|------|------|
| 自动收获 | 自动收获成熟作物 |
| 自动种植 | 收获后自动种植新作物 |
| 自动施肥 | 自动为作物施肥加速生长 |
| 自动除草/除虫/浇水 | 自动处理田地异常状态 |
| 好友巡查 | 自动巡查好友农场 |
| 自动偷菜 | 自动采摘好友成熟作物 |
| 帮忙操作 | 帮好友除草/除虫/浇水 |
| 自动任务 | 自动领取和完成每日任务 |

### 4.4 种植策略

- **自动最优**：系统根据当前等级，自动选择经验效率最高的作物
- **手动选择**：从下拉列表中选择指定作物种植

## 5. 长期运行部署

适用于将脚本部署到公司电脑 24 小时运行的场景：

1. 将 `win-unpacked/` 文件夹复制到目标电脑
2. 运行 `QQ经典农场助手.exe`，输入 code 连接
3. 关闭窗口（自动最小化到托盘）
4. 可将 exe 添加到 Windows 开机启动项

**注意**：code 有效期有限，断线后需要重新获取 code 并连接。

## 6. 项目结构

```
qq-farm-bot/
├── electron/          # Electron 主进程
│   ├── main.js        # 应用入口
│   ├── preload.js     # IPC 桥接
│   ├── ipc.js         # IPC 通道处理
│   ├── bot.js         # 机器人核心控制器
│   ├── store.js       # 配置持久化
│   ├── planner.js     # 种植策略计算
│   └── tray.js        # 系统托盘
├── src/               # 原有后端模块
├── renderer/          # Vue 3 前端
├── proto/             # Protobuf 定义
├── gameConfig/        # 游戏配置数据
├── release/           # 打包输出
└── docs/              # 文档
```
