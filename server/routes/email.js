var express = require('express');
var fs = require('fs');
var xlsx = require('node-xlsx');
var multipart = require('connect-multiparty');
var nodemailer = require('nodemailer');
var ejs = require('ejs');
var cheerio = require('cheerio');
var htmlEncode = require('htmlencode').htmlEncode;
var router = express.Router();
var multipartMiddleware = multipart();

var transporterCache = new Map();

var datasource = require('../dao/datasource')
var conn  = datasource.my_conn;

function isClient(req){

    if(req.header('User-Agent').indexOf('Electron') != -1){
        return true;
    }
    return false;
}
function endWith(src, str){
    var reg=new RegExp(str+"$");
    return reg.test(src);
}
function getTransporter(session){
   // console.log('email:', JSON.stringify(session));
    var email = session.user.email;
    var transporter = transporterCache.get(email)
    if(transporter && transporter.options.auth.pass == session.user.email_pass){
        return transporter;
    }else{
        var user = session.user;
        if (endWith(email, "163.com")){
            transporter = nodemailer.createTransport({
                host: 'smtphz.qiye.163.com',
                port: 994,
                auth: {
                    pass: user.email_pass,
                    user: user.user
                },
                secure:true,
                connectionTimeout:5000,
                greetingTimeout:5000,
                socketTimeout:3000
            });
        }else if (endWith(email, "qq.com")) {
            transporter = nodemailer.createTransport({
                service: 'QQ',
                auth: {
                    user: user.email,
                    pass: user.email_pass
                },
                secure:true
            });
        }else if(endWith(email, "songxiaocai.com")){
            transporter = nodemailer.createTransport({
                host: 'smtp.exmail.qq.com',
                port: 465,
                auth: {
                    pass: user.email_pass,
                    user: user.email
                },
                secure:true,
                connectionTimeout:5000,
                greetingTimeout:5000,
                socketTimeout:3000,
                debug:true
            });
        }
        transporterCache.set(email, transporter);
        return transporter;
    }

}



var tableTemplte = fs.readFileSync('views/_app_tmpl/email_default.ejs',{encoding:'utf-8'});
//console.log("tableTemplte:" + tableTemplte);
tableTemplte = ejs.compile(tableTemplte,{
    //debug:true
});

router.get('/', function(req, res, next) {
    console.log('session_login:' + req.session.login);
    conn.query('select * from email_task where sender = ? order by create_time desc limit 50',req.session.user.email, function(err,rows,fields){
        if(err){
            console.log(err);
        }else{
            res.render('email/index', {
                user: req.session.user,
                tasks: rows});
        }

    });

});

router.get('/upload.html', function(req, res, next) {
    res.render('email/upload', { user: req.session.user});
});

router.get('/fail.html', function(req, res, next) {
    var taskId = req.query.task_id;
    conn.query('select * from email_task_detail  where status=0 and task_id=? order by create_time desc',[taskId], function(err,rows,fields){
        if(err){
            console.log(err);
        }else{
            res.render('email/fail', {user: req.session.user, details: rows});
        }

    });
});

/*
*
*/
router.get('/resend.do', function(req, resonse, next) {
    var session = req.session;
    var emailFrom = session.user.email;
    var emailName = req.session.user.name;
    var transporter = getTransporter(session);

    //console.log(transporter);

    var taskId = req.query.detail_task_id;
    conn.query('select d.receiver, d.task_id, d.content, t.subject from email_task_detail d join email_task t on d.task_id=t.id where d.id=? ',[taskId], function(err,rows,fields){
        if(err){
            console.log(err);
            resonse.redirect('/email/index.html');
        }else{
            var mailOptions = {
                from: emailName +'<'+emailFrom+'>',
                to: rows[0].receiver, // list of receivers
                subject: rows[0].subject, // Subject line
                html: rows[0].content// html body
            };
            transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log(error);
                    conn.query('update email_task_detail set retry=retry+1 where id=?',taskId, function(error, res){
                        if(error){
                            console.log(error);
                        }else{
                            resonse.redirect('/email/fail.html?task_id='+rows[0].task_id);
                        }
                    });
                }else{
                    conn.query('update email_task_detail set status=1, retry=retry+1 where id=?',taskId, function(error, res){
                        if(error){
                            console.log(error);
                        }else{
                            resonse.redirect('/email/fail.html?task_id='+rows[0].task_id);
                        }
                    });
                }

            });
            /*
            setTimeout(function(){
                resonse.redirect('/email/fail.html?task_id='+rows[0].task_id);
            },3000);
            */
        }

    });

});

