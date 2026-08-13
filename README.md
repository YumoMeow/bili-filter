# Bili Filter 项目综述

> **当前阶段：Phase 2 开发中**
> **项目性质：个人视频时间管理 / 白名单式 B 站观看工具**
> **当前实现方式：前端静态网页 + 本地数据存储 + 本地 Python 服务代理 B 站 API**

---

# 1. 项目目标

这个项目的核心目标不是“帮助用户更方便地刷 B 站”，而是反过来：

> **主动限制自己只能观看经过允许的视频，从源头上减少无目的刷视频。**

核心理念是：

```text
正常使用 B 站

打开 B 站
  ↓
推荐流
  ↓
不断发现新视频
  ↓
无限观看
  ↓
浪费大量时间
```

变成：

```text
Bili Filter

白名单 UP 主 / 特定事件视频
        ↓
自动获取符合条件的视频
        ↓
加入观看队列
        ↓
用户主动选择观看
        ↓
观看预算限制
        ↓
视频过期自动删除
```

最终希望做到：

> **B 站本身不再是内容入口，而只是一个视频播放后端。**

因此项目未来的理想使用方式是：

* 手机上卸载 B 站 App
* 电脑上尽量不直接打开 B 站
* 日常通过 Bili Filter 浏览自己的视频队列
* 只有允许的视频能够进入观看范围
* 必要时跳转到 B 站播放
* 播放页面尽量只保留视频本身，隐藏推荐、评论、相关视频等容易诱发继续观看的内容

---

# 2. 当前确定的核心功能

目前项目已经确定的主要功能可以分成四层。

## 2.1 永久 UP 主白名单

用户维护一个自己的 UP 主白名单。

例如：

```text
UP 主 A
UP 主 B
UP 主 C
```

这些 UP 主发布的新视频可以自动进入观看队列。

白名单中的 UP 主具有：

```text
UID
昵称
头像
粉丝数
状态
```

等信息。

---

# 3. 白名单修改机制

这是目前 Phase 1/Phase 2 已经实现的核心机制之一。

设计目标是避免用户因为一时冲动不断修改白名单。

当前规则：

### 7 天修改周期

白名单正式修改后：

```text
保存修改
    ↓
进入 7 天锁定期
    ↓
7 天内不能再次修改
```

### 编辑草稿机制

后来我们专门调整了这一设计。

**不是添加一个 UP 主以后立刻开始 7 天周期。**

而是：

```text
点击「编辑白名单」
        ↓
建立 draft_whitelist
        ↓
添加 / 删除 UP 主
        ↓
继续修改
        ↓
点击「保存修改」
        ↓
正式提交
        ↓
开始 7 天锁定
```

因此：

> **只有用户主动点击“保存修改”，才真正修改白名单并开始 7 天周期。**

如果用户编辑到一半：

```text
取消
```

则：

```text
draft_whitelist
     ↓
丢弃
     ↓
正式 whitelist 不变
```

这个设计已经成为目前项目架构的重要组成部分。

---

# 4. 新增 UP 主的 24 小时冷静期

用户新增 UP 主以后，不应该马上能够观看其视频。

因此设计了：

```text
新增 UP 主
    ↓
PENDING
    ↓
24 小时冷静期
    ↓
ACTIVE
    ↓
正式允许进入观看队列
```

也就是说：

```text
active
```

代表：

> 可以观看。

而：

```text
pending
```

代表：

> 已经加入白名单，但还不能观看。

这个机制和 7 天白名单修改周期配合，用来尽可能减少“突然想看某个东西 → 临时把它加入白名单 → 马上开始刷”的情况。

---

# 5. 当前 UP 主卡片

Phase 2 开始以后，我们把原来的简单：

```text
UP主名称
UID
```

升级成：

```text
头像
昵称
UID
粉丝数
状态
删除按钮
```

目标视觉结构类似：

```text
┌──────────────────────────────────┐
│  [头像]  UP主昵称                │
│          UID 123456 · 12.3万粉丝 │
│                         可观看   │
│                              删除│
└──────────────────────────────────┘
```

`whitelist-view.js` 已经实现了读取：

```javascript
user.avatar
user.name
user.mid
user.fans
user.status
user.effectiveAt
```

所以 UI 层实际上已经为 Phase 2 数据结构做好准备。

