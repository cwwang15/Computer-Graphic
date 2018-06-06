function vectorAdd(a, b) {
    var v = new Vector3();
    v.elements[0] = a.elements[0] + b.elements[0];
    v.elements[1] = a.elements[1] + b.elements[1];
    v.elements[2] = a.elements[2] + b.elements[2];
    return v;
}

function vectorMinus(a, b) {
    var v = new Vector3();
    v.elements[0] = a.elements[0] - b.elements[0];
    v.elements[1] = a.elements[1] - b.elements[1];
    v.elements[2] = a.elements[2] - b.elements[2];
    return v;
}

function vectorReverse(b) {
    var v = new Vector3();
    v.elements[0] = -b.elements[0];
    v.elements[1] = -b.elements[1];
    v.elements[2] = -b.elements[2];
    return v;
}

function vectorCopy(b) {
    var v = new Vector3();
    v.elements[0] = b.elements[0];
    v.elements[1] = b.elements[1];
    v.elements[2] = b.elements[2];
    return v;
}

function vectorLength(b) {

    var c = b.elements[0], d = b.elements[1], e = b.elements[2];
    return Math.sqrt(c * c + d * d + e * e);
}

function vectorDot(a, b) {
    return a.elements[0] * b.elements[0] + a.elements[1] * b.elements[1] + a.elements[2] * b.elements[2];
}

function vectorMultNum(a, n) {
    var v = new Vector3();
    v.elements[0] = a.elements[0] * n;
    v.elements[1] = a.elements[1] * n;
    v.elements[2] = a.elements[2] * n;
    return v;
}

function vectorCross(a, b) {
    var v = new Vector3();
    var x1 = a.elements[0];
    var y1 = a.elements[1];
    var z1 = a.elements[2];
    var x2 = b.elements[0];
    var y2 = b.elements[1];
    var z2 = b.elements[2];
    v.elements[0] = y1 * z2 - y2 * z1;
    v.elements[1] = z1 * x2 - z2 * x1;
    v.elements[2] = x1 * y2 - x2 * y1;
    return v;
}
