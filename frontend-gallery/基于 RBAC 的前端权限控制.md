当我们讨论「前端应用的权限控制」时，不是在讨论如何去「控制权限」，而是在说如何保证「更好的用户体验」。因为前端本就无法实现真正的权限控制。

大部分时候，前端应用的权限控制其实就是：根据不同的权限显示或隐藏某个页面以及 UI 组件。目的就是提升用户体验，并减少发起无用的 HTTP 请求。

RBAC 是目前普遍使用的一种权限模型。本文会讨论如何基于 RBAC 权限模型去实现前端应用的权限控制。



## RBAC 简介

RBAC（Role-Based Access Control）即：基于角色的访问控制。RBAC 认为授权其实就是 who, what, how 三者之间的关系，即 who 对 what 进行 how 操作。简单来说就是某个角色 (who) 对某些资源 (what) 拥有怎样的 (how) 权限。

在 RBAC 中，用户只和角色关联，而角色对应了一组权限。通过为不同的用户分配不同的角色，从而让不同的用户拥有不同的权限。

相比于 ACL（Access Control List）直接为用户赋予权限的方式，RBAC 通过角色为用户和权限之间架起了一座桥梁，从而简化了用户和权限之间的关系，让权限配置更易于扩展和维护。

![rbac](权限控制.assets/image-20191216212755925.png)

## 前端应用的权限控制

对于前端应用来说，按照权限控制粒度的不同，可以分为组件权限和页面权限：

1. 组件权限控制的粒度更细，可以精确地控制每个 UI 组件显示与否。
2. 页面权限控制的粒度较粗，只能控制到页面层。本质上就是对路由进行权限控制。



### 组件权限控制

刚才也提到了，组件的权限控制粒度很细。因此，我们可能需要为应用中数百个组件添加权限控制。这意味着如果一开始没有设计好组件权限控制的方案，可能会导致应用难以维护，甚至造成灾难性的后果。



#### 一个「错误」的方案

在最初设计组件权限控制的方案时，我们将组件的显示与否关联到了角色。也就是说通过配置允许访问组件的角色列表，去控制组件的显示与否。为了方便使用，我们还设计了一个公用组件，用它来包裹每个需要权限控制的组件。如下所示：



```tsx
<OneOfAccessControl permittedRoles={["RoleA", "RoleB", "RoleC"]}>
  <Button />
</OneOfAccessControl>
```



在上面的例子中，只要列表中的任意一个角色有权限，那么就会渲染按钮组件，否则什么也不做。这段代码看起来似乎没什么问题。但如果此时要新增一个角色，试想会发生什么？

我们可能需要修改上百个地方的配置，而且由于配置散落在项目的各个角落，修改起来十分困难。因此每增加一个角色或者移除一个角色，都会带来巨大成本。为了解决这个问题，我们优化了之前的方案。如下所示：



```typescript
const permissionsConfig = {
  canViewButton: ["RoleA", "RoleB", "RoleC"],
  canEditButton: ["Role_A", "Role_B"]
  canDeleteButton: ["Role_B"],
};
```



与前面不同的是，我们将分散的配置项集中管理起来了。在获取到当前用户所拥有的角色之后，将这份配置转换成了一组控制 UI 组件显隐的开关，并通过 Context 提供给下游组件。因此使用时只需要通过一个布尔值就能控制按钮显示和隐藏。如下所示：



```typescript
const { canViewButton } = useContext(PermissionsContext);
canViewButton && <Button />;
```



优化之后的方案确实更易于维护了。但如果需求是根据动态生成的角色去控制组件的显示与否，又该如何解决呢？动态生成角色意味着角色列表可能随时发生变化。因此无法再像上面一样，通过配置「固定」的角色列表，去控制组件的显示与否。

其实问题的关键就在于：RBAC 权限模型中，角色不是固定的而是动态变化的。我们可以随时增加或者修改一个角色。因此，最好不要将组件的权限控制和角色绑定到一起。



#### 不如交给 BFF 吧？

