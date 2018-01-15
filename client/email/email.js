var xlsx = require('node-xlsx');
var nodemailer = require('nodemailer');
var ejs = require('ejs');
var cheerio = require('cheerio');
var fs = require('fs');
var htmlencode = require('htmlencode');
var request = require('request');
var http = require('http');

var transporterCache = new Map();
var tableTemplte = fs.readFileSync(
    require('path').join(__dirname, 'email_tmpl.ejs'),
    {encoding:'utf-8'});
tableTemplte = ejs.compile(tableTemplte,{
    //debug:true
});

//var remote_host = '127.0.0.1:3000'
var remote_host = 'hr.bolezhai.com'

function endWith(src, str){
    var reg=new RegExp(str+"$");
    return reg.test(src);
}

function getTransporter(user){
   // console.log("cache:", transporterCache);
    var email = user.email;
    if(transporterCache.get(email)){
        var transporter = transporterCache.get(email);
        console.log("hit cache. ", email);
        return transporter;
    }else{
        var transporter ;
        if (endWith(email, "163.com")){
            transporter = nodemailer.createTransport({
                host: 'smtphz.qiye.163.com',
                port: 994,
                auth: {
                    pass: user.pass,
                    user: user.user
                },
                secure: true,
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 3000,
                debug: true,
                pool: true
            });
        }else if (endWith(email, "qq.com")) {
            transporter = nodemailer.createTransport({
                service: 'QQ',
                auth: {
                    user: user.email,
                    pass: user.pass
                }
            });
        }else if(endWith(email, "songxiaocai.com")){
            transporter = nodemailer.createTransport({
                host: 'smtp.exmail.qq.com',
                port: 465,
                auth: {
                    pass: user.pass,
                    user: user.email
                },
                secure: true,
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 3000,
                debug: true,
                pool: true
            });
        }
        transporterCache.set(email, transporter);
        return transporter;
    }

}

var send = function( args){
    var user = {
        "email": args.email,
        "pass" : args.pass,
        "name" : args.name
    };
    var cookie = args.cookie_str;
    console.log('cookie in send:', cookie)
    var emailFrom = user.email;
    var emailName = user.name;
    var transporter = getTransporter(user);

    //发送邮件
    var subject = args.subject;

    //console.log('body_1:' + args.body);
    var body = htmlencode.htmlDecode(args.body);
    //console.log('body_2:' +body);
    // var $ = cheerio.load(body,{decodeEntities: false});
    // body = $.html();
    body = htmlencode.htmlDecode(body);
    //console.log('body_3:' +body);

   // console.log("raw data:",args.data);
    var tmp = htmlencode.htmlDecode(args.data)
   // console.log('data_1:' + tmp);
    tmp = tmp.replace(new RegExp("\r\n","gm"),"");
    tmp = tmp.replace(new RegExp("\r","gm"),"");
    tmp = tmp.replace(new RegExp("\n","gm"),"");
   // console.log('data_2:' + tmp);
    var sheet = JSON.parse(tmp);
    var header = sheet[0];

    var data={};
    var count =0; // 行数
    var table_count = 0;
    for(var i=1; i< sheet.length; i++){
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
    console.log("count:",count," table_count:", table_count);

    request({
        url: 'http://' + remote_host +'/email/add_task',
        method: "POST",
        json: true,
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Cookie" : cookie
        },
        body: {
            "sender": emailFrom,
            "subject": subject,
            "count": count,
            "table_count": table_count
        }
    }, function(error, response, http_body) {
        if (!error && response.statusCode == 200) {
            //console.log('http res body:', http_body)
            var task_id = http_body.insertId;
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
                        request({
                            url: 'http://' + remote_host +'/email/add_task_detail',
                            method: "POST",
                            json: true,
                            headers: {
                                "Content-Type": "application/json;charset=UTF-8",
                                "Cookie" : cookie
                            },
                            body: {
                                "taskId": task_id,
                                "toEmail": toEmail,
                                "content": content,
                                "remark": JSON.stringify(error),
                                "status" : 0
                            }
                        }, function(error, response, body) {
                        });
                        if(send_count == count){
                            request({
                                url: 'http://' + remote_host +'/email/update_task',
                                method: "POST",
                                json: true,
                                headers: {
                                    "Content-Type": "application/json;charset=UTF-8",
                                    "Cookie" : cookie
                                },
                                body: {
                                    "suc_count": suc_count,
                                    "suc_table_count": suc_table_count,
                                    "task_id" : task_id
                                }
                            }, function(error, response, body) {
                            });
                        }
                        console.log(error);
                    }else{
                        //需记录到数据库
                        request({
                            url: 'http://' + remote_host +'/email/add_task_detail',
                            method: "POST",
                            json: true,
                            headers: {
                                "Content-Type": "application/json;charset=UTF-8",
                                "Cookie" : cookie
                            },
                            body: {
                                "taskId": task_id,
                                "toEmail": toEmail,
                                "content": content,
                                "remark": '',
                                "status" : 1
                            }
                        }, function(error, response, body) {
                        });

                        suc_count++;
                        suc_table_count += records.length;

                        if(send_count == count){
                            request({
                                url: 'http://' + remote_host +'/email/update_task',
                                method: "POST",
                                json: true,
                                headers: {
                                    "Content-Type": "application/json;charset=UTF-8",
                                    "Cookie" : cookie
                                },
                                body: {
                                    "suc_count": suc_count,
                                    "suc_table_count": suc_table_count,
                                    "task_id" : task_id
                                }
                            }, function(error, response, body) {
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
        }else{
            console.log(error);
            console.log(response.body)
        }

    });


        //  console.log('header:'+ header);



}

var hello = function(){
    console.log("hello")
    return false;
}
exports.send = send;
exports.hello = hello;
exports.remoteHost = remote_host;