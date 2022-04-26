const binarySearch = (ar, el, compareFn, accessor) => {
  if (el[accessor] < ar[0][accessor]) {
    return 0;
  }
  if (el[accessor] > ar[ar.length - 1][accessor]) {
    return ar.length;
  }
  var m = 0;
  var n = ar.length - 1;
  while (m <= n) {
    var k = (n + m) >> 1;
    var cmp = compareFn(el, ar[k], accessor);
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return k;
    }
  }
  return -m - 1;
};

const comp = (a, b, accessor) => {
  return a[accessor] > b[accessor];
};

const reverseComp = (a, b, accessor) => {
  return a[accessor] < b[accessor];
};

module.exports = { binarySearch, comp, reverseComp };
