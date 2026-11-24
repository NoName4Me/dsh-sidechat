# 系统架构

> **旁敲侧击 / Side Chat** · 面向 DeepSeek Harness `0.2.2-rc.5`
>
> 本文描述**当前源码已经实现的架构**。自动化检查与维护者本地验收状态见
> [路线图](roadmap.md)。

## 1. 架构原则

1. **Host 是唯一权威**：授权、父子 Session 归属、上下文边界、生命周期和工具限制都在 Host 执行。
2. **主对话不可隐式变更**：侧聊永远不向父 Session 追加、注入或修改消息。
3. **Client 只做投影与意图**：浏览器负责入口、目录、消息展示和来源定位，不直接读写 Session 存储。
4. **运行时严格分层**：Host 为 Node ESM，Client 为 DSH 经典脚本模块工厂，跨边界只传可序列化协议。
5. **子 Session 身份可恢复**：`session-sidechat-{noteId}` 是确定性的；创建与绑定失败后可以重试，不产生孤儿。
6. **默认拒绝**：侧聊 Agent 的工具执行全部由 Host 工具守卫拒绝，不依赖提示词或隐藏 UI。
7. **显式回流**：复制或插入主对话草稿由用户主动触发；升格是另一条独立路径。

## 2. 运行时总览

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif","fontSize":"14px","primaryColor":"#EEF3FF","primaryTextColor":"#1D2433","primaryBorderColor":"#4F6FE8","lineColor":"#94A3B8","secondaryColor":"#F6F8FC","tertiaryColor":"#FFFFFF","background":"#FFFFFF","mainBkg":"#EEF3FF","nodeBorder":"#4F6FE8","clusterBkg":"#F8FAFF","clusterBorder":"#DCE4F5","edgeLabelBackground":"#FFFFFF","titleColor":"#1D2433","nodeTextColor":"#1D2433"},"flowchart":{"curve":"basis","nodeSpacing":38,"rankSpacing":52,"padding":14,"useMaxWidth":true}}}%%
flowchart TB
  subgraph CLIENT["Client · DSH 浏览器 / Desktop"]
    direction LR
    C1["入口<br/>回复操作 · 选区胶囊"] --> C2["原生右 Sidebar<br/>目录 · 会话 · 轮次导航"] --> C3["来源与回流<br/>锚点定位 · 草稿引用"] --> C4["主对话输入草稿"]
  end
  subgraph EDGE["认证边界"]
    direction LR
    R1["DSH WebServer<br/>auth: required"] --> R2["/sidechat<br/>owner · 参数校验"]
  end
  subgraph HOST["Host · Cordis 插件"]
    direction TB
    H1["Coordinator<br/>授权 · 幂等 · 单飞"]
    H2["Domain<br/>状态机 · revision"]
    H3["Session Adapter<br/>Light / Fork · 归档 · 工具拒绝"]
    H4["History<br/>文本投影"]
    H1 --> H2
    H1 --> H3
    H1 --> H4
  end
  subgraph DSH["DeepSeek Harness"]
    direction LR
    D1["Agent / Session"] --> D2["Session Log"]
    D3["Workspace Registry"]
  end
  STORE[("state/sidechat.json")]
  C2 --> R1
  R2 --> H1
  R2 -. "只读历史" .-> H4
  H2 --> STORE
  H3 --> D1
  H3 --> D3
  classDef client fill:#EEF3FF,stroke:#4F6FE8,stroke-width:1.5px,color:#1D2433
  classDef host fill:#F2EEFF,stroke:#7A6AE6,stroke-width:1.5px,color:#1D2433
  classDef dsh fill:#EAF8F1,stroke:#2E9E6B,stroke-width:1.5px,color:#1D2433
  classDef store fill:#FFF6E5,stroke:#D99A2B,stroke-width:1.5px,color:#1D2433
  classDef edge fill:#FFFFFF,stroke:#94A3B8,stroke-width:1.5px,color:#334155
  class C1,C2,C3,C4 client
  class H1,H2,H3,H4 host
  class D1,D2,D3 dsh
  class STORE store
  class R1,R2 edge
