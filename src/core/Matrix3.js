

export default class Matrix3 {

  constructor() {

    this.m = [];

  }

  transpose() {
    var tmp, m = this.m;

    tmp = m[1]; m[1] = m[3]; m[3] = tmp;
    tmp = m[2]; m[2] = m[6]; m[6] = tmp;
    tmp = m[5]; m[5] = m[7]; m[7] = tmp;

    return this;

  }
}