有时候一个组件的显示与否，不仅仅和权限相关，也和 API 返回的数据相关。比如：



``` jsx
// 有权限并且年满 18 岁的用户才能看到这个按钮
hasPermission && age >= 18 && <Button />
```



我们都知道，BFF（Backends For Frontends）是服务于前端的后端。既然是为前端服务的，我们可以在返回数据的同时，返回组件的开关。这样即便权限或数据状态发生改变，前端也无需重新部署。

不过这个方案可能会增加前后端的沟通成本。每次定义 API Schema 时，除了业务数据还需要定义一堆控制组件显隐的开关。

随着前端组件的变化，字段可能也需要重命名。比如原来的字段名叫 `canViewProfile`，随着需求的变化应该修改为 `canViewProfileAndHistory`，否则就会产生字段不表意的问题。

另外，前端组件不断增加，开关字段也会随之增多。如下所示：



```json
{
  "canViewProfile": true,
  "canEditProfile": false,
  "canDeleteProfile": false,
  "canViewHistory": true,
  "canEditHistory": false,
  "canDeleteHistory": false,
  "canCreateReport": false,
  "canViewReport": false,
  "canDeleteReport": false
}
```



在一些情况下，这种方案可能有致命的缺陷。比如一个提交按钮，根据权限控制的需求，在请求数据之前就需要将其隐藏，这个时候就无法通过 BFF 在返回数据中加上开关，而再提供额外接口获取开关又显得冗余。



#### 将后端权限映射到前端

RESTful 是目前最流行的 API 设计规范。它的核心思想就是用「动词 + 宾语」的结构来描述客户端发出的数据操作指令。

动词通常是指五种 HTTP 方法（GET, POST, PUT, PATCH, DELETE），对应接口的 CRUD 操作。宾语是指操作的资源。`DELETE /book/ID` 这个指令描述的就是删除（动词）某本书（宾语）。而 RESTful API 中的「动词 + 宾语」，不就正好对应了 RBAC 权限模型中的「权限 + 资源」吗？

因此，可以将权限管理与 RESTful API 关联起来。比如，A 角色对 `book` 资源拥有 `delete` 权限，那么 A 角色就一定可以调用 `DELETE /book/ID`  API，自然也能看到页面上的删除按钮。

我们可以让后端返回当前用户可用的接口列表，用于开关前端组件。比如：



```json
{
  "permissions": [
    "GET,/api/books",
    "POST,/api/book/{id}",
    "PATCH,/api/book/{id}",
    "DELETE,/api/book/{id}"
  ]
}
```



但接口最好用 API 唯一标识替代（如 `operationId`），方便前端使用。如下所示：



```json
{
  "permissions": ["GetBook", "NewBook", "UpdateBook", "DeleteBook", "ListBook"]
}
```



这样，当我们需要控制 `DeleteButton` 是否显示时，只需要看看当前用户有没有调用 `DeleteBook` 接口的权限即可。如下所示：



```tsx
const { permissions } = useContext(PermissionsContext);

hasPermission(permissions, "DeleteBook") && <DeleteButton />;
```



通过可用接口列表来配置权限，在角色变化时不会造成任何负担。同时，由于不需要在接口中定义开关字段，减少了前后端的沟通成本，也避免了接口字段不断膨胀的问题。



### 页面权限控制

页面的权限控制，其实就是对路由的权限控制。我们可以根据用户当前所拥有的权限，去判断他是否能访问某个页面，从而决定是否渲染某个路由导航。

与组件的权限控制类似，页面的权限控制也面临着相同的问题。如果根据角色列表去控制导航菜单的渲染，同样会遇到角色动态变化的问题。如果让 BFF 返回路由开关，还需要增加一个额外的接口。因此，最好还是根据用户可访问的接口列表去开关路由。



#### 配置路由

在配置路由时，我们可以增加一个状态 `visible ` 用于开关路由。在获取到当前用户可访问的接口列表之后，再将用户可访问的路由过滤出来。



