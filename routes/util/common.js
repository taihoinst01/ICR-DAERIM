'use strict';

var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var request = require('request');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var queryConfig = require(appRoot + '/config/queryConfig.js');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var pythonConfig = require(appRoot + '/config/pythonConfig');
var PythonShell = require('python-shell')
var sync = require('../util/sync.js');
var oracle = require('../util/oracle.js');
var execSync = require('sync-exec');
var ocrUtil = require('../util/ocr.js');
var Step = require('step');
const xlsx = require('xlsx');
const async = require("async");
var oracle = require('../util/oracle.js');
var sync = require('../util/sync.js');

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            //cb(null, 'uploads/');
            let fileExtensions = file.originalname.split('.')[1];
            if(fileExtensions == 'xlsx') {
                cb(null, propertiesConfig.filepath.excelUploadPath);
            } else {

                cb(null, propertiesConfig.filepath.uploadsPath);
            }
        },
        filename: function (req, file, cb) {
            
            var fileName = file.originalname.substring(0, file.originalname.lastIndexOf("."));
            var fileExt = file.originalname.substring(file.originalname.lastIndexOf(".") + 1, file.originalname.length);

            var tempName = new Date().isoNum(14) + "" + Math.floor(Math.random() * 99);

            // file.originalname = "tempFileName" + "_" + tempName + "." + fileExt;
            //file.originalname = fileName + "_" + tempName + "." + fileExt;
            
            cb(null, file.originalname);
        }
    }),
});


const defaults = {
    encoding: 'utf8',
};
var router = express.Router();


/***************************************************************
 * Router
 * *************************************************************/
// [POST] 엑셀 업로드
router.post('/excelUpload', upload.any(), function (req, res) {
   
    sync.fiber(function () {
        console.log("!!!!!!!!!!!!!!!!!!!!!!! excelupload");
        let returnObj = {};
        let param = {};
        var docId = req.body.docToptype;
        var dataExcel = req.files[0].path;
        var dataExcelWorkbook = xlsx.readFile(dataExcel);
        var dataExcelSheet = dataExcelWorkbook.Sheets[dataExcelWorkbook.SheetNames[0]];      
        var dataResult = [];
        var dataRow;
        var dataRowNum;
        var dataColNum;
        var dataRange = xlsx.utils.decode_range(dataExcelSheet['!ref']);
        for (dataRowNum = (dataRange.s.r + 1); dataRowNum <= dataRange.e.r; dataRowNum++) {
             dataRow = [];
             for (dataColNum = dataRange.s.c; dataColNum <= dataRange.e.c; dataColNum++) {
                 var nextCell = dataExcelSheet[
                     xlsx.utils.encode_cell({ r: dataRowNum, c: dataColNum })
                 ];
                 if (typeof nextCell === 'undefined') {
                     dataRow.push(void 0);
                 } else dataRow.push(nextCell.w);
             }
             dataResult.push(dataRow);
        }
        //console.log(dataResult);
        param = {'dataResult': dataResult, 'docId': docId};
        sync.await(oracle.insertExcelAnswerData(param, sync.defer()));     
        res.send({'code': '200', 'type': 'excel'});
    });

    //console.log(dataExcelWorkbook);
    // commonDB.reqInsertExcelDataPath(pathResult, dataResult, req, res);
    //commonDB.reqInsertExcelData(dataResult);
    // insert filepath.xlsx 
    //for (var i = 1, x = pathResult.length; i < x; i++) { // 첫번째 행은 무시
    //    if (!commonUtil.isNull(pathResult[i][0])) {
    //        let data = [];
    //        for (var j = 0, y = pathResult[i].length; j < y; j++) {
    //            data.push(commonUtil.nvl(pathResult[i][j]));
    //        }
    //        console.log(`insert pathResult : ` + i);
    //        commonDB.queryNoRows(queryConfig.batchLearningConfig.insertBatchAnswerFile, data, callbackBlank);
    //    } else {
    //        console.log(`finish insert pathResult...`);
    //        continue;
    //    }
    //}
    // insert data.xlsx
    //for (var i = 1, x = dataResult.length; i < x; i++) { // 첫번째 행은 무시
    //    if (!commonUtil.isNull(dataResult[i][0])) {
    //        let data = [];
    //        for (var j = 0, y = dataResult[i].length; j < y; j++) {
    //            data.push(commonUtil.nvl(dataResult[i][j]));
    //        }
    //        console.log(`insert dataResult : ` + x);
    //        commonDB.queryNoRows(queryConfig.batchLearningConfig.insertBatchAnswerData, data, callbackBlank);
    //    } else {
    //        console.log(`finish insert dataResult...`);
    //        continue;
    //    }
    //}
    //res.send({'code': '200', 'type': 'excel'});
});

