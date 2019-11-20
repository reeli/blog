
# Tree Shaking

Tree Shaking 已经出现很久了，想必大家或多或少都听说过它。这项技术可以帮助我们删除项目中没有用到的模块，从而减少打包出来的代码量。我也在项目上用了很长时间，希望通过这篇文章跟大家分享我踩过的坑，并从原理和实践两个方面，对这项技术做一个系统的整理。



## Tree  Shaking 是什么？

首先还是简单说一下 Tree Shaking 是什么吧。Tree  Shaking 的字面意思是「摇树」，就是将项目中一些没有用到的模块「摇」掉。在实际场景中，一个文件模块可能会导出多个函数，但是只有一个被用到了，因此在打包时不应该包含其他没有用到的函数。Tree Shaking 可以帮助我们解决这类问题。



## Tree Shaking 原理





```typescript
// fn.ts
export const fn1 = () => console.log("fn1");
export const fn2 = () => console.log("fn2");
```



```typescript
// index.ts
import { fn1 } from "./fn";

fn1();
```



![Screen Shot 2019-11-20 at 4.58.34 PM](webpack.assets/Screen Shot 2019-11-20 at 4.58.34 PM.png)



## Tree Shaking 为什么失效了？

Webpack 升级之后可以 import * as xxx?



只有在 production 模式下才会生效。





tree shaking 并不删除死代码，只是标记

Roll up 和 Webpack 对比



// harmony export 是什么？

// webpack 是如何识别 unused xxx 标记的？



- node_modules 里面的代码
- 非 node_modules 的代码