```typescript
const routes = [
  {
    path: "/home",
    exact: true,
    visible: (permissions) => hasOneOfPermissions(["GetBook", "GetPerson"], permissions),
  },
  {
    path: "/list",
    exact: true,
    visible: (permissions) => hasAllPermissions(["GetList", "ListBook"], permissions),
  },
];

filterRoutesByPermissions(routes, permissions);
```



这个方案相对来说比较简单，但是容易遗漏配置项。



#### 组件推导

页面一定会使用组件，因此可以根据页面使用到的组件推导出页面的权限。当然这里需要对组件进行一些改造。比如上一小节的 `DeleteButton` ：



```tsx
const ACDeleteButton = needPermissions("DeleteBook")(DeleteButton)
```



我们可以封装 HOC 来包裹原组件， 使之在 Function Component 的基础上，让函数持有 `shouldRender(permissions: {}) => bool` 方法以便推导：



```tsx
interface AccessControlComponent<TProps> {
  (props: TProps) => JSX.Element | null
  shouldRender: (permissions: {}) => bool 
}

```



在其他组件，我们可以通过如下方式进行组合直至页面：



```tsx
const ACSection = needPermissions(ACDeleteButton)(() => (
	<div>
    <ACDeleteButton/>
  </div>	
))

const ACPage = needPermissions(ACSection)(() => (
	<div>
    <ACSection/>
  </div>	
))
```



最后将 `ACPage` 注册到路由，在渲染导航菜单时，我们可以直接使用  `ACPage.shouldRender` 判断是否需要渲染页面对应的菜单（页面自身已经有控制）。



`needPermissions` 实现如下：



```tsx
function needPermissions<TProps>(...args: Array<AccessControlComponent | permissionKey>) {
  const permissionKeys: string[] = [];
  const accessControlComponents: AccessControlComponent[] = [];

  args.forEach((arg) => {
    if (typeof arg == "string") {
      permissionKeys.push(arg);
    } else {
      accessControlComponents.push(arg);
    }
  });

  const shouldRender = (permissions: {}) => {
    return (
      every(permissionKeys, (permissionKey) => hasPermission(permissions, permissionKey)) &&
      every(accessControlComponents, (accessControlComponent) => accessControlComponent.shouldRender(permissions))
    );
  };

  return (Comp: FunctionCompoment<TProps>) => {
    const ac = (props: props) => {
      const { permissions } = useContext(PermissionsContext);

      if (shouldRender(permissions)) {
        return <Comp {...props} />;
      }
      return null;
    };

    ac.shouldRender = shouldRender;

    return ac;
  };
}
```



组件推导的方案更适合通过 Babel 插件去自动配置。如果没有自动化工具辅助，这个方案会显得比较繁琐。



## 最后

本文讨论了前端实现 RBAC 权限控制的几种方案。这些方案没有绝对的对错之分，只有「适合」与「不适合」。就拿第一个「错误」的方案来说，它确实缺少了一些灵活性，但如果你项目中的角色变动很少，采用这个方案也不是不可以。只不过你需要明确这个方案带来的「利」与「弊」。





------------------





希望大家在指定权限控制方案时，能够清楚每种方案的利与弊。



可以通过 Babel 插件去自动添加。如果是手动加推导，可能会出现遗漏的情况，debug 起来更困难。

如果觉得很麻烦，可以在页面这一层就全部配置完成。组件推导适合通过工具来去自动配置。当页面比较复杂时，容易遗漏。



Hook ？



如何 Debug？



是否请求 welfare-home-officer 接口？由于 Internet 和 intranet 环境的用户都有可能调用这个接口，只是 intranet 的有些用户不能调用这个接口。那我们不能单纯的根据是 Internet 环境还是 intranet 环境去判断是否调用这个接口，而是根据用户所拥有的权限去判断，如果用户有调用这个接口的权限，那么就发起请求，否则就不发起请求。至于用户是否有调用这个接口的权限，我们可以通过用户所拥有的角色来判断？（同样会有前面提到的问题）







将权限和资源映射成 API。

