var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { user: req.session.user });
});

router.get('/index.html', function(req, res, next) {
  res.render('index', { user: req.session.user });
});

router.get('/first.html', function(req, res, next) {
  res.render('first', { user: req.session.user});
});

router.get('/learn', function(req, res, next) {
  res.render('learn/index', { user: req.session.user});
});
module.exports = router;
