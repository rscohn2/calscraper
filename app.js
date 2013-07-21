var util = require('util');
var express  = require('express');
var gcal = require('./routes/gcal');

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

app.get('/auth',
  passport.authenticate('google', { session: false }));

app.get('/auth/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  function(req, res) { 
    req.session.access_token = req.user.accessToken;
      res.redirect('/gcal?cal=nec&cmd=update');
      //res.redirect('/gcal?cal=nec&cmd=listSrc');
      //res.redirect('/gcal?cal=test&cmd=update');
      //res.redirect('/gcal?cal=test&cmd=listSrc');
  });


/*
  ===========================================================================
                               Google Calendar
  ===========================================================================
*/

app.all('/gcal', gcal);

