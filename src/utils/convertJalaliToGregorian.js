const moment = require("jalali-moment");

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

module.exports = { convertJalaliToGregorian }