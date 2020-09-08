module.exports = {
  title: "橘子的前端杂记",
  description:
    "个人博客。记录实际开发中遇到的问题及解决方案，日常的思考和总结、面试知识点、读书笔记等。",
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
        link: "/blog/"
      },
      {
        text: "开源项目",
        link: "/opensource/",
        items: [
          {
            text: "ts-codegen",
            link: "https://github.com/reeli/ts-codegen"
          },
          {
            text: "swagger-faker",
            link: "https://github.com/reeli/swagger-faker"
          },
          {
            text: "react-rx-form",
            link: "https://github.com/reeli/react-rx-form"
          },
          {
            text: "sketch-svg-to-react-component",
            link: "https://github.com/reeli/sketch-svg-to-react-component"
          }
        ]
      }
    ],
    sidebar: {
      "/blog/": [
        {
          title: "Framework",
          collapsable: false,
          children: [
            "framework_react-hooks-use",
            "framework_react-hooks-principle"
          ]
        },
        {
          title: "RxJS",
          collapsable: false,
          children: ["rxjs_reactive-programming"]
        },
        {
          title: "SVG",
          collapsable: false,
          children: [
            "svg_deep-learning-svg-1",
            "svg_deep-learning-svg-2",
          ]
        },
        {
          title: "核心模型",
          collapsable: false,
          children: [
            "models_authorization",
            "models_request"
          ]
        },
        {
          title: "性能优化",
          collapsable: false,
          children: []
        },
        {
          title: "打包",
          collapsable: false,
          children: ["build_webpack-tree-shaking"]
        },
        {
          title: "部署",
          collapsable: false,
          children: []
        },
        {
          title: "自动化工具",
          collapsable: false,
          children: ["tools_swagger-to-mocks", "tools_ts-codegen"]
        }
      ]
    }
  },
  plugins: [
    [
      "@vuepress/google-analytics",
      {
        ga: "UA-177434976-1"
      }
    ],
    [
      "@vuepress/pwa",
      {
        serviceWorker: true,
        updatePopup: true
      }
    ],
    ["@vuepress/medium-zoom", true],
    ["@vuepress/back-to-top", true]
  ]
};
