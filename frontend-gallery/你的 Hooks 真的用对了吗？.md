从 React Hooks 正式发布到现在，我们一直在项目使用它。但是，在使用 Hooks 的过程中，我们也进入了一些误区，导致写出来的代码隐藏 bug 并且难以维护。这篇文章中，我们会具体分析这些问题，并总结一些好的实践，以供大家参考。



# 问题一：我该使用单个 state 变量还是多个 state 变量？

`useState` 的出现，让我们可以使用多个 state 变量来保存 state，比如：



```typescript
const [width, setWidth] = useState(100);
const [height, setHeight] = useState(100);
const [left, setLeft] = useState(0);
const [top, setTop] = useState(0);
```



但同时，我们也可以像 Class 组件中的 `this.state` 一样，将所有的 state 放到一个 `object` 中，这样只需一个 state 变量即可：



```typescript
const [state, setState] = useState({
  width: 100,
  height: 100,
  left: 0,
  top: 0
});
```



那么问题来了，到底用单个 state 变量还是多个 state 变量呢？



如果使用单个 state 变量，每次更新 state 时需要合并之前的 state。它不像 Class 组件的 `this.setState` 方法，会把更新的字段合并到 state 对象中。`useState` 返回的 `setState` 会替换原来的值：



```typescript
const handleMouseMove = (e) => {
  setState((prevState) => ({
    ...prevState,
    left: e.pageX,
    top: e.pageY,
  }))
};
```



使用多个 state 变量可以让 state 的粒度更细，更易于逻辑的拆分和组合。比如，我们可以将关联的逻辑提取到自定义 hook 中：



```typescript
function usePosition() {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEffect(() => {
    // ...
  }, []);

  return [left, top, setLeft, setTop];
}
```



我们发现，每次更新 `left` 时 `top` 也会随之更新。因此，把 `top` 和 `left` 拆分为两个 state 变量显得有点多余。在使用 state 之前，我们需要考虑状态拆分的「粒度」问题。如果粒度过细，代码就会变得比较冗余。如果粒度过粗，代码的可复用性就会降低。



那么，到底哪些 state 应该合并，哪些 state 应该拆分呢？我总结了下面两点：



> 1. 将完全不相关的 state 拆分为多组 state。比如 `size` 和 `position`。
> 2. 如果某些 state 是相互关联的，或者需要一起发生改变，就可以把它们合并为一组 state。比如 `left` 和 `top`。



