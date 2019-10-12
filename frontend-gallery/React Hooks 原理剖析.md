在使用 React Hooks 的过程中，一直有很多疑问困扰着我。其中包括：



1. Function 组件内部没有存储状态，那么状态保存在什么地方？又是如何保存的？
2. 同一个组件中多次调用 `useState`，如何保证每个 state 之间相互独立？
3. state 发生变化之后，为什么 `useEffect` 会随之执行？
4. 为什么不能在 Class 组件中使用 Hooks？
5. 为什么不能在循环、条件语句或者嵌套函数中使用 Hooks？

 

为了解答这些疑问，我去阅读了 React 中的相关源码。看了一会儿发现，毕竟是一个完善的开源框架，源码确实有些晦涩难懂。回过头来，我不就是想了解 Hooks 的原理么，干嘛考虑那么多细枝末节的东西？不如自己实现一些核心的 Hooks API，从中领悟精髓。



这篇文章参考 [preact](https://github.com/preactjs/preact) 的源码，通过一种简单的方式去实现 React Hooks 的核心 API。虽然和 React 的实现有些差异，但核心思想是一样的。我们可以通过这种方式，更轻松地去理解 Hooks 的原理。



# useState

这个问题提得很好。



1. 当 prop 的值一致但引用不一致时，确实只有会 diff props 的组件才能避免 re-render，比如 Pure Component、React.memo 包裹的组件。不过还是建议保持 props 引用的一致性，毕竟你无法确定别人会不会把 props 又用到其他 Hook 的依赖数组中。
2. 使用 Context 时，如果 Provider 的 value 中定义的值（第一层）发生了变化，即便用了 Pure Component 或者 React.memo，仍然会导致子组件的 re-render。所以这种情况下，仍然需要保持引用的一致性。
3. 归根结底，保持引用的一致性很重要，不管你用 `useMemo` 还是 `useRef`。





第一步，定义 `useState` 函数的输入和输出。`useState` 接受一个参数作为初始状态，返回一个元组类型：



```typescript
type TUseStateReturnValue = [any, (newState: any) => void];

const useState = (initialState?: any): TUseStateReturnValue => {
};
```



























- state  存储在什么地方？Function Component 中不会存储状态，那么状态放在什么地方？
- 在同一个 FC 中，如何保证每次调用 useState 得到的 state 的独立性？



为什么 class  组件能保存状态，而 Function 组件不能？因为函数运行会重置其内部作用域和变量。



> 直观来看，好像造成这种差异是因为在class里，我们能通过this保存和访问“状态(state)”，而函数组件在其作用域内难以维持“状态(state)”，因为再次函数运行会重置其作用域内部变量，这种差异导致了我们“不得不”使用class至今。

嵌套地域 -> 俄罗斯套娃