---

# 6. Bilibili UID 自动获取 UP 主信息

这是 Phase 2 新增加的功能。

用户不再手动填写：

```text
昵称
UID
头像
粉丝数
```

而只需要：

```text
输入 UID
```

例如：

```text
2
```

系统自动向 B 站请求：

```text
mid
name
face
follower
```

然后转换成项目自己的用户对象：

```javascript
{
    mid: "2",
    name: "...",
    avatar: "...",
    fans: 123456
}
```

---

# 7. 为什么增加了 server.py

最初我们尝试让浏览器直接请求：

```text
https://api.bilibili.com/x/web-interface/card?mid=2
```

但是出现了：

```text
Access to fetch ... has been blocked by CORS policy
```

原因是：

> 浏览器从 `http://localhost:8000` 请求 B 站 API 时，B 站接口没有提供允许这个 Origin 的 CORS 响应头。

因此我们增加了一个非常简单的本地 Python 服务。

架构变成：

```text
浏览器
  │
  │ localhost
  ▼
server.py
  │
  │ 服务端请求
  ▼
Bilibili API
```

而不是：

```text
浏览器
  │
  │ 跨域
  ▼
Bilibili API
```

这样绕开了浏览器 CORS 限制。

---

# 8. 当前项目架构

目前我们已经确定采用分层架构，而不是把所有代码写在一个 `settings.js` 里。

大致结构：

```text
Bili Filter
│
├── index.html
├── settings.html
│
├── css/
│   ├── common.css
│   └── settings.css
│
├── js/
│   ├── app.js
│   ├── config.js
│   ├── settings.js
│   │
│   ├── models/
│   │   └── whitelist.js
│   │
│   ├── services/
│   │   ├── whitelist-service.js
│   │   └── bilibili-service.js
│   │
│   └── ui/
│       ├── whitelist-view.js
│       └── toast.js
│
├── data/
│   └── ...
│
└── server.py
```

---

# 9. 各层职责

## `models/`

负责定义数据结构。

例如：

```javascript
USER_STATUS
createWhitelistUser()
createEmptyWhitelist()
isValidWhitelist()
```

目前用户模型已经包含：

```text
mid
name
avatar
fans
status
addedAt
effectiveAt
```

---

## `services/whitelist-service.js`

负责白名单业务逻辑。

包括：

* 获取白名单
* 创建 draft
* 添加 UP 主
* 删除 UP 主
* 判断能否修改
* 判断是否有 draft 修改
* 保存 draft
* 提交 draft
* 处理 7 天限制
* 处理 24 小时冷静期

原则是：

> UI 不应该自己实现这些规则。

---

## `services/bilibili-service.js`

负责所有 B 站 API 相关操作。

目前主要负责：

```text
UID
 ↓
获取 UP 主公开信息
```

以后视频相关 API 也应该放在这里。

例如未来：

```javascript
getUserInfo()
getUserVideos()
getVideoInfo()
searchVideos()
```

这样将来如果 B 站 API 请求方式发生变化，或者需要后端代理，只需要修改 Service 层。

---

## `ui/whitelist-view.js`

只负责显示。

例如：

```text
用户对象
   ↓
UP 主卡片
```

它不应该负责：

* 7 天限制
* 24 小时限制
* API
* localStorage
* 白名单业务逻辑

---

## `settings.js`

作为页面 Controller。

负责：

```text
读取 DOM
    ↓
调用 Service
    ↓
更新 UI
```

例如：

```text
点击添加
 ↓
BilibiliService
 ↓
WhitelistService
 ↓
refresh()
 ↓
renderWhitelist()
```

---

# 10. 当前已经实现的功能

截至目前，可以认为 Phase 0 + Phase 1 的主要功能已经基本完成。

### 已实现

* [x] 静态网页
* [x] 手机 / PC 响应式 UI
* [x] 首页
* [x] 白名单设置页面
* [x] 查看白名单
* [x] 添加 UP 主
* [x] 删除 UP 主
* [x] 7 天白名单修改周期
* [x] 编辑草稿 `draft_whitelist`
* [x] 编辑过程中自由增删
* [x] 保存时才开始 7 天周期
* [x] 取消编辑
* [x] 修改状态显示
* [x] 下一次可修改时间显示
* [x] UP 主 24 小时冷静期
* [x] `active / pending` 状态
* [x] 本地数据存储
* [x] Service / Model / UI 分层
* [x] 本地 Python Server
* [x] B 站 API 代理
* [x] 根据 UID 自动获取 UP 主信息
* [x] UI 支持头像
* [x] UI 支持粉丝数

