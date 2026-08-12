# Bili Filter

一个用于限制个人 B 站视频消费的工具。

核心目标：

- 只有白名单 UP 主的视频可以进入观看队列
- 临时事件可以加入临时视频
- 视频具有有效期
- 每日具有观看预算
- 最终通过浏览器扩展限制 B 站页面中的其他内容
- 支持电脑 Chrome 和手机 Safari

---

## 当前开发阶段

Phase 0：项目骨架

当前已经实现：

- 响应式网页
- 首页
- 设置页
- Mobile First UI
- Storage 抽象
- LocalStorage Adapter
- Whitelist Service 基础接口
- Whitelist 数据模型

尚未实现：

- 白名单编辑
- 7 天修改限制
- 24 小时冷静期
- B 站视频获取
- 视频队列
- 观看预算
- 临时事件
- 浏览器扩展
- 后端同步

---

## 项目结构

```text
bili-filter/
│
├── index.html
├── settings.html
│
├── css/
│   ├── common.css
│   ├── index.css
│   └── settings.css
│
├── js/
│   ├── app.js
│   ├── config.js
│   │
│   ├── models/
│   │   └── whitelist.js
│   │
│   ├── services/
│   │   ├── storage.js
│   │   └── whitelist-service.js
│   │
│   └── ui/
│       ├── whitelist-view.js
│       └── toast.js
│
├── data/
│   └── default-whitelist.json
│
└── README.md