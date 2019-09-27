从 React Hooks 出现开始，我就一直在项目上使用它。但是，在使用的过程中也遇到了很多问题。这篇文章会从 基础开始讲起，详细讲述实践中遇到的问题，并给出相应的解决办法。同时，也会分享一些好的实践，以供大家参考。



## Hooks 是什么？

Hooks 是 React 中一类特殊的函数，它可以让我们在 Function 组件中使用 state 和 React 的其他特性。



## Hooks 出现的原因？

任何一个新东西的出现，都是为了解决某些问题，Hooks 也不例外。经常使用 React 的同学都知道，Class 组件有很多问题，比如官方文档中提到的：



> 1. 很难在组件之间复用有状态逻辑
>
> 2. 复杂的组件变得难以理解
>
> 3. 难以理解的 Class
>    - this 指针
>    - 不能很好地压缩



Hooks 就是为了解决 Class 组件带来的诸多问题。



在 Hooks 出现之前，有两种方法可以复用组件逻辑：render props 和高阶组件。但是，这两种方法都可能造成 JSX 嵌套地域的问题。如果逻辑比较复杂，写出来的代码就像俄罗斯套娃一样，一层套一层，阅读起来会非常困难：



```
export const PageHome = withStyles(styles)(connect()(withRouter(withSearch(HomePage))));
```



Hook 能够让我们更细粒度地去复用组件逻辑，写出更加简洁和清晰的代码。同时，也比 Class 组件更容易压缩。



# 如何使用 Hooks？

React 官方提供了很多内置 Hooks，最基本就是 `useState`、 `useEffect` 和 `useContext`。



useState 接收一个参数作为**初始值**，返回**一个状态**以及**修改这个状态**的方法。如下所示：



```tsx
const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>inc</button>
      <button onClick={() => setCount(count - 1)}>des</button>
      <div>{count}</div>
    </div>
  );
};
```



上面的代码中，count 和 setCount 就相当于 Class 组件中的 `this.state.count` 和 `this.setState`。与 `this.setState` 不同的是，setCount 是替换掉原来的值，而不是合并。



一个 State 变量 还是多个 State 变量？



















---

useState

- state  存储在什么地方？Function Component 中不会存储状态，那么状态放在什么地方？
- 在同一个 FC 中，如何保证每次调用 useState 得到的 state 的独立性？



为什么 class  组件能保存状态，而 Function 组件不能？因为函数运行会重置其内部作用域和变量。



> 直观来看，好像造成这种差异是因为在class里，我们能通过this保存和访问“状态(state)”，而函数组件在其作用域内难以维持“状态(state)”，因为再次函数运行会重置其作用域内部变量，这种差异导致了我们“不得不”使用class至今。

嵌套地域 -> 俄罗斯套娃



1. React Hooks 系列——基础
2. React Hooks 系列——实践
3. React Hooks 系列——原理



# 原理

