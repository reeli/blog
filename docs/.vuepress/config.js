module.exports = {
  title: "橘子的前端杂记",
  description: "",
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
          children: [ "webpack-tree-shaking"]
        },
        {
          title: "自动化工具",
          collapsable: false,
          children: ["swagger-to-mocks"],
        },
      ],
    }
  },
}
