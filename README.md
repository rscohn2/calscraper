Get a client id from https://code.google.com/apis/console/. Select
client id for web applications.

Javascript origin is: http://localhost (doesn't matter?)
Redirect URIs are: http://localhost:5000/auth/callback and https://aqueous-peak-9810.herokuapp.com/auth/callback

When running the node server, Google clientid, secret, and redirect URI are provided by environment variables:

On Linux:

export CSCRAPE_CLIENT_ID=<get this from google api console>
export CSCRAPE_CLIENT_SECRET=<get this from google api console>
export CSCRAPE_REDIRECT_URI=http://localhost:5000/auth/callback

To deploy on heroku:

heroku config:set CSCRAPE_CLIENT_ID=<get this from google api console>
heroku config:set CSCRAPE_CLIENT_SECRET=<get this from google api console>
heroku config:set CSCRAPE_REDIRECT_URI=https://<heroku-app>.herokuapp.com/auth/callback

Commands
=========

All commands will use oauth to get access to the calendar. Oauth will
do a redirect when it is done to http:://localhost/ which will list
the calendars in the account

Show events in google calendar
https://localhost:5000/mit?cmd=list

Show events in MIT calendar
https://localhost:5000/mit?cmd=listSrc

Update the calendar
https://localhost:5000/mit?cmd=update
