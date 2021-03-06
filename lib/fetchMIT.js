var request = require('request');
var mustache = require('mustache');
var tz = require('timezone');
var us = tz(require("timezone/America"));

var fields = [
    'date',
    'beginTime',
    'endTime',
    'recurring',
    'summary',
    'description',
    'room',
    'locationExtended',
    'categories',
    'sponsor',
    'u1',
    'tickets',
    'cost',
    'invited',
    'speaker',
    'contact',
    'webSite',
    'email',
    'phone'
];

var formatLocation = function(event) {
    var l = event.room;
    if (event.locationExtended != '')
        l += ' ' + event.locationExtended;
    return l
}

var addLabeledItem = function(event, item) {
    if (event[item] != '') return item + ': ' + event[item] + '\n';
    else return '';
}

var addItem = function(event, item) {
    if (event[item] != '') return event[item] + '\n';
    else return '';
}

var formatDescription = function(event) {
    var d = event.description + '\n\n';
    d += addLabeledItem(event, 'speaker');
    d += addLabeledItem(event, 'invited');
    d += addLabeledItem(event, 'cost');
    d += addLabeledItem(event, 'tickets');
    d += '\n';
    d += addLabeledItem(event, 'categories');
    d += addItem(event, 'contact');
    d += addItem(event, 'email');
    d += addItem(event, 'phone');
    d += addItem(event, 'webSite');
    //console.log(d);
    return d;
}

var months = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12'
};

var formatDate = function(date, time, fence) {
    //console.log('Got: ' + date + ' ' + time);
    var d = date.split(' ');
    var t = time.split(' ');
    var time = t[0];
    var ampm = t[1];
    var t2 = time.split(':');
    var hour = t2[0];
    var minutes = t2[1];
    // 0 pad
    if (hour.length < 2) hour = '0' + t[0];
    // mod 12 now, add 12 for PM later
    if (hour == '12') hour = '00';
    var ds = d[3] + '-' + months[d[2]] + '-' + d[1] + ' ' + hour + ':' + minutes;
    //console.log('date string: ' + ds);
    var date24 = us(ds,'America/New_York');
    // Convert to 24 hour clock
    if (t[1] == 'pm')
        date24 = tz(date24, '+12 hours');
    // If the end time is before the beginning, assume it is next day
    // e.g. start 11:00 PM, end 12:00 AM
    if (fence && tz(fence) > date24) {
        date24 = tz(date24, '+24 hours');
    }
    var dateString = tz(date24, '%FT%T%^z');
    //console.log('  ' + dateString);
    return {dateTime: dateString};
}

var eventContains = function(event, item, contains) {
    if (event[item] && event[item].match(contains))
        return true;
    return false;
}

var makeJSON = function(data) {
    var rawEvents = data.trim().split('\n');
    var cal = {events: []};
    for (var i = 0; i < rawEvents.length; i++) {
        //console.log('raw: ' + rawEvents[i]);
        var rawEvent = rawEvents[i].split('\t');
        var mitEvent = {};
        for (var j = 0; j < rawEvent.length; j++) {
            mitEvent[fields[j]] = rawEvent[j];
        }
        // Don't include exhibits
        if (eventContains(mitEvent, 'categories', 'exhibits'))
            continue;
        var start = formatDate(mitEvent.date,  mitEvent.beginTime);
        var end = formatDate(mitEvent.date,  mitEvent.endTime, start.dateTime);
        var event = {
            summary: mitEvent.summary,
            description: formatDescription(mitEvent),
            location: formatLocation(mitEvent),
            start: start,
            end: end
        };
        if (eventContains(mitEvent, 'description', 'reception|food|refreshments|dinner|lunch'))
            event.colorId = 11;
        //console.log(mitEvent.date + ' : ' + mitEvent.summary);
        cal.events.push(event);
    }
    return cal;
}
    
var fetchData = function(days, cb) {
    var start = new Date();
    var end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * days);
    var obj = {
        startDay: start.getDate(),
        startMonth: start.getMonth() + 1,
        startYear: start.getFullYear(),
        endDay: end.getDate(),
        endMonth: end.getMonth() + 1,
        endYear: end.getFullYear(),
    };
    var uri = mustache.render('http://events.mit.edu/searchresults-tab.html?fulltext=&andor=and&start.month={{startMonth}}&start.day={{startDay}}&start.year={{startYear}}&end.month={{endMonth}}&end.day={{endDay}}&end.year={{endYear}}&sponsors%3A0=&_search=Search', obj);
    //console.log(uri);

    request({uri: uri}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var j = makeJSON(body);
            //console.log('json events: ' + JSON.stringify(j));
            cb(null, j);
        } else cb(error);
    });
}
module.exports = fetchData;

//var sample = 'Sunday 07 July 2013	11:00 pm	12:00 am	(recurring)	Registration open for Your Enlightened Side workshop (Yesplus)	Registration is now open for a retreat-style meditation workshop July 10 through July 14. The workshop is called yesplus, and it is an amazing, vibrant experience, but also deeply relaxing.  It also teaches you enduring tools that you take with you - like breathing practices, yoga postures, and compassionate perspectives - which help you to be more in tune with yourself and others.   People in over 150 countries who have taken yesplus and its sister workshops have reported the following benefits:    Decreased stress and anxiety    Strengthened leadership skills    Improved productivity    Enhanced memory and concentration    Deeper sleep    Improved relationshipsMore details can be found at http://yesplusmit.eventbrite.com/			MIT events/clubs: social; career development: personal development; MIT events/clubs: interest clubs/groups	Art of Living				the public		Alison Takemura	http://yesplusmit.eventbrite.com/	alimura@mit.edu	626-487-8543';


var sample = 'Sunday 07 July 2013	11:00 pm	12:00 am		description	E51		MIT events/clubs: social	Persian Students Association of MIT; GSC Activities			5$ for MIT affiliates, MIT affiliates may buy tickets for family and friends at a cost of 10$	MIT-only		Poorya Hosseini		persian-officers@mit.edu';

//console.log(JSON.stringify(makeJSON(sample)));

/*
fetchData(function(data) {
    console.log(data);
});
*/
