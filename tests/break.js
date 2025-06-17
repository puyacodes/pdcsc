function test1() {
    let data = [10, 20, 30, 40];

    function find(x) {
        let index = 0;
        a: for (; index <= data.length;) {
            if (data[index++] == x)
                break a;
        }

        return index > data.length ? -1 : index;
    }

    console.log(find(10));
    console.log(find(20));
    console.log(find(30));
    console.log(find(40));
    console.log(find(50));
}

function test2() {

    function validate() {

    }
}