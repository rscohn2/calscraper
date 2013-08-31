var fs = require('fs');
var async = require('async');
var jsdom = require('jsdom');
var mustache = require('mustache');
var tz = require('timezone');
var us = tz(require("timezone/America"));

var jquery = fs.readFileSync('public/javascripts/jquery-1.10.2.min.js').toString();

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

var addDate = function(event, date, time, am) {
    var d = date.split(/[\s,]+/);
    var day = d[1];
    if (day.length < 2) day = '0' + day;
    var t2 = time.split(':');
    var hour = t2[0];
    var minutes = t2[1];
    // 0 pad
    if (hour.length < 2) hour = '0' + hour;
    // mod 12 now, add 12 for PM later
    if (hour == '12') hour = '00';
    var ds = d[2] + '-' + months[d[0]] + '-' + day + ' ' + hour + ':' + minutes;
    //console.log('  date string: ' + ds);
    var date24 = us(ds,'America/New_York');
    // Convert to 24 hour clock
    if (!am)
        date24 = tz(date24, '+12 hours');
    var endDate = tz(date24, '+1 hours');
    // If the end time is before the beginning, assume it is next day
    // e.g. start 11:00 PM, end 12:00 AM
    var startString = tz(date24, '%FT%T%^z');
    var endString = tz(endDate, '%FT%T%^z');
    event.start = {dateTime: startString};
    event.end = {dateTime: endString};
};

var extractDetail = function(detail, text) {
    var m = text.match(detail + ':</span>([^]+)');
    if (m) return quote(m[1]);
    return null;
}

var quote = function(str) {
    return str.replace(/[^\x00-\x7F]/g,'');
    //return str.replace(/[–'’`"]/g,'');
}

var getEvent = function(url, cb) {
    //console.log('Fetch: ' + url);
    var opt = {
        //file: 'examples/nec-detail2.html',
        url: url, 
        //proxy: process.env.http_proxy,
        src: [jquery],
        done: function(errors, window) {
            //console.log('Got url: ' + url);
            var event = {
                description: quote(window.$('.event-description').text() + '\n' + url),
                summary: quote(window.$('h1').text())
            };

            var fields = window.$('.event-detail');
            for (var i = 0; i < fields.length; i++) {
                var text = fields[i].innerHTML;
                //console.log('fields: ' + text);
                var d = extractDetail('Date', text);
                if (d) {
                    var date = d.match('[A-Z][a-z]+ [0-9]+, [0-9]+');
                    var time = d.match('[0-9]+:[0-9]+');
                    var am = !!d.match('[0-9]+:AM');
                    addDate(event, date[0],time[0], am);
                }
                var price = extractDetail('Price', text);
                if (price)
                    event.description += '\nPrice: ' + price;
                if (!event.location) event.location = extractDetail('Location', text);
            }
            cb(errors, event);
        }};
    jsdom.env(opt);
}

var getEvents = function(eventURLs, cb) {
    var done = function(err, events) {
        var cal = {events: events};
        cb(err, cal);
    };
    async.mapSeries(eventURLs, getEvent, done);
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
    var uri = mustache.render('http://necmusic.edu/calendar_search/from/{{startYear}}-{{startMonth}}-{{startDay}}/to/{{endYear}}-{{endMonth}}-{{endDay}}',obj);
    var opt = {
        url: uri, 
        //proxy: process.env.http_proxy,
        //file: 'examples/nec-list.html',
        src: [jquery],
        done: function(errors, window) {
            var eventURLs = window.$.makeArray(window.$(".list-description > a").map(function(index, elem) { return elem.href; }));
            getEvents(eventURLs, cb);
        }};
    jsdom.env(opt);
}

module.exports = fetchData;

//var sampleURLs = ['http://necmusic.edu/metropolitan-flute-festival-orchestra-long'];
//var sampleURLs = ['http://necmusic.edu/metropolitan-flute-festival-orchestra-long','http://necmusic.edu/sounds-shakespeare-10'];
var sampleURLs = ['examples/nec-detail2.html'];

//getEvent('', function(err, data) {console.log(JSON.stringify(data));});
//fetchData(7, function(err, data) {console.log(JSON.stringify(data));});

//console.log(JSON.stringify(formatDate('July 21, 2013', '5:00', false)));

//console.log(quote("a''b"))

