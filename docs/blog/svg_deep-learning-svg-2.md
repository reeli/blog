# SVG 坐标系统

这一篇是讲 SVG 的坐标系统，在这之前如果你对 SVG 的基础知识还不是很了解，可以先点这里学习 [深入理解 SVG 系列（一） —— SVG 基础](https://segmentfault.com/a/1190000015652209)。
## 网格坐标系

和很多计算机绘图所使用的坐标系统一样，SVG 也使用了网格坐标系统。这种坐标系有如下几个特点:

1. 以左上角为坐标系的原点(0,0)
2. `X 轴`的正方向`向右`，从 0,0 点开始向右， x 逐渐增大。`Y 轴`的正方向`向下`，从 0,0 点开始向下， y 逐渐增大。 
3. 坐标以像素为单位

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/grid-coordinate.png)

```html
<svg width="100" height="100" style="outline: 2px solid red">
	<rect x="0" y="0" width="50" height="50" fill='green'/>
</svg>
```

> 以 0,0 为起始点，画一个 100 * 100 的矩形

## 初始坐标系

上面我们提到了画布和视窗分别对应两个坐标系，一个视窗坐标系，一个用户坐标系。这两个坐标系都具有我们上面提到的网格坐标系的几个特点。

- **视窗坐标系**就是建立在**视窗上**的坐标系，
- **用户坐标系**是建立在 SVG 画布上的坐标系，也称**当前坐标系**。

这两个坐标系一开始是完全重合的，它们的原点和坐标都是完全一致的，也就是说初始用户坐标系的原点就位于视窗的左上角，也是 X 轴正向向右，Y 轴正向向下。

虽然一开始它们是两个完全一样的坐标系，但既然是两个坐标系，就意味着它们可以是不一样的。你可以通过 viewBox 去改变这种默认对齐的方式，接下来的内容会讲到。

## viewBox

之前的章节中，我们所有的 SVG 内容看起来都像是基于视图坐标系来绘制的，因为初始视窗坐标系和初始用户坐标系完全相同，但在这一节中，我们会通过 viewBox 来声明自己的用户坐标系。

**viewBox 是用来把 SVG 内容绘制到画布上的坐标系。**它的字面意思是视图盒子，只有出现在这个盒子区域里面的 SVG 内容才能被看到，你可以理解为 SVG 图形真正的可见区域。 

### viewBox 语法

```html
viewBox = <min-x> <min-y> <width> <height>
```
viewBox 接收四个参数值，分别是 `min-x`，`min-y`，`width`，`height`。

`min-x` 和 `min-y` 决定了 viewBox 的左上角，`width` 和 `height` 决定了 viewBox 的宽和高。注意 width 或 height 如果设置成 `0` ，会禁止元素的渲染。

### 一个实例

```html
<svg width="100" height="100" viewBox="0 0 50 50">
	<!-- SVG content -->
</svg>
```

设置 `viewBox="0 0 50 50"` 之后会发生什么？

1. 声明一个特定的区域，原点为左上角的 0,0 点，宽 50px，高 50px。
2. 将 SVG 内容绘制到画布上，但是只有这个特定的区域可见。
3. 区域被缩放，以适应整个 SVG 视窗。
4. 用户坐标系被映射到视窗坐标系，这里一个用户单位相当于两个视窗单位。效果就是通过 SVG 视窗看到的 SVG 图形变大了。


### 平移

通过改变 min-x 和 min-y 的值可以将 viewBox 声明的区域进行平移。

以坐标点 0,0 为圆心，半径为 50px 画一个圆，我们只能看到圆的 1/4，如图一:

```html
<svg width=100 height=100 style="outline: 2px solid red">
    <circle cx=0 cy=0 r=50 fill="green"/>
</svg>
```

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-4.png)


图一

通过设置 `viewBox="-50 -50 100 100"`，我们可以看到一整个圆。如下图:

```html
<svg width=100 height=100 style="outline: 2px solid red">
    <circle cx=0 cy=0 r=50 fill="green"/>
</svg>
```

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-5.png)


