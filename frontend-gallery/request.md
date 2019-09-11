# 基于 React 的 API 集成解决方案

[]()
<a name="xstWP"></a>
# 1. 统一处理 HTTP 请求

<a name="S2NWw"></a>
## 1.1 为什么要这样做？

我们可以通过 fetch 或者 XMLHttpRequest 直接发起 HTTP 请求。但是，如果在每个需要调用 API 的地方都采用这样的方式，不仅会产生大量的模板代码，而且很难应对一些业务场景，如何实现 loading 动画、analytics、API 去重等？

因此，我们需要对 HTTP 请求进行统一处理。

<a name="yjwmp"></a>
## 1.2 如何设计和实现？

通过 redux，我们可以将 API 请求 「action 化」。换句话说，就是将 API 请求转化成 redux 中的 action。通常来说，一个 API 请求会转化为三个不同的 action: request action、request start action、request success/fail action。分别用于发起 API 请求，记录请求开始、请求成功响应和请求失败的状态。然后，通过 redux middleware 来统一处理这些不同的 action，可以应对各种复杂的业务场景。

<a name="lgkDy"></a>
### 1.2.1 Request Action

redux 的 **dispatch** 是一个同步方法，默认只用于分发 action (普通对象)。但通过 middleware，我们可以 dispatch 任何东西，比如 function (redux-thunk) 和 observable，只要确保它们被拦截即可。

要实现异步的 HTTP 请求，我们需要一种特殊的 action，本文称之为 **request action** 。request action 会携带请求参数的信息，以便之后发起 HTTP 请求时使用。与其他 action 不同的是，它需要一个 **request** 属性作为标识。其定义如下：

```typescript
interface IRequestAction<T = any> {
  type: T
  meta: {
    request: true // 标记 request action
  };
  payload: AxiosRequestConfig; // 请求参数
}
```

redux 的 action 一直饱受诟病的一点，就是会产生大量模板代码，而且纯字符串的 type 也很容易写错。所以官方不推荐我们直接使用 action 对象，而是通过 **action creator** 函数来生成相应的 action。比如社区推出的 redux-actions，就能够帮助我们很好地创建 action creator。参考它的实现，我们可以实现一个函数 createRequestActionCreator ，用于创建如下定义的 request action creator:

```typescript
interface IRequestActionCreator<TReq, TResp = any, TMeta = any> {
  (args: TReq, extraMeta?: TMeta): IRequestAction;

  TReq: TReq;   // 请求参数的类型
  TResp: TResp; // 请求响应的类型
  $name: string; // request action creator 函数的名字
  toString: () => string;
  start: {
    toString: () => string;
  };
  success: {
    toString: () => string;
  };
  fail: {
    toString: () => string;
  };
}
```

`TReq` 和 `TResp` 分别表示 **请求参数的类型** 和 **请求响应的类型**，它们保存在 request action creator 函数的原型上。这样，通过 request action creator，我们就能迅速知道一个 API 的请求参数和响应的类型。

```typescript
const user: typeof getUser.TResp = { name: "Lee", age: 10 };
```

对于 API 请求来说，请求开始、请求成功和请求失败这几个节点非常重要。因为每一个节点都有可能触发 UI 的改变。我们可以定义三种特定 type 的 action 来记录每个异步阶段。比如 `GET_DATA`, 我们可以定义 `GET_DATA_START`, `GET_DATA_SUCCESS` 和 `GET_DATA_FAIL` 来追踪 API 请求时 promise 的 `pending`、`fulfilled` 和 `rejected` 阶段。

所以一个 request action 会关联三个不同 type 的 action，也就是我们上面提到的 request start action、request success action 和 request fail action。

```typescript
interface IRequestStartAction<T = any> {
  type: T; // xxx_START
  meta: {
    prevAction: IRequestAction; // 保存其对应的 reqeust action
  };
}

interface IRequestSuccessAction<T = any, TResp = any> {
  type: T; // xxx_SUCCESS
  payload: AxiosResponse<TResp>; // 保存 API Response
  meta: {
    prevAction: IRequestAction; 
  };
}

interface IRequestFailAction<T = any> {
  type: T; // xxx_FAIL
  error: true;
  payload: AxiosError; // 保存 Error
  meta: {
    prevAction: IRequestAction; 
  };
}
```

前面也提到了，action 的 type 是纯字符串，手写会很容易出错。所以我们在 request action creator 的原型上绑定了一个 `toString` 方法，以及 `start`、 `success` 和 `fail` 属性，这样通过 request action creator，就能够直接获取这几个 action 的 type:

