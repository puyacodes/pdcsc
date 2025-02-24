const { Exception } = require("@locustjs/exception");

class E1 extends Exception {
    constructor(e) {
        super('Error happend at f1', e)
    }
}
class E2 extends Exception {
    constructor(e) {
        super('Error happend at f2', e)
    }
}
class E3 extends Exception {
    constructor(e) {
        super('Error happend at f3', e)
    }
}

function f0(a) {
    console.log(a.name)
}
function f1(a) {
    try {
        f0(a)
    } catch (e) {
        throw new E1(e)
    }
}
function f2(a) {
    try {
        f1(a)
    } catch (e) {
        throw new E2(e)
    }
}
function f3(a) {
    try {
        f2(a)
    } catch (e) {
        throw new E3(e)
    }
}

try {
    f3();
} catch (e) {
    console.log(e)
    console.log(JSON.stringify(e, null, 4))
}