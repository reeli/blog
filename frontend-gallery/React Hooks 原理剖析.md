在使用 React Hooks 的过程中，一直有很多疑问困扰着我。其中包括：



1. 函数组件内部没有存储状态，那么状态保存在什么地方，又是如何保存的？
2. 同一个组件中多次调用 `useState`，如何保证得到的每个 state 是相互独立的？
5. 为什么不能在循环、条件语句或者嵌套函数中使用 Hooks？
4. 为什么不能在 Class 组件中使用 Hooks？



我们可以实现一些 Hooks API，从中找出问题的答案。这篇文章参考 [preact](https://github.com/preactjs/preact/blob/master/hooks/src/index.js) 的源码，虽然和 React 的实现有些差异，但核心思想是一样的。



## useState

我们知道，一个函数运行完之后，它内部的变量和数据会自动销毁。也就是说，函数本身无法保存状态。但是，函数组件却可以通过 `useState` 来保存状态。



```typescript
function Counter() {
  const [count, setCount] = useState(0);

  return <h1 onClick={() => setCount(count + 1)}>{count}</h1>;
}
```



> 函数组件也是一个函数，每次 render 都会重新执行这个函数。



从上面的例子来看，`Counter` 组件中并没有保存 `count` 状态。那么，状态保存在什么地方？回答这个问题之前，我们不妨换个角度想想，哪些地方能够保存状态？全局变量、Class 实例、闭包（文件作用域本质上也是闭包）、LocalStorage、IndexedDB、Cookie…… 这么多保存变量的地方，怎么选？

首先，排除全局变量、LocalStorage、IndexedDB 和 Cookie，因为它们会带来副作用。这样一来，就只剩下 Class 和闭包。让我们再仔细看看，它们是如何保存状态的：



Class：

```typescript
class Counter {
  private count: number;

  constructor() {
    this.count = 0;
  }

  increase() {
    this.count = this.count + 1;
    return this.count;
  }
}

const counter = new Counter();
counter.increase(); // output: 1
counter.increase(); // output: 2
```



闭包：

```typescript
function Counter() {
  let count = 0;
  return {
    increase: () => {
      count = count + 1;
      return count;
    }
  };
}

const { increase } = Counter();

increase(); // output: 1
increase(); // output: 2
```



由于 Class 会带来[诸多问题](https://reactjs.org/docs/hooks-intro.html#classes-confuse-both-people-and-machines)，因此闭包就成了最好的选择。

对于 `useState` 来说，可以利用闭包来保存 state。它接受一个参数作为初始值，返回状态以及修改状态的方法。代码如下：



```typescript
function useState(initialState?: any) {
  let state = initialState;

  function setState(newState?: any) {
    state = newState;
  }

  return [state, setState] as [typeof state, typeof setState];
}
```



使用时：



```typescript
const [count, setCount] = useState(0);
setCount(5);

console.log(count); // output: 0
```



可以看出，结果并不理想，`count` 的值永远都是 0。因为 `count` 发生变化之后，我们并没有重新执行 `useState`，所以得到的值始终都是初始值。但是，如果再次执行 `useState`，它内部的状态就会丢失。怎么办呢？



由于 `setState` 会导致组件 re-render，并且每次 render 都会执行 `useState` 函数，因此必须将状态提升到更外层的作用域中。



```typescript
let component = {
  memorizeState: undefined,
};

function useState(initialState?: any) {
  component.memorizeState =  component.memorizeState || initialState;

  function setState(newState?: any) {
    component.memorizeState = newState;
    render(); // 重新渲染组件
  }

  return [component.memorizeState, setState] as [typeof component.memorizeState, typeof setState];
}
```



使用时：



```typescript
const [count, setCount] = useState(0);
console.log(count); // 首次 render 时，获取 count 的初始值 0

setCount(5);        // 修改状态，导致组件 re-render

const [count1] = useState(0); // 第二次 render 时，再次执行 useState
console.log(count1);          // 由于 count 的值已经被修改了，所以返回值是修改后的 5
```



看起来不错，调用多次 `useState` 试试。



问题：function component 中闭包是如何形成的？






















`useState ` 它接收一个参数作为初始值，返回状态以及修改状态的方法。







- fiber
- function 组件 和 component 组件

- render 阶段

- Commit 阶段

  











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