权限控制应该对应资源和权限，而非角色。因为角色是动态创建的，对于相同的一组资源来说，不同的角色可能拥有不同的权限。因此，新建一个角色其实就是新建一组资源权限的集合。而在第一个方案中，描述的其实是某个角色是否能看到某个 UI 元素，并没有对应到资源上。因此，每新增一个角色时都会给前端带来很大成本。



如果前端能够知道某个角色能够调用哪些 API，就能够自动显示或隐藏对应的 UI 元素。

因为 RESTful API 中描述的「资源 + 对资源的操作类型」，正好对应了 RBAC 模型中的「资源 + 权限」。



因为 RESTful 是面向资源的，通过 RESTful API 我们可以知道资源以及资源的操作类型（GETPOST/PUT/PATCH/DELETE）。因此，我们可以得出这样一个结论：一个资源加上一个权限就可以对应为一个 RESTful API。



RBAC 权限模型中的「一个角色对某些资源拥有怎样的权限」，就可以翻译为「一个角色可以调用哪些 API」。



最大的问题是，组件的显示与否是强依赖于 API 响应数据的。也就是说，必须先发起 HTTP 请求才能获取控制组件显隐状态的字段。如果这里原本就需要发起一个 HTTP 请求，那么后端「顺便」将这些字段返回给前端也没有什么不妥。但是如果一个组件的显示与否，需要在发起 API 之前决定，又该怎么办呢？难道要写一个额外的 API 去处理这种情况吗？当然不是，这种情况还是应该前端去处理。



那既然组件的显示与否需要响应数据才能决定，如果由 BFF 去控制前端组件的显隐，那么当权限或数据状态发生改变时，前端无需重新部署。

我们可以通过它去控制前端组件的显隐。BFF 通过权限和数据状态判断出前端组件的显隐状态，并将其返回给前端。这样前端只需要通过布尔值去决定是否渲染组件即可。







比如管理员可以动态创建一个新的角色，那么这个新的角色同样应该参与按钮组件显隐的控制。但是由于按钮组件的显示与否是根据「固定」的角色列表来判定的，因此无法满足「动态」增加或删除角色的需求。



组件的权限控制，其实就是控制组件的显示与否。但有时候组件的显示与否，不仅仅和权限相关，也和数据状态相关：



```jsx
<OneOfAccessControl permittedRoles={["RoleA", "RoleB", "RoleC"]}>
  {age >= 18 && <Button />}
</OneOfAccessControl>;
```



在实际场景中，可能会有很多状态去控制 UI 元素是否显示，再加上权限控制，测试起来十分困难。在使用这个方案的过程中，问题也逐渐暴露出来：

1. 配置 `permittedRoles` 可能出错，且逻辑分散在项目的各个角落，难以维护。
2. 增加角色的成本很大，因为需要修改散落在各个地方的配置。
3. 增加单元测试成本。为了确保每个 UI 组件都正确设置了访问权限，我们需要增加单元测试。但是测试组件是否根据 `permittedRoles` 和状态渲染了正确的 UI，是一笔很大的开销。
4. 前后端权限控制不一致的问题。对于某个角色来说，能看到哪些 UI 元素是由前端控制的，而能够调用哪些接口是由后端决定的。有时候由于沟通协作的问题，可能会出现页面上显示了某个 UI 元素，但是却没有权限调用对应接口的问题。
5. 当某个 UI 元素的权限发生变化时，需要修改前端配置并重新部署。



一个用户有哪些权限，在登录完成之后就已经确定了。也就是说，这个用户能看到页面上的哪些元素也已经确定了。因此可以将所有权限配置放到一个文件中，统一管理起来。比如：







然后，在拿到当前用户所拥有的角色之后，将这份配置转化为下面的形式提供给下游组件使用：

 

```typescript
const accesss = {
  canViewProfile: true,
  canEditProfile: false,
  canDeleteProfile: true,
}
```



在使用时，只需要通过一个布尔值去控制按钮是否显示就可以了：



```tsx
const {
  access: { canViewProfile },
} = useContext(AccessControlContext);

canViewProfile && <Button />;
```



