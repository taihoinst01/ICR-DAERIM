'use strict';

var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var localRequest = require('sync-request');
var request = require('request');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var queryConfig = require(appRoot + '/config/queryConfig.js');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var oracle = require('../util/oracle.js');
var ftp = require('ftp');
var sync = require('./sync.js')

const defaults = {
    encoding: 'utf8',
};

//FTP 서버 정보
var ftpConfig = propertiesConfig.ftp;

/***************************************************************
 * Router
 * *************************************************************/

// [POST] LOCAL OCR API (request binary data)
exports.localOcr = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var pharsedOcrJson = "";
        try {
            var uploadImage = fs.readFileSync(req, 'binary');
            var base64 = new Buffer(uploadImage, 'binary').toString('base64');
            var binaryString = new Buffer(base64, 'base64').toString('binary');
            uploadImage = new Buffer(binaryString, "binary");

            var res = localRequest('POST', propertiesConfig.ocr.uri, {
                headers: {
                    'Ocp-Apim-Subscription-Key': propertiesConfig.ocr.subscriptionKey,
                    'Content-Type': 'application/octet-stream'
                },
                uri: propertiesConfig.ocr.uri + '?' + 'language=unk&detectOrientation=true',
                body: uploadImage,
                method: 'POST'
            });
            //var resJson = JSON.parse(res.getBody('utf8'));
            //pharsedOcrJson = ocrJson(resJson.regions);

            var jsonRes = JSON.parse(res.getBody('utf8'));
            if (jsonRes.textAngle > 0.03 || jsonRes.textAngle < -0.03 || jsonRes.orientation != "Up") {
                return done(null, jsonRes);
            }
            var resJson = ocrParsing(res.getBody('utf8'));

            return done(null, resJson);
        } catch (err) {
            console.log(err);
            return done(null, 'error');
        } finally {

        }
        /*
        var returnObj;
        var fileName = req;

        try {
            fs.readFile(propertiesConfig.filepath.convertedImagePath + fileName, function (err, data) {
                if (err) throw err;

                var buffer;
                var base64 = new Buffer(data, 'binary').toString('base64');
                var binaryString = new Buffer(base64, 'base64').toString('binary');
                buffer = new Buffer(binaryString, "binary");

                var params = {
                    'language': 'unk',
                    'detectOrientation': 'true'
                };

                request({
                    headers: {
                        'Ocp-Apim-Subscription-Key': propertiesConfig.ocr.subscriptionKey,
                        'Content-Type': 'application/octet-stream'
                    },
                    uri: propertiesConfig.ocr.uri + '?' + 'language=' + params.language + '&detectOrientation=' + params.detectOrientation,
                    body: buffer,
                    method: 'POST'
                }, function (err, response, body) {
                    if (err) { // request err
                        throw err;
                    } else {
                        if ((JSON.parse(body)).code) { // ocr api error
                            return done(null, { code: parseInt((JSON.parse(body)).code), message: (JSON.parse(body)).message });
                        } else { // 성공
                            return done(null, { code: 200, message: JSON.parse(body) });
                        }
                    }
                });
            });

        } catch (err) {
            reject(err);
            return done(null, { code: 500, message: err });
        } finally {           
        }
        */
    });   
};

// [POST] PROXY OCR API (request binary data)
exports.proxyOcr = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var fileName = req;

        try {
            var formData = {
                file: {
                    value: fs.createReadStream(fileName),
                    options: {
                        filename: fileName,
                        contentType: 'image/jpeg'
                    }
                }
            };

            request.post({ url: propertiesConfig.proxy.serverUrl + '/ocr/api', formData: formData }, function (err, httpRes, body) {
                var resJson = ocrParsing(body);
                return done(null, resJson);
            });

        } catch (err) {
            reject(err);
        } finally {
        }
    });
};