---

# 11. 当前正在解决的问题

目前唯一还没有解决干净的主要问题是：

> **B 站返回的头像和粉丝数虽然已经经过 BilibiliService 获取，但最终没有正确显示在 UP 主卡片中。**

当前表现：

```text
昵称       ✅
UID        ✅
头像       ❌
粉丝数     ❌
JavaScript 报错 ❌
```

也就是说：

```text
UID → B站 API
```

已经能够工作。

而：

```text
昵称
```

也能够正常从 API → Model → View。

但是：

```text
avatar
fans
```

这一条数据链仍然存在问题。

---

# 12. 这个问题目前的排查过程

我们已经依次排除了几个问题。

### 第一阶段：BilibiliService 重复声明

曾经出现：

```text
Identifier 'BilibiliService' has already been declared
```

原因是 `bilibili-service.js` 中同时存在两份：

```javascript
class BilibiliService
```

后来已经处理。

---

### 第二阶段：CORS

随后浏览器出现：

```text
blocked by CORS policy
```

已经通过：

```text
server.py
```

增加本地后端代理解决。

现在已经可以成功获取 B 站用户信息。

---

### 第三阶段：用户对象参数结构错误

之后出现：

```text
undefined
UID [object Object]
```

我们发现 `createWhitelistUser()` 的接口是：

```javascript
createWhitelistUser(
    mid,
    options
)
```

但 `WhitelistService` 曾错误地按照：

```javascript
createWhitelistUser(
    mid,
    name,
    options
)
```

调用。

这一处已经修正。

现在：

```text
昵称
UID
```

已经恢复正常。

---

### 第四阶段：头像 / 粉丝数仍然丢失

目前问题就是这里。

理论上现在应该是：

```javascript
createWhitelistUser(
    mid,
    {
        name: userInfo.name,
        avatar: userInfo.avatar,
        fans: userInfo.fans,
        ...
    }
);
```

而 Model 本身也已经有：

```javascript
avatar: options.avatar || "",
fans: Number(options.fans ?? 0)
```

但最终 UI 仍然没有显示。

因此目前最值得怀疑的已经不是 `whitelist-view.js`，而是：

```text
BilibiliService
       ↓
userInfo
       ↓
addUserToDraft()
       ↓
createWhitelistUser()
       ↓
draft/localStorage
       ↓
getUsers()
       ↓
renderWhitelist()
```

中间某一层实际传递的数据仍然与我们认为的结构不一致。

**下一步应该停止继续猜测修改代码，而是在这条数据链的几个节点直接打印实际对象。**

例如：

```javascript
console.log("Bilibili userInfo:", userInfo);
```

以及：

```javascript
console.log("Created user:", user);
```

以及：

```javascript
console.log("Draft users:", draftWhitelist.users);
```

这样可以一次性确定究竟是哪一层丢掉了：

```text
avatar
fans
```

---

# 13. 尚未实现的核心功能

现在项目真正的大头其实还没有开始：

## Phase 3：视频获取

目标：

```text
白名单 UP 主
      ↓
自动获取最新视频
      ↓
加入观看队列
```

需要获取：

* 视频 BV号
* 标题
* 封面
* UP主
* 发布时间
* 播放量
* 视频 URL
* 视频状态

---

# 14. 观看队列

之后首页不再只是一个静态页面，而应该成为：

> **用户唯一的视频入口。**

例如：

```text
今日观看队列

┌─────────────────────────┐
│ 视频 A                  │
│ UP主 A · 2小时前         │
│ ▶ 播放                  │
└─────────────────────────┘

┌─────────────────────────┐
│ 视频 B                  │
│ UP主 B · 昨天            │
│ ▶ 播放                  │
└─────────────────────────┘
```

---

# 15. 视频自动过期

用户之前提出了一个非常重要的机制：

> 白名单视频不是永久保留。

例如：

```text
视频发布
 ↓
加入队列
 ↓
24小时 / 48小时 / 自定义时间
 ↓
自动删除
```