router.post('/upload.do', multipartMiddleware, function(req, res, next) {
    var subject = req.body.subject;
    var content = req.body.body;
    //console.log('body_before:' +body);
    var $ = cheerio.load(content,{decodeEntities: false});
    content = $('body').html();
    //console.log('body_after:' +body);

    var target_path = null;
    var file_data = null;


    //处理上传文件
    if(req.files.file && req.files.file.size > 0){
        var tmp_path = req.files.file.path;
        // 指定文件上传后的目录 - 示例为"images"目录。
        target_path = '/var/data/email/' + req.files.file.name;
        fs.rename(tmp_path, target_path, function(err) {
            if (err) throw err;
            // 删除临时文件夹文件,
            fs.unlink(tmp_path, function() {
                if (err) throw err;
            });
        });

        // 解析上传的xlsl文件, 只处理第1个sheet
        var workbook = xlsx.parse(target_path);
        file_data = workbook[0].data;
    }

    // console.log(JSON.stringify(file_data));
    console.log(req.header('User-Agent'))
    if(isClient(req)){
        res.render('email/preview_c', {user: req.session.user,
            'subject':subject,
            'content': content,
            'content_encode': htmlEncode(content),
            'filePath': target_path,
            'data': file_data});
    }else{
        res.render('email/preview', {user: req.session.user,
            'subject':subject,
            'content': content,
            'filePath': target_path,
            'data': file_data});
    }

});

router.post('/add_task', function(req, res, next) {
   // console.log(req.body);
    var emailFrom = req.body.sender;
    var subject= req.body.subject;
    var count = req.body.count;
    var table_count = req.body.table_count;
    conn.query('insert into email_task set ?',{
            sender: emailFrom,
            subject: subject,
            template_id:1,
            count: count,
            table_count: table_count,
            create_time: new Date()
        }, function (err1, res1) {
            if (err1) {
                console.log(err1);
                res.send(JSON.stringify(err1))
                return ;
            }
            res.send(JSON.stringify(res1))
    });
});

router.post('/update_task', function(req, res, next) {
    var suc_count = req.body.suc_count;
    var suc_table_count = req.body.suc_table_count;
    var task_id = req.body.task_id;
    conn.query('update email_task set real_count=?, real_table_count=?, ? where id=?',
        [
            suc_count,
            suc_table_count,
            {done_time: new Date()},
            task_id
        ], function(error, res1){
            if(error){
                console.log(error);
            }
            res.send(JSON.stringify(res1))
        });
});

router.post('/add_task_detail', function(req, res, next) {
    var taskId = req.body.taskId;
    var toEmail= req.body.toEmail;
    var content = req.body.content;
    var remark = req.body.remark;
    var status = req.body.status;
    conn.query('insert into email_task_detail set ?',{
        task_id:taskId,
        receiver:toEmail,
        content:content,
        status: status,
        create_time: new Date(),
        remark: remark
    }, function(error, res1){
        if(error){
            console.log(error);
        }
        res.send(JSON.stringify(res1))
    });
});

router.post('/update_task_detail', function(req, res, next) {
    var status = req.body.status;
    var task_id = req.body.task_id;
    conn.query('update email_task_detail set status=?, retry=retry+1 where id=?',
        status,
        task_id,
        function(error, res){
        if(error){
            console.log(error);
        }else{
            resonse.redirect('/email/fail.html?task_id='+task_id);
        }
    });
});