```typescript
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



# 问题二：deps 依赖过多，导致 Hooks 难以维护？

使用 `useEffect`  hook 时，为了避免每次 render 都去执行它的 callback，我们通常会传入第二个参数「dependency array」。这样，只有当「依赖数组」发生变化时，才会执行 `useEffect` 的回调函数。



```typescript
function Example({id, name}) {
  useEffect(() => {
    console.log(id, name);
  }, [id, name]); 
}
```



在上面的例子中，只有当 `id` 或者 `name` 发生变化时，才会打印日志。「dependency array」中必须包含在 callback 内部用到的所有参与 React 数据流的值，比如 `state`、`props` 以及它们的衍生物。如果有遗漏，可能会造成 bug。这其实就是 JS 闭包问题，对闭包不清楚的同学可以自行 google，这里就不展开了。



```typescript
function Example({id, name}) {
  useEffect(() => {
    // 由于 dependency array 中不包含 name，所以当 name 发生变化时，无法打印日志
    console.log(id, name); 
  }, [id]);
}
```



在 React 中，除了 useEffect 外，接收「dependency array」的 hook 还有 `useMemo`、`useCallback` 和 `useImperativeHandle`。大部分情况下，使用「dependency array」确实可以节省一些性能的开销。我们刚刚也提到了，「dependency array」千万不要遗漏回调函数内部依赖的值。但如果 「dependency array」依赖了过多东西，可能导致代码难以维护。我在项目中就看到了这样一段代码：



```typescript
const refresh = useCallback(() => {
  // ...
}, [name, searchState, address, status, personA, personB, progress, page, size]);
```



不要说内部逻辑了，光是看到这一堆依赖就令人头大！如果项目中到处都是这样的代码，可想而知维护起来多么痛苦。如何才能避免写出这样的代码呢？



首先，你需要重新思考一下，这些 deps 是否真的都需要？看下面这个例子：



```typescript
function Example({id}) {
  const requestParams = useRef({});
  requestParams.current = {page: 1, size: 20, id};

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



```typescript
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



```typescript
useEffect(() => {
  id && doSearch({name, address, status, personA, personB, progress});
}, [id, name, address, status, personA, personB, progress]);

useEffect(() => {
  page && doRefresh({name, page, size});
}, [name,  page, size]);
```



如果逻辑无法继续拆分，但是「dependency array」还是依赖过多东西，该怎么办呢？就比如我们上面的代码：



```typescript
useEffect(() => {
  id && doSearch({name, address, status, personA, personB, progress});
}, [id, name, address, status, personA, personB, progress]);
```



这段代码中的 `useEffect` 依赖了七个值，还是偏多了。仔细观察上面的代码，可以发现这些值都是「过滤条件」的一部分，通过这些条件可以过滤页面上的数据。因此，我们可以将它们看做一个整体，也就是我们前面讲过的合并 state：



```typescript
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



```typescript
const useExample = () => {
  const [values, setValues] = useState({
    data: {},
    count: 0
  });

  const [updateData] = useCallback(
      (nextData) => {
        setValues({
          data: nextData,
          count: values.count + 1 // 因为 callback 内部依赖了外部的 values 变量，所以必须在 dependency array 中指定它
        });
      },
      [values], 
  );

  return [values, updateData];
};
```



上面的代码中，我们必须在 `useCallback` 的「dependency array」中指定 `values`，否则我们无法在 callback 中获取到最新的 `values` 状态。但是，通过 `setState` 回调函数，我们不用再依赖外部的 `values` 变量，因此也无需在「dependency array」中指定它。就像下面这样：



```typescript
const useExample = () => {
  const [values, setValues] = useState({});

  const [updateData] = useCallback((nextData) => {
    setValues((prevValues) => ({
      data: nextData,
      count: prevValues.count + 1, // 通过 setState 回调函数获取最新的 values 状态，这时 callback 不再依赖于外部的 values 变量了，因此 dependency array 中不需要指定任何值
    }));
  }, []); // 这个 callback 永远不会重新创建

  return [values, updateData];
};
```



最后，还可以通过 `ref` 来保存可变变量，并对它进行读写。举个例子：



```typescript
const useExample = () => {
  const [values, setValues] = useState({});
  const latestValues = useRef(values);
  latestValues.current = values;

  const [updateData] = useCallback((nextData) => {
    setValues({
      data: nextData,
      count: latestValues.current.count + 1,
    });
  }, []); 

  return [values, updateData];
};
```



在使用 ref 时要特别小心，因为它可以随意赋值，所以一定要控制好修改它的方法。特别是一些底层模块，在封装的时候千万不要直接暴露 `ref`，而是提供一些修改它的方法。



说了这么多，归根到底都是为了写出更加清晰、易于维护的代码。如果发现「dependency array」依赖过多，我们就需要重新审视自己的代码。



> - 「dependency array」依赖的值最好不要超过 3 个，否则会导致代码会难以维护。
>
> - 如果发现 「dependency array」依赖的值过多，我们应该采取一些方法来减少它。
>   - 去掉不必要的「dependency array」。
>   - 将 hook 拆分为更小的单元，每个 hook 依赖于各自的「dependency array」。
>   - 通过合并相关的 state，将多个 dependency 聚合为一个 dependency。
>   - 通过 `setState` 回调函数获取最新的 state，以减少外部依赖。
>   - 通过 ` ref ` 来读取可变变量的值，不过需要注意控制修改它的途径。



# 问题三：该不该使用 `useMemo`？

该不该使用 `useMemo`？对于这个问题，有的人从来没有思考过，有的人甚至不觉得这是个问题。不管什么情况，只要用 `useMemo` 或者 `useCallback` 「包裹一下」，似乎就能使应用远离性能的问题。但真的是这样吗？有的时候 `useMemo` 没有任何作用，甚至还会影响应用的性能。



为什么这么说呢？首先，我们需要知道 `useMemo `本身也有开销。`useMemo` 会「记住」一些值，同时在后续 render 时，将「dependency array」中的值取出来和上一次记录的值进行比较，如果不相等才会重新执行回调函数，否则直接返回「记住」的值。这个过程本身就会消耗一定的内存和计算资源。因此，过度使用 `useMemo` 可能会影响程序的性能。



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
    getResolvedValue(page, type);
  }, [page, type]);

  return <ExpensiveComponent resolvedValue={resolvedValue}/>;
};
```



在上面的例子中，渲染 `ExpensiveComponent` 的开销很大。所以，当 `resolvedValue` 的引用发生变化时，作者不想重新渲染这个组件。因此，作者使用了 `useMemo`，避免每次 render 重新计算 `resolvedValue`，导致它的引用发生改变，从而使下游组件 re-render。



这个担忧是正确的，但是使用 `useMemo` 之前，我们应该先思考两个问题：

1. 传递给 `useMemo` 的函数开销大不大？在上面的例子中，就是考虑 `getResolvedValue` 函数的开销大不大。JS 中大多数方法都是优化过的，比如 `Array.map`、`Array.forEach` 等。如果你执行的操作开销不大，那么就不需要记住返回值。否则，使用 `useMemo` 本身的开销就可能超过重新计算这个值的开销。因此，对于一些简单的 JS 运算来说，我们不需要使用 `useMemo` 来「记住」它的返回值。
2. 当输入相同时，「记忆」值的引用是否会发生改变？在上面的例子中，就是当 `page` 和 `type` 相同时，`resolvedValue` 的引用是否会发生改变？这里我们就需要考虑 `resolvedValue` 的类型了。如果 `resolvedValue` 是一个对象，由于我们项目上使用「函数式编程」，所以每次函数调用都会产生一个新的引用。但是，如果 `resolvedValue` 是一个 JS 基本类型（`string`, `boolean`, `null`, `undefined`, `number`, `symbol`），也就不存在「引用」的概念了，每次计算出来的这个值一定是相等的。也就是说，`ExpensiveComponent` 组件不会被重新渲染。



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



在使用 `useMemo` 前，考虑下面几个问题：



> 1. 要记住的函数开销很大吗？
>
> 2. 返回的值会被其他 hook 或者子组件用到吗？
>
> 3. 返回的值是原始值吗？
>
> 4. 使用 `useMemo` 还是 `useRef` 更合适？



回答出上面这几个问题，判断是否应该使用 `useMemo` 也就不再困难了。







useRef 保持引用相等。

方法静态化。



# 问题四：ref 的使用要小心？



# 问题五：使用 Tuple 还是对象？



Tuple 还是对象？



# 问题六：如何写自定义 Hooks？

- 将相关的逻辑放到一起。state 和 useEffect。



# 问题七：有 Hooks 之后，高阶组件和 Render Props 还有用吗？





useEffect hook 的执行顺序