```

| 层       | 代码位置                                       | 责任                                                           |
| -------- | ---------------------------------------------- | -------------------------------------------------------------- |
| Client   | `src/client/`                                  | 入口、意图、原生右 Sidebar、目录、消息投影、来源定位、草稿回填 |
| 认证 RPC | `src/host/secured-route.ts`、`src/host/rpc.ts` | DSH 认证、owner 校验、请求大小与参数校验、结构化错误           |
| Host     | `src/host/index.ts`、`coordinator.ts`          | 生命周期编排、授权、幂等、单飞、Agent/Session 协作             |
| Domain   | `src/domain/`                                  | 记录模型、状态转移、校验、JSON Repository                      |
| DSH      | 宿主服务                                       | Agent 推理、Session 事件日志、Fork、归档/恢复、工作区归属      |
| Store    | `state/sidechat.json`                          | Side Chat 元数据；不复制完整对话历史                           |

## 3. 模块地图

| 模块         | 关键文件                             | 说明                                                                                |
| ------------ | ------------------------------------ | ----------------------------------------------------------------------------------- |
| 插件入口     | `src/host/index.ts`                  | 注入 `agents`、`sessionQuery`、`workspaceRegistry`、`tools`、`webServer` 等宿主服务 |
| RPC 路由     | `src/host/rpc.ts`                    | `list/create/get/history/followup/cancel/archive/restore/promote`                   |
| Web 边界     | `src/host/secured-route.ts`          | `auth: required` 前缀路由；96 KB 请求上限；拒绝匿名调用                             |
| 授权         | `src/host/access.ts`                 | 从 DSH Session 日志验证父 Session 与锚点，而非信任浏览器                            |
| 编排         | `src/host/coordinator.ts`            | 授权、幂等、并发合并、`ensureBound`、`hydrate`、升格                                |
| Session 适配 | `src/host/dsh-session-adapter.ts`    | 确定性子 Session、Light/Fork 创建、归档/恢复、升格                                  |
| 官方桥接     | `src/host/dsh-runtime-bridge.ts`     | `agents.create/resume`、`buildForkSeed`、`workspaceRegistry`、`tools.guard`         |
| 历史投影     | `src/host/history.ts`                | 过滤 Fork 继承前缀，仅返回受限的 user/assistant 文本与 reasoning                    |
| Client 入口  | `src/client/index.ts`                | 注册右侧标签页、消息操作、选区操作、锚点层                                          |
| 侧聊页面     | `src/client/SideChatOverlay.tsx`     | 目录、创建、会话、工具栏、升格入口                                                  |
| 意图与目录   | `src/client/intent.ts`、`catalog.ts` | 跨 Slot 的发起意图、Session 级目录缓存与预览                                        |
| 来源定位     | `src/client/source-anchor.ts`        | 定位 `assistant-step` 正文与文本 Range；不指向 `turn-tail`                          |
| 草稿回填     | `src/client/bring-back.ts`           | 调用主对话编辑器 `insertQuote`，不发送消息                                          |

## 4. 关键流程

### 4.1 创建侧聊与选择上下文

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif","fontSize":"14px","primaryColor":"#EEF3FF","primaryTextColor":"#1D2433","primaryBorderColor":"#4F6FE8","lineColor":"#94A3B8","secondaryColor":"#F6F8FC","tertiaryColor":"#FFFFFF","background":"#FFFFFF","mainBkg":"#EEF3FF","nodeBorder":"#4F6FE8","clusterBkg":"#F8FAFF","clusterBorder":"#DCE4F5","edgeLabelBackground":"#FFFFFF","titleColor":"#1D2433","nodeTextColor":"#1D2433"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":52,"padding":14,"useMaxWidth":true}}}%%
flowchart TD
  A["Client：create<br/>parentSessionId · anchor · mode"] --> B["认证 RPC<br/>owner + 参数校验"]
  B --> C["Coordinator<br/>验证父 Session 与锚点归属"]
  C --> D{"clientRequestId<br/>已存在？"}
  D -- "是，内容一致" --> E["复用现有 SideChat"]
  D -- "是，内容不同" --> X["CONFLICT"]
  D -- "否" --> F["Domain：写入 active 记录<br/>childSessionId = null"]
  E --> G["ensureBound"]
  F --> G
  G --> H{"已绑定<br/>子 Session？"}
  H -- "是" --> I["返回现有记录"]
  H -- "否" --> J["Adapter.ensure<br/>session-sidechat-{noteId}"]
  J --> K{"子 Session<br/>已持久化？"}
  K -- "是" --> L["临时 unarchive → resume<br/>→ 重新 archive"]
  K -- "否" --> M["读取父 Session 事件"]
  M --> N["定位锚点所在或之后<br/>第一个 turn/end"]
  N --> O{"mode"}
  O -- "light" --> P["agents.create<br/>注入标题与受限引用"]
  O -- "fork" --> Q["buildForkSeed<br/>继承该已完成轮次之前的事件"]
  P --> R["archive 隐藏子 Session"]
  Q --> R
  L --> S["Domain：bindSession"]
  R --> S
  S --> T["返回 SideChat"]
  T --> U["Client 立即 followup 首个问题"]
  classDef client fill:#EEF3FF,stroke:#4F6FE8,stroke-width:1.5px,color:#1D2433
  classDef host fill:#F2EEFF,stroke:#7A6AE6,stroke-width:1.5px,color:#1D2433
  classDef dsh fill:#EAF8F1,stroke:#2E9E6B,stroke-width:1.5px,color:#1D2433
  classDef risk fill:#FFF1F0,stroke:#D9534F,stroke-width:1.5px,color:#7A1F1C
  class A,U client
  class B,C,E,F,G,H,I,J,L,M,N,O,P,Q,R,S,T host
  class X risk
```