```typescript
`${getData}` // "GET_DATA"
`${getData.start}` // "GET_DATA_START"
`${getData.success}` // "GET_DATA_SUCCESS"
`${getData.fail}`  // "GET_DATA_FAIL"
```

[]()
<a name="4sdyk"></a>
### 1.2.2 Request Middleware

接下来，我们需要创建一个 middleware 来统一处理 request action。middleware 的逻辑很简单，就是拦截所有的 request action，然后发起 HTTP 请求：

- 请求开始：dispatch xxx_STAT action，方便显示 loading
- 请求成功：携带 API Response，dispatch xxx_SUCCESS action
- 请求失败：携带 Error 信息，dispatch xxx_FAIL action

这里需要注意的是，request middleware 需要「吃掉」request action，也就是说不把这个 action 交给下游的 middleware 进行处理。一是因为逻辑已经在这个 middleware 处理完成了，下游的 middleware 无需处理这类 action。二是因为如果下游的 middleware 也 dispatch request action，会造成死循环，引发不必要的问题。


<a name="N52NL"></a>
## 1.3 如何使用？

我们可以通过 dispatch request action 来触发请求的调用。然后在 reducer 中去处理 request success action，将请求的响应数据存入 redux store。但是在实际使用场景中，我们可能会在 dispatch action 的地方去注册请求成功或失败的回调。

<a name="cn5W0"></a>
### 1.3.1 useRequest: 基于 React Hooks 和 RXJS 调用请求

裂变的 action 带来的问题，不方便直接调用 onSuccess 和  onFail。和 Promise 直接调用比较。这样，可以像 Promise 一样使用。

前面也提到过，为了让发起请求、请求成功和请求失败这几个阶段不再割裂开来，我们设计了 `onSuccess` 和 `onFail` 回调。但是这两个 callback 应该挂载在什么地方？这些逻辑具体是如何实现的呢？我们通过 React Hook API，封装了一些自定义 Hook，去实现我们上面的设计，也更方便在项目上去使用。

<a name="kWczY"></a>
#### 通过 RxJS 处理请求成功/失败回调

很多时候不仅要发起 API 请求，还要在 **请求成功** 或者 **请求失败** 的时候去执行一些逻辑。这些逻辑可能不会对 state 造成影响，因此不需要放到 reducer 中去处理。比如：用户填写了一个表单，点击 submit 按钮时会发起 API 请求，但只有当 API 请求成功时才会跳转页面，否则什么也不做。

可以通过回调函数来解决这个问题，在请求成功/失败的时候，去执行对应的 callback 就可以了。

```typescript
// 伪代码

if (requset_success) {
  onSuccess(request_success_action)
}

if (request_fail) {
  onFail(request_fail_action)
}
```

Promise 和 callback 都像「泼出去的水」，正所谓「覆水难收」，一旦它们开始执行便无法取消。如果遇到需要「取消」的场景就会比较尴尬。虽然可以通过一些方法绕过这个问题，但始终觉得代码不够优雅。因此，我们引入了 RxJS，尝试用一种新的思路去探索并解决这个问题。

通过改造 redux 的 `dispatch` 方法，在每次 dispatch 一个 action 之前，再 dispatch 一个 `subject$`。接着，在 middleware 中创建一个 `rootSubject$`，用于拦截 dispatch 过来的 `subject$`，并将它作为 `rootSubject$` 的观察者。对于 dispatch 过来的 普通 action，`rootSubject$` 会将其推送给它的所有观察者。最后，观察请求成功/失败的 action 并执行对应的 callback。

利用 Rx 自身的特性，我们可以更加方便的去控制复杂的异步流程，当然也包括取消。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/165509/1567418895336-d278e2a3-da99-4ab0-a884-a44d3ae6eb71.png#align=left&display=inline&height=675&name=image.png&originHeight=1404&originWidth=1294&size=190152&status=done&width=622)

[]()

`useRequest` 提供 **用于发起请求的函数**，同时在请求成功或失败时，**执行相应的回调函数**。

<a name="Ihvhq"></a>
#### 输入和输出

它的输入和输出大致如下：

```typescript
interface IRequestCallbacks<TResp> {
  onSuccess?: (action: IRequestSuccessAction<TResp>) => void;
  onFail?: (action: IRequestFailAction) => void;
}

export enum RequestStage {
  START = "START",
  SUCCESS = "SUCCESS",
  FAILED = "FAIL",
}

const useRequest = <T extends IRequestActionCreator<T["TReq"], T["TResp"]>>(
  actionCreator: T,
  options: IRequestCallbacks<T["TResp"]> = {},
  deps: DependencyList = [],
) => {
  
  // ...
  
  return [request, requestStage$] as [typeof request, BehaviorSubject<RequestStage>];
};
```

