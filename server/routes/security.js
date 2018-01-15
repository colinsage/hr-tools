var express = require('express');
var router = express.Router();

var config = require('../conf')
var dev = config.dev;


router.all('/*', function(req, res, next) {
    if(req.session.login){
        console.log('url:' + req.path+ '; session_login:' + req.session.login +';email='+req.session.user.email);
    }

    if(config.mode === "debug" || req.session.login == '1'  || req.path.indexOf('/outer')  == 0){
        if( config.mode === "debug" && req.session.login == '0'  ){
            req.session.user={
                name:dev.name,
                email:dev.email,
                pass:dev.pass,
                email_pass:dev.email_pass,
                is_admin:true
            }
        }
        next();
    }else{
        return res.redirect("/outer/login.html");
    }

});

module.exports = router;
