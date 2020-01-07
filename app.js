'use strict';
var express = require('express');
var fs = require('fs');
var debug = require('debug');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var router = express.Router();
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var cron = require('node-cron');

// batch
// 인식률 보고서 삭제
cron.schedule('0 6 * * *', function () {
    console.log('info', 'running a task every minute / ' + new Date());
    fs.readdir('./report/', (err, fileList) => {
        fileList.forEach(file => {
            fs.unlink('./report/' + file, function(err) {
                if (err) throw err;
                console.log('file deleted');
              });
        })
    })
}).start();

// Session
var session = require('express-session');
var flash = require('connect-flash');
var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , RememberMeStrategy = require('passport-remember-me').Strategy;
var app = express();
// routes
var routes = require('./routes');
var index = require('./routes/index');
//user
var docUpload = require('./routes/user/docUpload');
var invoiceRegistration = require('./routes/user/invoiceRegistration');
var myApproval = require('./routes/user/myApproval');
var uiLearning = require('./routes/user/uiLearning');
var batchLearning = require('./routes/user/batchLearning');
var documentCheck = require('./routes/user/documentCheck');
var invoiceProcessingStatus = require('./routes/user/invoiceProcessingStatus');
var batchLearningTest = require('./routes/user/batchLearningTest');
var docRegistration = require('./routes/user/docRegistration');
var docManagement = require('./routes/user/docManagement');
var adminLearning = require('./routes/user/adminLearning');
var wF_WorkflowProc = require('./routes/user/wF_WorkflowProc');
var templateRegistration = require('./routes/user/templateRegistration');
var setting = require('./routes/user/setting');

//admin
var adminDashboard = require('./routes/admin/adminDashboard');
var userManagement = require('./routes/admin/userManagement');

//proxy
var proxy = require('./routes/proxy/proxy');
//util
var common = require('./routes/util/common');
// etc
var xlsx = require('xlsx');
//var listProc = require('./routes/util/listProc'); // legacy interface

//auto scan
var auto = require('./routes/util/auto');

//api server
var apiServer = require('./routes/util/apiServer'); 

// 
app.use('/tifTest', express.static(path.join(appRoot)));
app.use('/tif', express.static(path.join(propertiesConfig.filepath.uploadsPath)));
app.use('/jpg', express.static(path.join(propertiesConfig.filepath.uploadsPath)));
app.use('/img', express.static(path.join(propertiesConfig.filepath.uploadsPath)));
app.use('/scan', express.static(path.join(propertiesConfig.filepath.scanPath)));
app.use('/sample', express.static(path.join(propertiesConfig.filepath.doc_sampleImagePath)));
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/sample', express.static(__dirname + '/sample'));
app.use('/excel', express.static(__dirname + '/excel'));
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
//
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
// Custom Middlewares
app.use(function (req, res, next) {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.currentUser = req.user;
    next();
});
// login
app.use(session({
    secret: 'koreanre-ocr',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// app.use(passport.authenticate('remember-me')); // Auto login
// routes
app.use('/', routes);
// user
app.use('/docUpload', docUpload);
app.use('/invoiceRegistration', invoiceRegistration);
app.use('/myApproval', myApproval);
app.use('/uiLearning', uiLearning);
app.use('/batchLearning', batchLearning);
app.use('/documentCheck', documentCheck);
app.use('/invoiceProcessingStatus', invoiceProcessingStatus);
app.use('/batchLearningTest', batchLearningTest);
app.use('/docRegistration', docRegistration);
app.use('/docManagement', docManagement);
app.use('/templateRegistration', templateRegistration);
app.use('/setting', setting);

app.use('/adminLearning', adminLearning);
app.use('/wF_WorkflowProc', wF_WorkflowProc);

// admin
app.use('/adminDashboard', adminDashboard);
app.use('/userManagement', userManagement);

//proxy
app.use('/proxy', proxy);
//util
app.use('/common', common);
//etc
//app.use('/listProc', listProc);

// api server
app.use('/apiServer', apiServer);

// server 
app.set('port', process.env.PORT || 80);
var server = app.listen(app.get('port'), function () {
    console.log('Server Start!! port : ' + server.address().port); 

    //auto.local(); // local directory watch (update, remove type)
    //auto.remoteFTP(); // remote FTP file server schedule and file download
    //auto.remoteFTP_v2(); // remote FTP file list and file db data compare process
    //auto.autoTest();
});