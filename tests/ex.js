const { Exception } = require("@locustjs/exception");
const ex = new Exception('an error happened')

// console.log(ex)
// console.log(ex.message)
// console.log(ex.toString())
// console.log(JSON.stringify(f(), null, 4))
console.log(f('this is an error'))

function f(msg) {
    let _stack;
    let _message = msg
    try {
        let temp = {};
        Error.captureStackTrace(temp, f);
        _stack = temp.stack;
  
        if (_stack.startsWith("Error\n")) {
          _stack = _message + "\n" + _stack.substr(7);
        }
      } catch {}
      return _stack;
}