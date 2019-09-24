我最近的在做的项目是一个前后端分离的项目，前后端由不同的团队分别开发，并且前端的进度经常领先后端。这就意味着，当前端在开发一个新功能时，API 可能还没有准备好。不过，我们会先和后端先商议好 API Schema，然后使用 Mock 数据进行开发。

但问题也随之而来，定义 Mock 数据并配置 mock server 真的太浪费时间了！我真的非常讨厌这种没有任何技术含量的「苦力活」。所以，只好想办法让生成 Mock 数据的过程「自动化」。那么，从哪里生成这些 Mock 数据呢？突然想到了开发时使用的 Swagger UI，它提供的 Swagger JSON 准确地定义了所有的 API Schema。因此，我们可以通过 Swagger JSON 去自动生成 Mock 数据。



本篇文章会介绍如何通过 Swagger 定义去生成 Mock 数据以及 Mock Server 的配置。主要内容包括：



- Swagger 简介

- 通过 Swagger JSON 生成 Mock 数据

  - 处理 Swagger JSON

  - 生成 Mock 数据
  - 生成 Mock Server 配置
  - 

本文所有代码都在这个仓库 [swagger-faker](https://github.com/reeli/swagger-faker)。



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

## 处理 Swagger JSON

要生成 Mock 数据，我们应该从 Swagger JSON 中获取哪些内容？我从 [这个 Swagger JSON](https://petstore.swagger.io/v2/swagger.json) 中截取了一段数据，如下所示。仔细观察下面的内容并思考这个问题。



```json
{
  "paths": {
    "/pet/findByStatus": {
      "get": {
        "tags": ["pet"],
        "summary": "Finds Pets by status",
        "description": "Multiple status values can be provided with comma separated strings",
        "operationId": "findPetsByStatus",
        "produces": ["application/xml", "application/json"],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "description": "Status values that need to be considered for filter",
            "required": true,
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["available", "pending", "sold"],
              "default": "available"
            },
            "collectionFormat": "multi"
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "schema": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/Pet"
              }
            }
          },
          "400": {
            "description": "Invalid status value"
          }
        },
        "security": [
          {
            "petstore_auth": ["write:pets", "read:pets"]
          }
        ]
      }
    }
  }
}
```



从上面的例子中可以发现，对于一个请求来说，我们需要的 Mock 数据就是它成功响应之后的数据。也就是说，对于 Swagger JSON，我们需要关心 `responses` 中 HTTP Status Code 为 2xx 的数据。但是 `response` 可能会引用 definitions 中定义的数据。因此，为了生成 Mock 数据，我们还需要处理 `$ref`，也就是用 Definitions 中定义的数据替换它。



## 生成 Mock 数据

处理好 response 之后，就可以生成 Mock 数据了。因为 Swagger JSON 中可以为 response 或者每一个 property 定义 examples/example，所以使用 examples/example 来生成 Mock 数据一定是最准确的。因此，我们会优先使用 examples/example。如果没有定义 examples/example，我们就通过 `type` 定义的数据类型去生成。



因为 [faker.js](https://github.com/marak/Faker.js/) 能让我们更方便地去生成 Mock 数据，因此这里选用了它。你可以像下面这样，构造一些方法，去生成不同类型的假数据。



```ts
import * as faker from "faker";

export const getRandomArrayItem = (items: any[]) => items[Math.floor(Math.random() * items.length)];
export const booleanGenerator = () => faker.random.boolean();
export const stringGenerator = (enumList?: any[]) => (enumList ? getRandomArrayItem(enumList) : faker.random.words());
export const numberGenerator = (max?: number, min?: number) =>
  faker.random.number({
    min,
    max,
  });
export const fileGenerator = () => faker.system.mimeType();

```



## 生成 Mock Server 配置

除了生成 Mock 数据之外，很多时候我们还需要配置 Mock Server。就拿我们常用的 [JSON Server](https://github.com/typicode/json-server) 来说，我们还需要配置一些额外的东西。比如在 db.json 中配置路由对应的 Mock 数据，在 routes.json 中自定义路由规则等。

因此，我们还需要从 response 中获取更多的内容，包括 path、basePath、method、response 和 queryParams，如下所示：



```ts
{
  "path": "/pet/findByStatus",
  "basePath": "/v2",
  "method": "get",
  "response": [
    {
      "id": 93645,
      "category": {
        "id": 85609,
        "name": "open-source"
      },
      "name": "doggie",
      "photoUrls": ["firewall Berkshire withdrawal"],
      "tags": [
        {
          "id": 13201,
          "name": "Salad synthesize e-business"
        }
      ],
      "status": "pending"
    }
  ],
  "queryParams": ["status"]
}
```



生成 JSON Server 中的自定义路由时，我们可以根据规则，使用 basePath, path 和 queryParams 拼接即可。



```json
// routes.json
{
  "/v2/pet/findByStatus?status=:status": "./findPetsByStatus"
}
```



最后，将这些数据写入对应的文件中便大功告成了。



# 最后

生成 Mock 数据的过程中还是有很多细节需要处理，感兴趣的同学可以去这个仓库 [swagger-faker](https://github.com/reeli/swagger-faker) 查看源码。