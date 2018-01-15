var express = require('express');
var router = express.Router();
var fs = require('fs');
var crypto = require('crypto');
var mysql = require('mysql');
var config = require('../conf')
var datasource = require('../dao/datasource')

var conn  = datasource.my_conn;
var secret = config.secret;
var admins = config.admin;

router.get('/edit.html', function(req, res, next) {
  res.render('user/edit', { user: req.session.user });
});

router.get('/reset.html', function(req, res, next) {
    res.render('user/reset', { user: req.session.user });
});

router.get('/logout.html', function(req, res, next) {
    req.session.login= '0';
    req.session = null;
    return res.redirect("/outer/login.html");
});

function isAdmin(email){
    for(var i=0; i< admins.length;i++){
        if(email == admins[i]){
            return true;
        }
    }
    return false;
}
//重置密码
router.post('/resetpw.do', function(req, res, next) {
    var cur_user = req.session.user.email;
    if(!isAdmin(cur_user)){
        return res.redirect('/index.html');
    }

    var email = req.body.email
    var pass = getFinePass(config.default_pass);

    conn.query('update hr_account set pass=? where email=?',[pass,email], function(error, re){
        if(error){
            console.log(error);
            return res.redirect('/index.html');
        }else{
            if(email == req.session.user.email){
                req.session.user.pass = config.default_pass;
            }
            return  res.render("user/reset", {
                user: req.session.user,
                "info":"重置成功"
            })
        }
    });

});

router.post('/save.do', function(req, res, next) {
    console.log(req.body.name, req.body.pass);
    var name = req.body.name
    var pass = getFinePass(req.body.pass);
    var email = req.session.user.email;
    var email_pass = getFinePass(req.body.email_pass);

    conn.query('update hr_account set name=?,pass=?,email_pass=? where email=?',[name,pass,email_pass, email], function(error, re){
        if(error){
            console.log(error);
        }else{
            req.session.user.name=name;
            req.session.user.pass=req.body.pass;
            req.session.user.email_pass = req.body.email_pass
            return  res.redirect("/index.html")
        }
    });

});
/**
登录 与 登出
不受权限检查
**/

/* GET users listing. */
router.post('/login.do', function(req, res, next) {
    var user = req.body.user
    var pass = getFinePass(req.body.pass);

    conn.query('select * from hr_account where email=?',[user], function(err, rows){
        if(err){
            console.log(err);
        }else{
           // console.log(rows);
            if(rows.length > 0 && user== rows[0].email && pass == rows[0].pass){
                req.session.login= '1';
                req.session.user={
                    name: rows[0].name,
                    email: rows[0].email,
                    pass: getInitPass(rows[0].pass),
                    email_pass: getInitPass(rows[0].email_pass),
                    is_admin: isAdmin(rows[0].email)
                }
                console.log("login success " + user);
                return res.redirect("/index.html");
            }else{
                console.log("login fail " + user);
                return res.redirect("/outer/login.html");
            }
        }

    });
/*
    if(user== emailConfig.user && pass == emailConfig.pass){
        req.session.login= '1';
        return res.redirect("/index.html");
    }else{
        return res.redirect("/outer/login.html");
    }
*/
});

router.get('/login.html', function(req, res, next) {
  res.render('user/login', { title: 'Express' });
});


router.get('/register.html', function(req, res, next) {
  res.render('user/register', { title: 'Express' });
});


function getFinePass(password){
    var cipher = crypto.createCipher('aes-256-cbc',secret);
    var pass = cipher.update(password,'utf8','hex');
    pass += cipher.final('hex');
    return pass;
}

function getInitPass(password){
    var cipher = crypto.createDecipher('aes-256-cbc',secret);
    var de_pass = cipher.update(password,'hex','utf8');
    de_pass += cipher.final('utf8');
    return de_pass;
}

router.post('/register.do', function(req, res, next) {

    if(req.body.code != "0303" ){
        return res.render('user/register', {"error": "无效验证码"});
    }
    var pass = getFinePass(req.body.pass);
    var name = req.body.email.split('@')[0];
    var user = {
        name: name,
        email:req.body.email,
        pass: pass,
        init_pass: req.body.pass,
    }
    conn.query('insert into hr_account set ?',{
        name: name,
        email: user.email,
        pass:user.pass,
        email_pass: user.pass,
        create_time: new Date(),
        modified_time: new Date() }, function (error, res1){
            if(error){
                console.log(error);
                error.user = user;
                res.render('user/register', error);
                return
            }
        req.session.login= '1';
        req.session.user={
            name: user.name,
            email: user.email,
            pass: req.body.pass,
            email_pass: req.body.pass
        }
            return res.redirect("/first.html");

        }
    );
    console.log('user register:'+req.body.email)
});

module.exports = router;
