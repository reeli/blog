从 React Hooks 正式发布到现在，我们一直在项目使用它。但是，在使用 Hooks 的过程中，我们也进入了一些误区，导致写出来的代码隐藏 bug 并且难以维护。这篇文章中，我们会具体分析这些问题，并总结一些好的实践，以供大家参考。



# 问题一：我该使用单个 State 变量还是多个 State 变量？

useState 的出现，让我们可以使用多个 state 变量来保存 state，比如：



```typescript
const [width, setWidth] = useState(100);
const [height, setHeight] = useState(100);
const [left, setLeft] = useState(0);
const [top, setTop] = useState(0);
```



但同时，我们也可以像 Class 组件中的 `this.state` 一样，将所有的 state 放到一个 object 中，这样只需一个 state 变量即可：



```typescript
const [state, setState] = useState({
  width: 100,
  height: 100,
  left: 0,
  top: 0
});
```



那么问题来了，应该使用单个 state 变量还是多个 state 变量？



如果使用单个 state 变量，每次更新 state 时需要合并之前的 state。它不像 Class 组件的 `this.setState` 方法，会把更新的字段合并到 state 对象中。useState 返回的 setState 会替换原来的值：



```typescript
const handleMouseMove = (e) => {
  setState((prevState) => ({
    ...prevState,
    left: e.pageX,
    top: e.pageY,
  }))
};
```



使用多个 state 变量可以让 state 的粒度更细，更易于逻辑的拆分和组合。比如，我们可以将关联的逻辑提取到自定义 Hook 中：



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



我们发现，每次更新 left 时 top 也会随之更新。因此，把 top 和 left 拆分为两个 state 变量显得有点多余。在使用 state  之前，我们需要考虑状态拆分的「粒度」问题。如果粒度过细，代码就会变得比较冗余。如果粒度过粗，代码的可复用性就会降低。



那么，到底哪些 state 应该合并，哪些 state 应该拆分呢？我总结了下面两点：



> 1. 将完全不相关的 state 拆分为多组 state。比如 size 和 position。
> 2. 如果某些 state 是相互关联的，或者需要一起发生改变，就可以把它们合并为一组 state。比如 left 和 top，search filters 和 page、size，userInfo 等。



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

使用 useEffect Hook 时，为了避免每次 render 都去执行它的 Callback，我们通常会传入第二个参数「dependency array」。这样，只有当「依赖数组」发生变化时，才会执行 useEffect 的回调函数。



```typescript
function Example({id, name}) {
  useEffect(() => {
    console.log(id, name);
  }, [id, name]); 
}
```



在上面的例子中，只有当 id 或者 name 发生变化时，才会打印日志。「dependency array」中必须包含在 callback 内部用到的所有参与 React 数据流的值，比如 state、props 以及它们的衍生物。如果有遗漏，可能会造成 bug。这其实就是 JS 闭包问题，对闭包不清楚的同学可以自行 Google，这里就不展开了。



```typescript
function Example({id, name}) {
  useEffect(() => {
    // 由于 dependency array 中不包含 name，所以当 name 发生变化时，无法打印日志
    console.log(id, name); 
  }, [id]);
}
```



在 React 中，除了 useEffect 外，接收「dependency array」的 Hook 还有 useMemo、useCallback 和 useImperativeHandle。大部分情况下，使用「dependency array」确实可以节省一些性能的开销。我们刚刚也提到了，dependency array 千万不要遗漏回调函数内部依赖的值。但如果 「dependency array」依赖了过多东西，可能导致代码难以维护。我在项目中就看到了这样一段代码：



```typescript
const refresh = useCallback(() => {
  // ...
}, [name, searchState, address, status, personA, personB, progress, page, size]);
```



不要说内部逻辑了，光是看到这一堆依赖就令人头大！如果项目中到处都是这样的代码，可想而知维护起来多么痛苦。如何才能避免写出这样的代码呢？



首先，你需要重新思考一下，这些 deps 是否真的都需要？看下面这个例子：



```typescript
function Example() {
  const [id, setId] = useState();
  const requestParams = useRef({});
  requestParams.current = {page: 1, size: 20, id};

  function handleClick(id) {
    setId(id);
  }
  
  const refresh = useCallback(() => {
    doRefresh(requestParams.current);
  }, []);


  useEffect(() => {
    id && refresh(); 
  }, [id, refresh]); // 思考这里的 deps list 是否合理？
}
```



虽然 useEffect 的回调函数依赖了 id 和 refresh 方法，但是观察 refresh 方法可以发现，它在首次 render 被创建之后，永远不会发生改变了。因此，把它作为 useEffect 的 deps 是多余的。



其次，如果这些依赖真的都是需要的，那么这些逻辑是否应该放到同一个 Hook 中？



```typescript
function Example2({name, address, status, personA, personB, progress, searchState}) {
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



可以看出，在 useEffect 中有两段逻辑，这两段逻辑是相互独立的，因此我们可以将这两段逻辑放到不同 useEffect 中：



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



这段代码中的 useEffect 依赖了七个值，还是偏多了。仔细观察上面的代码，可以发现这些值都是「过滤条件」的一部分，通过这些条件可以过滤页面上的数据。因此，我们可以将它们看做一个整体，也就是我们前面讲过的合并 state：



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

















- 使用 setState callback
- 使用 ref

















# 问题三：该不该用 useMemo？



useMemo 滥用的问题。



# 问题四：ref 到底是在哪儿设置的？



# 问题五：使用 Tuple 还是对象？



Tuple 还是对象？



# 问题六：如何写自定义 Hooks？

- 将相关的逻辑放到一起。state 和 useEffect。



# 问题七：有 Hooks 之后，高阶组件和 Render Props 还有用吗？



