TS Codegen

1. 如何优雅的传递 parentKey 和 propertyKey，用以生成 enum 的名字？

    - 可以通过为 Schema 对象增加属性的方式
    - 通过为对象增加属性，可以逐级传递 context

2. 在写入 enum 时，用 writeTo 方法和直接传入一个用于写入 result 对象的区别？

    - 解耦，让职责更单一。原来依赖了一个 result 对象，SchemaResolver.resolve 方法既要负责解析 schema，又要负责写入 result。
    - 通过 writeTo 方法，SchemaResolver 不再负责写入 result 的逻辑，把这部分逻辑通过 callback 交给外部，让 SchemaResolver 的职责变得更加单一。
    - 依赖反转。原来是直接依赖于外部传递的 result 对象，现在则是只负责通过 writeTo 将「数据」吐出去，至于外部怎么使用，内部不再关心。
