# 开发规范

## 1. 基线

- 宿主：**DeepSeek Harness `0.2.2-rc.5`**。
- Node.js **≥ 24.9**、pnpm **11.28.5**、TypeScript strict。
- `pnpm-lock.yaml` 必须入库；CI 使用 `pnpm install --frozen-lockfile`。
- 插件通过 Cordis `apply(ctx)` 与 `cordis.patch.yml` 安装，保持宿主扩展边界。

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm check:manifest
node --experimental-transform-types --test integration/*.test.ts
```

## 2. 目录与边界

| 位置                     | 责任                                          |
| ------------------------ | --------------------------------------------- |
| `src/domain/`            | 数据结构、状态机、校验、Repository            |
| `src/host/`              | Cordis 服务、认证 RPC、DSH Agent/Session 适配 |
| `src/client/`            | React UI、DSH 原生 Slot、右侧 Sidebar         |
| `src/shared/`            | Client / Host 共享的通道常量                  |
| `tests/`、`integration/` | 领域测试与真实 DSH API 桥接测试               |

Host 与 Client 必须保持运行时分离：Node 模块不能进入浏览器 Bundle；跨边界只共享可序列化协议和类型。不要用 `any` 绕过权限、Session 身份或参数校验。

### DSH Client 产物

Client **不可输出裸 ESM**。DSH Web/Desktop 以经典脚本加载扩展，`tsdown.config.ts` 生成 `lib/client.js`，外层必须是：

```js
window.__ModuleLoader__.load({
  id: '@jonge/dsh-sidechat',
  factory: (require) => {
    // bundled client code
    return module.exports
  },
})
```

`scripts/check-build.mjs` 会执行该包装并核对模块 ID 与工厂格式；不要只检查文件存在。

## 3. 标识与数据

- npm 包：`@jonge/dsh-sidechat`。
- DSH 插件 ID：`dsh-external/dsh-sidechat`；Cordis ID：`dsh-sidechat`。
- Client Loader ID 与 npm 包名一致。
- RPC 通道：`/sidechat`。
- 元数据：`dshHomePath('state', 'sidechat.json')`。
- 子 Session：`session-sidechat-{noteId}`。

项目已进入正式发布流程；早期试验包名、模块 ID 或存储路径不属于公开契约，不为其维护迁移代码。元数据 Repository 是单进程 JSON 实现；不要跨多个 DSH Host 进程并发写同一个文件。

## 4. 交互与安全约定

- 原生右 Sidebar 是唯一侧聊目录；不要恢复浮动圆点轨道。
- 选区入口在鼠标释放或键盘选区完成后出现，与原生「引用文本」胶囊共存；不要在 `selectionchange` 中改写 DOM 或 selection。
- 全回复定位指向 `assistant-step` 正文，不指向 `turn-tail` 操作栏；选区只高亮匹配范围。
- 使用 DSH `--dsw-*` Token、原生图标与 Tooltip；适配深浅主题、窄窗口与减少动效。
- **Host 侧**验证调用者、父 Session、锚点、参数和工具权限；不能只靠 UI 或提示词。
- 默认拒绝侧聊 Agent 的全部工具执行；主 Session 永远不能被隐式追加、注入或修改。
- 不记录 Token、原始选中内容、私密消息或工作区文件内容。
- 回流只写主对话草稿，**永不自动发送**；升格与回流保持独立。

## 5. 验证与提交

- 改动 Domain / Coordinator：运行 `pnpm test`。
- 改动 Host/Client 接口或 DSH 接入：运行 `pnpm typecheck`、`pnpm build`、相关集成测试与 DSH Web Profile 冒烟。
- 改动发布元数据：运行 `pnpm check:manifest` 与 `npm pack --dry-run`。
- 构建、CI 或 RPC 冒烟通过**不等于** Desktop 真实模型与 UX 验收通过；未验证项必须明确标注。
- 使用 Conventional Commits，按功能模块提交，一次包含实现、类型、必要测试与文档；避免一文件一提交。
- 禁止提交 `node_modules`、构建输出、Token、`.npmrc` 机密内容。

## 6. npmjs.org 发布

唯一公开包名：**`@jonge/dsh-sidechat`**。工作流：
[`publish-npm.yml`](../.github/workflows/publish-npm.yml)，**仅手动触发**，仅允许主仓库 `master`。

工作流会先执行类型检查、构建、单元/桥接测试、Manifest 与 npm pack 检查，再发布公开包。

- 推荐使用 npm Trusted Publishing：完成配置后选择 `oidc`，使用 GitHub OIDC，不保留长期发布 Token。
- 若尚未配置可信发布，可配置仓库 Secret `NPM_TOKEN` 并选择 `npm-token` 完成一次 bootstrap；遵守 npm 当前 2FA / Token 发布要求。
- 正式版本使用 `latest` dist-tag；已发布的 `name@version` 不可覆盖。

不要自动触发发布，也不要引入 GitHub Packages 工作流。参见
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。
