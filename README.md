# 执行教练聊天界面

一个使用 React、Tailwind CSS 和 React Context 构建的模拟聊天界面。

## 启动

```bash
pnpm install
pnpm dev
```

## 已实现交互

- 接入 DeepSeek API，模型使用 `deepseek-v4-flash`。
- 系统提示词内置执行猫角色设定。
- 回复末尾带 `actionCard` JSON 时，自动渲染倒计时任务卡片。
- 点击“标记完成”后更新经验值、金币，播放完成音效，并派发 `task:completed` 事件。
- 支持目标地图、成就弹窗、今日记录三个模块。

## 模块

- 聊天：`src/components/ChatWindow.jsx`、`src/components/InputBar.jsx`
- 目标地图：`src/components/GoalMap.jsx`、`src/context/GoalContext.jsx`
- 游戏化系统：`src/components/StatusBar.jsx`、`src/components/AchievementModal.jsx`、`src/context/GameContext.jsx`
- 每日记录：`src/components/DailyStatus.jsx`、`src/context/RecordContext.jsx`
- 视图切换：`src/components/TopNav.jsx`、`src/context/AppContext.jsx`

## DeepSeek 配置

1. 打开 `.env.local`。
2. 将 `VITE_DEEPSEEK_API_KEY=你的密钥` 替换为真实密钥。
3. 重新启动开发服务器。

API Key 由 Vite 代理在服务端读取，不会打包进前端代码。
