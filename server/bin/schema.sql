
create database hr_tools;

use hr_tools;

create table hr_account(
  id int(11) primary key auto_increment,
  name varchar(255),
  email varchar(255) NOT NULL unique,
  pass varchar(255),
  service int(1), /*smtp的服务提供商类型 */
  create_time datetime,
  modified_time datetime
)ENGINE=InnoDB DEFAULT CHARSET=utf8;


create table email_task(
  id int(11) primary key auto_increment,
  sender varchar(255) ,
  subject varchar(255),
  template_id int,
  count int default 0,  /*邮件地址个数*/
  table_count int default 0,  /*提交的表格行数*/
  real_count int default 0, /*实际发送的邮件地址个数*/
  real_table_count int default 0 , /*发送的表格行数*/
  create_time datetime,
  done_time datetime)
  ENGINE=InnoDB DEFAULT CHARSET=utf8;

create table email_task_detail(
  id int(11) primary key auto_increment,
  task_id int(11) not null,
  receiver varchar(255),
  content text,
  status int(1) default 0,
  create_time datetime,
  remark varchar(255),
  retry int(6) default 0)
  ENGINE=InnoDB DEFAULT CHARSET=utf8;

############### 2015.09.11###########
ALTER TABLE email_task ADD table_count INT NOT NULL DEFAULT 0 COMMENT '提交的表格行数';
ALTER TABLE email_task ADD real_table_count INT NOT NULL DEFAULT 0 COMMENT '发送的表格行数';

############## 2016.06.10 ##########
ALTER TABLE email_task_detail ADD retry INT(6) default '0';

############## 2017.05.03 ##########
ALTER TABLE hr_account add email_pass varchar(255);
