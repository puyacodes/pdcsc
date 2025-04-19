// const moment = require("moment");
const moment = require("jalali-moment");

function reformat(d, l) {
    let year = parseInt(d.substring(0, 4));
    let month = parseInt(d.substring(4, 6));
    let day = parseInt(d.substring(6, 8));
    let hour = parseInt(d.substring(8, 10) || "0");
    let minute = parseInt(d.substring(10, 12) || "0");
    let second = parseInt(d.substring(12, 14) || "0");

    console.log({ year, month, day, hour, minute, second })

    let date = moment(`${year}-${month}-${day}`).toDate();

    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(second);

    return date;
}
function convertJalaliToGregorian(jalaliDateStr) {
    let year = parseInt(jalaliDateStr.substring(0, 4));
    let month = parseInt(jalaliDateStr.substring(4, 6));
    let day = parseInt(jalaliDateStr.substring(6, 8));
    let hour = parseInt(jalaliDateStr.substring(8, 10) || "0");
    let minute = parseInt(jalaliDateStr.substring(10, 12) || "0");
    let second = parseInt(jalaliDateStr.substring(12, 14) || "0");

    let gregorianDate = moment(`${year}-${month}-${day}`, 'jYYYY-jMM-jDD').toDate();

    gregorianDate.setHours(hour);
    gregorianDate.setMinutes(minute);
    gregorianDate.setSeconds(second);

    return gregorianDate;
}
function extractDateFromString(inputString) {
    try {
        let date;
        const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/;
        const match = inputString.match(regex);

        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const hour = parseInt(match[4], 10);
            const minute = parseInt(match[5], 10);
            const second = match[6] ? parseInt(match[6], 10) : 0;

            date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            console.log({ date })
            const formattedDate = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');

            return formattedDate;
        }
    } catch (ex) {
        console.log("Extracting date error", ex);
    }
}

const d = "14031230143629"
// const d2 = moment(d).locale("fa").format("YYYYMMDDHHmmss");
// console.log(convertJalaliToGregorian(d));
console.log(extractDateFromString(d));