router.post('/imageUpload', upload.any(), function (req, res) {
    sync.fiber(function () {
        var files = req.files;
        
        var fileInfo = [];
        var returnObj = [];

        Step(          
            function uploadConvertStep() {
                var self = this;
                files.forEach(function (element) {
                    var result = uploadConvert_new(element, self.parallel());
                    fileInfo.push(result.fileInfo);
                    returnObj.push(result.returnObj);
                });
            },
                
            function finalize(err) {
                if (err) console.log(err);
                var filePath = propertiesConfig.auto.ftpFileUrl;
                for (var i in fileInfo) {
                    var fileName = fileInfo[i].oriFileName;
                    // TBL_FTP_FILE_LIST table insert   
                    // sync.await(oracle.insertFtpFileListFromUi([filePath, fileName], sync.defer()));
                }
                res.send({ code: 200, message: returnObj, fileInfo: fileInfo, type: 'image' });
            }         
        );
            
       

    });

    /*
    for (var i = 0; i < files.length; i++) {
        if (files[i].originalname.split('.')[1].toLowerCase() === 'tif' ||
            files[i].originalname.split('.')[1].toLowerCase() === 'tiff') {
            var fileObj = files[i]; // 파일
            var oriFileName = fileObj.originalname; // 파일 원본명
            var filePath = fileObj.path;    // 파일 경로
            var ifile = filePath;
            var ofile = "/uploads/" + oriFileName.split('.')[0] + '.jpg';
            // 파일 정보 추출
            //var imgId = Math.random().toString(36).slice(2); // TODO : 임시로 imgId 생성
            var d = new Date();
            var imgId = d.isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000;
            //console.log("생성한 imgId와 길이 : " + imgId + " : " + imgId.length);

            //var filePath = ifile;    // 파일 경로

            var _lastDot = oriFileName.lastIndexOf('.');
            var fileExt = oriFileName.substring(_lastDot + 1, oriFileName.length).toLowerCase();        // 파일 확장자
            var fileSize = fileObj.size;  // 파일 크기
            var contentType = fileObj.mimetype; // 컨텐트타입
            var svrFileName = Math.random().toString(26).slice(2);  // 서버에 저장될 랜덤 파일명

            var fileParam = {
                imgId: imgId,
                filePath: filePath,
                oriFileName: oriFileName,
                convertFileName: ofile.split('.')[0] + '.jpg',
                fileExt: fileExt,
                fileSize: fileSize,
                contentType: contentType,
                svrFileName: svrFileName
            };

            //console.log(`file Info : ${JSON.stringify(fileParam)}`);
            fileInfo.push(fileParam);
            returnObj.push(oriFileName.split('.')[0] + '.jpg');

            exec('module\\imageMagick\\convert.exe -density 800x800 ' + ifile + ' ' + ofile, function (err, out, code) {
                if (endCount === files.length - 1) {
                    res.send({ code: 200, message: returnObj, fileInfo: fileInfo, type: 'image' });
                }
                endCount++;
            });
        } else if (files[i].originalname.split('.')[1].toLowerCase() === 'jpg') {

        }
    }
    */
});

function uploadConvert_new(files, callback) {
    var returnResult = {};
    var imagePath = propertiesConfig.filepath.imagePath;
    //var convertedImagePath = appRoot + '\\uploads\\';
    var convertedImagePath = propertiesConfig.filepath.uploadsPath;
    console.time("file upload & convert");
    var fileObj = files;
    //var fileExt = fileObj.originalname.split('.')[1];
    var fileExt = fileObj.originalname.substring(fileObj.originalname.lastIndexOf(".") + 1, fileObj.originalname.length);

    if (fileExt.toLowerCase() === 'tif' || fileExt.toLowerCase() === 'jpg') {
        var fileItem = {
            imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
            filePath: fileObj.path.replace(/\\/gi, '/'),
            oriFileName: fileObj.originalname,
            convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
            convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.jpg',
            fileExt: fileExt,
            fileSize: fileObj.size,
            contentType: fileObj.mimetype,
            imgCount: 1
        };
        returnResult.fileInfo = fileItem;

        var fileNames = [];
        returnResult.returnObj = fileItem.convertFileName;

        var ifile = convertedImagePath + fileObj.originalname;
        var ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.jpg';

    } else if (fileExt.toLowerCase() === 'png') {
        var fileItem = {
            imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
            filePath: fileObj.path.replace(/\\/gi, '/'),
            oriFileName: fileObj.originalname,
            convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
            convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png',
            fileExt: fileExt,
            fileSize: fileObj.size,
            contentType: fileObj.mimetype,
            imgCount: 1
        };
        returnResult.fileInfo = fileItem;

        var fileNames = [];
        returnResult.returnObj = fileItem.convertFileName;

        var ifile = convertedImagePath + fileObj.originalname;
        var ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png';

    } else if (fileExt.toLowerCase() === 'docx' || fileExt.toLowerCase() === 'doc'
        || fileExt.toLowerCase() === 'xlsx' || fileExt.toLowerCase() === 'xls'
        || fileExt.toLowerCase() === 'pptx' || fileExt.toLowerCase() === 'ppt'
        || fileExt.toLowerCase() === 'pdf') {


        var ifile = convertedImagePath + fileObj.originalname;
        var ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.pdf';

        var convertPdf = '';

        //file decription 운영 경로
        //execSync('java -jar C:/ICR/app/source/module/DrmDec.jar "' + ifile + '"');

        //file convert MsOffice to Pdf
        if (!(fileExt.toLowerCase() === 'pdf')) {
            //convertPdf = execSync('"C:/Program Files/LibreOffice/program/python.exe" C:/ICR/app/source/module/unoconv/unoconv.py -f pdf -o "' + ofile + '" "' + ifile + '"');  //운영
            convertPdf = execSync('"C:/Program Files/LibreOffice/program/python.exe" C:/projectWork/ocrService/module/unoconv/unoconv.py -f pdf -o "' + ofile + '" "' + ifile + '"');
        }

        ifile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.pdf';
        ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png';

        //file convert Pdf to Png
        if (convertPdf || fileExt.toLowerCase() === 'pdf') {

            var fileItem = {
                imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                filePath: fileObj.path.replace(/\\/gi, '/'),
                oriFileName: fileObj.originalname,
                convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png',
                fileExt: fileExt,
                fileSize: fileObj.size,
                contentType: fileObj.mimetype,
                imgCount: 1
            };
            returnResult.fileInfo = fileItem;
            returnResult.returnObj = fileItem.convertFileName;

        } else {
            throw new Error("pdf convert fail");
        }
    }
    console.timeEnd("file upload & convert");

    callback();
    return returnResult;
}

