var express = require('express')
  , request = require('request')
  , oauth2_client = require('oauth2-client')
  , webfinger = require('webfinger')
 ;

var base_url = 'http://127.0.0.1:3000';
var config = {
  oauth2_client: {
    client: {
      base_url: base_url,
      process_login_url: '/login/process/',
      redirect_uri: base_url + '/login/process/',
      login_url: '/login',
      logout_url: '/logout',
      default_redirection_url: '/',
    },
    default_server: "auth_server",
    servers: {
      "auth_server": {
        server_authorize_endpoint: 'http://localhost:7070/oauth2/authorize',
        server_token_endpoint: 'http://localhost:7070/oauth2/token',

        client_id: "4d9337046fbf419313000004", // TODO: define this before running
        client_secret: 'some secret string'
      }
    }
  }
};

var oauth2_client_options = {
  "auth_server": {
    // To get info from access_token and set them in session
    treat_access_token: function(access_token, req, res, callback) {
      request.get({uri: 'http://localhost:7070/portable_contacts/@me/@self',
                   headers: {"Authorization" : "OAuth "+ access_token.token.access_token}},
                  function(err, response, body) {
                    var info = JSON.parse(body);
                    req.session.user = info.entry;
                    callback();
                  });
    }
  }
};

var client = oauth2_client.createClient(config.oauth2_client, oauth2_client_options);

var app = express.createServer(
    express.static(__dirname + '/public'),
    express.logger(),
    express.bodyParser(),
    express.cookieParser(),
    express.session({ secret: "klhs34654d67lu6gh" }),
    client.connector()
);

app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('home', {user: req.session.user});
});

app.post('/user/login', function(req, res) {
  console.log(req.param('turbid'));
  var wf = new webfinger.WebFingerClient();
  wf.finger(req.param('turbid'), function(err, xrdObj) {
    if (err) {
      console.error(err);
      return res.send('Error', 500);
    }
    var oauth2Links = xrdObj.getLinksByRel("http://oauth.net/core/2.0/endpoint/authorize");
    if (oauth2Links.length < 1) {
      return res.send('No oauth2 endpoint found.')
    }
    return res.send('Yeah !')
  });
});

app.listen(3000, function() {
    console.log("running on http://127.0.0.1:3000");
});