通过这种方式将应用中所有权限控制的配置都汇总到一个地方，维护起来更加方便。同时为了保证配置的正确性，我们可以通过简单的 snapshot 测试来覆盖业务场景。在使用时因为逻辑非常简单，甚至不需要再增加额外的单元测试。这个方案只解决了我们刚才提到的两个问题，那其他问题如何解决呢？请接着往下看。





每个需要权限控制的组件，都需要增加相应逻辑。因此为了方便使用，可以通过一些公用组件来帮我们进行权限控制。如果要对一个按钮增加权限控制，只需要在它外面包裹一个组件，然后配置允许访问的角色即可。只要其中任意一个角色被允许，就渲染按钮否则就返回空。



1. 减少前后端沟通成本。比如增加或减少一个用于权限控制的接口字段。
2. 无需增加任何额外字段，只需要通过是否能够使用某个接口，就能判定某个元素是否显示。解决了接口无限膨胀的问题。



最终决定元素的显示与否，可能是权限 + 数据状态。



权限 + 数据状态：

1 对 多：后端 

   1. 无限膨胀

      

表达式：避免服务重启。

后端动态 Render ：解决了无限膨胀的问题、更灵活。但是页面元素相对固定，如果要增加或者修改都很困难。



1 对 1： 前端

1. 状态单独判断。（修改、部署困难）
2. 需求变更的情况。









RBAC 控制的最小单元就是接口。让接口的权限和组件的显示与否一一对应。不会存在和后端不一致的情况。





```typescript
const PermissionsContext = createContext<{ permissions: { [key: string]: true }}>({})

const usePermissions = () => useContext(PermissionsContext).permissions || {}


const mustOneOfPermissions = (...requestActionCreators: { name: string }) => (
  const operationIDs = requestActionCreators.map((p) => p.name)

	return function<TProps>(Comp: ComponentType<TProps>) {
    return (props: TProps) => {
      const permissions = usePermissions()
      
      if (some(operationIDs, (operationID) => permissions[operationID])) {
        return <Comp {...props} />
      }
      
      return null
    }
  }
)


const mustAllOfPermissions = (...requestActionCreators: { name: string }) => (
  const operationIDs = requestActionCreators.map((p) => p.name)

	return function<TProps>(Comp: ComponentType<TProps>) {
    return (props: TProps) => {
      const permissions = usePermissions()
      
      if (every(operationIDs, (operationID) => permissions[operationID])) {
        return <Comp {...props} />
      }
      
      return null
    }
  }
)

const SomeComponent = () => {
  
}
```





## Dynamic Content

和组件化开发的思路是一样的。我们可以进一步抽象，将页面元素划分为可配置的 block，不同的 block 包含不同的类型或对应的配置值，如 Section, Image, Paragraph 等，当然每种类型的 block，是需要前端开发完备的，支持对应配置项。然后我们便可通过 JSON 来描述和存储页面，比如

```jsx
const Page = (
  <>
    <Section>
      <Paragraph content="xxxxxx"/>
      <Image src="http://xxx">
    </Section>
    <Section>
      <Paragraph content="content">
    </Section>
  </>
)
```

可以描述为

```json
[
  {
    "type": "Section",
    "children": [
      {
        "type":"Paragraph",
        "content": "xxxxxx"
      },
      {
        "type":"Image",
        "src": "http://xxx"
      }
    ]
  },
  {
    "type": "Section",
    "children": [
      {
        "type":"Paragraph",
        "content": "content"
      }
    ]
  }
]
```

虽然看上去复杂了不少，但由于 JSON 无关语言，易于传输与存储的特性。我们可以这份 JSON 可存放到服务端，前端获取这一 JSON 配置，渲染最终页面。在一些特殊需求中（RBAC，定向广告），服务进行适当删减，使得显示内容得以动态。

参考: https://www.contentful.com/



## Dynamic Form

同样的，更复杂的表单，也是一样的思路，只是对于 Form，有一个额外的功能点，即表单可能随着用户的输入而变化。

既然是表单，最终是需要提交的，所以一般而言我们会为 Dynamic Form 定义两个部分。

