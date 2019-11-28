
# Tree Shaking

Tree Shaking 已经出现很久了，想必大家或多或少都听说过它。这项技术可以帮助我们删除项目中未被引用的代码，从而减少打包出来的代码量。我也在项目上用了很长时间，希望通过这篇文章跟大家分享我踩过的坑，并从原理和实践两个方面，对这项技术做一个系统的整理。

文章中使用的 Webpack 版本是 4.35.x。



## 为什么需要 Tree  Shaking？

Tree  Shaking 的字面意思是「摇树」，就是将项目中一些没有用到的模块「摇」掉。在实际场景中，一个文件模块可能会导出多个函数，但其中只有一个被用到了，其他没有被用到的函数就成为了「死代码」。死代码就像树上的枯叶，不仅毫无用处，而且还会增加树的负担，因此我们需要把它「摇」掉，不让死代码进入最终的打包文件。

有的人可能会说，我把没用到的模块删了不就好了，为什么还需要 Tree Shaking？且不说三方依赖库中也会有很多没有用到的模块，那些随着项目迭代而不再需要的方法，真的还会有人记得去删除吗？

有的人又说了，我们可以使用 UglifyJS 这样的工具来做死代码消除（Dead Code Elimination）。那些对应用程序不会造成任何影响或者不可达的代码会被删除，就像下面这样：



![Screen Shot 2019-11-21 at 1.32.45 PM](webpack.assets/Screen Shot 2019-11-21 at 1.32.45 PM.png)



既然 UglifyJS 可以消除死代码，为什么还需要 Tree Shaking？原因是 UglifyJS 目前不能跨文件去做死代码消除。UglifyJS 会对文件的代码进行静态分析，然后将死代码从抽象语法树（AST）中删除。静态分析是指不运行代码，只从字面量上对代码进行分析。因此在静态分析时，require 函数不会被运行，无法得知文件 require 或 export 了哪些模块。另外，UglifyJS 只会对单个文件的 AST 进行分析，无法得知 export 的模块是否会被其他文件使用。



![Screen Shot 2019-11-21 at 2.27.51 PM](webpack.assets/Screen Shot 2019-11-21 at 2.27.51 PM.png)



因此，在下面这种跨文件的场景下，UglifyJS 无法将没有用到的函数 `fn2` 消除。



![Screen Shot 2019-11-21 at 1.36.31 PM](webpack.assets/Screen Shot 2019-11-21 at 1.36.31 PM.png)



但 Tree Shaking 可以帮我们解决这个问题，接下来就让我们一起来看看 Tree Shaking 是如何解决这个问题的。



## Tree Shaking 的原理是什么？

简单来说，Tree Shaking 的原理就是对你 import 的代码进行静态分析，如果发现没有被用到的部分就不再 export。没有 export 的代码就会被 UglifyJS 当成死代码删除。需要注意的是，Webpack 的 Tree Shaking 不会直接把没有用到的代码删除，真正删除代码的是 UglifyJS 这样的死代码消除工具。



![Screen Shot 2019-11-21 at 12.58.16 PM](webpack.assets/Screen Shot 2019-11-21 at 12.58.16 PM-4407909.png)



在上面的例子中，fn 文件 export 了两个函数 `fn1` 和 `fn2`，但是只有 `fn1` 被用到了。Tree Shaking 对代码进行静态分析，发现 `fn2` 没有被任何地方使用到，于是就不再 export `fn2` 。就像下面这样：



```typescript
// 伪代码
export const fn1 = () => console.log("fn1");
const fn2 = () => console.log("fn2"); // Dead Code
```



这样 `fn2` 就成为了死代码，在之后 Uglify 时就会被删除。不过这一切都依赖于 ES6 模块的静态结构特性：

1. 在编译时就可以明确知道 import 或 export 了哪些模块。
2. 只能在文件顶层 import 或 export 模块，不能在条件语句中使用。
3. import 或 export 的模块名只能是字符串常量。
4. export 导出的模块是一个值的引用，而非值的拷贝。

在 ES6 模块出现之前，我们通常使用 CommonJS 模块来导入和导出模块。通过 require 方法可以动态导入一个模块，但是只有在运行时才能确定导入的模块是什么，因此无法进行静态分析。由于静态结构特性，ES6 模块的依赖关系在编译时就能够明确，为 Tree Shaking 进行静态分析打下了坚实的基础。



## Tree Shaking 为什么失效了？

