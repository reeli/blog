# React Hooks 你真的用对了吗？

从 React Hooks 正式发布到现在，我一直在项目使用它。但是，在使用 Hooks 的过程中，我也进入了一些误区，导致写出来的代码隐藏 bug 并且难以维护。这篇文章中，我会具体分析这些问题，并总结一些好的实践，以供大家参考。



## 问题一：我该使用单个 state 变量还是多个 state 变量？

`useState` 的出现，让我们可以使用多个 state 变量来保存 state，比如：



```javascript
const [width, setWidth] = useState(100);
const [height, setHeight] = useState(100);
const [left, setLeft] = useState(0);
const [top, setTop] = useState(0);
```



但同时，我们也可以像 Class 组件的 `this.state` 一样，将所有的 state 放到一个 `object` 中，这样只需一个 state 变量即可：



```javascript
const [state, setState] = useState({
  width: 100,
  height: 100,
  left: 0,
  top: 0
});
```



那么问题来了，到底该用单个 state 变量还是多个 state 变量呢？



如果使用单个 state 变量，每次更新 state 时需要合并之前的 state。因为 `useState` 返回的 `setState` 会替换原来的值。这一点和 Class 组件的 `this.setState` 不同。`this.setState` 会把更新的字段自动合并到 `this.state` 对象中。



```javascript
const handleMouseMove = (e) => {
  setState((prevState) => ({
    ...prevState,
    left: e.pageX,
    top: e.pageY,
  }))
};
```



使用多个 state 变量可以让 state 的粒度更细，更易于逻辑的拆分和组合。比如，我们可以将关联的逻辑提取到自定义 Hook 中：



```javascript
function usePosition() {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEffect(() => {
    // ...
  }, []);

  return [left, top, setLeft, setTop];
}
```



我们发现，每次更新 `left` 时 `top` 也会随之更新。因此，把 `top` 和 `left` 拆分为两个 state 变量显得有点多余。

在使用 state 之前，我们需要考虑状态拆分的「粒度」问题。如果粒度过细，代码就会变得比较冗余。如果粒度过粗，代码的可复用性就会降低。那么，到底哪些 state 应该合并，哪些 state 应该拆分呢？我总结了下面两点：



1. 将完全不相关的 state 拆分为多组 state。比如 `size` 和 `position`。
2. 如果某些 state 是相互关联的，或者需要一起发生改变，就可以把它们合并为一组 state。比如 `left` 和 `top`。



```javascript
function Box() {
  const [position, setPosition] = usePosition();
  const [size, setSize] = useState({width: 100, height: 100});
  // ...
}

function usePosition() {
  const [position, setPosition] = useState({left: 0, top: 0});

  useEffect(() => {
    // ...
  }, []);

  return [position, setPosition];
}

```



## 问题二：deps 依赖过多，导致 Hooks 难以维护？

使用 `useEffect`  hook 时，为了避免每次 render 都去执行它的 callback，我们通常会传入第二个参数「dependency array」（下面统称为依赖数组）。这样，只有当依赖数组发生变化时，才会执行 `useEffect` 的回调函数。



```javascript
function Example({id, name}) {
  useEffect(() => {
    console.log(id, name);
  }, [id, name]); 
}
```



在上面的例子中，只有当 `id` 或 `name` 发生变化时，才会打印日志。依赖数组中必须包含在 callback 内部用到的所有参与 React 数据流的值，比如 `state`、`props` 以及它们的衍生物。如果有遗漏，可能会造成 bug。这其实就是 JS 闭包问题，对闭包不清楚的同学可以自行 google，这里就不展开了。



```javascript
function Example({id, name}) {
  useEffect(() => {
    // 由于依赖数组中不包含 name，所以当 name 发生变化时，无法打印日志
    console.log(id, name); 
  }, [id]);
}
```



在 React 中，除了 useEffect 外，接收依赖数组作为参数的 Hook 还有 `useMemo`、`useCallback` 和 `useImperativeHandle`。我们刚刚也提到了，依赖数组中千万不要遗漏回调函数内部依赖的值。但是，如果依赖数组依赖了过多东西，可能导致代码难以维护。我在项目中就看到了这样一段代码：



