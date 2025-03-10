const { Exception } = require("@locustjs/exception");
const ex = new Exception('an error happened')

console.log(ex)
console.log(ex.message)
console.log(ex.toString())