**上下文边界规则**

- **Light**：不继承父 Session 事件；只把标题和最多 8,000 字符的选中文本作为子 Agent 的首步来源上下文。
- **Fork**：从锚点消息出发，找到锚点所在或紧随其后的第一个 `turn/end`，只继承该已完成轮次之前的事件。锚点后尚未完成或之后的对话不会进入子 Session。
- 两种模式都通过 DSH Agent 生命周期创建持久化子 Session；不把内存 `fork()` 当成完整 Agent。
- 若锚点消息不存在或锚点轮次尚未完成，创建失败，不生成子 Session。
- 元数据先写入、Session 后绑定是刻意设计：创建失败会留下未绑定记录，重试通过确定性 ID 恢复同一个子 Session。

### 4.2 追问、停止与历史投影

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif","fontSize":"13px","actorBkg":"#EEF3FF","actorBorder":"#4F6FE8","actorTextColor":"#1D2433","actorLineColor":"#CBD5E1","signalColor":"#64748B","signalTextColor":"#334155","labelBoxBkgColor":"#F6F8FC","labelBoxBorderColor":"#DCE4F5","labelTextColor":"#334155","loopTextColor":"#334155","noteBkgColor":"#FFF7E6","noteBorderColor":"#E8B55B","noteTextColor":"#5B3B00","activationBkgColor":"#E8EEFF","activationBorderColor":"#4F6FE8","sequenceNumberColor":"#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant C as Client
  participant R as RPC /sidechat
  participant O as Coordinator
  participant A as Session Adapter
  participant D as DSH Agent / Workspace
  C->>R: followup(parent, note, text)
  R->>R: owner + payload 校验
  R->>O: followup(...)
  O->>O: 父 Session 授权 · 状态必须为 active
  opt 首次或 Host 重启后
    O->>A: hydrate(note)
    A->>D: resume 同一子 Session
  end
  O->>A: followup(childSessionId, text)
  A->>D: unarchive → agent.followup(text)
  D-->>A: whenIdle()
  A->>D: archive(child)（promoted 除外）
  A-->>O: 完成
  O-->>R: accepted
  R-->>C: { accepted: true }
  Note over C,R: 会话页打开时约每 1.25s 轮询 history
  C->>R: history(parent, note)
  R-->>C: 最近 50 条文本投影 + busy