```javascript
const refresh = useCallback(() => {
  // ...
}, [name, searchState, address, status, personA, personB, progress, page, size]);
```



不要说内部逻辑了，光是看到这一堆依赖就令人头大！如果项目中到处都是这样的代码，可想而知维护起来多么痛苦。如何才能避免写出这样的代码呢？



首先，你需要重新思考一下，这些 deps 是否真的都需要？看下面这个例子：



```javascript
function Example({id}) {
  const requestParams = useRef({});

  useEffect(() => {
    requestParams.current = {page: 1, size: 20, id};
  });


  const refresh = useCallback(() => {
    doRefresh(requestParams.current);
  }, []);


  useEffect(() => {
    id && refresh();
  }, [id, refresh]); // 思考这里的 deps list 是否合理？
}
```



虽然 `useEffect` 的回调函数依赖了 `id` 和 `refresh` 方法，但是观察 `refresh` 方法可以发现，它在首次 render 被创建之后，永远不会发生改变了。因此，把它作为 `useEffect` 的 deps 是多余的。



其次，如果这些依赖真的都是需要的，那么这些逻辑是否应该放到同一个 hook 中？



```javascript
function Example({id, name, address, status, personA, personB, progress}) {
  const [page, setPage] = useState();
  const [size, setSize] = useState();

  const doSearch = useCallback(() => {
    // ...
  }, []);

  const doRefresh = useCallback(() => {
    // ...
  }, []);


  useEffect(() => {
    id && doSearch({name, address, status, personA, personB, progress});
    page && doRefresh({name, page, size});
  }, [id, name, address, status, personA, personB, progress, page, size]);
}
```



可以看出，在 `useEffect` 中有两段逻辑，这两段逻辑是相互独立的，因此我们可以将这两段逻辑放到不同 `useEffect` 中：



```javascript
useEffect(() => {
  id && doSearch({name, address, status, personA, personB, progress});
}, [id, name, address, status, personA, personB, progress]);

useEffect(() => {
  page && doRefresh({name, page, size});
}, [name,  page, size]);
```



如果逻辑无法继续拆分，但是依赖数组还是依赖了过多东西，该怎么办呢？就比如我们上面的代码：



```javascript
useEffect(() => {
  id && doSearch({name, address, status, personA, personB, progress});
}, [id, name, address, status, personA, personB, progress]);
```



这段代码中的 `useEffect` 依赖了七个值，还是偏多了。仔细观察上面的代码，可以发现这些值都是「过滤条件」的一部分，通过这些条件可以过滤页面上的数据。因此，我们可以将它们看做一个整体，也就是我们前面讲过的合并 state：



```javascript
const [filters, setFilters] = useState({
  name: "",
  address: "",
  status: "",
  personA: "",
  personB: "",
  progress: ""
});

useEffect(() => {
  id && doSearch(filters);
}, [id, filters]);
```



如果 state 不能合并，在 callback 内部又使用了 `setState` 方法，那么可以考虑使用 `setState` callback 来减少一些依赖。比如：



```javascript
const useValues = () => {
  const [values, setValues] = useState({
    data: {},
    count: 0
  });

  const [updateData] = useCallback(
      (nextData) => {
        setValues({
          data: nextData,
          count: values.count + 1 // 因为 callback 内部依赖了外部的 values 变量，所以必须在依赖数组中指定它
        });
      },
      [values], 
  );

  return [values, updateData];
};
```



上面的代码中，我们必须在 `useCallback` 的依赖数组中指定 `values`，否则我们无法在 callback 中获取到最新的 `values` 状态。但是，通过 `setState` 回调函数，我们不用再依赖外部的 `values` 变量，因此也无需在依赖数组中指定它。就像下面这样：



```javascript
const useValues = () => {
  const [values, setValues] = useState({});

  const [updateData] = useCallback((nextData) => {
    setValues((prevValues) => ({
      data: nextData,
      count: prevValues.count + 1, // 通过 setState 回调函数获取最新的 values 状态，这时 callback 不再依赖于外部的 values 变量了，因此依赖数组中不需要指定任何值
    }));
  }, []); // 这个 callback 永远不会重新创建

  return [values, updateData];
};
```



