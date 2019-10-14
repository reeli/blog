在使用 React Hooks 的过程中，一直有很多疑问困扰着我。其中包括：



1. 函数组件内部没有存储状态，那么状态保存在什么地方，又是如何保存的？
2. 同一个组件中多次调用 `useState`，如何保证得到的每个 state 是相互独立的？
4. 为什么不能在 Class 组件中使用 Hooks？
5. 为什么不能在循环、条件语句或者嵌套函数中使用 Hooks？



为了解答这些疑问，我去阅读了 React 中的相关源码。但 React 源码晦涩难懂，很难快速找出问题的答案。那不如自己简单实现一些 Hooks API，从中领悟 Hooks 的设计和原理。



这篇文章参考 [preact](https://github.com/preactjs/preact/blob/master/hooks/src/index.js) 的源码，通过一种简单的方式去实现 React Hooks 的核心 API。虽然和 React 的实现有些差异，但核心思想是一样的。我们可以通过这种方式，更轻松地去理解 Hooks 的原理。



## useState

我们知道，一个函数运行完之后，它内部的变量和数据会自动销毁。也就是说，函数本身无法保存状态。`useState ` 让函数组件拥有状态。它接收一个参数作为初始值，返回一个状态以及修改这个状态的方法。



```typescript
function Counter() {
  const [count, setCount] = useState(0);

  return <h1 onClick={() => setCount(count + 1)}>{count}</h1>;
}
```



从上面的例子来看，`Counter` 组件中并没有保存 `count` 状态。但是，这个状态一定保存在某个地方。













- 通过 TypeScript 定义来描述

- 如何保存状态？全局变量、Class、闭包、LocalStorage、indexDB、Cookie。简单、无副作用。挂载点？

- useState 如何保证每个 state 的独立性？

- React 能根据调用顺序提供给你正确的状态。

- React 知道当前 hook 属于哪个 fiber。

- dispatch (redux 单向数据流)

- 如何取到每个 Hook？

- Function 组件最终调用还是在 React Class component 中吗？

  



# useEffect

执行顺序，先销毁、再创建。



# useMemo

性能优化



# useContext





















- state 发生变化之后，为什么 `useEffect` 会随之执行？

- 这就是多个 useState() 调用会得到各自独立的本地 state 的原因。

- state  存储在什么地方？Function Component 中不会存储状态，那么状态放在什么地方？
- 在同一个 FC 中，如何保证每次调用 useState 得到的 state 的独立性？



为什么 class  组件能保存状态，而 Function 组件不能？因为函数运行会重置其内部作用域和变量。



> 直观来看，好像造成这种差异是因为在class里，我们能通过this保存和访问“状态(state)”，而函数组件在其作用域内难以维持“状态(state)”，因为再次函数运行会重置其作用域内部变量，这种差异导致了我们“不得不”使用class至今。

嵌套地域 -> 俄罗斯套娃