```

- 追问文本上限 32,000 字符；只允许 `active` 状态继续追问。
- 每个子 Session 的生成期间保持可见，`whenIdle()` 后重新归档；已升格的 Session 不再归档。
- 历史只投影子 Session 的 `user/message` 与 `assistant/message`，并过滤 `inheritedEventCount` 之前的 Fork 前缀。
- 单条文本上限 16,000 字符、reasoning 上限 8,000 字符；不返回注入上下文、工具输出或原始事件。

### 4.3 归档、恢复与升格

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif","fontSize":"14px","primaryColor":"#EEF3FF","primaryTextColor":"#1D2433","primaryBorderColor":"#4F6FE8","lineColor":"#94A3B8","secondaryColor":"#F6F8FC","tertiaryColor":"#FFFFFF","background":"#FFFFFF","mainBkg":"#EEF3FF","nodeBorder":"#4F6FE8","clusterBkg":"#F8FAFF","clusterBorder":"#DCE4F5","edgeLabelBackground":"#FFFFFF","titleColor":"#1D2433","nodeTextColor":"#1D2433"},"flowchart":{"curve":"basis","nodeSpacing":32,"rankSpacing":44,"padding":12,"useMaxWidth":true}}}%%
flowchart TB
  subgraph PROMOTE["升格为正式会话"]
    direction TB
    P1["请求升格"] --> P2["ensureBound + hydrate<br/>确认同一子 Session 可恢复"]
    P2 --> P3["解析父 Session 工作区<br/>直接归属 → 祖先会话 → cwd"]
    P3 --> P4{"找到工作区？"}
    P4 -- "否" --> P5["失败：不伪装为已归组"]
    P4 -- "是" --> P6["Workspace.attachSession(child)"]
    P6 --> P7["Workspace.unarchive(child)"]
    P7 --> P8["status = promoted<br/>promotedSessionId = childSessionId"]
    P8 --> P9["侧聊详情保留<br/>可打开正式会话"]
  end
  subgraph RETURN["回到主对话草稿"]
    direction TB
    B1["复制回答"] --> B2["系统剪贴板"]
    B3["引用回答"] --> B4["conversation.input.insertQuote"]
    B4 --> B5["主对话输入草稿"]
    B5 --> B6["用户自行编辑 / 发送"]
  end
  classDef promote fill:#EAF8F1,stroke:#2E9E6B,stroke-width:1.5px,color:#1D2433
  classDef risk fill:#FFF1F0,stroke:#D9534F,stroke-width:1.5px,color:#7A1F1C
  classDef back fill:#EEF3FF,stroke:#4F6FE8,stroke-width:1.5px,color:#1D2433
  class P1,P2,P3,P6,P7,P8,P9 promote
  class P4,P5 risk
  class B1,B2,B3,B4,B5,B6 back
```

- 元数据 `archive` / `restore` 只改变目录状态；子 Session 本身在空闲时已隐藏，追问前会临时解除归档。
- 升格复用**同一个子 Session**，不复制消息历史到父 Session。
- 父 Session 不属于任何工作区时升格失败；不会把侧聊伪装成已归组的正式会话。
- 升格与回流互不依赖：升格不向主对话写入内容，回流也不会改变侧聊状态。

## 5. 认证与数据边界

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif","fontSize":"13px","actorBkg":"#EEF3FF","actorBorder":"#4F6FE8","actorTextColor":"#1D2433","actorLineColor":"#CBD5E1","signalColor":"#64748B","signalTextColor":"#334155","labelBoxBkgColor":"#F6F8FC","labelBoxBorderColor":"#DCE4F5","labelTextColor":"#334155","loopTextColor":"#334155","noteBkgColor":"#FFF7E6","noteBorderColor":"#E8B55B","noteTextColor":"#5B3B00","activationBkgColor":"#E8EEFF","activationBorderColor":"#4F6FE8","sequenceNumberColor":"#FFFFFF"}}}%%
sequenceDiagram
  autonumber
  participant B as Browser / Desktop
  participant W as DSH WebServer
  participant R as SideChat Router
  participant D as DSH Session / Agent
  B->>W: POST /sidechat/{method} + Cookie
  W->>W: auth: required + Origin / source policy
  alt 宿主未提供 peer
    W->>W: connection.admit(headers)
  end
  W->>R: authenticated peer
  R->>R: principal.kind === owner?
  R->>R: 方法白名单 · 参数类型 · 大小限制
  R->>D: observeSession(parent)
  D-->>R: 父 Session 事件
  R->>R: 锚点消息属于父 Session?
  R->>D: 创建 / 追问 / 取消 / 升格
  D->>D: tools.guard：拒绝全部工具
  D-->>R: 结果
  R-->>B: server-response / 结构化错误