最后，还可以通过 `ref` 来保存可变变量。以前我们只把 `ref` 用作保持 DOM 节点引用的工具，可 `useRef` Hook 能做的事情远不止如此。我们可以用它来保存一些值的引用，并对它进行读写。举个例子：



```javascript
const useValues = () => {
  const [values, setValues] = useState({});
  const latestValues = useRef(values);

  useEffect(() => {
    latestValues.current = values;
  });


  const [updateData] = useCallback((nextData) => {
    setValues({
      data: nextData,
      count: latestValues.current.count + 1,
    });
  }, []);

  return [values, updateData];
};
```



在使用 `ref` 时要特别小心，因为它可以随意赋值，所以一定要控制好修改它的方法。特别是一些底层模块，在封装的时候千万不要直接暴露 `ref`，而是提供一些修改它的方法。



说了这么多，归根到底都是为了写出更加清晰、易于维护的代码。如果发现依赖数组依赖过多，我们就需要重新审视自己的代码：



1. 依赖数组依赖的值最好不要超过 3 个，否则会导致代码会难以维护。
2. 如果发现依赖数组依赖的值过多，我们应该采取一些方法来减少它。
   - 去掉不必要的依赖。
   - 将 Hook 拆分为更小的单元，每个 Hook 依赖于各自的依赖数组。
   - 通过合并相关的 state，将多个依赖值聚合为一个。
   - 通过 `setState` 回调函数获取最新的 state，以减少外部依赖。
   - 通过 `ref` 来读取可变变量的值，不过需要注意控制修改它的途径。



## 问题三：该不该使用 `useMemo`？

该不该使用 `useMemo`？对于这个问题，有的人从来没有思考过，有的人甚至不觉得这是个问题。不管什么情况，只要用 `useMemo` 或者 `useCallback` 「包裹一下」，似乎就能使应用远离性能的问题。但真的是这样吗？有的时候 `useMemo` 没有任何作用，甚至还会影响应用的性能。



为什么这么说呢？首先，我们需要知道 `useMemo `本身也有开销。`useMemo` 会「记住」一些值，同时在后续 render 时，将依赖数组中的值取出来和上一次记录的值进行比较，如果不相等才会重新执行回调函数，否则直接返回「记住」的值。这个过程本身就会消耗一定的内存和计算资源。因此，过度使用 `useMemo` 可能会影响程序的性能。



要想合理使用 `useMemo`，我们需要搞清楚 `useMemo` 适用的场景：

- 有些计算开销很大，我们就需要「记住」它的返回值，避免每次 render 都去重新计算。
- 由于值的引用发生变化，导致下游组件重新渲染，我们也需要「记住」这个值。



让我们来看个例子：



```typescript
interface IExampleProps {
  page: number;
  type: string;
}

const Example = ({page, type}: IExampleProps) => {
  const resolvedValue = useMemo(() => {
    return getResolvedValue(page, type);
  }, [page, type]);

  return <ExpensiveComponent resolvedValue={resolvedValue}/>;
};
```



> 注： `ExpensiveComponent` 组件包裹了 `React.memo` 。



在上面的例子中，渲染 `ExpensiveComponent` 的开销很大。所以，当 `resolvedValue` 的引用发生变化时，作者不想重新渲染这个组件。因此，作者使用了 `useMemo`，避免每次 render 重新计算 `resolvedValue`，导致它的引用发生改变，从而使下游组件 re-render。



这个担忧是正确的，但是使用 `useMemo` 之前，我们应该先思考两个问题：

1. 传递给 `useMemo` 的函数开销大不大？在上面的例子中，就是考虑 `getResolvedValue` 函数的开销大不大。JS 中大多数方法都是优化过的，比如 `Array.map`、`Array.forEach` 等。如果你执行的操作开销不大，那么就不需要记住返回值。否则，使用 `useMemo` 本身的开销就可能超过重新计算这个值的开销。因此，对于一些简单的 JS 运算来说，我们不需要使用 `useMemo` 来「记住」它的返回值。
2. 当输入相同时，「记忆」值的引用是否会发生改变？在上面的例子中，就是当 `page` 和 `type` 相同时，`resolvedValue` 的引用是否会发生改变？这里我们就需要考虑 `resolvedValue` 的类型了。如果 `resolvedValue` 是一个对象，由于我们项目上使用「函数式编程」，每次函数调用都会产生一个新的引用。但是，如果 `resolvedValue` 是一个原始值（`string`, `boolean`, `null`, `undefined`, `number`, `symbol`），也就不存在「引用」的概念了，每次计算出来的这个值一定是相等的。也就是说，`ExpensiveComponent` 组件不会被重新渲染。