它接收 `actionCreator` 作为第一个参数，并返回一个 **request 函数**，当你调用这个函数时，就可以**分发相应的 request action**，**从而发起 API 请求**。<br />
<br />同时它也会返回一个可观察对象 `requestStage$` ，用于推送当前请求所处的阶段，其中包括：**请求开始、请求成功和请求失败三个阶段**。这样，在发起请求之后，我们就能够轻松地追踪到它的状态。这在一些场景下非常有用，比如当请求开始时，在页面上显示 loading 动画，请求结束时关闭这个动画。<br />
<br />为什么返回可观察对象 `requestStage$` 而不是返回 requestStage 状态呢？如果返回状态，意味着在请求开始、请求成功和请求失败时都需要去 setState。但并不是每一个场景都需要这个状态。对于不需要这个状态的组件来说，就会造成一些浪费（re-render）。因此，我们返回一个可观察对象，当你需要用到这个状态时，去订阅它就好了。

 `options` 作为它的第二个参数，你可以通过它来指定 `onSuccess` 和 `onFail` 回调。onSuccess 会将 request success action 作为参数提供给你，你可以通过它拿到请求成功响应之后的数据。然后，你可以选择将数据存入 redux store，或是 local state，又或者你根本不在乎它的响应数据，只是为了在请求成功时去跳转页面。但无论如何，通过 useRequest，我们都能更加便捷地去实现需求。

```typescript
const [getBooks] = useRequest(getBooksUsingGET, {
  success: (action) => {
    saveBooksToStore(action.payload.data); // 将 response 数据存入 redux store
  },
});

const onSubmit = (values: { name: string; price: number }) => {
  getBooks(values);
};
```

<a name="JF7jr"></a>
#### 复杂场景

`useRequest` 封装了调用请求的逻辑，通过组合多个 `useRequest` ，可以应对很多复杂场景。

**处理多个相互独立的 Request Action**<br />**<br />同时发起 **多个不同 **的 request action，这些 request action 之间 **相互独立**，并无关联。这种情况很简单，使用多个 `useRequest` 即可。

```typescript
const [requestA] = useRequest(A);
const [requestB] = useRequest(B);
const [requestC] = useRequest(C);

useEffect(() => {
  requestA();
  requestB();
  requestC();
}, []);

```

**处理多个相互关联的 Request Action**<br />**<br />同时发起 **多个不同 **的 request action，这些 request action 之间 **有先后顺序**。比如发起 A 请求，A 请求成功了之后发起 B 请求，B 请求成功了之后再发起 C 请求。由于 useRequest 会创建发起请求的函数，并在请求成功之后执行 onSuccess 回调。因此，我们可以通过 useRequest 创建多个 request 函数，并预设它们成功响应之后的逻辑。就像 RXJS 中「预铺设管道」一样，当事件发生之后，系统会按照预设的管道运作。

```typescript
// 预先创建所有的 request 函数，并预设 onSuccess 的逻辑
const [requestC] = useRequest(C);

const [requestB] = useRequest(B, {
  onSuccess: () => {
    requestC();
  },
});
const [requestA] = useRequest(A, {
  onSuccess: () => {
    requestB();
  },
});

// 当 requestA 真正调用之后，程序会按照预设的逻辑执行。

<form onSubmit={requestA}>

```

**处理多个相同的 request action**<br />**<br />同时发起 **多个完全相同 **的 request action，但是出于性能的考虑，我们通常会「吃掉」相同的 action，只有最后一个 action 会发起 API 请求。但是对于 request action 的回调函数来说，可能会有下面两种不同的需求：

1. 每个相同 request action 所对应的 onSuccess/onFail 回调在请求成功时都会被执行。
1. 只执行真正发起请求的这个 action 所对应的 onSuccess/onFail 回调。

对于第一个场景来说，我们可以判断 action 的 type 和 payload 是否一致，如果一致就执行对应的 callback，这样相同 action 的回调都可以被执行。对于第二个场景，我们可以从 action 的 payload 上做点「手脚」，action 的 payload 放置的是我们发起请求时需要的 request config，通过添加一个 UUID，可以让这个和其他 action「相同」的 action 变得「不同」，这样就只会执行这个 request action 所对应的回调函数。