function uploadConvert(files, callback) {
    var returnResult = {};
    var imagePath = propertiesConfig.filepath.imagePath;
    //var convertedImagePath = appRoot + '\\uploads\\';
    var convertedImagePath = propertiesConfig.filepath.uploadsPath;
    console.time("file upload & convert");
    var fileObj = files;
    //var fileExt = fileObj.originalname.split('.')[1];
    var fileExt = fileObj.originalname.substring(fileObj.originalname.lastIndexOf(".") + 1, fileObj.originalname.length);

    if (fileExt.toLowerCase() === 'tif' || fileExt.toLowerCase() === 'jpg') {
        var fileItem = {
            imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
            filePath: fileObj.path.replace(/\\/gi, '/'),
            oriFileName: fileObj.originalname,
            convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
            convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.jpg',
            fileExt: fileExt,
            fileSize: fileObj.size,
            contentType: fileObj.mimetype,
            imgCount: 1
        };
        returnResult.fileInfo = fileItem;

        var fileNames = [];
        returnResult.returnObj = fileItem.convertFileName;

        var ifile = convertedImagePath + fileObj.originalname;
        var ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.jpg';
        
        var result = execSync('module\\imageMagick\\convert.exe -colorspace Gray -density 800x800 ' + ifile + ' ' + ofile);
        if (result.status != 0) {
            throw new Error(result.stderr);
        }

        var encode = Buffer.from(ofile).toString("base64");
        pythonConfig.columnMappingOptions.args = [];
        pythonConfig.columnMappingOptions.args.push(encode);
        var resPyStr = sync.await(PythonShell.run('lineDeleteAndNoiseDelete.py', pythonConfig.columnMappingOptions, sync.defer()));

    } else if (fileExt.toLowerCase() === 'png') {
        var fileItem = {
            imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
            filePath: fileObj.path.replace(/\\/gi, '/'),
            oriFileName: fileObj.originalname,
            convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
            convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png',
            fileExt: fileExt,
            fileSize: fileObj.size,
            contentType: fileObj.mimetype,
            imgCount: 1
        };
        returnResult.fileInfo = fileItem;

        var fileNames = [];
        returnResult.returnObj = fileItem.convertFileName;

        var ifile = convertedImagePath + fileObj.originalname;
        var ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png';

        var encode = Buffer.from(ofile).toString("base64");
        pythonConfig.columnMappingOptions.args = [];
        pythonConfig.columnMappingOptions.args.push(encode);
        var resPyStr = sync.await(PythonShell.run('lineDeleteAndNoiseDelete.py', pythonConfig.columnMappingOptions, sync.defer()));

    } else if (fileExt.toLowerCase() === 'docx' || fileExt.toLowerCase() === 'doc'
        || fileExt.toLowerCase() === 'xlsx' || fileExt.toLowerCase() === 'xls'
        || fileExt.toLowerCase() === 'pptx' || fileExt.toLowerCase() === 'ppt'
        || fileExt.toLowerCase() === 'pdf') {


        var ifile = convertedImagePath + fileObj.originalname;
        var ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.pdf';

        var convertPdf = '';

        //file decription 운영 경로
        //execSync('java -jar C:/ICR/app/source/module/DrmDec.jar "' + ifile + '"');

        //file convert MsOffice to Pdf
        if (!(fileExt.toLowerCase() === 'pdf')) {
            //convertPdf = execSync('"C:/Program Files/LibreOffice/program/python.exe" C:/ICR/app/source/module/unoconv/unoconv.py -f pdf -o "' + ofile + '" "' + ifile + '"');  //운영
            convertPdf = execSync('"C:/Program Files/LibreOffice/program/python.exe" C:/projectWork/ocrService/module/unoconv/unoconv.py -f pdf -o "' + ofile + '" "' + ifile + '"');
        }

        ifile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.pdf';
        ofile = convertedImagePath + fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png';

        //file convert Pdf to Png
        if (convertPdf || fileExt.toLowerCase() === 'pdf') {
            var result = execSync('module\\imageMagick\\convert.exe -colors 8 -density 300 -colorspace Gray -alpha remove -alpha off "' + ifile + '" "' + ofile + '"');

            if (result.status != 0) {
                throw new Error(result.stderr);
            }

            var isStop = false;
            var j = 0;

            while (!isStop) {
                try { // 하나의 파일 안의 여러 페이지면
                    var convertFileFullPath = files.path.substring(0, files.path.lastIndexOf(".")) + '-' + j + '.png';
                    var stat = fs.statSync(convertFileFullPath);
                    if (stat) {
                        var fileItem = {
                            imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                            filePath: fileObj.path.replace(/\\/gi, '/'),
                            oriFileName: fileObj.originalname,
                            convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                            convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '-' + j + '.png',
                            fileExt: fileExt,
                            fileSize: fileObj.size,
                            contentType: fileObj.mimetype,
                            imgCount : (j + 1)
                        };
 
                        returnResult.fileInfo = fileItem;
                        returnResult.returnObj = fileItem.convertFileName;

                        var encode = Buffer.from(convertFileFullPath).toString("base64");
                        pythonConfig.columnMappingOptions.args = [];
                        pythonConfig.columnMappingOptions.args.push(encode);
                        var resPyStr = sync.await(PythonShell.run('lineDeleteAndNoiseDelete.py', pythonConfig.columnMappingOptions, sync.defer()));
                    } else {
                        isStop = true;
                        break;
                    }
                } catch (err) { // 하나의 파일 안의 한 페이지면
                    try {
                        var convertFileFullPath = files.path.substring(0, files.path.lastIndexOf(".")) + '.png';
                        var stat2 = fs.statSync(convertFileFullPath);
                        if (stat2) {
                            var fileItem = {
                                imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                                filePath: fileObj.path.replace(/\\/gi, '/'),
                                oriFileName: fileObj.originalname,
                                convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                                convertFileName: fileObj.originalname.substring(0, fileObj.originalname.lastIndexOf(".")) + '.png',
                                fileExt: fileExt,
                                fileSize: fileObj.size,
                                contentType: fileObj.mimetype,
                                imgCount : (j + 1)
                            };
                            returnResult.fileInfo = fileItem;
                            returnResult.returnObj = fileItem.convertFileName;

                            var encode = Buffer.from(convertFileFullPath).toString("base64");
                            pythonConfig.columnMappingOptions.args = [];
                            pythonConfig.columnMappingOptions.args.push(encode);
                            var resPyStr = sync.await(PythonShell.run('lineDeleteAndNoiseDelete.py', pythonConfig.columnMappingOptions, sync.defer()));

                            break;
                        }
                    } catch (e) {
                        break;
                    }
                }
                j++;
            }

        } else {
            throw new Error("pdf convert fail");
        }
    }
    console.timeEnd("file upload & convert");
    
    callback();
    return returnResult;
}

