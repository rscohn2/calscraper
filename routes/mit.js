var async = require('async');
var googleCalendar = require('google-calendar');

var calendarId = 'ncqr7uo4nbkbd10qsmaj4v9gg8@group.calendar.google.com';

var fetchMIT = require('../lib/fetchMIT');

var listSrc = function(cb) {
    fetchMIT(function(data) {
        cb(null, data);
    })
};

var eventListPage = function(gcal, events, nextPage, cb) {
    gcal.events.list(calendarId, {pageToken: nextPage}, function(err, data) {
        if (err) return cb(err, events);
        events = events.concat(data.items);
        if (data.nextPageToken) {
            eventListPage(gcal, events, data.nextPageToken, cb);
        } else {
            cb(err, events);
        }
    });
}
    
var eventList = function(gcal, cb) {
    gcal.events.list(calendarId, {}, function(err, data) {
        if (err) return cb(err);
        var events = data.items;
        if (data.nextPageToken) {
            eventListPage(gcal, events, data.nextPageToken, cb);
        } else {
            cb(err, events);
        }
    });
}

var waitCalEmpty = function(gcal, cb) {
    eventList(gcal, function(err, events) {
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
        setTimeout(function() {waitCalEmpty(gcal, cb);}, 10000);
    });
}

var reset = function(gcal,cb) {
    console.log('Reset');
    wait = 2;
    eventList(gcal, function(err, events) {
        console.log('  deleting items: ' + events.length);
        // Should be possible to do in parallel, but node gets an error and stops
        async.eachSeries(events, 
                         function(item, cb) {
                             gcal.events.delete(calendarId, item.id, cb);
                         }, 
                         function(err) {
                             console.log('  issued delete requests');
                             if (err)
                                 return cb(err);
                             waitCalEmpty(gcal, cb);
                         });
    });
}

var check = function(gcal,cb) {
    console.log('  check');
    async.waterfall([
        function(cb) {eventList(gcal, cb);},
        function(events, cb) { 
            console.log('  # items: ' + events.length);
            cb();
        }], cb);
};

var update = function(gcal, cb) {
    console.log('Update');
    async.series([
        function(cb) { reset(gcal, cb); },
        function(cb) { populate(gcal, cb);},
        function(cb) { check(gcal, cb);},
    ], function(err) { 
        if (err) console.log('Error during update: ' + err);
        cb(err);
    });
}

var populate = function(gcal, cb) {
    console.log('  populate');
    var insert = function(data, cb) {
        console.log('  inserting events: ' + data.events.length);
        // Should be possible to do in parallel, but node gets an error and stops
        async.eachSeries(data.events,
                         function(event, cb) {
                             //console.log('INSERTING: ' + JSON.stringify(event));
                             gcal.events.insert(calendarId, event, cb);
                         },
                         cb);
    };
        
    async.waterfall([
        fetchMIT,
        insert
    ], cb);
}
        
module.exports = function(req, res) {    
    if (process.env.ACCESS_TOKEN)
        req.session.access_token = process.env.ACCESS_TOKEN;
    if(!req.session.access_token) return res.redirect('/auth');
    //console.log(JSON.stringify(req.session.access_token));
    var gcal = new googleCalendar.GoogleCalendar(req.session.access_token);
    var cb = function(err, data) {
        if (err) return res.send(500,err);
        return res.send(data || 'OK');
    }

    switch (req.query.cmd) {
    case 'reset':
        reset(gcal, cb);
        break;
    case 'update':
        update(gcal, 
               function(err) {
                   console.log('  update done');
                   if (err) console.log('  error in update: ' + err);
               });
        cb();
        break;
    case 'listSrc':
        listSrc(cb);
        break;
    case 'list':
    default:
        eventList(gcal, cb);
        break;
    }
}