//pass => 한글 English 1234567890 <>,.!@#$%^&*()~`-+_=|;:?/ lid => Iñtërnâtiônàlizætiøn☃
//send전 parsing 된 array 중 text안에 {}[]'" 있을 경우 삭제
function ocrParsing(body) {
    var data = [];

    try {
        var body = JSON.parse(body);

        // ocr line parsing
        for (var i = 0; i < body.regions.length; i++) {
            for (var j = 0; j < body.regions[i].lines.length; j++) {
                if ((body.regions[i].lines[j].words[0] != undefined && body.regions[i].lines[j].words[0].text == 'REQ') && (body.regions[i].lines[j].words[1] != undefined && body.regions[i].lines[j].words[1].text == 'QUANTITY')) {
                    data.push({ 'location': body.regions[i].lines[j].words[0].boundingBox, 'text': body.regions[i].lines[j].words[0].text.trim() });
                    data.push({ 'location': body.regions[i].lines[j].words[1].boundingBox, 'text': body.regions[i].lines[j].words[1].text.trim() });
                    break;
                }
                if ((body.regions[i].lines[j].words[0] != undefined && body.regions[i].lines[j].words[0].text == 'TOTAL') && (body.regions[i].lines[j].words[1] != undefined && body.regions[i].lines[j].words[1].text == 'GBP')) {
                    data.push({ 'location': body.regions[i].lines[j].words[0].boundingBox, 'text': body.regions[i].lines[j].words[0].text.trim() });
                    data.push({ 'location': body.regions[i].lines[j].words[1].boundingBox, 'text': body.regions[i].lines[j].words[1].text.trim() });
                    if (body.regions[i].lines[j + 1] != undefined && body.regions[i].lines[j + 1].words[0] != undefined) {
                        data.push({ 'location': body.regions[i].lines[j+1].words[0].boundingBox, 'text': body.regions[i].lines[j+1].words[0].text.trim() });
                    }
                    break;
                }
                /*
                if ((body.regions[i].lines[j].words[0] != undefined && body.regions[i].lines[j].words[0].text == 'Delivery') && (body.regions[i].lines[j].words[1] != undefined && body.regions[i].lines[j].words[1].text == 'Unit')) {
                    data.push({ 'location': body.regions[i].lines[j].words[0].boundingBox, 'text': body.regions[i].lines[j].words[0].text.trim() });
                    data.push({ 'location': body.regions[i].lines[j].words[1].boundingBox, 'text': body.regions[i].lines[j].words[1].text.trim() });
                    break;
                }
                */
                var item = '';
                for (var k = 0; k < body.regions[i].lines[j].words.length; k++) {
                    item += body.regions[i].lines[j].words[k].text + ' ';
                }
                data.push({ 'location': body.regions[i].lines[j].boundingBox, 'text': item.trim() });
            }
        }

        // ocr x location parsing
        var xInterval = 20; // x pixel value

        for (var i = 0; i < data.length; i++) {
            if (!(data[i].text == "TOTAL" || data[i].text == "GBP")) {
                for (var j = 0; j < data.length; j++) {
                    if (data[i].location != data[j].location) {
                        var targetLocArr = data[i].location.split(',');
                        var compareLocArr = data[j].location.split(',');
                        var width = Number(targetLocArr[0]) + Number(targetLocArr[2]); // target text width
                        var textSpacing = Math.abs(Number(compareLocArr[0]) - width) // spacing between target text and compare text

                        if (textSpacing <= xInterval && compareLocArr[1] == targetLocArr[1]) {
                            data[i].location = targetLocArr[0] + ',' + targetLocArr[1] + ',' +
                                (Number(targetLocArr[2]) + Number(compareLocArr[2]) + textSpacing) + ',' + targetLocArr[3];
                            data[i].text += ' ' + data[j].text;
                            data[j].text = '';
                            data[j].location = '';
                        }
                    }
                }
            }
        }

        for (var i = 0; i < data.length; i++) {
            if (data[i].location == '' && data[i].text == '') data.splice(i, 1);
        }
        // ocr text Unknown character parsing
        var ignoreChar = ['"'.charCodeAt(0), '\''.charCodeAt(0), '['.charCodeAt(0), ']'.charCodeAt(0),
        '{'.charCodeAt(0), '}'.charCodeAt(0)];

        for (var i = 0; i < data.length; i++) {
            var modifyText = data[i].text;
            for (var j = 0; j < data[i].text.length; j++) {
                var ascii = data[i].text.charCodeAt(j);
                if (ascii > 127 || ignoreChar.indexOf(ascii) != -1) {
                    var rep = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
                    if (!rep.test(data[i].text[j])) { // not Korean
                        rep = new RegExp(((ascii < 128) ? '\\' : '') + data[i].text[j], "gi");
                        modifyText = modifyText.replace(rep, '');
                    }
                }
            }
            data[i].text = modifyText;
        }

    } catch (e) {
        console.log(e);
        data = { 'error': e };
    } finally {
        return data;
    }
}



exports.correctEntryFnc = function (uiInputData, done) {
    return new Promise(async function (resolve, reject) {
        try{ 
            var docTypeJson;
            var entryJson;
            var inputDataArr = uiInputData.data;
            for (var i=0; i<inputDataArr.length; i++) {
                docTypeJson = correctEntry.pantos[uiInputData.docCategory.DOCTOPTYPE];
                //console.log(' docTypeJson ---  ' + docTypeJson);
                if (typeof docTypeJson != 'undefined') {
                    //console.log(' inputDataArr[i].entryLbl ---  ' + inputDataArr[i].entryLbl);
                    entryJson = docTypeJson[inputDataArr[i].entryLbl];
                    //console.log(' entryJson ---  ' + entryJson.toString());
                    if (typeof entryJson != 'undefined') {
                        var ocrText = inputDataArr[i].originText;
                        var correctText = '';
                        Object.keys(entryJson).forEach(function(objKey){
                            console.log(objKey + ' - ' + entryJson[objKey]);
                            if (ocrText.indexOf(objKey) != -1) {
                                console.log('before' + ocrText);
                                //ocrText = ocrText.split(objKey).join(entryJson[objKey]);
                                
		                        var regEx = new RegExp(objKey, "g");
                                ocrText = ocrText.replace(regEx, entryJson[objKey]);
                                inputDataArr[i].text = ocrText;
                                console.log('after' + ocrText );
                            }
                        });
                    }
                }
            }
            uiInputData.data = inputDataArr;
            return done(null, uiInputData);
        } catch (e) {
            console.log(e);
            return done(null, uiInputData);
        }
    });
};

