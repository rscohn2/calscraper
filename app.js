var util = require('util');
var express  = require('express');
var gcal = require('google-calendar');

var mit = require('./routes/mit');

/*
  ===========================================================================
            Setup express + passportjs server for authentication
  ===========================================================================
*/

var app = express();
var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var port = process.env.PORT || 5000;

app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
});
app.listen(port);
console.log('listening on port: ' + port);

passport.use(new GoogleStrategy({
    clientID: process.env.CSCRAPE_CLIENT_ID,
    clientSecret: process.env.CSCRAPE_CLIENT_SECRET,
    callbackURL: process.env.CSCRAPE_REDIRECT_URI,
    scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar'] 
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    return done(null, profile);
  }
));

app.get('/mit', mit);

app.get('/auth',
  passport.authenticate('google', { session: false }));

app.get('/auth/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  function(req, res) { 
    req.session.access_token = req.user.accessToken;
      res.redirect('/mit?cmd=update');
      //res.redirect('/mit?cmd=listSrc');
  });


/*
  ===========================================================================
                               Google Calendar
  ===========================================================================
*/

app.all('/', function(req, res){
  
  if(!req.session.access_token) return res.redirect('/auth');
  
  //Create an instance from accessToken
  var accessToken = req.session.access_token;
  var google_calendar = new gcal.GoogleCalendar(accessToken);
  
  google_calendar.calendarList.list(function(err, data) {
    if(err) return res.send(500,err);
    return res.send(data);
  });
});

app.all('/:calendarId', function(req, res){
  
  if(!req.session.access_token) return res.redirect('/auth');
  
  //Create an instance from accessToken
  var accessToken     = req.session.access_token;
  var google_calendar = new gcal.GoogleCalendar(accessToken);
  var calendarId      = req.params.calendarId;
  
  google_calendar.events.list(calendarId, function(err, data) {
    if(err) return res.send(500,err);
    return res.send(data);
  });
});


app.all('/:calendarId/:eventId', function(req, res){
  
  if(!req.session.access_token) return res.redirect('/auth');
  
  //Create an instance from accessToken
  var accessToken     = req.session.access_token;
  var google_calendar = new gcal.GoogleCalendar(accessToken);
  var calendarId      = req.params.calendarId;
  var eventId         = req.params.eventId;
  
  google_calendar.events.get(calendarId, eventId, function(err, data) {
    if(err) return res.send(500,err);
    return res.send(data);
  });
});
