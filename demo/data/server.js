
var http = require("http"),
    url = require("url"),
    q = require("querystring"),
    nextUid = require("../../src/func/nextUid.js");


var allData = {};

function random(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function createFakeData() {
    var firstNames   = ['Ed', 'Tommy', 'Aaron', 'Abe', 'Jamie', 'Adam', 'Dave', 'David', 'Jay', 'Nicolas', 'Nige'],
        lastNames    = ['Spencer', 'Maintz', 'Conran', 'Elias', 'Avins', 'Mishcon', 'Kaneda', 'Davis', 'Robinson', 'Ferrero', 'White'],
        departments  = ['Engineering', 'Sales', 'Marketing', 'Managment', 'Support', 'Administration'],
        ratings      = [1, 2, 3, 4, 5],
        salaries     = [100, 400, 900, 1500, 1000000],
        noticePeriods= ['2 weeks', '1 month', '3 months'];

    var firstName   = firstNames[random(0, firstNames.length - 1)],
        lastName    = lastNames[random(0, lastNames.length - 1)],
        email       = firstName.toLowerCase() + '.' + lastName.toLowerCase() + '@whatever.com',
        rating      = random(0, ratings.length - 1),
        salary      = random(0, salaries.length - 1),
        department  = departments[random(0, departments.length - 1)],
        ageInYears  = random(23, 55),
        dob         = new Date(new Date().getFullYear() - ageInYears, random(0, 11), random(0, 31)),
        joinDate    = new Date(new Date() - random(60, 2000) * 1000 * 60 * 60 * 24),
        sickDays    = random(0, 10),
        holidayDays = random(0, 10),
        holidayAllowance = random(20, 40);

    return {
        employeeNo: nextUid(),
        rating: rating,
        salary: salary,
        forename: firstName,
        surname: lastName,
        email: email,
        department: department,
        dob: dob,
        joinDate: joinDate,
        sickDays: sickDays,
        holidayDays: holidayDays,
        holidayAllowance: holidayAllowance,
        noticePeriod: noticePeriods[random(0, noticePeriods.length - 1)]
    };


}

http.createServer(function(request, response){

    var u       = url.parse(request.url),
        qs      = q.parse(u.query),
        start   = parseInt(qs.start, 10) || 0,
        limit   = parseInt(qs.limit, 10) || 50,
        end     = start + limit,
        data    = [],
        cb      = qs.callback,
        i, r;

    if (start < 0) {
        start = 0;
    }

    for (i = start; i < end; i++) {
        if (!allData[i]) {
            allData[i] = createFakeData();
        }
        data.push(allData[i]);
    }

    r = JSON.stringify(data);

    if (cb) {
        r = cb + "(" + r + ")";
    }

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(r);

}).listen('3001', '0.0.0.0');