router.post('/send.do', function(req, res, next){
    var emailFrom = req.session.user.email;
    var emailName = req.session.user.name;
    var transporter = getTransporter(req.session);
        //发送邮件
        var workbook = xlsx.parse(req.body.filePath);
        var subject = req.body.subject;
        var body = req.body.body;
        var $ = cheerio.load(body,{decodeEntities: false});
        body = $.html();
        console.log('body_after:' +body);

        var sheet = workbook[0].data;
        var header = workbook[0].data[0];

        var data={};
        var count =0; // 行数
        var table_count = 0;
        for(var i=1; i< sheet.length; i++){
            var line = sheet[i];
            var email = sheet[i][0];
            if(data[email]){
                var length = data[email].length;
                data[email][length] = sheet[i];
            }else{
                var records=new Array();
                records[0] = sheet[i];
                data[email] = records;

                count++;
            }
            table_count++;
        }

        conn.query('insert into email_task set ?',{
            sender:emailFrom,
            subject: subject,
            template_id:1,
            count: count,
            table_count: table_count,
            create_time: new Date()}, function (err1, res1) {
                if (err1) console.log(err1);
                console.log("INSERT Return ==> ");
                console.log(res1);
                var taskId = res1.insertId;

                //  console.log('header:'+ header);
                var send_count =0;
                var send_table_count = 0;

                var suc_count = 0;
                var suc_table_count = 0;

                var emailList = new Array();
                for(var email in data){
                    emailList.push(email);
                }
                var sendEmail = function(){
                    var toEmail = emailList.pop();
                    var records = data[toEmail];

                    send_count++;
                    send_table_count += records.length;

                    var content = tableTemplte({'body':body, 'header':header,'records':records}) ;
                    var mailOptions = {
                        from: emailName +'<'+emailFrom+'>',
                        to: toEmail, // list of receivers
                        subject: subject, // Subject line
                        html: content// html body
                    };

                    transporter.sendMail(mailOptions, function(error, info){
                        if(error){
                            conn.query('insert into email_task_detail set ?',{
                                task_id:taskId,
                                receiver:toEmail,
                                content:content,
                                status:0,
                                create_time: new Date(),
                                remark:error
                            }, function(error, res){
                                if(error){
                                    console.log(error);
                                }
                            });
                            if(send_count == count){
                                //最后一次更新状态
                                conn.query('update email_task set real_count=?, real_table_count=?, ? where id=?',[
                                    suc_count,suc_table_count,{done_time: new Date()},taskId], function(error, res){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            }
                            console.log(error);
                        }else{
                            //需记录到数据库
                            conn.query('insert into email_task_detail set ?',{
                                task_id:taskId,
                                receiver:toEmail,
                                content:content,
                                status:1,
                                create_time: new Date()
                            }, function(error, res){
                                if(error){
                                    console.log(error);
                                }
                            });

                            suc_count++;
                            suc_table_count += records.length;
                            if(send_count == count){
                                //最后一次更新状态
                                conn.query('update email_task set real_count=?, real_table_count=?, ? where id=?',[
                                    suc_count,suc_table_count,{done_time: new Date()},taskId], function(error, res){
                                    if(error){
                                        console.log(error);
                                    }
                                });
                            }
                            console.log('send_count:' + send_count + ', suc_count:' + suc_count);
                            console.log(new Date() + '-- ' + toEmail + ' -- Message sent: ' + info.response);
                        }

                    });
                }
                var timeout = 6000;
                for(var email in data){
                    setTimeout(sendEmail, timeout);
                    console.log(email + ' sent timeout: ' + timeout);
                    timeout = timeout + 6000;
                }

            });
            //  console.log('email send done.');
            res.redirect('/email/');
        });
module.exports = router;