这样可以防止：

```text
“我以后再看”
```

最终变成一个几百条视频的收藏夹。

具体保留时间还需要最终确定。

---

# 16. 观看预算

这是项目后续非常重要的一层。

核心理念：

> **每天只允许自己看有限的视频 / 时间。**

例如：

```text
今日预算

剩余：
45 分钟
```

或者：

```text
今日预算

5 个视频
```

观看视频以后：

```text
预算 - 实际观看时间
```

最终可能形成：

```text
今日观看预算
████████░░ 32 / 45 分钟
```

这样项目就从：

> 白名单视频聚合器

进一步变成：

> **主动控制视频消费量的工具。**

---

# 17. B 站播放页处理

之前讨论过：

> 跳转到 B 站后，通过浏览器控制台 / 脚本删除页面中多余元素，只留下视频。

目标是：

```text
B站页面

视频
标题
推荐
评论
相关视频
侧边栏
弹幕
首页入口
各种推荐
    ↓
尽可能隐藏
```

最终只把 B 站当成：

> **视频播放器**

而不是内容推荐平台。

这个功能未来可以考虑：

* Tampermonkey 用户脚本
* Safari 用户脚本 / 扩展
* Chrome Extension
* CSS / JS 注入

具体实现方式尚未确定。

---

# 18. 搜索关键词临时视频队列

这是项目非常有意思的第二条内容来源。

用户之前提出：

例如中超比赛结束以后：

```text
山东泰山 vs 天津津门虎
```

希望系统自动搜索 B 站。

然后：

```text
搜索关键词
    ↓
找到相关视频
    ↓
按照播放量等指标筛选
    ↓
加入临时观看队列
    ↓
24小时后自动删除
```

例如：

```text
山东泰山 vs 天津津门虎

① 比赛集锦        82万播放
② 赛后分析        36万播放
③ 战术复盘        21万播放
④ 球迷评论        12万播放
```

这些视频不需要进入永久白名单。

它们属于：

```text
Temporary Queue
```

生命周期类似：

```text
创建
 ↓
允许观看
 ↓
24小时
 ↓
自动失效
```

---

# 19. Event 模块暂时取消

之前曾经讨论过：

```text
Event
```

例如：

```text
中超第 XX 轮
欧冠比赛
某个新闻事件
某个专题
```

然后让 Event 自动管理搜索关键词。

但是目前已经明确：

> **暂时不加入 Event 模块。**

因此当前路线不会先做：

```text
Event Model
Event Service
Event UI
```

而是直接做更加简单的：

```text
关键词 → 搜索 → 临时队列
```

以后如果确实有需要，再在此基础上增加 Event。

---

# 20. 后续项目实现计划

目前建议按照以下顺序继续。

```text
Phase 0
基础网页
      ↓
Phase 1
白名单 + 修改限制
      ↓
Phase 2
B站 UP 主信息
      ↓
Phase 3
视频获取
      ↓
Phase 4
观看队列
      ↓
Phase 5
视频过期
      ↓
Phase 6
观看预算
      ↓
Phase 7
B站播放页净化
      ↓
Phase 8
关键词临时队列
      ↓
Phase 9
后端化
      ↓
Phase 10
浏览器扩展 / 更完善的多设备支持
```

---

# 21. Phase 3：视频获取

重点工作：

```text
BilibiliService
```

增加：

```javascript
getUserVideos(mid)
```

获取：

```text
UP 主最新投稿
```

建立：

```text
Video Model
```

例如：

```javascript
{
    bvid,
    title,
    cover,
    mid,
    author,
    publishedAt,
    viewCount,
    url
}
```

然后建立：

```text
VideoService
```

负责：

* 获取视频
* 去重
* 保存
* 判断是否过期

---

# 22. Phase 4：观看队列

建立：

```text
queue
```

把：

```text
永久白名单视频
```

转化为：

```text
可观看视频
```

首页开始真正承担核心功能。

---

# 23. Phase 5：过期机制

每一个视频加入：

```text
expiresAt
```

例如：

```javascript
{
    publishedAt: "...",
    addedAt: "...",
    expiresAt: "..."
}
```

到期以后自动从队列移除。

---

# 24. Phase 6：观看预算

增加：

```text
DailyBudget
```