```

| 控制点     | 实现                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| 传输认证   | `registerSideChatWebRoute` 使用 `kind: 'prefix'`、`path: '/sidechat'`、`auth: 'required'` |
| 匿名拒绝   | 路由缺失 peer 时通过官方 `connection.admit` 重新认证；失败返回 401                        |
| owner 校验 | Router 在解析 payload 前检查 `peer.principal.kind === 'owner'`                            |
| 来源校验   | 每次创建读取父 Session 日志，验证锚点消息真实存在且属于该 Session                         |
| 请求限制   | 请求体上限 96 KB；`clientRequestId` ≤ 128；选中文本 ≤ 8,000；标题 ≤ 120；追问 ≤ 32,000    |
| 工具限制   | Agent `setup` 与 `resume` 都安装 `tools.guard`，对子 Agent 的每次工具执行返回拒绝原因     |
| 错误响应   | 只返回 `sidechat/*` 结构化错误；不回传提示词、路径、Token 或堆栈                          |
| 日志       | 不记录 Token、选中内容、私聊正文或工作区文件内容                                          |
| 历史边界   | 只返回子 Session 的文本投影；不暴露内部注入上下文、工具输出或完整原生事件                 |

这是携带 DSH Connection 请求/响应 Envelope 的**认证 Web RPC**，不是公开、匿名的 HTTP API。实现选择直接注册 WebServer 前缀路由，以避免依赖版本敏感的 Connection 注册上下文，同时保留官方认证与 Envelope 兼容。

## 6. 持久化与一致性

```ts
interface StoredDocument {
  version: 1
  notes: SideChat[]
}
```

- 路径：`dshHomePath('state', 'sidechat.json')`。
- 写入：临时文件 + `rename` 原子替换，文件模式 `0o600`；单进程串行队列。
- 幂等：`(parentSessionId, clientRequestId)` 唯一；重复创建返回同一条记录。
- 并发：更新使用 `revision` 比较交换（CAS）；冲突时重试，三次后报 `CONFLICT`。
- 恢复：子 Session ID 由记录 ID 推导；即使元数据绑定前进程退出，下一次 `ensure()` 也能恢复同一 Session。
- 限制：Repository 是**单进程 JSON 存储**，多个 DSH Host 进程不能安全并发写同一文件。

## 7. DSH 集成点

### Host 服务

| 能力                   | 官方接入点                                                        |
| ---------------------- | ----------------------------------------------------------------- |
| 读取父/子 Session 事件 | `ctx.sessionQuery.observeSession(SessionId(id))`                  |
| Fork 继承指定前缀      | `buildForkSeed(events, SessionSeq(boundary))`                     |
| 创建 / 恢复子 Agent    | `ctx.agents.create(…)` / `ctx.agents.resume(…)`                   |
| 追问 / 停止            | `agent.followup(…)` / `agent.cancel(…)`                           |
| 归档 / 恢复            | `ctx.workspaceRegistry.archiveSession(…)` / `unarchiveSession(…)` |
| 升格归组               | `Workspace.attachSession(…)`                                      |
| 工具拒绝               | Agent `setup` 内 `agentCtx.tools.guard(…)`                        |

### Client Slot

| Slot                                  | 用途                         |
| ------------------------------------- | ---------------------------- |
| `conversation.chat.assistant-actions` | AI 回复下方的「侧聊」图标    |
| `shell.overlay`                       | 文本选区胶囊扩展、来源侧标记 |
| `sidebarRightTabs.register(…)`        | 注册原生「旁敲侧击」标签页   |
| `sidebar.right.pane.tab`              | 渲染目录、创建页与会话页     |

选区入口在 `pointerup` / 完成后触发，不监听 `selectionchange`。DSH 当前提供的是独占式 Quote 文本交互 Seat，因此 Client 通过 React Portal 把「侧聊」附加到原生引用胶囊，而不是替换原生 Quote 行为。

## 8. 构建产物与运行时边界

| 产物            | 格式             | 约束                                                                           |
| --------------- | ---------------- | ------------------------------------------------------------------------------ |
| `lib/index.mjs` | Node ESM         | Host 侧；只允许 Node 模块                                                      |
| `lib/client.js` | CJS 经典脚本工厂 | 由 `window.__ModuleLoader__.load({ id: '@jonge/dsh-sidechat', factory })` 包装 |

Client **不能**输出裸 ESM；React、React DOM 与原生 Primitives 由宿主提供。`scripts/check-build.mjs` 会实际执行加载器包装并核对模块 ID 与工厂格式，而不是只检查文件存在。

## 9. 验证边界

CI 已覆盖：

- Node 24 与 DSH `0.2.2-rc.5` 的 TypeScript 检查、Host/Client 打包、Manifest 与 npm pack 检查。
- 领域状态机、持久化幂等、Coordinator 授权、RPC owner 校验、历史投影、Session 适配与官方桥接契约。
- DSH Web Profile 安装、Host 激活、浏览器 Cookie 认证、`/sidechat/list` 认证 RPC 可达，以及匿名请求被拒绝。

维护者已在本地完成基本功能验收；发布后仍需继续回归真实引用胶囊、长文本与重复选区定位、跨重启恢复、升格后可见性、深浅主题与窄窗口等边界场景。通过 RPC 冒烟不代表这些场景全部覆盖。

## 10. 上游参考

- [DSH Host 核心架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/core.md)
- [UI Slots](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/slots.md)
- [原生右侧 Sidebar](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/sidebar-right.zh.md)
- [客户端原生消息操作](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-chat/src/client/chat/MessageIconActions.tsx)
