const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const upyun = require('upyun');
const multer = require('multer');
const unzip = require('unzip');

const business = require('./Server/business');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './temp/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})
const upload = multer({storage: storage});

const app = express();
const router = express.Router();

// upyun 配置
const service = new upyun.Service('demo-varued', 'vardemo', 'varsafe_demo');
const client = new upyun.Client(service);

// 加载静态资源
app.use('/static', express.static(path.join(__dirname, './Client')));

// 获取客户端 POST 参数
app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

// 跨域
app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  
    if(req.method == 'OPTIONS') {
        res.send(200); /让options请求快速返回/
    } else {
        next();
    }
});

// 页面请求
app.get('/', function(req, res) {
    business.queryList();
    res.sendFile(path.join(__dirname, './Client/index.html'));
})

app.get('/add', function(req, res) {
    res.sendFile(path.join(__dirname, './Client/add.html'));
})

app.get('/detail/:id', function(req, res) {
    // console.log(req.params.id);
    res.sendFile(path.join(__dirname, './Client/detail.html'));
})

app.get('/demo/*', function(req, res) {
    console.log(req);
    res.sendFile(path.join(__dirname, req.originalUrl));
})

// Ajax 请求
router.get('/list', function(req, res) {
    res.sendFile(path.join(__dirname, 'Server/cache/list.json'));
});

router.post('/content', function(req, res) {
    business.queryId(req, res);
});

router.post('/upload', function(req, res) {
    business.insertInfo(req,res);
    // res.send(req.body);
});

router.post('/file', upload.single('demoFile'), function(req, res) {
    console.log(req.file);
    let fileName = req.file.originalname.substring(0, req.file.originalname.lastIndexOf('.')); // 文件名，没有后缀
    let upyunUrl = 'http://file.varyu.com';
    let packagePath = '/demoFile/' + fileName + '/' + req.file.originalname; // zip 包在 upyun 路径
    let localPath = __dirname + '/' + req.file.path; // zip 包在服务器本地临时路径
    let previewPath = 'demo/'; // zip 包解压路径，即预览路径

    // client.putFile('upyun 地址', '本地文件')
    client.putFile(packagePath, fs.createReadStream(localPath)).then(function(result) {
        if(result) {
            fs.createReadStream(localPath).pipe(unzip.Extract({path: previewPath}));
            res.json({
                "previewUrl": '/demo/' + fileName + '/',
                "packageUrl": upyunUrl + packagePath,
            });
        } else {
            res.json({"msg": "Upyun 上传失败"});
        }
        console.log(result);
        console.log('put file to upyun ' + (result ? 'success' : 'failed'));
    });
});

app.use('/api', router);

app.listen('3000', function() {
    console.log('监听 3000 端口');
})