因此，如果 `getResolvedValue` 的开销不大，并且 `resolvedValue` 返回一个字符串之类的原始值，那我们完全可以去掉 `useMemo`，就像下面这样：



```typescript
interface IExampleProps {
  page: number;
  type: string;
}

const Example = ({page, type}: IExampleProps) => {
  const resolvedValue = getResolvedValue(page, type);
  return <ExpensiveComponent resolvedValue={resolvedValue}/>;
};
```



还有一个误区就是对创建函数开销的评估。有的人觉得在 render 中创建函数可能会开销比较大，为了避免函数多次创建，使用了 `useMemo` 或者 `useCallback`。但是对于现代浏览器来说，创建函数的成本微乎其微。因此，我们没有必要使用 `useMemo` 或者 `useCallback` 去节省这部分性能开销。当然，如果是为了保证每次 render 时回调的引用相等，你可以放心使用 `useMemo` 或者 `useCallback`。



```javascript
const Example = () => {
  const onSubmit = useCallback(() => { // 考虑这里的 useCallback 是否必要？
    doSomething();
  }, []);

  return <form onSubmit={onSubmit}></form>;
};
```



我之前看过一篇文章（链接在文章的最后），这篇文章中提到，如果只是想在重新渲染时保持值的引用不变，更好的方法是使用 `useRef`，而不是 `useMemo`。我并不同意这个观点。让我们来看个例子：



```javascript
// 使用 useMemo
function Example() {
  const users = useMemo(() => [1, 2, 3], []);

  return <ExpensiveComponent users={users} />
}
  
// 使用 useRef
function Example() {
  const {current: users} = useRef([1, 2, 3]);

  return <ExpensiveComponent users={users} />
}
```



在上面的例子中，我们用 `useMemo` 来「记住」`users` 数组，不是因为数组本身的开销大，而是因为 `users ` 的引用在每次 render 时都会发生改变，从而导致子组件 `ExpensiveComponent` 重新渲染（可能会带来较大开销）。

作者认为从语义上不应该使用 `useMemo`，而是应该使用 `useRef`，否则会消耗更多的内存和计算资源。虽然在 React 中 `useRef` 和 `useMemo` 的实现有一点差别，但是当 `useMemo` 的依赖数组为空数组时，它和 `useRef` 的开销可以说相差无几。`useRef` 甚至可以直接用 `useMemo` 来实现，就像下面这样：



```javascript
const useRef = (v) => {
  return useMemo(() => ({current: v}), []);
};
```



因此，我认为使用 `useMemo` 来保持值的引用一致没有太大问题。



在编写自定义 Hook 时，返回值一定要保持引用的一致性。因为你无法确定外部要如何使用它的返回值。如果返回值被用做其他 Hook 的依赖，并且每次 re-render 时引用不一致（当值相等的情况），就可能会产生 bug。比如：



```javascript
function Example() {
  const data = useData();
  const [dataChanged, setDataChanged] = useState(false);

  useEffect(() => {
    setDataChanged((prevDataChanged) => !prevDataChanged); // 当 data 发生变化时，调用 setState。如果 data 值相同而引用不同，就可能会产生非预期的结果。
  }, [data]);

  console.log(dataChanged);

  return <ExpensiveComponent data={data} />;
}

const useData = () => {
  // 获取异步数据
  const resp = getAsyncData([]);

  // 处理获取到的异步数据，这里使用了 Array.map。因此，即使 data 相同，每次调用得到的引用也是不同的。
  const mapper = (data) => data.map((item) => ({...item, selected: false}));

  return resp ? mapper(resp) : resp;
};
```



在上面的例子中，我们通过 `useData` Hook 获取了 `data`。每次 render 时 `data` 的值没有发生变化，但是引用却不一致。如果把 `data` 用到 `useEffect ` 的依赖数组中，就可能产生非预期的结果。另外，由于引用的不同，也会导致 `ExpensiveComponent`  组件 re-render，产生性能问题。



