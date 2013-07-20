var async = require('async');
var googleCalendar = require('google-calendar');
var days = 8;

var calendars = {
    mit: {
        id: 'ncqr7uo4nbkbd10qsmaj4v9gg8@group.calendar.google.com',
        fetch: require('../lib/fetchMIT')
    },
    test: {
        id: 'o8pt90810godrvn91e81u0568g@group.calendar.google.com',
        fetch: require('../lib/fetchMIT')
    }        
};

var calError = function(res) {
    var cals = null;
    for (k in calendars) {
        if (!cals)
            cals = k;
        else
            cals += '|' + k;
    }
    res.send(500, 'Must specify a calendar: ?cal=[' + cals + ']');
}

var eventListPage = function(calendar, gcal, events, nextPage, cb) {
    gcal.events.list(calendar.id, {pageToken: nextPage}, function(err, data) {
        if (err) return cb(err, events);
        events = events.concat(data.items);
        if (data.nextPageToken) {
            eventListPage(calendar, gcal, events, data.nextPageToken, cb);
        } else {
            cb(err, events);
        }
    });
}
    
var eventList = function(calendar, gcal, cb) {
    gcal.events.list(calendar.id, {}, function(err, data) {
        if (err) return cb(err);
        var events = data.items;
        if (data.nextPageToken) {
            eventListPage(calendar, gcal, events, data.nextPageToken, cb);
        } else {
            cb(err, events);
        }
    });
}

var waitCalEmpty = function(calendar, gcal, cb) {
    eventList(calendar, gcal, function(err, events) {
        if (err)
            cb(err);
        console.log('  items left: ' + events.length);
        if (events.length == 0) {
            return cb();
        }
        wait--;
        if (wait == 0)
            return cb('error deleting');
        console.log('  scheduling another wait');
        setTimeout(function() {waitCalEmpty(calendar, gcal, cb);}, 10000);
    });
}

var reset = function(calendar, gcal,cb) {
    console.log('Reset');
    wait = 2;
    eventList(calendar, gcal, function(err, events) {
        console.log('  deleting items: ' + events.length);
        // Should be possible to do in parallel, but node gets an error and stops
        async.eachSeries(events, 
                         function(item, cb) {
                             gcal.events.delete(calendar.id, item.id, cb);
                         }, 
                         function(err) {
                             console.log('  issued delete requests');
                             if (err)
                                 return cb(err);
                             waitCalEmpty(calendar, gcal, cb);
                         });
    });
}

var check = function(calendar, gcal,cb) {
    console.log('  check');
    async.waterfall([
        function(cb) {eventList(calendar, gcal, cb);},
        function(events, cb) { 
            console.log('  # items: ' + events.length);
            cb();
        }], cb);
};

var update = function(calendar, gcal, cb) {
    console.log('Update');
    async.series([
        function(cb) { reset(calendar, gcal, cb); },
        function(cb) { populate(calendar, gcal, cb);},
        function(cb) { check(calendar, gcal, cb);},
    ], function(err) { 
        if (err) console.log('Error during update: ' + err);
        cb(err);
    });
}

var populate = function(calendar, gcal, cb) {
    console.log('  populate');
    var insert = function(data, cb) {
        console.log('  inserting events: ' + data.events.length);
        // Should be possible to do in parallel, but node gets an error and stops
        async.eachSeries(data.events,
                         function(event, cb) {
                             //console.log('INSERTING: ' + JSON.stringify(event));
                             gcal.events.insert(calendar.id, event, cb);
                         },
                         cb);
    };
        
    async.waterfall([
        function(cb) {calendar.fetch(days, cb);},
        insert
    ], cb);
}
        
module.exports = function(req, res) {    
    if(!req.session.access_token) return res.redirect('/auth');

    var gcal = new googleCalendar.GoogleCalendar(req.session.access_token);
    if (!req.query.cal)
        return calError(res);
    var calendar = calendars[req.query.cal];
    if (!calendar)
        return calError(res);
    var cb = function(err, data) {
        if (err) return res.send(500,err);
        return res.send(data || 'OK');
    }

    switch (req.query.cmd) {
    case 'reset':
        reset(calendar, gcal, cb);
        break;
    case 'update':
        update(calendar, gcal, 
               function(err) {
                   console.log('  update done');
                   if (err) console.log('  error in update: ' + err);
               });
        cb();
        break;
    case 'listSrc':
        calendar.fetch(cb);
        break;
    case 'list':
    default:
        eventList(calendar, gcal, cb);
        break;
    }
}
