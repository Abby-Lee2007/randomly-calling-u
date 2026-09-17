# 随机点名器

一个零依赖、数据保存在浏览器本机的随机点名工具。可以像文件夹一样创建和切换班级，录入同学名单后进行不放回式随机点名。

![界面截图](docs/screenshot.png)

## 功能

- 创建、重命名、删除和随时切换多个班级
- 每行一个姓名，也支持逗号、顿号、分号和制表符批量导入
- 保存名单后自动生成本轮抽取池
- 使用浏览器加密随机数从未抽名单中等概率抽取
- 抽中后自动移出本轮名单，同一轮不会重复
- 显示本轮进度、已抽名单和剩余人数
- 可一键重新抽一轮
- 数据自动保存在当前浏览器，刷新或关闭页面不会丢失
- 支持桌面和手机浏览器，可安装为本地网页应用

## 本地运行

项目不需要安装任何第三方依赖，只需要 Node.js 18 或更高版本。

```bash
node server.mjs
```

然后访问 `http://127.0.0.1:4173`。

如果电脑已经安装了 npm，也可以运行 `npm start`。

运行核心逻辑测试：

```bash
node --test tests/core.test.mjs
```

如果电脑已经安装了 npm，也可以运行 `npm test`。

## 上传到 GitHub

1. 在 GitHub 新建一个空仓库。
2. 在本项目目录执行：

```bash
git init
git add .
git commit -m "Initial random class caller"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

## 发布为 GitHub Pages

仓库已经包含 `.github/workflows/deploy-pages.yml`。

1. 把代码推送到 `main` 分支。
2. 打开仓库的 `Settings` → `Pages`。
3. 在 `Build and deployment` 中把来源选择为 `GitHub Actions`。
4. 工作流完成后，页面地址会显示在部署任务中。

## 数据说明

班级、名单和点名记录使用浏览器 `localStorage` 保存。数据不会上传到服务器，也不会自动同步到其他设备。清除浏览器站点数据会同时删除这些内容。

## 技术结构

- `index.html`：页面结构
- `styles.css`：响应式界面样式
- `core.js`：名单解析、随机抽取、数据规范化
- `app.js`：界面交互和本地数据管理
- `server.mjs`：零依赖本地静态服务器
- `tests/core.test.mjs`：核心逻辑测试

## 许可证

[MIT](LICENSE)