>  如果因为 prop 的值相同而引用不同，从而导致子组件发生 re-render，不一定会造成性能问题。因为 Virtual DOM re-render ≠ DOM re-render。但是当子组件特别大时，Virtual DOM 的 Diff 开销也很大。因此，还是应该尽量避免子组件 re-render。



因此，在使用 `useMemo` 之前，我们不妨先问自己几个问题：



1. 要记住的函数开销很大吗？
2. 返回的值是原始值吗？
3. 记忆的值会被其他 Hook 或者子组件用到吗？



回答出上面这几个问题，判断是否应该使用 `useMemo` 也就不再困难了。不过在实际项目中，还是最好定义出一套统一的规范，方便团队中多人协作。比如第一个问题，开销很大如何定义？如果没有明确的标准，执行起来会非常困难。因此，我总结了下面一些规则：



一、应该使用 `useMemo` 的场景

1. 保持引用相等
   - 对于组件内部用到的 object、array、函数等，如果用在了其他 Hook 的依赖数组中，或者作为 props 传递给了下游组件，应该使用 `useMemo`。
   - 自定义 Hook 中暴露出来的 object、array、函数等，都应该使用 `useMemo` 。以确保当值相同时，引用不发生变化。
   - 使用 `Context` 时，如果 `Provider` 的 value 中定义的值（第一层）发生了变化，即便用了 Pure Component 或者 `React.memo`，仍然会导致子组件 re-render。这种情况下，仍然建议使用 `useMemo` 保持引用的一致性。
2. 成本很高的计算
   - 比如 `cloneDeep` 一个很大并且层级很深的数据


二、无需使用 useMemo 的场景

1. 如果返回的值是原始值： `string`, `boolean`, `null`, `undefined`, `number`, `symbol`（不包括动态声明的 Symbol），一般不需要使用 `useMemo`。
2. 仅在组件内部用到的 object、array、函数等（没有作为 props 传递给子组件），且没有用到其他 Hook 的依赖数组中，一般不需要使用 `useMemo`。



## 问题四：Hooks 能替代高阶组件和 Render Props 吗？

