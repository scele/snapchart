var fs            = require('fs'),
    express       = require('express'),
    bodyParser    = require('body-parser'),
    cookieSession = require('cookie-session'),
    tmp           = require('tmp'),
    gm            = require('gm').subClass({imageMagick: true}),
    _             = require('lodash');

var VERSION = '1.0';
var app = express();
var port = process.env.PORT || 80;

//var databaseUrl = "127.0.0.1/pivotchart.production";
//var collections = ["workspaces"]
//var mongojs = require("mongojs");
//var db = mongojs.connect(databaseUrl, collections);

var secret = fs.readFileSync('.secret').toString();
console.log('Cookie secret: ' + secret);

function host(req) {
  return req.protocol + '://' + (process.env.HOST || req.get('host'));
}

var clientBase = __dirname + '/..';
app.use('/dist', express.static(clientBase + '/dist'));
app.use('/src', express.static(clientBase + '/src'));
app.use('/fonts', express.static(clientBase + '/fonts'));

app.use(cookieSession({secret: secret}));
app.use(bodyParser());

app.get('/', function(req, res) { res.sendfile('index.html'); });
app.get('/d/version', function(req, res) {
  res.json({
    version: VERSION,
  });
});

app.post('/d/chart.png', function (req, res, next) {
  tmp.file(function (err, path, fd) {
    if (err) throw err;
    var buf = new Buffer(req.body.svg);
    // gm(buf, 'chart.svg').stream('png', function(err, stdout, stderr) {
    gm(buf, 'chart.svg').setFormat('png').write(path, function (err) {
      console.log('err=' + err);
      if (err) next(err);
      req.session.pngFilePath = path;
      console.log('POST ' + req.session);
      res.redirect('/d/chart.png');
    });
  });
});

app.get('/d/chart.png', function (req, res, next) {
  res.set('Content-Type', 'application/octet-stream');
  console.log('GET ' + req.session);
  res.sendfile(req.session.pngFilePath);
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Error.');
});

app.listen(port);
console.log('Listening on port ' + port);