例如：

```javascript
{
    date: "2026-08-12",
    budgetMinutes: 60,
    usedMinutes: 27
}
```

然后记录：

```text
开始观看
 ↓
暂停
 ↓
结束
```

计算实际观看时间。

---

# 25. Phase 7：B站页面净化

这是整个项目“限制自己刷 B 站”理念非常重要的一环。

目标不是阻止 B 站视频播放，而是：

> **允许播放，但尽可能禁止推荐机制继续把用户拉走。**

最终可能做成浏览器扩展：

```text
Bili Filter Extension
```

只在用户从 Bili Filter 打开的 B 站视频页面生效。

---

# 26. Phase 8：关键词临时队列

实现：

```text
输入关键词
    ↓
搜索 B站
    ↓
筛选高播放量视频
    ↓
加入临时队列
    ↓
设置 expiresAt
    ↓
自动过期
```

例如：

```text
关键词：
山东泰山 vs 天津津门虎

临时队列：
├─ 比赛集锦
├─ 赛后分析
├─ 战术复盘
└─ 球员表现
```

不改变永久白名单。

---

# 27. Phase 9：后端化

目前白名单数据放在本地。

之前我们专门讨论过：

> **现在本地存储，以后迁移到后端是否方便？**

结论是：

**只要继续保持现在的 Service / Model 分层，非常方便。**

现在：

```text
WhitelistService
       ↓
LocalStorage
```

以后可以变成：

```text
WhitelistService
       ↓
API
       ↓
Backend
       ↓
Database
```

UI 基本不用动。

所以目前没有必要为了未来后端化而过早增加复杂后端。

---

# 28. 多设备支持

最终希望：

```text
手机 Safari
       ↕
      后端
       ↕
电脑 Chrome
```

共享：

```text
白名单
视频队列
观看记录
观看预算
过期状态
```

目前阶段则优先保持：

```text
手机 Safari
电脑 Chrome
```

都能够正常使用响应式网页。

**没有必要因为手机使用 Safari，就强迫电脑和手机都使用 Chrome。**

---

# 29. 当前最重要的架构原则

后续继续开发时，项目应该坚持以下原则。

### UI 不负责业务规则

不要在：

```text
settings.js
```

里面实现：

```text
7天
24小时
数据存储
API
```

这些应该由 Service 负责。

---

### Service 不负责 UI

例如：

```text
WhitelistService
```

不要操作：

```javascript
document.querySelector(...)
```

---

### Model 定义数据结构

例如：

```text
User
Video
QueueItem
DailyBudget
```

---

### 外部 API 全部封装

B站相关操作统一进入：

```text
BilibiliService
```

以后改成后端代理时：

```text
UI
 ↓
Service
 ↓
Backend
```

UI 不需要知道。

---

# 30. 当前项目状态一句话总结

目前项目已经从最初的：

> **“做一个静态白名单网页”**

发展成了一个比较清晰的：

> **“以白名单和时间预算为核心、把 B 站降级为视频播放后端的个人视频消费控制系统”。**

目前：

```text
基础 UI                 ✅
白名单                  ✅
草稿编辑                ✅
7 天修改限制             ✅
24 小时冷静期             ✅
本地存储                 ✅
B站 UID 查询             ✅
本地 API Proxy           ✅
昵称 / UID               ✅
头像 / 粉丝数             ⚠️ 当前仍有数据链问题
视频获取                 ⏳
观看队列                 ⏳
视频过期                 ⏳
观看预算                 ⏳
B站页面净化              ⏳
关键词临时队列            ⏳
后端同步                 ⏳
多设备同步                ⏳
```

## 当前最应该做的事

**先不要进入 Phase 3。**

现在应该把 Phase 2 收尾：

```text
BilibiliService
      ↓
userInfo
      ↓
WhitelistService
      ↓
createWhitelistUser
      ↓
draftWhitelist.users
      ↓
localStorage
      ↓
getUsers()
      ↓
renderWhitelist()
```

逐层打印实际对象，找到 `avatar` / `fans` 到底在哪一层消失。

一旦这条数据链彻底打通，Phase 2 就算真正完成。然后再进入 **Phase 3：视频获取与视频数据模型**，这样后面不会一边开发视频功能、一边继续被用户数据结构的问题绊脚。
