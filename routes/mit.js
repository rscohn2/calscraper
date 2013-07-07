var async = require('async');
var googleCalendar = require('google-calendar');
var calendarId = "lldb7h5rn85o734jqi4p1i97ns@group.calendar.google.com";

var fetchMIT = require('../lib/fetchMIT');

/*
exports.json = function(req, res) {
    fetchMIT(function(data) {
        res.send(data);
    });
}

var updateGcal = function(accessToken, data, cb) {
    //Create an instance from accessToken
    var gcal = new gcal.GoogleCalendar(accessToken);

    gcal.events.quickAdd(calendarId, 'some text', function(err, data) {
        if(err) return cb(err);
        cb(err);
    });
}

exports.update = function(req, res) {
    if(!req.session.access_token) return res.redirect('/auth');

    fetchMIT(function(data) {
        updateGcal(req.session.access_token, data, function(err) {
            if (err) return res.send(500,err);
            return res.send('OK');
        });
    });
}
*/
var list = function(gcal,cb) {
    gcal.events.list(calendarId, {}, cb);
};

var listSrc = function(cb) {
    fetchMIT(function(data) {
        cb(null, data);
    })
};

var reset = function(gcal,cb) {
    gcal.events.list(calendarId, {}, function(err, data) {
        async.each(data.items, 
                   function(item, cb) {
                       gcal.events.delete(calendarId, item.id, cb);
                   }, 
                   cb);
    });;
}

var update = function(gcal, cb) {
    reset(gcal, function(err) {
        if (err) return cb(err);
        fetchMIT(function(data) {
            //data.events = [data.events[0]];
            async.each(data.events,
                       function(event, cb) {
                           gcal.events.insert(calendarId, event, cb);
                       },
                       cb);
        });
    });
}
        
module.exports = function(req, res) {    
    if (process.env.ACCESS_TOKEN)
        req.session.access_token = process.env.ACCESS_TOKEN;
    if(!req.session.access_token) return res.redirect('/auth');
    console.log(JSON.stringify(req.session.access_token));
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
                   if (err) return cb(err);
                   else list(gcal, cb);
               });
        break;
    case 'listSrc':
        listSrc(cb);
        break;
    case 'list':
    default:
        list(gcal, cb);
        break;
    }
}