一个是提交数据的声明结构，这个采用 JSON Schema 即可。如提交数据为

```json
{
  "name": "xxx",
  "age": 1,
  "gender": "male"
}
```

我们可以用如下声明表示

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"，
      "pattern": "[\w]{2,}"，
      "x-error": "名字长度不够"
    },
    "gender": {
      "type": "string",
      "enum": ["male", "female"],
      "x-enum-labels": ["男"，"女"]
    }，
    "age": {
      "type": "number",
      "mininum": 20，
      "x-error": "年龄太小"
    }
  }
}
```

然后前端根据不同的类型，渲染对应的组件，

* `type: "string"` 我们可以用  `TextInput` 渲染，`type: "number"` 我们可以用 `NumberInput` 渲染，我们可以 JSON Schema 的 validations 属性来进行输入检查， 由于 JSON Schema 毕竟是设计来描述数据结构的，对错误的 inline error，我们可以扩展 `error` 来描述。
* `type: "number"` 我们可以用 `NumberInput` 渲染，
* `enum` 我们可以用  `SelectInput` 渲染。同样的，对于选项文本的描述需要我们自己扩展，如上面例子中的 `x-enum-labels` ，



对于响应用户输入变化，JSON Shema 有对应的方案。https://json-schema.org/understanding-json-schema/reference/conditionals.html，如下，男女法定婚龄不同，JSON Schema 可定义为，前端组件做出对应的处理即可。

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"，
      "pattern": "[\w]{2,}"，
      "x-error": "名字长度不够"
    },
    "gender": {
      "type": "string",
      "enum": ["male", "female"],
      "x-enum-labels": ["男"，"女"]
    }，
    "age": {
      "type": "number"
    }
  },
  "if": {
    "properties": { "gender": { "const": "male" } }
  },
  "then": {
    "properties": { "age": { "mininum": 22 } }
  },
  "else": {
    "properties": { "age": { "mininum": 20 } }
  }
}
```



可是这个方案确实不够强大，对应。

这里还有另一种方式，借鉴自一个地图引擎，https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions，对于复杂场景，来定义 validation `x-validation` 和 condition `x-when`，还可以支持复杂情况

```json
[expression_name, argument_0, argument_1, ...]

["one", ...]
["all", ...] 
["match", pattern, msg]
["get", path]
["case", defaultResult, case1, result1, ...]
[">", target, v]
[">=", target, v]
["==", target, v]
["<", target, v]
["<=", target, v]
```



```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"，
// if (len(field_value) == 0) return "不能为空"
// if (!(/[\w]{2,}/.text(field_value))) return "名字长度不够"
// return ""      
      "x-validate": [
         "case",
         "",
         ["==", ["len"，"$value"], 0], "不能为空",
         ["not", ["match", "$value", [\w]{2,}"]], "名字长度不够",
      ] 
    },
    "gender": {
      "type": "string",
      "enum": ["male", "female"],
      "x-enum-labels": ["男"，"女"]
    }，
    "age": {
      "type": "number"，
// get(values, "gender") && <Field/>      
      "x-when": [
      	"get", "gender",
      ],
// if (get(values, "gender") == "male" && field_value <= 22) return "年龄太小"
// if (get(values, "gender") == "female" && field_value <= 20) return "名字长度不够"
// return "" 
      "x-validate": [
        "case",
        "",
        ["all",
           ["==", ["get", "$values", "gender"], "male"],
           ["<=", 22]
        ], "年龄太小"],
        ["all",
           ["==", ["get", "$values", "gender"], "female"],
           ["<=", 20]
        ], "年龄太小"],
      ]
    }
  }
}
```

至于如何去解析并运算表达式，这算是函数式编程的别样用法。















权限控制应该对应到它的最小单元，否则难以扩展。



权限控制：

oneOf A, B, C

allOf A,B,C



- 对路由的权限控制

- 局部 UI 组件的显示与否。如果用户没有某个权限，点击某个 button 时会抛出 error message，是否考虑 hide button 或者提示用户？

  

