## Package Updates

- Upgrade  `react v16.7` to `react v16.12`, apply react hooks to all new features
- Upgrade `material-ui v3.x` to `material-ui v4.x`
- Remove `tslint`, use `eslint` instead
- Remove `enzyme`, use `react-testing-library` instead



## Core Bussiness Functions

- Corppass Integration

  - 最大的坑是安全审查，cookie 和 local storage 中都不能存任何「可疑」的字段，比如 xxx_token
  - 浏览器打开新 Tab 不重新登录，但是关闭浏览器之后需要重新登录，因此采用了 session cookie + local storage
  - 由于客户 IE 浏览器安全的安全设置，导致前端无法成功 redirect 到 corppass，后改为由 server redirect。

- BIP

  

## Core Modules

- Dynamic Import
  - 不希望加载多余的代码。访问 Internet 和 intranet 看到的内容不同，并且不同的角色看到的内容也不同。
- Access Control 
  - 增加了文件 src-modules/auth/authConfig.ts，用于配置所有权限
  - 安全审查认为 JS 中不应该出现 Role 相关的信息（他们认为这是一种信息泄露）。目前的解决方案还是改名，先从后端  API 获取 role mapping，然后再将前端所有的 Role name 替换为不可读字段。
- Generate api request action and mock data automatically
- Request Modules
  - useRequest（生成 request 方法，方便自行决定请求的发起）
  - useTempData（用于获取页面上的临时数据。在组件 mount 时自动发起 request，并将提供 api response 数据（自动存入 store），在组件销毁时自动删除 store 中相应数据）
  - useEntity (用于获取可以持久化的数据，比如 lookup enums, only fetch lookup enums once when app load）
  - useTapWhenMatchRequestSucceed（当 API 请求成功时刷新页面）
- Search (refetch api when filters change)
- Table
- convert-svg
- Feature Toggle (removed)
- Lookup Enums
  - useLookupEnums
  - transformLookupEnum



## Code Patterns

- Unit Test
  - Hook Test (Extract Logic to hooks, to make testing easier)
- Constants
- Ramda

