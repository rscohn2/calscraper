var request = require('request');
var mustache = require('mustache');

var fields = [
    'date',
    'beginTime',
    'endTime',
    'recurring',
    'title',
    'description',
    'room',
    'locationExtended',
    'categories',
    'sponsor',
    'u1',
    'tickets',
    'cost',
    'openTo',
    'speaker',
    'contactName',
    'webSite',
    'email',
    'phone'
];

var makeJSON = function(data) {
    var rawEvents = data.split('\n');
    var cal = {events: []};
    for (var i = 0; i < rawEvents.length; i++) {
        var rawEvent = rawEvents[i].split('\t');
        var event = {};
        cal.events.push(event);
        for (var j = 0; j < rawEvent.length; j++) {
            event[fields[j]] = rawEvent[j];
        }
    }
    return cal;
}
    
var fetchData = function(cb) {
    var start = new Date();
    var end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 1);
    var obj = {
        startDay: start.getDate(),
        startMonth: start.getMonth() + 1,
        startYear: start.getFullYear(),
        endDay: end.getDate(),
        endMonth: end.getMonth() + 1,
        endYear: end.getFullYear(),
    };
    var uri = mustache.render('http://events.mit.edu/searchresults-tab.html?fulltext=&andor=and&start.month={{startMonth}}&start.day={{startDay}}&start.year={{startYear}}&end.month={{endMonth}}&end.day={{endDay}}&end.year={{endYear}}&sponsors%3A0=&_search=Search', obj);
    console.log(uri);

    request({uri: uri}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            cb(makeJSON(body));
        }
    });
}

fetchData(function(cal) {
    console.log(JSON.stringify(cal));
});
