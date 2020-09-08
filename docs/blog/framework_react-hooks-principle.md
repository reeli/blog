# React Hooks 原理剖析

在使用 React Hooks 的过程中，一直有很多疑问困扰着我。其中包括：



1. 函数组件持有的状态保存在什么地方？如何保证每次 render 取到正确的状态？
2. 同一个组件中多次调用 `useState`，如何保证返回的每个 state 是相互独立的？
5. 为什么不能在循环、条件语句或者嵌套函数中使用 Hooks？
4. 为什么不能在 Class 组件中使用 Hooks？



我们可以实现一些 Hooks API，从中找出问题的答案。虽然和 React 的实现有些差异，但核心思想是一样的。



## useState

一个函数运行完之后，它内部的变量和数据就会自动销毁。函数组件也是函数，组件每次渲染时 React 都会重新调用这个函数，它内部的变量和数据也会随之销毁。因此，如果要让函数组件持有状态，那么这个状态一定不能保存在函数组件内部。我们已经知道，函数组件可以通过 `useState` 来保存状态，例如：



```typescript
function Counter() {
  const [count, setCount] = useState(0);

  return <h1 onClick={() => setCount(count + 1)}>{count}</h1>;
}
```



从这个例子可以看出，`Counter` 组件中确实并没有保存 `count` 状态。那么，状态保存在什么地方？回答这个问题之前，我们不妨换个角度想想，哪些地方能够保存状态？全局变量、Class 实例、闭包、LocalStorage、IndexedDB、Cookie…… 这么多保存状态的地方，如何选择？

首先排除 LocalStorage、IndexedDB 和 Cookie，因为它们会带来副作用和兼容性问题。这样一来，就只剩下全局变量、Class 和闭包。接下来，让我们再仔细看看，它们分别是如何保存状态的。



全局变量：

```typescript
let count = 0;

function increase() {
  return count = count + 1;
}

increase(); // output: 1
increase(); // output: 2
```



Class：

```typescript
class Counter {
  private count: number;

  constructor() {
    this.count = 0;
  }

  increase() {
    return this.count = this.count + 1;
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
    increase: () => count = count + 1
  }
}

const {increase} = Counter();

increase(); // output: 1
increase(); // output: 2
```