// [POST] linux server icrRest
exports.icrRest = function (req, req1,  isAuto, done) {
    return new Promise(async function (resolve, reject) {
        var filepath = req;
        var filename = (filepath.lastIndexOf("/") != -1) ? filepath.slice(filepath.lastIndexOf("/") + 1) : filepath;
        var reqInfo;
        var formData;
        var chgFilename = filename.split('_')[0]+"/"+req1+"/"+filename;
        try {   
            if (isAuto) {
                reqInfo = { url: propertiesConfig.icrRest.serverUrl + '/fileUploadGoogle', form: { filename: chgFilename } };
                //reqInfo = { url: 'http://127.0.0.1:5000/fileUpload', form: { filename: filename } };
            } else {

                // var path = sync.await(changeFtpFilePath(filename,req1, sync.defer()));
                // if(path == null)
                // {
                //     sync.await(makeFtpFilePath(filename,req1, sync.defer()));
                // }
                // sync.await(moveFtpFile(filename,req1, sync.defer()));
                // formData = {
                //     file: {
                //         value: fs.createReadStream(chgFilename),
                //         options: {
                //             filename: filename,
                //         }
                //     }
                // };
                // reqInfo = { url: propertiesConfig.icrRest.serverUrl + '/fileUploadGoogle', formData: formData };
                reqInfo = { url: propertiesConfig.icrRest.serverUrl + '/fileUploadGoogle', form: { filename: chgFilename } };
                //reqInfo = { url: 'http://127.0.0.1:5000/fileUpload', formData: formData };               
            }
            console.time("icrRest Time");
            request.post(reqInfo, function (err, httpRes, body) {
                if (err) {
                    console.log(err);
                    return done(null, err);
                }
                console.timeEnd("icrRest Time");
                // if (!isAuto) fs.unlinkSync(filepath);
                return done(null, body);
            });
        } catch (err) {
            //reject(err);
            console.log(err);
        } finally {

        }
    });
};

// [POST] linux server icrRestimage download
exports.downloadRestSaveImg = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var filename = req;
        try {
            console.time("downloadRestSaveImg Time");
            request.get({ url: propertiesConfig.icrRest.serverUrl + '/fileDown?fileName=' + filename}, function (err, httpRes, body) {
                if (err) return done(null, err);
                let binaryData = new Buffer(body, 'base64').toString('binary');
                fs.writeFile(propertiesConfig.filepath.uploadsPath + filename, binaryData, 'binary', function() {
                    if (err) throw err
                    console.log('File saved.')
                })
                console.timeEnd("downloadRestSaveImg Time");
                return done(null, null);
            }) 
        } catch (err) {
            reject(err);
        } finally {
        }
    });
};


// FTP server file move (ScanFiles -> uploads)
function changeFtpFilePath(fileName,fileTime, done) {

    var destFtpFilePath = propertiesConfig.auto.destFtpFilePath+fileName.split('_')[0]+"/"+fileTime;

    sync.fiber(function () {
        try {
            var c = new ftp();
            c.on('ready', function () {
                c.cwd(destFtpFilePath, function (err,path) {
                    if (err) 
                    {
                        console.log(err);
                        return done(null, null);
                    }
                    return done(null, path);
                    });
                });
            c.connect(ftpConfig);
        } catch (e) {
            throw e;
        }
    });
}


// FTP server file move (ScanFiles -> uploads)
function makeFtpFilePath(fileName,fileTime, done) {

    var destFtpFilePath = propertiesConfig.auto.destFtpFilePath+fileName.split('_')[0]+"/"+fileTime;

    sync.fiber(function () {
        try {
            var c = new ftp();
            c.on('ready', function () {
                c.mkdir(destFtpFilePath, function (err) {
                    if (err) console.log(err);
                    
                    return done(null);
                    });
                });
            c.connect(ftpConfig);
        } catch (e) {
            throw e;
        }
    });
}

// FTP server file move (ScanFiles -> uploads)
function moveFtpFile(fileName,fileTime, done) {

    var ftpFilePath = propertiesConfig.auto.ftpFilePath + fileName;
    var localFilePath = propertiesConfig.auto.localFilePath + fileName;
    var destFtpFilePath = propertiesConfig.auto.destFtpFilePath+fileName.split('_')[0]+"/"+fileTime+"/" + fileName;

    sync.fiber(function () {
        try {
            var c = new ftp();
            c.on('ready', function () {
                c.get(ftpFilePath, function (err, stream) {
                    if (err) console.log(err);
                    stream.pipe(fs.createWriteStream(localFilePath));
                    stream.once('close', function () {
                        c.put(localFilePath, destFtpFilePath, function (err) {
                            if (err) console.log(err);
                            c.end();
                            fs.unlinkSync(localFilePath);
                            return done(null, null);
                        });
                    });
                });
            });
            c.connect(ftpConfig);
        } catch (e) {
            throw e;
        }
    });
}