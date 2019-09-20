我最近的项目是一个前后端分离的项目。前后端由不同的团队分别开发，并且前端的进度经常领先后端。这就意味着，当前端在开发一个新功能时，API 可能还没有准备好。不过，我们通常会先和后端商议好 API Schema，然后使用 Mock 数据进行开发。



但问题也随之而来，定义 Mock 数据并配置 mock server 真的太浪费时间了！我真的非常讨厌这种没有任何技术含量的「苦力活」。所以，只好想办法让生成 Mock 数据的过程「自动化」。那么，从哪里生成这些 Mock 数据呢？突然想到了开发时使用的 Swagger UI。它提供的 Swagger JSON 准确地定义了所有 API Schema。那为什么不通过 Swagger 定义去自动生成 Mock 数据呢！说干就干！



- Swagger 简介

- 通过 Swagger JSON 生成 Mock 数据

  - 处理 Swagger JSON

  - 生成 Mock 数据

- 自动生成 Mock Server 配置



本文所有代码都在这个仓库 [swagger-faker](https://github.com/reeli/swagger-faker)，有兴趣点个 star 呗。



# Swagger 简介

在介绍 Swagger 之前，你需要先了解一下 [OpenAPI 规范](https://swagger.io/specification/)。因为 Swagger 定义是基于 OpenAPI 规范的。



>  OpenAPI 规范（OAS）为 RESTful API 定义了一个与语言无关的标准接口，允许人和计算机发现和理解服务的功能，而无需通过访问源代码、文档或开发者工具。



OpenAPI 定义大致如下：



```json
{
  "swagger": "2.0",
  "info": {},
  "host": "petstore.swagger.io",
  "basePath": "/v2",
  "tags": [],
  "schemes": [],
  "paths": {
    "/user/logout": {
      "get": {
        "tags": [
          "user"
        ],
        "summary": "Logs out current logged in user session",
        "description": "",
        "operationId": "logoutUser",
        "produces": [
          "application/xml",
          "application/json"
        ],
        "parameters": [
        ],
        "responses": {
          "default": {
            "description": "successful operation"
          }
        }
      }
    }
  },
  "securityDefinitions": {},
  "definitions": {},
  "externalDocs": {}
}
```



[查看完整 OpenAPI 定义示例](https://petstore.swagger.io/v2/swagger.json)



通过上面的示例，我们可以清楚地知道，/user/logout 用于注销当前已登录的用户会话。它是一个 GET 请求，且不接收任何请求参数。当然，清楚地描述一个 API 意味着要定义很多东西。你可能会觉得 OpenAPI 定义写起来有点麻烦？不用担心，在实际工作中，我们会通过注解的方式自动生成 OpenAPI 定义。



基于 OpenAPI 定义，我们还可以完成很多事情。比如自动生成服务器和客户端代码（Swagger Codegen）、通过交互式的 UI 来可视化服务接口（Swagger UI）等等。



#通过 Swagger JSON 生成 Mock 数据

你可以通过 [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker) 直接将 Swagger JSON 生成为带 Mock 数据的 Schema。但是这样做会有个问题，就是生成的数据不够准确，比如：



```json
{
  "responses": {
    "200": {
      "description": "OK",
      "schema": {
        "users": [
          {
            "userId": "reprehenderit consequat fug",
            "name": "velit Duis",
            "homeAddress": "consectetur culpa cillum ex"
          },
          {
            "userId": "proident sit deserunt cupidatat sunt",
            "name": "aliquip eu laborum",
            "homeAddress": "eu tempor"
          },
        ]
      }
    }
  }
}
```



Swagger 定义中有一个字段是 `example`，它允许我们去定义这个



TODO: // 确认 Swagger UI 中的 Response 的 examples 是从哪里生成的？

我们需要的 Mock 数据一般来说都是请求成功响应的数据。仔细观察[一个 Swagger JSON](https://petstore.swagger.io/v2/swagger.json)，你很快就能发现，我们的 API Response 都定义在了  __definitions__  里面。因此处理 definitions 字段是尤为重要的一步。