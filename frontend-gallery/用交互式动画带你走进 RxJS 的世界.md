mergeMap 等于 map + mergeAll: https://cloud.tencent.com/developer/article/1533003

```
import { timer } from "rxjs";
import { take } from "rxjs/operators";
//
// interval(1000)
//   .pipe(
//     take(4),
//     groupBy(v => v % 2 == 0),
//     mergeMap(group$ => {
//         console.log(group$,'group$')
//         return group$.pipe(tap(v => console.log(v)));
//     }),
//   )
//   .subscribe();
//
// const source1 = interval(2000).pipe(take(2));
// const source2 = interval(1000).pipe(take(5));
//
// const s$ = source1.pipe(
//   map(() => {
//     return source2;
//   }),
// );
//
// s$.pipe(mergeAll()).subscribe(console.log);

// const source1 = interval(2000).pipe(
//     take(2)
// );
// const source2 = interval(1000).pipe(
//     take(5)
// );
//
// source1.pipe(mergeMap(() => source2)).subscribe(console.log);
```