全局变量的问题不用多说，很多人都深有体会。Class 也会带来[诸多问题](https://reactjs.org/docs/hooks-intro.html#classes-confuse-both-people-and-machines)。最后可供选择的就只有闭包了。在模块化开发中，利用闭包的特性，我们只需要在文件顶部声明一个用于挂载状态的变量即可。这样在文件内部的所有方法都可以访问这个变量，而且不会污染全局命名空间。



我们可以定义一个 `component`  变量用于挂载状态，就像下面这样：



```typescript
interface ICurrentComponent {
  memoizedState: any;
}

let currentComponent: ICurrentComponent = {
  memoizedState: undefined,
};

function useState<T = any>(initialState?: T) {
  currentComponent.memoizedState = currentComponent.memoizedState || initialState;

  function setState(newState: T) {
    currentComponent.memoizedState = newState;
    render(); // 重新渲染组件
  }

  return [currentComponent.memoizedState, setState] as const;
}
```



在上面的例子中，不管组件渲染多少次，状态都能够一直保存。接下来，让我们试试调用多次 `useState` ：



 ```typescript
function Counter() {
  const [count, setCount] = useState<number>(0);
  const [times, setTimes] = useState<number>(100);

  return (
    <div>
      <div onClick={() => setCount(count + 1)}>{count}</div>
      <div onClick={() => setTimes(times + 1)}>{times}</div>
    </div>
  );
}
 ```



我们发现，`count` 变化之后 `times` 也随之改变了。因为两个不同的 `setState` 修改了同一个值。但是，我们希望每次调用 `useState ` 得到的 state 都是独立的，并且每个 setState 只修改其对应的 state。也就是说，每调用 `useState` 一次，我们就需要保存一组 `state` 和 `setState`。显然，`currentComponent` 的结构已经不能满足我们的需求，我们需要对它进行调整。



我们可以用字典结构去存储每个 Hook 的状态。这种方式需要为每个 Hook 指定一个唯一的 key，不仅使用起来不方便，而且可能产生命名冲突的问题：



```typescript
interface IHookState {
  memoizedState?: any;
}

interface ICurrentComponent {
  hooks: {
    [key: string]: IHookState;
  };
}

let currentComponent: ICurrentComponent = {
  hooks: {},
};

// 对应的使用方式
const [count1, setCount1] = useState<number>(0, "count1"); 
const [count2, setCount2] = useState<number>(2, "count1"); // 冲突！前面已经定义了一个 count1

```



我们也可以用数组来记录每个 Hook 的状态，然后通过索引去取值：



```typescript
interface IHookState {
  memoizedState?: any;
}

interface ICurrentComponent {
  hooks: IHookState[];
}

let currentComponent: ICurrentComponent = {
  hooks: [],
};
```



用这种结构来实现 `useState`，如下所示：



```typescript
let currentIdx = 0;
let currentComponent = {
  hooks: [],
};

function useState<T = any>(initialState: T) {
  // 每调用一次 useState，索引 +1
  const hookState = getHookState(currentIdx++);

  function setState(nextState: T) {
    if (hookState.memoizedState[0] !== nextState) {
      hookState.memoizedState[0] = nextState;
      render();
    }
  }

  const state = hookState.memoizedState ? hookState.memoizedState[0] : initialState;
  hookState.memoizedState = [state, setState];

  return hookState.memoizedState;
}

// 根据索引获取对应 Hook 的 State
function getHookState(idx: number) {
  const hooks = currentComponent.hooks;

  // 如果要获取的 Hook State 不存在，就为它赋一个初始值 {}
  if (idx >= hooks.length) {
    hooks.push({});
  }

  return hooks[idx];
}
```



这样组件中每调用一次 `useState`，就会在 `currentComponent.hooks` 节点上保存一组 `state` 和 `setState`，保证了每个 state 的独立性。但是这种方式必须保证索引的一致性，否则我们无法通过索引取到正确的值。

于是，也就不难理解 React Hooks 定义的规则：不能在循环、条件语句或者嵌套函数中使用 Hooks。因为这样可能导致首次 render 注册的 Hooks 和后续 render 时的 Hooks 不一致，无法通过索引获取到正确的值。举个例子：



```typescript
function Counter() {
  if (count === 0) {
    const [count3, setCount3] = useState<number>(2);
    console.log(count3, setCount3);
  }
  
  const [count1, setCount1] = useState<number>(0);
  const [count2, setCount2] = useState<number>(2);
  
  return <div onClick={() => setCount1(count1 + 1)}>{count1}</div>;
}
```



让我们来看看上面这段代码会发生什么：

1. 首次 render，初始化 useState



每一次 render，React 会 比较 hooks 的 length、类型以及 deps， 如果 Hooks 定义的规则被破坏了，会抛出 warning。









-------------分割线--------------



接下来，我们就用闭包的方式来实现 `useState`。



```typescript
// `useState` 接收一个参数作为初始值，返回状态以及修改状态的方法

export function useState<T = any>(initialState?: T) {
  let state = initialState;

  function setState(newState?: T) {
    state = newState;
  }

  return [state, setState] as const;
}
```



在上面的例子中，我们将 state 保存在 `useState` 内部，通过 `setState` 的返回值获取最新的 state。这样做明显是不可行的，也不符合 React 数据驱动的理念。在 React 中， `setState` 不会返回更新后的状态。如果想要获取最新的 state，我们必须再次执行 `useState`。



```typescript
const [count, setCount] = useState(0);
setCount(5);

console.log(count); // output: 0
```



对于 `useState` 来说，可以利用闭包来保存 state。它接受一个参数作为初始值，返回状态以及修改状态的方法。代码如下：



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







**问题：**

1. function component 中闭包是如何形成的？preact 的 component 算全局作用域还是闭包？
2. 高阶组件中使用 Hooks，TypeScript 定义的问题
3. useMemo 中的闭包是怎么生成的？
4. useMemo 中把 callback 存下来是为什么？
5. useEffect 里面是否还需要 render ? 












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

拿 useState 来说，在一个组件中，每一次调用 useState，我们都需要保存一组 state 和 setState。因此，我们需要一个唯一标识来标记每一次 Hook 调用。可以通过 idx，也可以通过 id。id 可能存在命名冲突的问题，而且接口也不简洁。index 可以让接口比较简洁，但是需要定义一些规范，否则我们无法通过 index 取到正确的值。于是就有了 Hooks 定义的规范：

- 只能在 React Function 的顶层调用 Hooks。不能在循环、条件语句或者嵌套函数（比如 Callback）中使用 Hooks。



用 index 获取 Hook 的方式：

```typescript
import ReactDOM from "react-dom";
import React from "react";

interface IComponent {
  __hooks: any[];
}

let currentIdx = 0;
let component: IComponent = {
  __hooks: [],
};

// 根据 currentIdx 获取到当前 hook
function getHookState(currentIdx: number) {
  const hooks = component.__hooks;
  if (currentIdx >= hooks.length) {
    hooks.push({});
  }
  return hooks[currentIdx];
}

function useState<T = any>(initialState: T) {
  const hookState = getHookState(currentIdx++);

  function setState(nextState: T) {
    if (hookState._value[0] !== nextState) {
      hookState._value[0] = nextState;
      render();
    }
  }

  hookState._value = [hookState._value ? hookState._value[0] : initialState, setState];
  return hookState._value;
}

function Counter() {
  const [count, setCount] = useState<number>(0);
  const [count1, setCount1] = useState<number>(2);

  return (
    <div>
      <div onClick={() => setCount(count + 1)}>{count}</div>
      <div onClick={() => setCount1(count1 + 1)}>{count1}</div>
    </div>
  );
}

function render() {
  console.log(component);
  currentIdx = 0; // 重置 currentIdx 非常关键
  ReactDOM.render(<Counter />, document.body);
}

render();
```



用 ID 获取 hook 的方式：



```typescript
import ReactDOM from "react-dom";
import React from "react";

interface IComponent {
  __hooks: {
    [key: string]: any;
  };
}

let component: IComponent = {
  __hooks: {},
};

// 根据 id 获取到当前 hook
function getHookState(id: string) {
  const hooks = component.__hooks;
  hooks[id] = hooks[id] ? hooks[id] : {};
  return hooks[id];
}

function useState<T = any>(initialState: T, id: string) {
  const hookState = getHookState(id);

  function setState(nextState: T) {
    if (hookState._value[0] !== nextState) {
      hookState._value[0] = nextState;
      render();
    }
  }

  hookState._value = [hookState._value ? hookState._value[0] : initialState, setState];
  return hookState._value;
}

function Counter() {
  const [count, setCount] = useState<number>(0, "count");
  const [count1, setCount1] = useState<number>(2, "count2");

  return (
    <div>
      <div onClick={() => setCount(count + 1)}>Click me {count}</div>
      <div onClick={() => setCount1(count1 + 1)}>Click me {count1}</div>
    </div>
  );
}

function render() {
  ReactDOM.render(<Counter />, document.body);
}

render();
```





分别在 render props 和 高阶组件中使用 Hooks:



高阶组件中：



```typescript
import React, { useState } from "react";
import { render } from "react-dom";

interface ICounterProps {
  v: string;
  updateVisible: () => void;
}

function Counter({ v, updateVisible }: ICounterProps) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>increase count</button>
      <button onClick={updateVisible}>toggle visible state</button>
    </div>
  );
}

export function enhance<TProps = {}>(Comp: (props: TProps & { updateVisible: () => void }) => JSX.Element) {
  return function(props: Omit<TProps, "updateVisible">) {
    const [visible, setVisible] = useState(true);
    return visible ? <Comp {...(props as any)} updateVisible={() => setVisible(false)} /> : null;
  };
}

const B = enhance(Counter);

render(<B v={"1"} />, document.body);
// render(<Counter v={"1"} updateVisible={() => {}} />, document.body);
```



Render Props 中：



```typescript
import React, { useState } from "react";
import { render } from "react-dom";

interface ICounterProps {
  updateVisible: () => void;
}

function Counter({ updateVisible }: ICounterProps) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>increase count</button>
      <button onClick={updateVisible}>toggle visible state</button>
    </div>
  );
}

export function EnhancedCounter({ children }: { children: (props: ICounterProps) => JSX.Element }) {
  const [visible, setVisible] = useState(true);
  return visible
    ? children({
        updateVisible: () => setVisible(!visible),
      })
    : null;
}

function B() {
  return <EnhancedCounter>{({ updateVisible }) => <Counter updateVisible={updateVisible} />}</EnhancedCounter>;
}

render(<B />, document.body);
```



这样写也不会有问题，但是当你把 Counter  组件 inline 时，就可能出现问题。比如：



```typescript
function B() {
  return (
    <EnhancedCounter>
      {({ updateVisible }) => {
        const [count, setCount] = useState(0);
        return (
          <div>
            <div>{count}</div>
            <button onClick={() => setCount(count + 1)}>increase count</button>
            <button onClick={updateVisible}>toggle visible state</button>
          </div>
        );
      }}
    </EnhancedCounter>
  );
}
```



因为 render props 和它的 children 其实都是挂载在 EnhancedCounter 组件上的，所以当 EnhancedCounter 中有条件判断时，会导致 Hooks 的顺序不一致。但是，高阶组件会产生两个组件，Counter 是一个完整组件，里面 hooks 可以正常使用，不存在挂载点外移的情况。







解释闭包：



「函数」和「函数内部能访问到的变量或者参数」（也叫环境）的总和，就是一个闭包。



这个例子不能生成闭包，因为 init 执行完成之后，就再也不能访问 init 内部的 name 变量了。

```typescript
function init() {
    var name = "Mozilla"; // name 是一个被 init 创建的局部变量
    function displayName() { // displayName() 是内部函数,一个闭包
        alert(name); // 使用了父函数中声明的变量
    }
    displayName();
}
init();
```



下面这个例子才会生成闭包：

```typescript
function makeFunc() {
    var name = "Mozilla";
    function displayName() {
        alert(name);
    }
    return displayName;
}

var myFunc = makeFunc();
myFunc();
```



- 词法作用域根据声明变量的位置来确定该变量可被访问的位置。嵌套函数可获取声明于外部作用域的函数。闭包可以让你从内部函数访问外部函数作用域。
- 闭包是由函数以及创建该函数的词法环境组合而成。**这个环境包含了这个闭包创建时所能访问的所有局部变量**。



https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures



# 参考

这篇文章参考 [preact](https://github.com/preactjs/preact/blob/master/hooks/src/index.js) 的源码，



- state 发生变化之后，为什么 `useEffect` 会随之执行？

- 这就是多个 useState() 调用会得到各自独立的本地 state 的原因。

- state  存储在什么地方？Function Component 中不会存储状态，那么状态放在什么地方？
- 在同一个 FC 中，如何保证每次调用 useState 得到的 state 的独立性？



为什么 class  组件能保存状态，而 Function 组件不能？因为函数运行会重置其内部作用域和变量。



> 直观来看，好像造成这种差异是因为在class里，我们能通过this保存和访问“状态(state)”，而函数组件在其作用域内难以维持“状态(state)”，因为再次函数运行会重置其作用域内部变量，这种差异导致了我们“不得不”使用class至今。

嵌套地域 -> 俄罗斯套娃