<a name="0KOt2"></a>
#### 组件卸载
**<br />通常我们会使用 Promise 或者 XMLHttpRequest 发起 API 请求，但由于 API 请求是异步的，在组件卸载之后，它们的回调函数仍然会被执行。这就可能导致一些问题，比如在已卸载的组件里执行 setState。

组件被卸载之后，组件内部的逻辑应该随之「销毁」，我们不应该再执行任何组件内包含的任何逻辑。利用 RxJS，useRequest 能够在组件销毁时自动取消所有逻辑。换句话说，就是不再执行请求成功或者失败的回调函数。

<a name="vc86E"></a>
### 1.3.2 实际场景
处理 Request Action 以及它裂变出来的 action。<br />loading<br />API 去重<br />Analytics

<a name="9Si3L"></a>
# 2. 存储并使用请求响应的数据

请求返回的数据对于应用来说有不同的作用，所以需要归类。所以要建立模型。数据的存活时间。useSearch。

在 redux 中，所有的 state 都被保存在一个对象中。对于 API Response 这一类数据，我们应该如何存储呢？我们目前的方案是，对不同的 state 分类存储。就像平时我们收纳生活用品一样，比如第一个抽屉放餐具，第二个抽屉放零食。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/165509/1567418882391-583b61d5-7c01-4ced-a992-7cf648f8184a.png#align=left&display=inline&height=340&name=image.png&originHeight=340&originWidth=440&size=258256&status=done&width=440)

按照数据变化的频率，可以大致将 API response 归为两类：

一类是变化频率非常高的数据，比如排行榜列表，可能每一秒都在发生变化，这一类数据没有缓存价值，我们称之为 temporary data (临时数据)。临时数据用完之后会被销毁。

另一类是不常发生变化的数据，我们称之为 entity，比如国家列表、品牌列表。这一类数据很多时候需要缓存到本地，将它们归为一类更易于做数据持久化。

<a name="bEwSO"></a>
## 2.1 useTempData

<a name="GxzOR"></a>
### 2.1.2 背景

通过 useRequest 我们已经能够非常方便的去调用 API 请求了。但是对于大部分业务场景来说，还是会比较繁琐。试想一个非常常见的需求：将 API 数据渲染到页面上。我们通常需要以下几个步骤：

Step1: 组件 mount 时，dispatch 一个 request action。这一步可以通过 useRequest 实现。<br />Step2: 处理 request success action，并将数据存入 store 中。<br />Step3: 从 store 的 state 中 pick 出对应的数据，并将其提供给组件。<br />Step4: 组件拿到数据并渲染页面。<br />Step5: 执行某些操作之后，用新的 request 参数重新发起请求。<br />Step6: 重复 Step2、Step3、Step4。

如果每一次集成 API 都要通过上面的几个步骤才能完成，不仅会浪费大量时间，也会生产大量模板代码。并且，由于逻辑非常地分散，我们无法为它们统一添加测试，因此需要在每个使用的地方单独去测。可想而知，开发效率一定会大打折扣。

为了解决这个问题，我们抽象了 useTempData。之前也提到过 temp data 的概念，其实它就是指页面上的临时数据，通常都是「阅后即焚」。我们项目上通过 API 请求获取的数据大部分都是这一类。useTempData 主要用于在组件 mount 时自动获取 API 数据，并在组件 unmount 时自动销毁它们。

<a name="umgdS"></a>
### 2.1.3 输入和输出

useTempData 会在组件 mount 时 **自动分发 request action**，当请求成功之后将响应数据存入 redux  store，然后从 store 提取出响应数据，**将响应数据提供给外部使用**。当然，你也可以通过配置，让 useTempData **响应请求参数的变化**，当请求参数发生变化时，useTempData 会携带新的请求参数重新发起请求。

其核心的输入输出如下：

```typescript
export const useTempData = <T extends IRequestActionCreator<T["TReq"], T["TResp"]>>(
  actionCreator: T,
  args?: T["TReq"],
  deps: DependencyList = [],
) => {
  // ...
  return [data, requestStage, fetchData] as [
    typeof actionCreator["TResp"],
    typeof requestStage,
    typeof fetchData,
  ];
};
```

它接收 `actionCreator` 作为第一个参数，用于创建相应的 request action。当组件 mount 时，会自动分发 request action。`args` 作为第二个参数，用于设置请求参数。 `deps` 作为第三个参数，当它发生变化时，会重新分发 request action。

同时，它会返回 API 响应的数据 `data` ，表示请求当前所处阶段的 `requestStage`  ，以及用于调用请求的函数 `fetchData` 。<br />当组件挂载时，我们常常需要发起 API 请求，然后将 response 渲染出来。如果业务场景比较简单的话，集成 API 就是一行代码的事。