router.post('/approvalDtlProcess', function (req, res) {
    var data = req.body.data;
    var returnObj;

    sync.fiber(function () {
        try {
            sync.await(oracle.approvalDtlProcess(data, sync.defer()));
            
            returnObj = { code: 200, message: 'modify textData success' };

        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

router.post('/modifyTextData', function (req, res) {
    var beforeData = req.body.beforeData;
    var afterData = req.body.afterData;
    var returnObj;

    sync.fiber(function () {
        try {
            
            for (var i in afterData.data) {
                for (var j in beforeData.data) {
                    if (afterData.data[i].location == beforeData.data[j].location) {
                        //사용자가 글자를 직접 수정한 경우 TBL_CONTRACT_MAPPING에 insert
                        if (afterData.data[i].text != beforeData.data[j].text) {
                            var item = [beforeData.data[j].originText, '', afterData.data[i].text, ''];
                            sync.await(oracle.insertContractMapping(item, sync.defer()));
                        }
                        //사용자가 지정한 컬럼라벨의 텍스트가 유효한 컬럼의 경우 OcrSymspell에 before text(중요!!) insert
                        if (afterData.data[i].colLbl >= 3 && afterData.data[i].colLbl <= 34) {
                            sync.await(oracle.insertOcrSymsSingle(beforeData.data[j], sync.defer()));
                        }
                        afterData.data[i].sid = sync.await(oracle.selectSid(beforeData.data[j], sync.defer()));
                        //라벨이 변경된 경우만 트레이닝 insert
                        if (afterData.data[i].colLbl != beforeData.data[j].colLbl) {
                            sync.await(oracle.insertColumnMapping(afterData.data[i], sync.defer()));
                        }
                    } 
                }
            }
            
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args = ["training"];
    
            sync.await(PythonShell.run('columnClassicify.py', pythonConfig.columnMappingOptions, sync.defer()));
            //sync.await(PythonShell.run('columnClassicifyFromAzure.py', pythonConfig.columnMappingOptions, sync.defer())); //azure

            // for (var i in afterData.data) {
            //     if (afterData.data[i].colLbl == 0 || afterData.data[i].colLbl == 1) { // ogCompany or contractName 
            //         for (var j in beforeData.data) {
            //             if (afterData.data[i].location == beforeData.data[j].location) {

            //                 if (isWordLengthMatch(afterData.data[i], beforeData.data[j])) { // text length difference is less than 2
            //                     sync.await(oracle.insertOcrSymspell([afterData.data[i]], sync.defer()));
            //                 } else {
            //                     beforeOgAndCtnm.push(beforeData.data[j]);
            //                     afterOgAndCtnm.push(afterData.data[i]);
            //                 }

            //             }
            //         }
            //     } else if (afterData.data[i].colLbl == 3) {// currency code
            //         for (var j in beforeData.data) {
            //             if (afterData.data[i].location == beforeData.data[j].location && afterData.data[i].text != beforeData.data[j].text) {
            //                 sync.await(oracle.insertOcrSymspellForCurcd([afterData.data[i], beforeData.data[j]], sync.defer()));
            //             }
            //         }
            //     } else if (afterData.data[i].colLbl != 37 && (afterData.data[i].colLbl >= 4 && afterData.data[i].colLbl <= 38)) {
            //         for (var j in beforeData.data) {
            //             if (afterData.data[i].location == beforeData.data[j].location) {
            //                 if (afterData.data[i].text.toLowerCase() != beforeData.data[j].text.toLowerCase()) { // text length difference is less than 2
            //                     sync.await(oracle.insertOcrSymspell([afterData.data[i]], sync.defer()));
            //                 }
            //             }
            //         }
            //     }
            // }

            // var params = convertContractMappingData(beforeOgAndCtnm, afterOgAndCtnm);
            // if (params) {
            //     for (var i in params) {
            //         var item = [params[i][0], params[i][1], params[i][2], params[i][3]];
            //         sync.await(oracle.insertContractMapping(item, sync.defer()));
            //     }
            // }
            returnObj = { code: 200, message: 'modify textData success' };

        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

router.post('/modifyBatchUiTextData', function (req, res) {
    var beforeData = req.body.beforeData;
    var afterData = req.body.afterData;
    var predLabelData = req.body.predLabelData;
    var predEntryData = req.body.predEntryData;
    var fileFullpath = req.body.beforeData.fileinfo.filepath;
    var docTopType = beforeData.docCategory.DOCTOPTYPE;
    var docType = beforeData.docCategory.DOCTYPE;
    var returnObj;
    sync.fiber(function () {
        try {

            for (var i in afterData.data) {
                for (var j in beforeData.data) {
                    if (afterData.data[i].location == beforeData.data[j].location) {
                        //사용자가 글자를 직접 수정한 경우 TBL_CONTRACT_MAPPING에 insert
                        if (afterData.data[i].text != beforeData.data[j].text) {
                            var item = [beforeData.data[j].originText, '', afterData.data[i].text, ''];
                            //sync.await(oracle.insertContractMapping(item, sync.defer()));
                            //sync.await(oracle.insertSymspell(afterData.data[i], sync.defer()));
                        }
                        //사용자가 지정한 컬럼라벨의 텍스트가 유효한 컬럼의 경우 OcrSymspell에 before text(중요!!) insert
                        if (afterData.data[i].colLbl >= 1) {
                            //sync.await(oracle.insertOcrSymsSingle(beforeData.data[j], sync.defer()));
                        }
                        afterData.data[i].sid = sync.await(oracle.selectSid(beforeData.data[j], sync.defer()));
                        //라벨이 변경된 경우만 트레이닝 insert
                        if ((afterData.data[i].colLbl != beforeData.data[j].colLbl && beforeData.data[j].colLbl >= -1) || (beforeData.data[j].entryLbl != afterData.data[i].colLbl && beforeData.data[j].entryLbl > 0)) {
                            // 현재소스
                            var itemLoc = beforeData.data[j].location.split(",");
                            var yData = [];
                            var xData = [];

                            for (var k in beforeData.data) {
                                if (k == j) continue;
                                var compareData = beforeData.data[k];
                                var dataLoc = compareData.location.split(",");
                                var inputOcrData;

                                if (afterData.data[i].colType == 'L') { // label
                                    //위로 2개 문장 가져오기
                                    if (bottomCheck(itemLoc[1], dataLoc[1], 50) && locationCheck(itemLoc[0], dataLoc[0], 10, -20, 'label') && yData.length < 2) {
                                        yData.push(compareData["text"]);
                                    }
                                    //왼쪽으로 2개 문장 가져오기
                                    if (bottomCheck(itemLoc[1], dataLoc[1], 50) && locationCheck(itemLoc[1], dataLoc[1], 0, -20, 'label') && xData.length < 2) {
                                        xData.push(compareData["text"]);
                                    }
                                } else if (afterData.data[i].colType == 'E'){ // entry
                                    //아래로 4개 문장 가져오기
                                    if (bottomCheck(itemLoc[1], dataLoc[1], 10) && locationCheck(itemLoc[0], dataLoc[0], 10, -10, 'column') && yData.length < 4) {
                                        yData.push(compareData["text"]);
                                    }
                                    //오른쪽으로 4개 문장 가져오기
                                    if (bottomCheck(itemLoc[1], dataLoc[1], 10) && locationCheck(itemLoc[1], dataLoc[1], 10, -10, 'column') && xData.length < 4) {
                                        xData.push(compareData["text"]);
                                    }
                                }
                            }

                            if (afterData.data[i].colType == 'L') {
                                inputOcrData = [docType, beforeData.data[j].text, itemLoc[0] + ',' + itemLoc[2], itemLoc[1] + ',' + itemLoc[3], afterData.data[i].colLbl];
                            } else if (afterData.data[i].colType == 'E'){
                                inputOcrData = [docType, beforeData.data[j].text, itemLoc[0] + ',' + itemLoc[2], itemLoc[1] + ',' + itemLoc[3], docTopType];
                            }
                            for (var q = 0; q < 4; q++) {
                                if (q < xData.length) {
                                    inputOcrData.push(xData[q])
                                } else {
                                    inputOcrData.push(null)
                                }
                            }
                            for (var q = 0; q < 4; q++) {
                                if (q < yData.length) {
                                    inputOcrData.push(yData[q])
                                } else {
                                    inputOcrData.push(null)
                                }
                            }

                            beforeData.data[j].inputOcrData = afterData.data[i].inputOcrData = inputOcrData;
                            beforeData.data[j].yData = afterData.data[i].yData = yData;
                            beforeData.data[j].xData = afterData.data[i].xData = xData;
                            
                            sync.await(oracle.insertBatchColumnMapping(afterData.data[i], docType, beforeData.data[j], sync.defer()));  

                            /* 기존소스
                            var itemLoc = beforeData.data[j].location.split(",");
                            var yData = [];
                            var xData = [];
                            var seqNum;
                            var labelData = sync.await(oracle.selectIcrLabelDef(docTopType, sync.defer()));
                            var isLabel = false;
                            for (var inc=0; inc<labelData.rows.length; inc++) {
                                if (labelData.rows[inc].ENGNM == 'LabelTest') {
                                    seqNum = labelData.rows[inc].SEQNUM;
                                    break;
                                }
                            }
                            if (seqNum == afterData.data[i].colLbl) {
                                isLabel = true;
                            }

                            beforeData.data[j].isLabel = afterData.data[i].isLabel = isLabel;

                            for (var k in beforeData.data) {
                                if (k==j) {
                                    continue;
                                } 
                                var compareData = beforeData.data[k];
                                var dataLoc = compareData.location.split(",");

                                if (isLabel) {

                                    //위로 2개 문장 가져오기
                                    if ( bottomCheck(itemLoc[1], dataLoc[1], 50) && locationCheck(itemLoc[0], dataLoc[0], 10, -20, 'label') && yData.length < 2 ) {
                                        yData.push(compareData["text"]);
                                    }
                                    //왼쪽으로 2개 문장 가져오기

                                    if ( bottomCheck(itemLoc[1], dataLoc[1], 50) && locationCheck(itemLoc[1], dataLoc[1], 0, -20, 'label') && xData.length < 2 ) {
                                        xData.push(compareData["text"]);
                                    }
                                } else { 
                                    //아래로 4개 문장 가져오기
                                    if ( bottomCheck(itemLoc[1], dataLoc[1], 10) && locationCheck(itemLoc[0], dataLoc[0], 10, -10, 'column') && yData.length < 4 ) {
                                        yData.push(compareData["text"]);
                                    }
                                    //오른쪽으로 4개 문장 가져오기
                                    if ( bottomCheck(itemLoc[1], dataLoc[1], 10) && locationCheck(itemLoc[1], dataLoc[1], 10, -10, 'column') && xData.length < 4 ) {
                                        xData.push(compareData["text"]);
                                    }
                                }
                                
                            }
                            
                            var classTmp = "901"

                            var inputOcrData;
                            if (isLabel) {
                                inputOcrData = [docType, beforeData.data[j].text, itemLoc[0], itemLoc[1], classTmp];
                            } else {
                                inputOcrData = [docType, beforeData.data[j].text, itemLoc[0] + ',' +  itemLoc[2], itemLoc[1] + ',' +  itemLoc[3], docTopType];
                            }
                            for (var q=0; q<4; q++) {
                                if (q < xData.length) {
                                    inputOcrData.push(xData[q])
                                } else {
                                    inputOcrData.push(null)
                                }
                            }
                            for (var q=0; q<4; q++) {
                                if (q < yData.length) {
                                    inputOcrData.push(yData[q])
                                } else {
                                    inputOcrData.push(null)
                                }
                            }

                            beforeData.data[j].inputOcrData = afterData.data[i].inputOcrData = inputOcrData;
                            beforeData.data[j].yData = afterData.data[i].yData = yData;
                            beforeData.data[j].xData = afterData.data[i].xData = xData;

                            sync.await(oracle.insertBatchColumnMapping(afterData.data[i], docType, beforeData.data[j], sync.defer()));
                            */
                        }
                    }
                }
            }

            //label prediction ML DB insert
            sync.await(oracle.insertPredLabelMapping(predLabelData, sync.defer()));
            //entry prediction ML DB insert
            sync.await(oracle.insertPredEntryMapping(predEntryData, sync.defer()));
      
            //var d = new Date();
            //var imgId = d.isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000;
            var filePath = fileFullpath.substring(0, fileFullpath.lastIndexOf('/') + 1);
            var fileName = fileFullpath.substring(fileFullpath.lastIndexOf('/') + 1);
            //sync.await(oracle.insertFtpFileListFromUi([filePath, fileName], sync.defer()));

            // TBL_BATCH_PO_ML_EXPORT table insert
            var exportData = "[";
            let labels = sync.await(oracle.selectIcrLabelDef(docTopType, sync.defer()));
            for (var i in labels.rows) {
                var entryData = "";
                for (var j in afterData.data) {
                    var item = null;
                    if (afterData.data[j].colType == 'E' && labels.rows[i].SEQNUM == afterData.data[j].colLbl) {
                        item = ((entryData == "") ? "" : " | ") + afterData.data[j].location.split(',')[1] + "::" + afterData.data[j].text;
                        entryData += item;
                    }
                }
                exportData += ((entryData != "") ? "\"" + entryData + "\"" : null);
                exportData += ",";                
            }
            exportData = exportData.slice(0, -1);
            exportData += "]";

            sync.await(oracle.insertBatchPoMlExportFromUi([docTopType, fileFullpath, exportData], sync.defer()));

            returnObj = { code: 200, message: 'modify textData success' };

        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

Date.prototype.isoNum = function (n) {
    var tzoffset = this.getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(this - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.replace(/[-T:\.Z]/g, '').substring(0, n || 20); // YYYYMMDD
};

function locationCheck(loc1, loc2, plus, minus, islabel) {
    if (islabel == 'label') {
        if (minus < (loc2 - loc1) && (loc2 - loc1) < plus) {
            return true;
        }
        else {
            return false;
        }
    } else {
        if (minus < (loc1 - loc2) && (loc1 - loc2) < plus) {
            return true;
        }
        else {
            return false;
        }
    }
    
}


function bottomCheck(loc1, loc2, num) {
    if ( (loc1 - loc2) < num) {
        return true;
    }
    else {
        return false;
    }
}

router.post('/selectTypoData', function (req, res) {
    var data = req.body.data.data;
    var ogCompanyName = [];
    var ctnm = [];
    var curcd = [];
    var returnObj;

    sync.fiber(function () {
        try {
            for (var i in data) {
                if (data[i].colLbl == 0) {
                    ogCompanyName.push(data[i]);
                } else if (data[i].colLbl == 1) {
                    ctnm.push(data[i]);
                } else if (data[i].colLbl == 3) {
                    curcd.push(data[i]);
                }
            }
            if (ogCompanyName.length > ctnm.length) { // N:1
                for (var i = 1; i < ogCompanyName.length; i++) ctnm.push(ctnm[0]);
            } else if (ogCompanyName.length > ctnm.length) { // 1:N
                for (var i = 1; i < ctnm.length; i++) ogCompanyName.push(ogCompanyName[0]);
            }

            // select tbl_contract_mapping And save modified text data (ogCompanyName, contractName)
            for (var i in ogCompanyName) {
                var result = sync.await(oracle.selectContractMapping2([ogCompanyName[i].text, ctnm[i].text], sync.defer()));
                if (result) {
                    ogCompanyName[i].text = result.ASOGCOMPANYNAME;
                    ctnm[i].text = result.ASCTNM;
                }
            }

            // select tbl_curcd_mapping And save modified text data (curcd)
            for (var i in curcd) {
                var result = sync.await(oracle.selectCurcdMapping(curcd[i].text, sync.defer()));
                if (result) {
                    curcd[i].text = result.AFTERTEXT;
                }
            }

            // save modified text data to return data
            for (var i in data) {
                if (data[i].colLbl == 0 || data[i].colLbl == 1) {
                    for (var j in ogCompanyName) {
                        if (data[i].location == ogCompanyName[j].location) {
                            data[i].text = ogCompanyName[j].text;
                        }
                    }
                } else if (data[i].colLbl == 3) {
                    for (var j in curcd) {
                        if (data[i].location == curcd[j].location) {
                            data[i].text = curcd[j].text;
                        }
                    }
                }
            }

            returnObj = { code: 200, data: data };
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

router.post('/selectTypoData2', function (req, res) {
    var data = req.body.data.data.data;
    var ogCompanyName = [];
    var ctnm = [];
    var curcd = [];
    var returnObj;

    sync.fiber(function () {
        try {
            for (var i in data) {
                let result = sync.await(oracle.selectDomainDict([data[i].text], sync.defer()));
                if(result) {
                    data[i].text = result;
                }
            }

            returnObj = { code: 200, data: data };
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

router.post('/selectUserInfo', function (req, res) {
    var returnObj;
    let userInfoArr;
    var param = req.body.param;

    sync.fiber(function () {
        try {
            userInfoArr = sync.await(oracle.selectUserInfo(param ,sync.defer()));

            returnObj = { code: 200, data: userInfoArr };
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

// [POST] OCR API (request binary data)
router.post('/ocr', function (req, res) {
    var fileInfo = req.body.fileInfo;

    console.time("ocrTime")
    fs.readFile(fileInfo.convertedFilePath + fileInfo.convertFileName , function (err, data) {
        if (err) { // fs error
            console.log(err);
            res.send({ code: 404, error: '파일이 없습니다.' });
        } else {

            var buffer;
            try {
                var base64 = new Buffer(data, 'binary').toString('base64');
                var binaryString = new Buffer(base64, 'base64').toString('binary');
                buffer = new Buffer(binaryString, "binary");
            } catch (e) {
                res.send({ error: '파일 읽기 도중 버퍼 에러가 발생했습니다.' });
            } finally {
                if (!buffer) res.send({ error: '파일 버퍼가 비어있습니다.' });
            }

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
                    res.send({ error: '요청 에러가 발생했습니다.' });
                } else {
                    if ((JSON.parse(body)).code) { // ocr api error
                        console.timeEnd("ocrTime");
                        res.send({ code: (JSON.parse(body)).code, message: (JSON.parse(body)).message });
                    } else { // 성공
                        console.timeEnd("ocrTime");
                        res.send(ocrParsing(body));
                    }
                }
            });
        }
    });
});

//pass => 한글 English 1234567890 <>,.!@#$%^&*()~`-+_=|;:?/ lid => Iñtërnâtiônàlizætiøn☃
//send전 parsing 된 array 중 text안에 {}[]'" 있을 경우 삭제
function ocrParsing(body) {
    var data = [];

    try {
        var body = JSON.parse(body);

        // ocr line parsing
        for (var i = 0; i < body.regions.length; i++) {
            for (var j = 0; j < body.regions[i].lines.length; j++) {
                var item = '';
                for (var k = 0; k < body.regions[i].lines[j].words.length; k++) {
                    if (body.regions[i].lines[j].words[k].text == '공단부담금') {
                        data.push({ 'location': body.regions[i].lines[j].words[k].boundingBox, 'text': body.regions[i].lines[j].words[k].text.trim() });
                        break;
                    }
                    item += body.regions[i].lines[j].words[k].text + ' ';
                }
                data.push({ 'location': body.regions[i].lines[j].boundingBox, 'text': item.trim() });
            }
        }

        // ocr x location parsing
        var xInterval = 6; // x pixel value

        for (var i = 0; i < data.length; i++) {
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

        for (var i = 0; i < data.length; i++) {
            if (data[i].location == '' && data[i].text == '') data.splice(i, 1);
        }
        // ocr text Unknown character parsing
        var ignoreChar = [ '"'.charCodeAt(0), '\''.charCodeAt(0), '['.charCodeAt(0), ']'.charCodeAt(0),
            '{'.charCodeAt(0), '}'.charCodeAt(0) ];

        for (var i = 0; i < data.length; i++) {
            var modifyText = data[i].text;
            for (var j = 0; j < data[i].text.length; j++) {
                var ascii = data[i].text.charCodeAt(j);
                if (ascii > 127 || ignoreChar.indexOf(ascii) != -1) {
                    var rep = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
                    if (!rep.test(data[i].text[j])) { // not Korean
                        rep = new RegExp(((ascii < 128)? '\\':'') + data[i].text[j], "gi");
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
        //console.log(data);
        return data;
    }
}

// [POST] TBL_COMM_ERROR INSERT
var callIInsertCommError = function (rows, req, res) {
    res.send({ code: 200 });
};

router.post('/insertCommError', function (req, res) {
    var eCode = ocrErrorCode(req.body.eCode); // 에러코드
    var type = req.body.type;
    var param = [];

    param.push(req.session.userId);
    if (type == 'ocr') {
        param.push(1001);
    } else if (type == 'typo') {
        param.push(1002);
    } else if (type == 'domain') {
        param.push(1003);     
    } else {
        param.push(9999);
    }
    param.push((eCode) ? eCode : 999);

    commonDB.reqQueryParam(queryConfig.commonConfig.insertCommError, param, callIInsertCommError, req, res);
});

function isWordLengthMatch(afterDataItem, beforeDataItem) {
    var lengthDifference = afterDataItem.text.length - beforeDataItem.text.length;
    if (lengthDifference >= -1 && lengthDifference <= 1) {
        return true;
    } else {
        return false;
    }
}

function convertContractMappingData(beforeOgAndCtnm, afterOgAndCtnm) {
    var extOgComapnyName = [];
    var extCtnm = [];
    var asOgComapnyName = [];
    var asCtnm = [];
    var OgCount = 0;
    var ctnmcount = 0;
    var returnArray = [];

    // ogComapanyName And contractName count
    for (var i in afterOgAndCtnm) {
        if (afterOgAndCtnm[i].colLbl == 0) {
            OgCount++;
        }
    }
    ctnmcount = afterOgAndCtnm.length - OgCount;

    if (OgCount == 1 || ctnmcount == 1) { // not N:N (case 1:1, 1:N, N:1)

        // add an array of before modifying data (ogComapanyName And contractName)
        for (var i in beforeOgAndCtnm) {
            for (var j in afterOgAndCtnm) {
                if (beforeOgAndCtnm[i].location == afterOgAndCtnm[j].location && afterOgAndCtnm[i].colLbl == 0) {
                    extOgComapnyName.push(beforeOgAndCtnm[i].text);
                    break;
                } else if (beforeOgAndCtnm[i].location == afterOgAndCtnm[j].location && afterOgAndCtnm[i].colLbl == 1) {
                    extCtnm.push(beforeOgAndCtnm[i].text);
                    break;
                }
            }
        }

        // add an array of after modifying data (ogComapanyName And contractName)
        for (var i in afterOgAndCtnm) {
            if (afterOgAndCtnm[i].colLbl == 0) {
                asOgComapnyName.push(afterOgAndCtnm[i].text);
            } else {
                asCtnm.push(afterOgAndCtnm[i].text);
            }
        }

        // determining relationships (1:1 or 1:N or N:N)
        if (asOgComapnyName.length == asCtnm.length) { // 1:1
            returnArray = [[extOgComapnyName[0], extCtnm[0], asOgComapnyName[0], asCtnm[0]]];
        } else if (asOgComapnyName.length < asCtnm.length) { // 1:N
            for (var i in asCtnm) {
                returnArray.push([extOgComapnyName[0], extCtnm[i], asOgComapnyName[0], asCtnm[i]]);
            }
        } else { // N:1
            for (var i in asOgComapnyName) {
                returnArray.push([extOgComapnyName[i], extCtnm[0], asOgComapnyName[i], asCtnm[0]]);
            }
        }

        return returnArray;

    } else { // N:N
        return null;
    }
}

// ocr request err code
function ocrErrorCode(code) {
    code = code.trim();
    if (code == 'InvalidImageUrl' || code == 'InvalidImageFormat' || code == 'InvalidImageSize' || code == 'NotSupportedLanguage') {
        return 400;
    } else if (code == 'BadArgument') {
        return 415;
    } else if (code == 'FailedToProcess' || code == 'Timeout' || code == 'InternalServerError') {
        return 500;
    } else {
        return 999;
    }
}

// [POST] 헤더 사용자관리 팝업 패스워드 비교
var callbackHeaderUserPopSelectPw = function (rows, req, res) {
    res.send({ code: 200, cnt: rows });
};
router.post('/headerUserPopSelectPw', function (req, res) {
    var condQuery = ` WHERE USERID = '${req.session.userId}' AND USERPW = '${req.body.userPw}' `;
    var query = queryConfig.userMngConfig.headerUserPopSelectPw + condQuery;
    commonDB.reqQuery(query, callbackHeaderUserPopSelectPw, req, res);
});


// [POST] 헤더 사용자관리 팝업 패스워드 변경
var callbackHeaderUserPopChangePw = function (rows, req, res) {
    res.send({ code: 200, cnt: rows });
};
router.post('/headerUserPopChangePw', function (req, res) {
    var condQuery = ` USERPW = '${req.body.userPw}' WHERE USERID = '${req.session.userId}' `;
    var query = queryConfig.userMngConfig.updateUser + condQuery;
    var param = [req.body.userPw, req.session.userId];
    commonDB.reqQuery(query, callbackHeaderUserPopChangePw, req, res);
});

// [POST] 레프트사이드바 계산서등록(진행 수) 표시
var callbackLeftSideBarInvoiceRegistration = function (rows, req, res) {
    res.send({ code: 200, cnt: rows[0].CNT });
};
router.post('/leftSideBarInvoiceRegistration', function (req, res) {
    var param = [];
    var andQuery = '';
    if (req.body.scanApproval == 'Y' && req.body.adminApproval == 'N') {
        andQuery = 'AND UPLOADNUM = ' + "'" + req.session.userId + "' AND ICRNUM IS NULL AND MIDDLENUM IS NULL AND FINALNUM IS NULL";
    } else if (req.body.icrApproval == 'Y' && req.body.adminApproval == 'N') {
        andQuery = 'AND ICRNUM = ' + "'" + req.session.userId + "' AND MIDDLENUM IS NULL AND FINALNUM IS NULL";
    } else if (req.body.adminApproval == 'Y') {
        andQuery = "AND MIDDLENUM IS NULL AND FINALNUM IS NULL";
    }
    commonDB.reqCountQueryParam2(queryConfig.sessionConfig.leftSideBarInvoiceRegistration + andQuery, param, callbackLeftSideBarInvoiceRegistration, req, res);
   
});

// [POST] 레프트사이드바 내결재(진행 수) 표시
var callbackLeftSideBarMyApproval = function (rows, req, res) {
    res.send({ code: 200, cnt: rows[0].CNT });
};
router.post('/leftSideBarMyApproval', function (req, res) {
    var param = [];
    var andQuery='';
    if (req.body.middleApproval == 'Y' && req.body.adminApproval == 'N') {
        andQuery = 'AND MIDDLENUM = ' + "'" + req.session.userId + "'";
    } else if (req.body.lastApproval == 'Y' && req.body.adminApproval == 'N') {
        andQuery = 'AND FINALNUM = ' + "'" + req.session.userId + "'";
    } else if (req.body.adminApproval == 'Y') {
        andQuery = "OR STATUS = '03' AND MIDDLENUM IS NOT NULL";
    }
    commonDB.reqCountQueryParam2(queryConfig.sessionConfig.leftSideBarMyApproval + andQuery, param, callbackLeftSideBarMyApproval, req, res);
});

// [POST] Increase OCR COUNT
// ocrCount : 증가시킬 OCR COUNT
// userId : 사용자 ID
var callbackUpdateOcrCount = function (rows, req, res) {
    res.send({ code: 200, cnt: rows });
};
// server에서 호출하여 증가
var updateOcrCount = function (req, res, ocrCount) {
    var param = [ocrCount, req.session.userId];
    commonDB.reqQueryParam(queryConfig.sessionConfig.updateOcrCount, param, callbackUpdateOcrCount, req, res);
};
// client에서 호출하여 증가
router.post('/updateOcrCount', function (req, res) {
    var param = [req.body.ocrCount, req.session.userId];
    commonDB.reqQueryParam(queryConfig.sessionConfig.updateOcrCount, param, callbackUpdateOcrCount, req, res);
});

module.exports = router;
