module.exports = {
  title: "橘子的前端杂记",
  description: "个人博客。记录实际开发中遇到的问题及解决方案，日常的思考和总结、面试知识点、读书笔记等。",
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    repo: "reeli/blog",
    docsDir: "docs",
    editLinks: true,
    lastUpdated: "更新时间",
    editLinkText: "本文源码地址",
    nav: [
      {
        text: "博客",
        link: "/blog/",
      },
    ],
    sidebar: {
      "/blog/": [
        {
          title: "性能优化",
          collapsable: false,
          children: []
        },
        {
          title: "打包和部署",
          collapsable: false,
          children: ["webpack-tree-shaking"]
        },
        {
          title: "自动化工具",
          collapsable: false,
          children: ["swagger-to-mocks"],
        },
      ],
    }
  },
  plugins: [
    [
      '@vuepress/google-analytics',
      {
        "ga": "UA-177434976-1"
      }
    ],
    [
      "@vuepress/pwa",
      {
        serviceWorker: true,
        updatePopup: true,
      },
    ],
    ["@vuepress/medium-zoom", true],
    ["@vuepress/back-to-top", true],
  ],
}