在 Hooks 出现之前，我们有两种方法可以复用组件逻辑：[Render Props](https://reactjs.org/docs/render-props.html) 和[高阶组件](https://reactjs.org/docs/higher-order-components.html)。但是这两种方法都可能会造成 JSX「嵌套地狱」的问题。Hooks 的出现，让组件逻辑的复用变得更简单，同时解决了「嵌套地狱」的问题。Hooks 之于 React 就像 async / await  之于 Promise 一样。

那 Hooks 能替代高阶组件和 Render Props 吗？官方给出的回答是，在高阶组件或者 Render Props 只渲染一个子组件时，Hook 提供了一种更简单的方式。不过在我看来，Hooks 并不能完全替代 Render Props 和高阶组件。接下来，我们会详细分析这个问题。



### 高阶组件 HOC

高阶组件是一个函数，它接受一个组件作为参数，返回一个新的组件。



```javascript
function enhance(Comp) {
  // 增加一些其他的功能
  return function Component() {
    // ...
      return <Comp />;
  };
}
```


高阶组件采用了装饰器模式，让我们可以增强原有组件的功能，并且不破坏它原有的特性。例如：



```javascript
const RedButton = withStyles({
  root: {
    background: "red",
  },
})(Button);
```



在上面的代码中，我们希望保留 `Button` 组件的逻辑，但同时我们又想使用它原有的样式。因此，我们通过 `withStyles` 这个高阶组件注入了自定义的样式，并且生成了一个新的组件 `RedButton`。



### Render Props

Render Props 通过父组件将可复用逻辑封装起来，并把数据提供给子组件。至于子组件拿到数据之后要怎么渲染，完全由子组件自己决定，灵活性非常高。而高阶组件中，渲染结果是由父组件决定的。Render Props 不会产生新的组件，而且更加直观的体现了「父子关系」。



```javascript
<Parent>
  {(data) => {
    // 你父亲已经把江山给你打好了，并给你留下了一堆金币，至于怎么花就看你自己了
    return <Child data={data} />;
  }}
</Parent>
```



Render Props 作为 JSX 的一部分，可以很方便地利用 React 生命周期和 Props、State 来进行渲染，在渲染上有着非常高的自由度。同时，它不像 Hooks 需要遵守一些规则，你可以放心大胆的在它里面使用 if / else、map 等各类操作。



在大部分情况下，高阶组件和 Render Props 是可以相互转换的，也就是说用高阶组件能实现的，用 Render Props 也能实现。只不过在不同的场景下，哪种方式使用起来简单一点罢了。



将上面 HOC 的例子改成 Render Props，使用起来确实要「麻烦」一点：



```javascript
<RedButton>
  {(styles)=>(
    <Button styles={styles}/>
  )}
</RedButton>
```



### 小结

没有 Hooks 之前，高阶组件和 Render Props 本质上都是将复用逻辑提升到父组件中。而 Hooks 出现之后，我们将复用逻辑提取到组件顶层，而不是强行提升到父组件中。这样就能够避免 HOC 和 Render Props 带来的「嵌套地狱」。但是，像 Context 的 `<Provider/>` 和 `<Consumer/>` 这样有父子层级关系（树状结构关系）的，还是只能使用 Render Props 或者 HOC。



对于 Hooks、Render Props 和高阶组件来说，它们都有各自的使用场景：



- Hooks：
  - 替代 Class 的大部分用例，除了 `getSnapshotBeforeUpdate` 和 `componentDidCatch` 还不支持。
  - 提取复用逻辑。除了有明确父子关系的，其他场景都可以使用 Hooks。
- Render Props：在组件渲染上拥有更高的自由度，可以根据父组件提供的数据进行动态渲染。适合有明确父子关系的场景。
- 高阶组件：适合用来做注入，并且生成一个新的可复用组件。适合用来写插件。



不过，能使用 Hooks 的场景还是应该优先使用 Hooks，其次才是 Render Props 和 HOC。当然，Hooks、Render Props 和 HOC 不是对立的关系。我们既可以用 Hook 来写 Render Props 和 HOC，也可以在 HOC 中使用 Render Props 和 Hooks。



## 问题五： 使用 Hooks 时还有哪些好的实践？

1、若 Hook 类型相同，且依赖数组一致时，应该合并成一个 Hook。否则会产生更多开销。



```javascript
const dataA = useMemo(() => {
  return getDataA();
}, [A, B]);

const dataB = useMemo(() => {
  return getDataB();
}, [A, B]);

// 应该合并为
  
const [dataA, dataB] = useMemo(() => {
  return [getDataA(), getDataB()]
}, [A, B]);
```



2、参考原生 Hooks 的设计，自定义 Hooks 的返回值可以使用 Tuple 类型，更易于在外部重命名。但如果返回值的数量超过三个，还是建议返回一个对象。

   

```typescript
export const useToggle = (defaultVisible: boolean = false) => {
  const [visible, setVisible] = useState(defaultVisible);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return [visible, show, hide] as [typeof visible, typeof show, typeof hide];
};

const [isOpen, open, close] = useToggle(); // 在外部可以更方便地修改名字
const [visible, show, hide] = useToggle();
```



3、`ref` 不要直接暴露给外部使用，而是提供一个修改值的方法。
4、在使用 `useMemo` 或者 `useCallback` 时，确保返回的函数只创建一次。也就是说，函数不会根据依赖数组的变化而二次创建。举个例子：



```javascript
export const useCount = () => {
  const [count, setCount] = useState(0);

  const [increase, decrease] = useMemo(() => {
    const increase = () => {
      setCount(count + 1);
    };

    const decrease = () => {
      setCount(count - 1);
    };
    return [increase, decrease];
  }, [count]);

  return [count, increase, decrease];
};
```



在 `useCount` Hook 中， `count` 状态的改变会让 `useMemo` 中的 `increase` 和 `decrease` 函数被重新创建。由于闭包特性，如果这两个函数被其他 Hook 用到了，我们应该将这两个函数也添加到相应 Hook 的依赖数组中，否则就会产生 bug。比如：



```javascript
function Counter() {
  const [count, increase] = useCount();

  useEffect(() => {
    const handleClick = () => {
      increase(); // 执行后 count 的值永远都是 1
    };

    document.body.addEventListener("click", handleClick);
    return () => {
      document.body.removeEventListener("click", handleClick);
    };
  }, []); 

  return <h1>{count}</h1>;
}
```



在 `useCount` 中，`increase` 会随着 `count` 的变化而被重新创建。但是 `increase` 被重新创建之后， `useEffect` 并不会再次执行，所以 `useEffect` 中取到的 `increase` 永远都是首次创建时的 `increase` 。而首次创建时 `count` 的值为 0，因此无论点击多少次， `count` 的值永远都是 1。



那把 `increase` 函数放到 `useEffect `  的依赖数组中不就好了吗？事实上，这会带来更多问题：



- `increase` 的变化会导致频繁地绑定事件监听，以及解除事件监听。
- 需求是只在组件 mount 时执行一次 `useEffect`，但是 `increase` 的变化会导致 `useEffect` 多次执行，不能满足需求。



如何解决这些问题呢？



1) 通过 `setState` 回调，让函数不依赖外部变量。例如：