本以为有了 Tree Shaking 之后，再也不用担心引入多余模块的问题了。可是在实际场景中，当我使用 Webpack 的 Tree Shaking 时，却发现许多未使用的模块并没有被删除。原因是你的代码有「副作用」，或者 Uglify/Terser 无法判断你的代码是否有「副作用」。



>  副作用是函数式编程的一个概念，是指当调用函数时，除了返回函数值之外，还会对主调用函数产生附加的影响。简单来说，就是除了返回函数值之外，还做了一些别的事情。比如打印 Log、读取和修改外部变量等。引申到应用层面，副作用还可能是导入 CSS 文件、引入 Polyfill 等。



为什么有副作用的代码不能被删除呢？举个简单的例子：



```typescript
const setTitle = () => {
  document.title = "111";
};

const a = setTitle();
```



在上面的例子中，虽然 `a` 变量没有被任何地方使用到，但是由于副作用，在为它赋值时会使 document 的 title 被设置为 111。如果把 `a` 变量删除，会导致 document 的 title 无法被正确设置。因此，删除有副作用的代码可能导致应用程序出现 bug 甚至 crash。

那不在项目中写这种带副作用的代码就行了呗？当然，确实不应该在项目中写这种带副作用的代码。不过即便我们不写，在编译的过程中也可能会产生很多带副作用的代码。比如用 TypeScript 或者 Babel 将项目代码从 ES6 编译成 ES5。



Terser -> Babel 的 scope？函数的 scope 内有哪些变量会被存储，分析 AST 时，如果 xxx(document) 没有在 scope 内，就可以判定为有副作用。







[Babel 例子](https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=KYDwDg9gTgLgBAYwgOwM7wGbIIxwLxwAUAlPgHyIqoQA2wAdDRAOaEBEW2bxA3AFB9QkWJTTwEUYAEMYwAHJSAtsADCkmdHxFkS4AC446KAEtkzUnjJ84RCxUIBvazcMBXBAmCpUBgAYASBx1lAF8AfVR3T29fABpnGwwpYxo_QODgcKSUuOcQ3gEhaHEqcXVZBWUtCWkK3TVa6HYAFRQAT24eIA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2016%2Ces2017%2Ctypescript%2Cenv&prettier=false&targets=&version=7.7.4&externalPlugins=)









```typescript
// foo.ts
export const a = (() => (Array.prototype.forEach = () => console.log("Hi!")))();
export const b = () => console.log("b");

// index.ts
import { b } from "./foo.ts";
b();
```





```typescript
const subscription = sub$.subscribe(() => {
  subscription.unsubscribe();
});

function setTitle(){
  document.title='1111'
  return 111
}

const a = /*#__PURE__*/setTitle()
```







```
// 在没有 Tree Shaking 之前，都是按需引用
// import {map} from 'lodash'; //lodash-es
// import map form 'lodash/map';
// import * as React from 'react';
```

Loads -> lodash-es

赋值语句都不要带副作用，带副作用的都不要赋值，比如 useEffect

注册给 export 等同于使用了它。



## 参考

[https://zh.wikipedia.org/wiki/%E5%87%BD%E6%95%B0%E5%89%AF%E4%BD%9C%E7%94%A8](https://zh.wikipedia.org/wiki/函数副作用)



打包过程可以拆分为四步：

1、利用 babel 完成代码转换,并生成单个文件的依赖

2、从入口开始递归分析，并生成依赖图谱

3、将各个引用模块打包为一个立即执行函数

4、将最终的 bundle 文件写入 bundle.js 中



document.title 取值也会产生副作用？因为 getter, setter 是不透明的？

Pollyfill/ call/bind/apply

先转换代码，再去死代码？Or 先去死代码再转换？

如何知道三方库是否使用 ES6 还是 ES5？

Babel: ES6 模块转换成 ES5。

Uglify 和 Terser: Uglify 不支持 ES6 module。



Webpack 升级之后可以 import * as xxx?

只有在 production 模式下才会生效?

UglifyJS 不会跨文件去做 DCE，如果有 Scope Hoisting 还需要 Tree Shaking 吗？

UglifyJS 为什么不能跨文件去做 DCE？

标记 sideEffect

标记 PURE

tree shaking 并不删除死代码，只是标记

Roll up 和 Webpack 对比

// harmony export 是什么？

// import * as xxx 

// import React from 'react' 会导入所有模块吗？

// const abc = require("abc"); 会导入所有模块吗？

// webpack 是如何识别 unused xxx 标记的？

- node_modules 里面的代码
- 非 node_modules 的代码