图二

通过 viewBox 的 `min-x` 和 `min-y` 两个参数，我们将 viewBox 声明的区域分别向左和上进行了平移，这时我们以 0,0 为圆心，半径为 50 画圆，正好能够将整个圆显示到 viwBox 声明的区域中，然后再将这个坐标系映射到 100px * 100px 的视窗中，就大功告成了。

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-viewBox-1.png)


### 缩放

通过改变 width 和 height 的值可以缩放 viewBox 声明的区域。

```html
<svg width=100 height=100 style="outline: 2px solid red">
    <circle cx=0 cy=0 r=50 fill="green"/>
</svg>
```

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-6.png)


当 viewBox 的宽高小于视窗的宽高时，相当于放大。

```html
<svg width=100 height=100 viewBox="0 0 50 50" style="outline: 2px solid red">
    <circle cx=0 cy=0 r=50 fill="green"/>
</svg>

```
![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-7.png)


当 viewBox 的宽高大于视窗的宽高时，相当于缩小。

```html
<svg width=100 height=100 viewBox="0 0 200 200" style="outline: 2px solid red">
    <circle cx=0 cy=0 r=50 fill="green"/>
</svg>
```
![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-8.png)


### 通过百分比和 viewBox 让 SVG 图形进行缩放

因为多设备适配的需求，很多时候我们期望 SVG 图形能够在不同的屏幕上放大或缩小，但是我们又不希望每次都去修改 `<svg>` 的 `width` 和 `height`，这时百分比就非常有用了。

如果给视窗设置 `width: 100%` 和 `height: 100%`，那么视窗的宽高就由它父元素的宽高决定，我们可以通过调整其父元素的宽高来放大和缩小 SVG 视窗，而不用修改 `<svg>` 的 width 和 height。仅仅是这样还不够，我们还需要通过 viewBox 来将 SVG 图形放大到整个视窗区域。


```html
<div style="width:100px; height:100px;"> // 你可以试着通过修改 div 的宽高来改变 SVG 图形的大小
	<svg width="100%" height="100%" style="outline: 2px solid red" viewBox="0 0 100 100">
		<rect x="0" y="0" width="100" height="100" fill="green"/>
	</svg>
</div>
```
### 小练习

1. 利用 viewBox 实现上半圆

    	```html
    	<svg width=100 height=100 viewBox="-50 -100 100 100" style="outline: 2px solid red">
    	    <circle cx=0 cy=0 r=50 fill="green"/>
    	</svg>
    	```

    	在纸上画出 viewBox 声明的区域,如下图:
    	
    ![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-viewBox-2.png)

	
	>  橙色区域为 viewBox 声明的区域，从粉色的区域移动到橙色区域可以得出 viewBox 的 min-x = -50 min-y = -100，在这个区域只有上半圆可见，因此我们最后看到的也就只是这个上半圆。

2. 请参考第一题，在纸上画出下面 SVG 的坐标系，在坐标系上画出每个元素，以及 viewBox 的区域。

	```html
	<svg width=100 height=100 viewBox="0 -50 100 100" style="outline: 2px solid red">
	    <circle cx=0 cy=0 r=50 fill="green"/>
	</svg>
	```
	
	![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-11.png)

	
	
## preserveAspectRatio

preserveAspectRatio 属性用来强制统一缩放比，以保持图形的宽高比。

如果 viewBox 的宽高比和 SVG 视窗的宽高比不同，那么在拉伸 viewBox 来适应视窗的时候，就可能导致 SVG 图形发生扭曲。这个时候 preserveAspectRatio 就派上用场了。

### preserveAspectRatio 语法

```html
preserveAspectRatio = <align> <meetOrSlice>?
```

- `align` 表示 viewBox 如何与 viewport 对齐。
- `meetOrSlice` 是可选的，表示如何保持宽高比。

**align**

align 的值有很多，为了方便理解，我们先把它最基本的值拆分出来，如下:

