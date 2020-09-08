function isObject(data) {
  return Array.prototype.toString.call(data) === "[object Object]";
}

function cloneDeep(data) {
  const final = {};

  if (!isObject(data)) {
    return;
  }

  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      if (isObject(data[key])) {
        final[key] = cloneDeep(data[key]);
      } else {
        final[key] = data[key];
      }
    }
  }

  return final;
}

function cloneDeep1() {

}

const oa = {
  a: 1,
  b: {
    b1: "b1",
    b2: "b2",
    b3: {
      b333: "b33"
    }
  }
};
// const ob = {
//   ...oa
// }
const ob = cloneDeep(oa);

oa.b.b1 = { b11: "1" };
console.log(oa);
console.log(ob);
