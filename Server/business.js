const mysql = require('mysql'); // 与数据库交互
const jsonfile = require('jsonfile'); // 生成 json 文件
const schedule = require('node-schedule'); // 定时任务
const path = require('path');
const config = require('./config');

// 使用连接池，提升性能
let pool = mysql.createPool(config.mysql);

// 查询语句
let sql = {
    queryList: 'SELECT * FROM demo_info',
    queryId: 'SELECT * FROM demo_info WHERE id=?',
    insertInfo: 'INSERT INTO demo_info(title, type, content, tag, image, previewUrl, pageUrl, packageUrl, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
};

// 向前台返回JSON方法的简单封装
let sendMsg = function (res, ret) {
    if(typeof ret === 'undefined') {
        res.json({
            code:'1',
            msg: '操作失败'
        });
    } else {
        res.json(ret);
    }
};

jsonfile.spaces = 4;

module.exports = {
    queryList: function() { // 查询首页列表数据
        pool.getConnection(function(err, connection) {
            // 建立连接，查询数据库
            connection.query(sql.queryList, function(err, ret) {
                if(err) throw err;

                let file = path.join(__dirname, '/cache/list.json');
                // 定时执行查询任务并缓存数据
                schedule.scheduleJob('0 * * * * *', function() {
                    jsonfile.writeFile(file, ret, function(err) {
                        console.log('查询数据完成');
                    })
                });
                connection.release(); // 释放连接
            });
        });
    },
    queryId: function(req, res) { // 指定 ID 查询数据
        let {id} = req.body;
        pool.getConnection(function(err, connection) {
            connection.query(sql.queryId, id, function(err, ret) {
                if(err) throw err;

                if(ret.length > 0) {
                    res.json(ret);
                } else {
                    res.json({"msg": 0});
                }
                connection.release();
            });
        });
    },
    insertInfo: function(req, res) {
        let {title, type, content, tag, image, previewUrl, pageUrl, packageUrl, time} = req.body;

        pool.getConnection(function(err, connection) {
            connection.query(sql.insertInfo, [title, type, content, tag, image, previewUrl, pageUrl, packageUrl, time], function(err, ret) {
                if(err) throw err;

                res.json({"msg": 1});
                connection.release();
            });
        });
    }
}