| 值  | 含义 |
| ------------- | ------------- |
| none | 通过拉伸 viewBox 来适应整个视窗，不管宽高比 |
| xMin | viewBox 和 viewport 左边缘对齐 |
| xMid | viewBox 和 viewport x 轴中心对齐 |
| xMax | viewBox 和 viewport 右边缘对齐 |
| YMin | viewBox 和 viewport 上边缘对齐 |
| YMid | viewBox 和 viewport y 轴中心对齐 |
| YMax | viewBox 和 viewport 下边缘对齐 |


然后再自由组合 x,y 就能可以了，比如：

```html
xMinYMin => 左-上对齐
xMidYmid => 中-中对齐
```

**meetOrSlice**

| 值  | 含义 |
| ------------- | ------------- |
| meet | 保持宽高比缩放 viewBox 以适应 viewport，类似于 `background-size: contain` |
| slice | 保持宽高比同时比例小的方向放大填满 viewport，类似于 `background-size: cover` |

### 例子

```html
<svg width="200" height="100" viewBox="0 0 100 100" style="outline: 2px solid red">
	<rect x=10 y=10 width=50 height=50 fill="green"/>
</svg>
```

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-12.png)


在上面的例子中，我们并没有设置 preserveAspectRatio ，但是根据我们之前讲过的知识，不难发现在 `<svg>` 上作用着一个隐形的 `preserveAspectRatio="xMidYMid meet"`。

```html
<svg width="200" height="100" viewBox="0 0 100 100" style="outline: 2px solid red" preserveAspectRatio="xMidYMid meet">
	<rect x=10 y=10 width=50 height=50 fill="green"/>
</svg>
```
![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-13.png)


那么 `preserveAspectRatio="xMidYMid meet"` 是如何作用在 SVG 上的呢？请看下面的图:

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-meet-1.png)

上图中 viewport  宽 200 高 100，viewBox 宽 100 高 100， x 横轴比例是 2， y 纵轴比例是 1。
`xMidYMid`  让 viewBox 和 viewPort 的中心对齐，和 viewport y 轴上边缘对齐。
`meet` 的作用是让 viewBox 保持宽高比的同时，完全在 viewport 中显示。
因为这里最小的纵向比例是 1 ，所以 viewBox 没有任何的缩放。

为了更好的去感受缩放，我们将 viewBox 的宽度从 100 调整到 300，其它保持不变。

```html
<svg width="200" height="100" viewBox="0 0 300 100" style="outline: 2px solid red" preserveAspectRatio="xMinYMin meet">
	<rect x=10 y=10 width=50 height=50 fill="green"/>
</svg>
```

这时 viewBox 的宽度超过 viewport 的宽度了（如图一），所以 viewBox 就会缩小以适应 viewport，因为 meet 会让 viewBox 保持比例来进行缩放，所以你可以想象成按住viewBox 的右下角，缩小 viewBox 至 viewport 的大小 (如图二)。


![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-meet-2.png)

说完了 `meet` 下面我们再来说说 slice， slice 虽然会保持宽高比进行缩放，但是会在比例小的方向放大填满 viewport。比如设置 viewBox 宽 100 高 100，viewport 宽 200 高 100，在 viewport 的 x 轴方向还有空间，所以会将 viewBox 在横轴上进行放大，结果就是我们的好好的正方形被拉成了矩形。

```html
<svg width="200" height="100" viewBox="0 0 100 100" style="outline: 2px solid red" preserveAspectRatio="xMidYMid slice">
	<rect x=10 y=10 width=50 height=50 fill="green"/>
</svg>
```

![](https://raw.githubusercontent.com/reeli/blog/master/docs/assets/svg-learning/svg-14.png)

## 结尾

在学习 SVG 的过程中，动手画图真的非常的重要。这也是为什么我一直尝试图解 SVG，在之前的练习中也要求大家去画图的原因。画图能够帮助你去理解 SVG 的坐标系，理解每一个元素或者每一个属性在坐标系中是怎样体现出来的。所以希望大家在学习 SVG 的过程中，多去动手画图，最后达到能够“裸写” SVG 的境界！