```javascript
export const useCount = () => {
  const [count, setCount] = useState(0);

  const [increase, decrease] = useMemo(() => {
    const increase = () => {
      setCount((latestCount) => latestCount + 1);
    };

    const decrease = () => {
      setCount((latestCount) => latestCount - 1);
    };
    return [increase, decrease];
  }, []); // 保持依赖数组为空，这样 increase 和 decrease 方法都只会被创建一次

  return [count, increase, decrease];
};
```



2) 通过 `ref` 来保存可变变量。例如：



```javascript
export const useCount = () => {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  useEffect(() => {
    countRef.current = count;
  });

  const [increase, decrease] = useMemo(() => {
    const increase = () => {
      setCount(countRef.current + 1);
    };

    const decrease = () => {
      setCount(countRef.current - 1);
    };
    return [increase, decrease];
  }, []); // 保持依赖数组为空，这样 increase 和 decrease 方法都只会被创建一次

  return [count, increase, decrease];
};
```


## 最后

我们总结了在实践中一些常见的问题，并提出了一些解决方案。最后让我们再来回顾一下：

1. 将完全不相关的 state 拆分为多组 state。
2. 如果某些 state 是相互关联的，或者需要一起发生改变，就可以把它们合并为一组 state。
3. 依赖数组依赖的值最好不要超过 3 个，否则会导致代码会难以维护。
4. 如果发现依赖数组依赖的值过多，我们应该采取一些方法来减少它。
   - 去掉不必要的依赖。
   - 将 Hook 拆分为更小的单元，每个 Hook 依赖于各自的依赖数组。
   - 通过合并相关的 state，将多个依赖值聚合为一个。
   - 通过 `setState` 回调函数获取最新的 state，以减少外部依赖。
   - 通过 `ref` 来读取可变变量的值，不过需要注意控制修改它的途径。
5. 应该使用 `useMemo` 的场景：
   - 保持引用相等
   - 成本很高的计算
6. 无需使用 `useMemo` 的场景：
   - 如果返回的值是原始值： `string`, `boolean`, `null`, `undefined`, `number`, `symbol`（不包括动态声明的 Symbol），一般不需要使用 `useMemo`。
   - 仅在组件内部用到的 object、array、函数等（没有作为 props 传递给子组件），且没有用到其他 Hook 的依赖数组中，一般不需要使用 `useMemo`。
7. Hooks、Render Props 和高阶组件都有各自的使用场景，具体使用哪一种要看实际情况。
8. 若 Hook 类型相同，且依赖数组一致时，应该合并成一个 Hook。
9. 自定义 Hooks 的返回值可以使用 Tuple 类型，更易于在外部重命名。如果返回的值过多，则不建议使用。
10. `ref` 不要直接暴露给外部使用，而是提供一个修改值的方法。
11. 在使用 `useMemo` 或者 `useCallback` 时，可以借助 `ref` 或者 `setState` callback，确保返回的函数只创建一次。也就是说，函数不会根据依赖数组的变化而二次创建。



参考文章：

