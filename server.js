var express = require('express')
  , request = require('request')
  , oauth2_client = require('oauth2-client')
  , ostatus = require('ostatus')
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
  if (req.session.user) {
    console.log(req.session.token);
    getAtomLinks(req.session.token, function(err, atom) {
      res.render('home', {user: req.session.user,
                          atom: atom});
    });
  } else {
    res.render('home', {user: req.session.user,
                        atom: {items:[]}});
  }
});

app.post('/user/login', function(req, res) {
  getOAuth2Endpoint(req.param('turbid'), function(err, endpoint) {
    if (err) {
      res.send('Error '+ err, 500);
      return;
    }
    for (var i in config.oauth2_client.servers) {
      if (i == endpoint) {
        return client.redirects_for_login(i, res, base_url +"/");
      }
    }
    res.send('Error 2', 500);
  });
});

app.listen(3000, function() {
    console.log("running on http://127.0.0.1:3000");
});

function getOAuth2Endpoint(id, callback) {
  ostatus.webfinger.lookup("acct:"+id, function(err, res) {
    if (err) return callback(err);
    for (var link in res.links) {
      if (res.links[link].rel == 'http://turbulences.com/oauth/core/2.0/endpoint/authorize') {
        return callback(null, res.links[link].href);
      }
    }
    return callback('no link found');
  });
}

function getAtomLinks(token, callback) {
  request.get({uri: 'https://auth.af83.com/portable_contacts/@me/@all',
               headers: {"Authorization" : "OAuth "+ token}},
              function(err, response, body) {
                console.log(body);
                var contacts = JSON.parse(body);
                contacts.entry.forEach(function(contact) {
                  if (Array.isArray(contact.rss)) {
                    ostatus.as.fromUrl(contact.rss[0].value, callback);
                  }
                });
              });
}
