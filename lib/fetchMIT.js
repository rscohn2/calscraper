var request = require('request');
var mustache = require('mustache');

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

var formatDate = function(date, time) {
    return {dateTime: new Date(date + ' ' + time)};
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
        var rawEvent = rawEvents[i].split('\t');
        var mitEvent = {};
        for (var j = 0; j < rawEvent.length; j++) {
            mitEvent[fields[j]] = rawEvent[j];
        }
        // Don't include exhibits
        if (eventContains(mitEvent, 'categories', 'exhibits'))
            continue;
        var event = {
            summary: mitEvent.summary,
            description: formatDescription(mitEvent),
            location: formatLocation(mitEvent),
            start: formatDate(mitEvent.date,  mitEvent.beginTime),
            end: formatDate(mitEvent.date,  mitEvent.endTime)
        };
        if (eventContains(mitEvent, 'description', 'reception|food|refreshments|dinner|lunch'))
            event.colorId = 11;
        //console.log(mitEvent.date + ' : ' + mitEvent.summary);
        cal.events.push(event);
    }
    return cal;
}
    
var fetchData = function(cb) {
    var start = new Date();
    var end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 7);
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
            cb(makeJSON(body));
        }
    });
}
module.exports = fetchData;

var sample = 'Sunday 07 July 2013	12:00 am	12:00 am	(recurring)	Registration open for Your Enlightened Side workshop (Yesplus)	Registration is now open for a retreat-style meditation workshop July 10 through July 14. The workshop is called yesplus, and it is an amazing, vibrant experience, but also deeply relaxing.  It also teaches you enduring tools that you take with you - like breathing practices, yoga postures, and compassionate perspectives - which help you to be more in tune with yourself and others.   People in over 150 countries who have taken yesplus and its sister workshops have reported the following benefits:    Decreased stress and anxiety    Strengthened leadership skills    Improved productivity    Enhanced memory and concentration    Deeper sleep    Improved relationshipsMore details can be found at http://yesplusmit.eventbrite.com/			MIT events/clubs: social; career development: personal development; MIT events/clubs: interest clubs/groups	Art of Living				the public		Alison Takemura	http://yesplusmit.eventbrite.com/	alimura@mit.edu	626-487-8543\
Sunday 07 July 2013	9:00 am	6:00 pm		Trip to Stage Fort Park	After many rainy days, it is the time to welcome sunny Boston; here is our plan to do just that. Lets spend a day full of fun, game, and laugh in Stage Fort Park in Gloucester, MA (a 50-min drive from MIT). Lunch, snacks, beverages, and transportation will be provided by Persian Student Association (PSA). To buy your tickets, contact Setareh Borjian (st.borjian@gmail.com)We will leave from 60 Wadsworth St., Cambridge (Eastgate housing) at 9:00 am sharp on Sunday, July 7th. Do you have a car? Great! Give a ride to others and get $30 in cash for your favor and the compensation for gas. Persian Students Association at MIT Contact us via persian-officers@mit.edu	E51		MIT events/clubs: social	Persian Students Association of MIT; GSC Activities			5$ for MIT affiliates, MIT affiliates may buy tickets for family and friends at a cost of 10$	MIT-only		Poorya Hosseini		persian-officers@mit.edu';

//console.log(JSON.stringify(makeJSON(sample)));

/*
fetchData(function(data) {
    console.log(data);
});
*/