```typescript
const [books] = useTempData(getBooksUsingGET, { bookType }, [bookType]);

// 拿到 books 数据，渲染 UI
// ...
```

<a name="HsVsB"></a>
### 2.1.4 实现思路

useTempData 基于 useRequest 实现。在组件 mount 时分发 request action，然后在请求成功的回调函数 onSuccess 中再分发另一个 action，将请求响应的数据存入 redux store。

```typescript
const [fetchData] = useRequest(actionCreator, {
  success: (action) => {
    dispatch(updateTempData(groupName, reducer(dataRef.current, action))),
  },
});

useEffect(() => {
  fetchData(args as any);
}, deps);
```

<a name="hGC87"></a>
### 2.1.5 组件卸载

当组件卸载时，如果 store 的 state 已经保存了这个 request action 成功响应的数据，useTempData 会自动将它清除。发起 API 请求之后，如果组件已经卸载，useTempData 就不会将请求成功响应的数据存入 redux store。

<a name="D3Fsi"></a>
## 2.2 useEntity

基于 useTempData 的设计，我们可以继续封装 useEntity， 用于统一处理 entity 这类数据。
<a name="u09xi"></a>
## 

<a name="LbG1c"></a>
# 3. 自动生成代码

- 排序
- 请求参数的校验
- 多人协作开发








Q:

连续发起多个请求 A, B, C，只保留最后一次请求。这个场景在自动完成组件中很常见，用户每输入一个字符就会发起一次请求，连续输入时，只保留最后一次。（如果请求足够快，还是需要 debounce?）

`deps` 作为第三个参数，当它发生变化时，会重新创建 request 函数。// TODO: 是否可以去掉？可以，可以使用多个 useRequest 替代它

**useRequest:**<br />**

1. 在层级很深的组件内部 call 父组件的 request 请求。
1. 方便在任何地方去调用请求

比如需要在请求完成之后发起另一个请求、同时设置 form error（异步表单错误信息）、页面上显示 Loading 动画。

使用 useRequest 创建了一个请求 A，A 成功之后执行 A 的 onSuccess 回调 onSuccess1，<br />经过一些操作之后，又用 useRequest 又创建了一个相同的请求 A，A 成功之后执行它的 onSuccess 回调 onSuccess2，这时候如果共享 callback，那么当第二次请求成功时，由于第一次请求的订阅关系并没有取消，那么 onSuccess1 和 onSuccess2 都会执行。这就可能引发一些 bug。

无限滚动，发起请求 A 请求首页数据，当页面滚动到底部时会请求下一页的数据，并将得到的数据和之前的数据 merge 起来。点击更新按钮之后，会再次发起请求 A，以刷新页面的数据，当再次发起 A 请求时，由于 callback 共享，首次请求时的 callback 也会执行，导致重复 merge 数据的问题。

将 callback 放到 action.meta  里面的缺点：

- 闭包问题
- API 节流，导致某些 onSuccess 回调不执行的问题。


<br />


1. useRequest 的 request 方法调用多次。
1. useRequest 创建多次。

A B C<br />A -> B -> C<br />A A A

**useTempData:**

fetchData 和 useRequest？不要将 fetchData 传入非常深的层级里面去使用。

- useRequest 和 useTempData 在组件销毁时都会取消所有逻辑（unsubscribe）。子组件中 save state to store 的逻辑会导致问题。save store to state  的时候可能会导致组件销毁，以致于无法执行相应的 callback。比如点了一个 button 之后 trigger 父组件数据更新，在 onSuccess 的时候将数据存入 store，这时候因为数据发生变化，可能导致 button 被销毁，也就是说它内部的逻辑也就全部取消了。子组件使父组件的数据发生变化，然后导致子组件被销毁，子组件被销毁之后，子组件里面定义的所有的 useRequest 会被 cancel。因此，这种情况下，不应该将异步的请求调用放到子组件中，而是应该将请求调用放在父组件中，通过「子组件 + callback」来实现。

- 在组件销毁之后，如果不取消请求/请求成功的回调，可能会引发问题。比如在组件发起请求，但在请求成功之前，组件就已经销毁了，虽然组件销毁了，但是请求成功的回调仍然会被执行，如果在它里面又去 setState，React 会抛出 warning。我们应该避免在组件销毁之后去 setState，如何避免呢？在组件 unmount 之后，不执行任何逻辑。

组件只关心自己的逻辑，trigger 页面刷新这样的逻辑应该放到对应的组件。

