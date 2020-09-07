module.exports = {
  title: "橘子的前端杂记",
  description: "",
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
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
          children: []
        },
        {
          title: "博客",
          collapsable: false,
          children: ["swagger_2_mocks", "webpack"],
        },
      ],
    }
  },
}