[You’re overusing useMemo: Rethinking Hooks memoization](https://blog.logrocket.com/rethinking-hooks-memoization/?from=singlemessage&isappinstalled=0)





----------分割线--------



useMemo 可能带来的成本：

1. 使代码变得更复杂
2. 防止依赖项和 memoized 值被垃圾收集，而使性能变差


计算很大的开销， clone deep 100 W 数据的耗时测试：
 
```js
let a = {};
for (let i = 0; i < 1000000; i++) {
  a[i] = {
    a: 1,
    b: 2,
    c: {
      c1: 1,
      c2: 2,
    },
  };
}

const start = window.performance.now();

_.cloneDeep(a);

const time = window.performance.now() - start;

console.log(time);
```



- function component 的 children  中不能使用 hook。
- 高阶组件中会生成一个新的组件，一个准备数据，一个用来真正渲染的情况。
- 通过一些 hooks 准备数据，然后其他 hooks 又强依赖于这些数据。如果数据为空，其他 hooks 内部的逻辑要发生变化，如果再在每一个 hooks 里面去加这一层逻辑，会显得很繁琐。因此，还不如拆成两个组件，一个准备数据，有数据了之后下面的组件再渲染，就不需要在每个 hook 中再去关心是否有数据的问题了。

```typescript
type NonNullableArray<TArr> = { [I in keyof TArr]: NonNullable<TArr[I]> };

export function must<TPrepare extends Readonly<Array<any>>>(usePrepare: () => TPrepare) {
  return function <TProps>(render: (props: TProps, ...prepare: NonNullableArray<TPrepare>) => JSX.Element | null) {
    const C = (props: TProps & { ["data-prepare"]: NonNullableArray<TPrepare> }) =>
        render(props, ...(props["data-prepare"] as any));

    return (props: TProps) => {
      const prepare = usePrepare();

      if (some(prepare, (a) => !a)) {
        return null;
      }

      return <C {...props} data-prepare={prepare as NonNullableArray<TPrepare>}/>;
    };
  };
}
```


>  Provider 的 value 属性会拿第一层属性的值做 shallowEqual，即便 value 的引用是变的，但是 value.value 没有变化，还是不会 re-render child。



1. 确实只有会 diff props 的组件才能避免 re-render，比如 Pure Component、React.memo 包裹的组件。不过还是建议保持 props 引用的一致性，毕竟你无法确定别人会不会把 props 又用到其他 Hook 的依赖数组中。
2. 使用 Context 时，如果 Provider 的 value 中定义的值（第一层）发生了变化，即便用了 Pure Component 或者 React.memo，仍然会导致子组件的 re-render。所以这种情况下，仍然需要保持引用的一致性。
3. 归根结底，保持引用的一致性很重要，不管你用 `useMemo` 还是 `useRef`。





方法静态化。

方法开销大不大，如何具体评估？

useEffect hook 的执行顺序

hooks  的一些规范：

- Hooks 内部依赖的方法应该放到 callback 内部，如果不能可以采用其他方法...
- 若 hook 类型相同，且 deps 一致时，应该合并成一个 hook
- ref 的使用要小心
- 使用 Tuple 还是对象？
- 将相关的逻辑放到一起。state 和 useEffect。



将方法静态化。也就是说，方法只创建一次，不会根据某些值的变化而二次创建。让我们来看一个例子：

   

```javascript
export const useValues = () => {
  const [values, setValues] = useState();

  const updateValues = useMemo(
    () => (nextValues) => {
      setValues({
        ...values,
        ...nextValues,
      });
    },
    [values],
  );

  return [values, updateValues];
};
```



在上面的例子中，为了避免每次 render 时都去创建 `updateValues` 函数，我们使用了 `useMemo`。只有当 `values` 发生变化时，才会重新创建 `updateValues` 函数。我们把 `updateValues` 函数暴露出去给外部使用。

- setState 为什么可以直接在闭包中使用？
- 方法导致频繁的创建和销毁 useEffect，可能会造成混乱
- 自定义 Hooks 中暴露出来的值都应该使用 useMemo，因为不确定外部会如何使用
- 组件内部的方法或者值，如果要传递给子组件的，加 useMemo，否则可以不用加。
- useMemo 和 useRef？useRef 只是 useMemo 的语法糖？
- 方法预先定义好，可以做到不根据值的变化而二次创建。

定义好一些统一的规范，在实际项目中，更方便团队中多人协作，否则标准的规则不一致，执行起来会非常困难。 


