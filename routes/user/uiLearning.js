'use strict';
var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var request = require('sync-request');
var oracledb = require('oracledb');
var dbConfig = require('../../config/dbConfig.js');
var logger = require('../util/logger');
var sync = require('../util/sync.js');
var oracle = require('../util/oracle.js');
var pythonConfig = require(appRoot + '/config/pythonConfig');
var PythonShell = require('python-shell');
var ui = require('../util/ui.js');
var transPantternVar = require('./transPattern');
var batch = require('../util/batch.js');
var ocrUtil = require('../util/ocr.js');

var date = require('date-utils');

var ocrJs = require('../util/ocr.js');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');

//const winston = require('../util/winston')

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/');
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
    }),
});
var commonDB = require(appRoot + '/public/js/common.db.js');
var commModule = require(appRoot + '/public/js/import.js');
var commonUtil = commModule.commonUtil;
var router = commModule.router;
var queryConfig = commModule.queryConfig;
const defaults = {
    encoding: 'utf8',
};
var aimain = require('../util/aiMain');

var mlclassify = require('../util/mlClassify.js');

var router = express.Router();

var insertTextClassification = queryConfig.uiLearningConfig.insertTextClassification;
var insertLabelMapping = queryConfig.uiLearningConfig.insertLabelMapping;
var selectLabel = queryConfig.uiLearningConfig.selectLabel;
var insertTypo = queryConfig.uiLearningConfig.insertTypo;
var insertDomainDic = queryConfig.uiLearningConfig.insertDomainDic;
var selectTypo = queryConfig.uiLearningConfig.selectTypo;
var updateTypo = queryConfig.uiLearningConfig.updateTypo;
var selectColumn = queryConfig.uiLearningConfig.selectColumn;

router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});

// uiLearning.html 보여주기 (get)
router.get('/', function (req, res) {
    var fileName = "";
    if (req.query.fileName) fileName = req.query.fileName;
    if (req.isAuthenticated()) res.render('user/uiLearning', { currentUser: req.user, fileName: fileName });
    else res.redirect("/logout");
});

// userDashbaord.html 보여주기 (post)
router.post('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/uiLearning', { currentUser: req.user });
    else res.redirect("/logout");
});

router.post('/uiLearnTraining', function (req, res) {
    req.setTimeout(120000);
    sync.fiber(function () {
        var filepath = req.body.fileInfo.filePath;
        var isAuto = req.body.isAuto;
        var uiData;

        uiData = sync.await(uiLearnTraining_new(filepath, isAuto, sync.defer()));

        res.send({ data: uiData });
    });
});

function uiLearnTraining_new(filepath, isAuto, callback) {
    sync.fiber(function () {
        try{
            // var dt = new Date(); 
            var filename = (filepath.lastIndexOf("/") != -1) ? filepath.slice(filepath.lastIndexOf("/") + 1) : filepath;
            var dt = sync.await(oracle.selectDocScanDate(filepath, sync.defer()));
            // dt.toFormat('YYYYMM');
            var icrRestResult = sync.await(ocrUtil.icrRest(filepath, dt, isAuto, sync.defer()));
            // pythonConfig.columnMappingOptions.args = [];
            // pythonConfig.columnMappingOptions.args.push(filepath);
            // var resPyStr = sync.await(PythonShell.run('pyOcr.py', pythonConfig.columnMappingOptions, sync.defer()));
            // var testStr = resPyStr[0].replace('b', '');
            // testStr = testStr.replace(/'/g, '');
            // var decode = Buffer.from(testStr, 'base64').toString('utf-8');
            var resPyArr = JSON.parse(icrRestResult);
            var retData = {};
            var retDataList = [];
            var docCategory = {};
            for (var i in resPyArr) {
                //sync.await(ocrUtil.downloadRestSaveImg(resPyArr[i].fileName, sync.defer()));
                if (i == 0) {
                    docCategory = resPyArr[i].docCategory;
                }
                resPyArr[i].docCategory = docCategory;
                retData = sync.await(mlclassify.classify(resPyArr[i], sync.defer())); // 오타수정 및 엔트리 추출
                var labelData = sync.await(oracle.selectIcrLabelDef(retData.docCategory.DOCTOPTYPE, sync.defer()));
                var docName = sync.await(oracle.selectDocName(retData.docCategory.DOCTYPE, sync.defer()));

				if (docName.length != 0) {
					retData.docCategory.DOCNAME = docName[0].DOCNAME;
				}
				else {
					retData.docCategory.DOCNAME = "unKnown";
				}
				
                retData.labelData = labelData.rows;

                // 정규식 적용
                for(var ii= 0; ii < resPyArr[i].data.length; ii++){
                    // if(retData.data[ii]["colLbl"] != -1){
                    if(retData.data[ii]["entryLbl"]){
                        for(var jj = 0; jj < labelData.rows.length; jj++) {
                            if(retData.data[ii]["entryLbl"] == labelData.rows[jj].SEQNUM) {
                                var re = new RegExp(labelData.rows[jj].VALID,'gi');   
                                if(retData.data[ii]["text"] != null)
                                {
                                    var keyParts = retData.data[ii]["text"].match(re); 
                                    if(keyParts != null && labelData.rows[jj].SEQNUM !="504" && labelData.rows[jj].SEQNUM !="877")
                                    {
                                        retData.data[ii]["text"] = keyParts.toString().replace(/,/gi,'');
                                    } 
                                }
                                // var keyParts = retData.data[ii]["text"].match(re); 
                                // if(keyParts != null && labelData.rows[jj].SEQNUM !="504")
                                // {
                                //     retData.data[ii]["text"] = keyParts.toString().replace(/,/gi,'');
                                // }
                            }                                
                        }
                    }                        
                }

                retData = sync.await(oracle.selectNumTypo(retData, labelData, sync.defer()));

                if (isAuto) {
                    // TBL_BATCH_PO_ML_EXPORT table에 exportData 가공
                    var exportData = sync.await(processingExportData(retData.data, labelData.rows, sync.defer()));
                    // TBL_BATCH_PO_ML_EXPORT table insert
                    sync.await(oracle.insertBatchPoMlExportFromUi([retData.docCategory.DOCTOPTYPE, propertiesConfig.auto.ftpFileUrl+resPyArr[i].originFileName.split('_')[0]+"/"+dt+"/" +filepath, exportData], sync.defer()));
                }

                // retData.fileinfo = {
                //     filepath: propertiesConfig.auto.ftpFileUrl + resPyArr[i].originFileName,
                //     convertFilepath: propertiesConfig.auto.ftpFileUrl + resPyArr[i].convertFileName
                // };

                retData.fileinfo = {
                    filepath: propertiesConfig.auto.ftpFileUrl+filepath.split('_')[0]+"/"+dt+"/" + resPyArr[i].originFileName,
                    convertFilepath: propertiesConfig.auto.ftpFileUrl+filepath.split('_')[0]+"/"+dt+"/" + resPyArr[i].convertFileName
                };

                retDataList.push(retData);
            }
            // winston.info("\n"+filepath.split("/")[3]);
            // for(var n=0; n < retData.data.length; n++)
            // {
            //     if(retData.data[n]["entryLbl"])
            //     {
            //         if(retData.data[n].addItem)
            //         {
            //             var additems = "";
            //             // console.log(retData.data[n].addItem);
            //             for(var i =0; i < retData.data[n].addItem.length; i++)
            //             {
            //                 additems = additems + retData.data[n].addItem[i]["text"]+",";
            //             }
            //             // console.log(additems.substring(0,additems.length-1));
            //             // console.log(additems.substring(0,additems.length-1) +"@@@"+ retData.data[n]["text"]);
            //             winston.info(additems.substring(0,additems.length-1) + "    "+retData.data[n]["entryLbl"]);
            //         }
            //         else
            //         {
            //             winston.info(retData.data[n]["text"]+ "    "+retData.data[n]["entryLbl"]);
            //         }
                    
            //     }
                
            // }


            console.log("for end");
            console.log(retDataList);
            // resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));

            // retData = resPyArr;
            // var labelData = sync.await(oracle.selectIcrLabelDef(retData.docCategory.DOCTOPTYPE, sync.defer()));
            // retData.labelData = labelData.rows;
            //retDataList.push(retData);
            //var labelData = sync.await(oracle.selectIcrLabelDef(retData.docCategory.DOCTOPTYPE, sync.defer()));
            //retData.labelData = labelData.rows;
            //retDataList["labelData"] = labelData.rows;
            callback(null, retDataList);

        } catch (e) {
            console.log(icrRestResult);
            callback(null, null);
        }

    });
}

//TBL_BATCH_PO_ML_EXPORT's exportData column data processing
function processingExportData(mlData, labels, done) {
    sync.fiber(function () {
        try {
            var exportData = "[";
            for (var i in labels) {
                var entryData = "";
                for (var j in mlData) {
                    var item = null;
                    if (mlData[j].entryLbl && labels[i].SEQNUM == mlData[j].entryLbl) {
                        if (mlData[j].text != "") {
                            item = ((entryData == "") ? "" : " | ") + mlData[j].location.split(',')[1] + "::" + mlData[j].text;
                            entryData += item;
                        }
                    }
                }
                exportData += ((entryData != "") ? "\"" + entryData.replace(/,/gi,'') + "\"" : null);
                exportData += ",";
            }
            exportData = exportData.slice(0, -1);
            exportData += "]";
            return done(null, exportData);

        } catch (e) {
            throw e;
        }

    });
}

function uiLearnTraining(filepath, callback) {
    sync.fiber(function () {
        try {

            var filename = filepath.substring(0, filepath.lastIndexOf("."));
            var fileExt = filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length);

            var fullFilePath = "";
            var fullFilePathList = [];
            if (fileExt == "pdf") {
                var fileCount = 0;
                while (true) {
                    if (exists(filename + "-" + fileCount + ".png")) {
                        fullFilePathList.push(filename + "-" + fileCount + ".png");
                        fileCount++;
                    } else {
                        if (fileCount == 0) {
                            fullFilePathList.push(filename + ".png");
                        }
                        break;
                    }
                }

            } else if (fileExt.toLowerCase() == "png") {
                fullFilePath = filename + ".png";
                fullFilePathList.push(fullFilePath);
            } else {
                var fileCount = 0;
                while (true) {
                    if (exists(filename + "-" + fileCount + ".jpg")) {
                        fullFilePathList.push(filename + "-" + fileCount + ".jpg");
                        fileCount++;
                    } else {
                        if (fileCount == 0) {
                            fullFilePathList.push(filename + ".jpg");
                        }
                        break;
                    }
                }
            }

            var retDataList = [];
            var docType = 0;
            for (var i = 0; i < fullFilePathList.length; i++) {
                var selOcr = sync.await(oracle.selectOcrData(fullFilePathList[i], sync.defer()));
                if (selOcr.length == 0) {
                    var ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));

                    if (ocrResult.orientation != undefined && ocrResult.orientation != "Up") {
                        var angle = 0;

                        if (ocrResult.orientation == "Left") {
                            angle += 90;
                        } else if (ocrResult.orientation == "Right") {
                            angle += -90;
                        } else if (ocrResult.orientation == "Down") {
                            angle += 180;
                        }

                        execSync('module\\imageMagick\\convert.exe -colors 8 -density 300 -rotate "' + angle + '" ' + fullFilePathList[i] + ' ' + fullFilePathList[i]);
                        ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));
                    }

                    for (var j = 0; j < 10; j++) {
                        if ((ocrResult.textAngle != undefined && ocrResult.textAngle > 0.03 || ocrResult.textAngle < -0.03)) {
                            var angle = 0;

                            var textAngle = Math.floor(ocrResult.textAngle * 100);

                            if (textAngle < 0) {
                                angle += 3;
                            } else if (textAngle == 17 || textAngle == 15 || textAngle == 14) {
                                angle = 10;
                            } else if (textAngle == 103) {
                                angle = 98;
                            }

                            execSync('module\\imageMagick\\convert.exe -colors 8 -density 300 -depth 8 -gravity center -rotate "' + (textAngle + angle) + '" ' + fullFilePathList[i] + ' ' + fullFilePathList[i]);

                            ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));
                        } else {
                            break;
                        }
                    }

                    sync.await(oracle.insertOcrData(fullFilePathList[i], JSON.stringify(ocrResult), sync.defer()));
                    selOcr = sync.await(oracle.selectOcrData(fullFilePathList[i], sync.defer()));
                }

                var seqNum = selOcr.SEQNUM;
                pythonConfig.columnMappingOptions.args = [];
                pythonConfig.columnMappingOptions.args.push(seqNum);

                if (i != 0) {
                    pythonConfig.columnMappingOptions.args.push(docType);
                }

                //var resPyStr = sync.await(PythonShell.run('batchClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var resPyStr = sync.await(PythonShell.run('samClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var testStr = resPyStr[0].replace('b', '');
                testStr = testStr.replace(/'/g, '');
                var decode = new Buffer(testStr, 'base64').toString('utf-8');

                var resPyArr = JSON.parse(decode);

                resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));
                console.log(resPyArr);

                var retData = {};
                retData = resPyArr;
                retData.fileinfo = { filepath: fullFilePathList[i] };
                //sync.await(oracle.insertMLData(retData, sync.defer()));

                if (i == 0) {
                    docType = retData.docCategory.DOCTYPE;
                }

                var labelData = sync.await(oracle.selectIcrLabelDef(retData.docCategory.DOCTOPTYPE, sync.defer()));

                retData.labelData = labelData.rows;

                retDataList.push(retData);
            }
            callback(null, retDataList);

        } catch (e) {
            console.log(e);
            callback(null, null);
        }


    });
}

/*
router.post('/uiLearnTraining', function (req, res) {
    var ocrData = req.body.ocrData;
    var filePath = req.body.filePath;
    var fileName = req.body.fileName;
    var fileExt = filePath.split(".")[1];
    var returnObj;
    sync.fiber(function () {
        try {
            console.time("mlTime");
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args.push(JSON.stringify(ocrData));
            var resPyStr = sync.await(PythonShell.run('uiClassify.py', pythonConfig.columnMappingOptions, sync.defer()));
            var resPyArr = JSON.parse(resPyStr[0]);

            resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));

            var colMappingList = sync.await(oracle.selectColumn(req, sync.defer()));
            var entryMappingList = sync.await(oracle.selectEntryMappingCls(req, sync.defer()));

            console.timeEnd("mlTime");
            returnObj = { code: 200, 'fileName': fileName, 'data': resPyArr, 'column': colMappingList, 'entryMappingList': entryMappingList };
        } catch (e) {
            console.log(resPyStr);
            returnObj = { 'code':500, 'message': e };

        } finally {
            res.send(returnObj);
        }

    });
});
*/

// ui training
router.post('/uiTraining', function (req, res) {
    var beforeData = req.body.beforeData;
    var afterData = req.body.afterData;
    var docType = req.body.docType;
    var docSid = req.body.docSid;
    var fmData = [];
    var cmData = [];
    var returnObj;

    sync.fiber(function () {
        try {
            if (beforeData.docCategory.DOCTYPE != docType) {
                sync.await(oracle.insertFormMapping([docSid, docType], sync.defer()));
                fmData.push({ 'data': docSid, 'class': docType });
            }

            for (var i in afterData.data) {
                for (var j in beforeData.data) {
                    if (afterData.data[i].location == beforeData.data[j].location) {
                        //사용자가 글자를 직접 수정한 경우 TBL_CONTRACT_MAPPING에 insert
                        if (afterData.data[i].text != beforeData.data[j].text) {
                            var item = [beforeData.data[j].text, '', afterData.data[i].text, ''];
                            sync.await(oracle.insertContractMapping(item, sync.defer()));
                        }
                        //사용자가 지정한 컬럼라벨의 텍스트가 유효한 컬럼의 경우 OcrSymspell에 before text(중요!!) insert
                        if (afterData.data[i].colLbl >= 3 && afterData.data[i].colLbl <= 34) {
                            sync.await(oracle.insertOcrSymsSingle(beforeData.data[j], sync.defer()));
                        }
                        afterData.data[i].sid = sync.await(oracle.selectSid(beforeData.data[j], sync.defer()));
                        //라벨이 변경된 경우만 트레이닝 insert
                        if ((docType != 0 && docType != 1) && (afterData.data[i].colLbl == 0 || (afterData.data[i].colLbl && afterData.data[i].colLbl != 38) ||
                            (beforeData.data[j].colLbl != 38 && afterData.data[i].colLbl == 38))) {
                            var item = sync.await(oracle.insertBatchColumnMappingFromUi(afterData.data[i], docType, beforeData.data[j], sync.defer()));
                            if (item) {
                                cmData.push({ 'data': item.colSid, 'class': item.colLbl });
                            }
                        }
                        break;
                    }
                }
            }            

            // Azure ml train 프록시 호출
            //var azureRes = request('POST', 'http://172.16.53.143:8888/ml/train', { json: { 'fmData': fmData, 'cmData': cmData } });

            returnObj = { code: 200, message: 'ui training success' };

        } catch (e) {
            console.log(e);
            returnObj = { code: 500, error: e };
        } finally {
            res.send(returnObj);
        }
    });
});

// typoSentence ML
router.post('/typoSentence', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;
    var regId = req.session.userId;
    
    process.on('uncaughtException', function (err) {
        console.log('typo uncaughtException : ' + err);
    });
    
    try {
        
        aimain.typoSentenceEval2(data, function (typoResult) {
            console.log('execute typo ML');
            res.send({ 'fileName': fileName, 'data': typoResult, nextType: 'cm'});
            //res.send({ 'fileName': fileName, 'data': typoResult, nextType: 'fl' });
        });
        

        /*
        //08.30
        aimain.typoSentenceEval3(data, function (typoResult) {
            console.log('execute typo ML');
            res.send({ 'fileName': fileName, 'data': typoResult, nextType: 'cm'});
            //res.send({ 'fileName': fileName, 'data': typoResult, nextType: 'fl' });
        });
        */
    }
    catch (exception) {
        console.log(exception);
    }
});

function insertTypoCorrect(req, res, result) {
    var fileName = req.body.fileName;
    var data = req.body.data;
    var regId = req.session.userId;

    var arr = [];

    for (var i in data) {
        if (data[i].originText != null) {
            var correctWord = data[i].text;
            var originWord = data[i].originText;

            var correctSplit = correctWord.split(" ");
            var originSplit = originWord.split(" ");

            for (var j in correctSplit) {
                if (correctSplit[j] != originSplit[j]) {
                    var arrData = {
                        userid: regId,
                        originWord: originSplit[j],
                        correctWord: correctSplit[j],
                        fileName: fileName,
                        correctorType: "M"
                    };
                    arr.push(arrData);
                }
            }
        }
    }

    var options = {
        autoCommit: true,
        bindDefs: {
            userid: { type: oracledb.STRING, maxSize: 100 },
            originWord: { type: oracledb.STRING, maxSize: 100 },
            correctWord: { type: oracledb.STRING, maxSize: 100 },
            fileName: { type: oracledb.STRING, maxSize: 100 },
            correctorType: { type: oracledb.STRING, maxSize: 1 }
        }
    };

    commonDB.reqBatchQueryParam(queryConfig.uiLearningConfig.insertTypoCorrect, arr, options, function (rows, req, res) {
        res.send({ 'fileName': fileName, 'data': result, nextType: 'fl' });
    }, req, res);

}

router.post('/formLabelMapping', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('formLabelMapping uncaughtException : ' + err);
    });

    try {
        aimain.formLabelMapping2(data, function (formLabelResult) {
            console.log('execute formLabelMapping ML');
            res.send({ 'fileName': fileName, 'data': formLabelResult, nextType: 'fm' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

router.post('/formMapping', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('formMapping uncaughtException : ' + err);
    });

    try {

        aimain.formMapping2(data, function (formMappingResult) {
            console.log('execute formMapping ML');
            res.send({ 'fileName': fileName, 'data': formMappingResult, nextType: 'cm' });
        });

    } catch (exception) {
        console.log(exception);
    }
});

router.post('/columnMapping', function (req, res) {
    req.setTimeout(300000);
    var fileName = req.body.fileName;
    var arg = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('columnMapping uncaughtException : ' + err);
    });

    try {
        /*
        // ML Studio
        aimain.runFromMLStudio(arg, function (result) {
            res.send({ 'fileName': fileName, 'data': result.data, nextType: 'sc' });
        });
        */

        
        // tensorflow
        aimain.columnMapping3(arg, function (columnResult) {
            console.log('execute columnMapping ML');
            res.send({ 'fileName': fileName, 'data': columnResult, nextType: 'sc' });          
        });
        
        /*
        //08.30
        aimain.columnMapping4(arg, function (columnResult) {
            console.log('execute columnMapping ML');
            res.send({ 'fileName': fileName, 'data': columnResult, nextType: 'sc' });
        });
        */
        
    } catch (exception) {
        console.log(exception);
    }
});

// DB Columns select
router.post('/searchDBColumns', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;
    //todo
    sync.fiber(function () {
        try {
            var colMappingList = sync.await(oracle.selectColumn(req, sync.defer()));
            var entryMappingList = sync.await(oracle.selectEntryMappingCls(req, sync.defer()));

            res.send({code: 200, 'fileName': fileName, 'data': data, 'column': colMappingList, 'entryMappingList': entryMappingList});
        } catch (e) {
            console.log(e);
            res.send({ code: 400 });
        }
    });
});

/*
// db컬럼명 조회
router.post('/searchDBColumns', function (req, res) {

    var fileName = req.body.fileName;
    var data = req.body.data;

    typoSentenceEval(data, function (result1) {

        domainDictionaryEval(result1, function (result2) {

            textClassificationEval(result2, function (result3) {

                labelMappingEval(result3, function (result4) {
                    console.log(result4);

                    commonDB.reqQuery(selectColumn, function(rows, req, res) {
                        res.send({ 'fileName': fileName, 'data': result4, 'column': rows});
                    }, req, res);
                })
            })
        })
    });
});
*/

// fileupload
router.post('/uploadFile', upload.any(), function (req, res) {
    var files = req.files;
    var endCount = 0;
    var returnObj = [];
    var convertType = '';

    for (var i = 0; i < files.length; i++) {
        if (files[i].originalname.split('.')[1] === 'TIF' || files[i].originalname.split('.')[1] === 'tif' ||
            files[i].originalname.split('.')[1] === 'TIFF' || files[i].originalname.split('.')[1] === 'tiff') {
            var ifile = appRoot + '\\' + files[i].path;
            var ofile = appRoot + '\\' + files[i].path.split('.')[0] + '.jpg';
            execSync('module\\imageMagick\\convert.exe -quiet -density 800x800 ' + ifile + ' ' + ofile);
            if (endCount === files.length - 1) { // 모든 파일 변환이 완료되면
                var j = 0;
                var isStop = false;
                while (!isStop) {
                    try { // 하나의 파일 안의 여러 페이지면
                        var stat = fs.statSync(appRoot + '\\' + files[i].path.split('.')[0] + '-' + j + '.jpg');
                        if (stat) {
                            returnObj.push(files[i].originalname.split('.')[0] + '-' + j + '.jpg');
                        } else {
                            isStop = true;
                            break;
                        }
                    } catch (err) { // 하나의 파일 안의 한 페이지면
                        try {
                            var stat2 = fs.statSync(appRoot + '\\' + files[i].path.split('.')[0] + '.jpg');
                            if (stat2) {
                                returnObj.push(files[i].originalname.split('.')[0] + '.jpg');
                                break;
                            }
                        } catch (e) {
                            break;
                        }
                    }
                    j++;
                }
            }
            endCount++;
        }
    }
    res.send({ code: 200, message: returnObj });

    /*
    for (var i = 0; i < files.length; i++) {
        var ifile = appRoot + '\\' + files[i].path;
        var ofile = appRoot + '\\' + files[i].path.split('.')[0] + '.jpg';

        if (files[i].originalname.split('.')[1].toLowerCase() === 'tif' ||
            files[i].originalname.split('.')[1].toLowerCase() === 'tiff') {
            execSync('module\\imageMagick\\convert.exe -quiet -density 800x800 ' + ifile + ' ' + ofile);
            convertType = files[i].originalname.split('.')[1].toLowerCase();
        } else {

        }

        if (endCount === files.length - 1) { // 모든 파일 변환이 완료되면
            if (convertType === 'tif') {
                try {
                    var stat = fs.statSync(appRoot + '\\' + files[i].path.split('.')[0] + '.jpg');
                    if (stat) {
                        returnObj.push(files[i].originalname.split('.')[0] + '.jpg');
                    }
                } catch (e) {
                }
            } else if (convertType === 'tiff') {
                var j = 0;
                var isStop = false;
                while (!isStop) {

                }
            }           
        }

        endCount++;
    }
    */
});

// 기존문서 양식 LIKE 검색
var callbackSelectLikeDocCategory = function (rows, req, res) {
    res.send(rows);
};

// 신규문서 양식 등록
var callbackInsertDocCategory = function (rows, req, res) {
    res.send({ code: 200, message: 'document Category insert success' });
};
var callbackSelectMaxDocType = function (rows, req, res) {
    var docName = req.body.docName;
    var sampleImagePath = req.body.sampleImagePath;
    var docType = rows[0].DOCTYPE;
    if (docType == 998) { // unk 가 999이므로 피하기 위함
        docType++;
    }
    commonDB.reqQueryParam(queryConfig.uiLearningConfig.insertDocCategory, [docName, (docType + 1), sampleImagePath], callbackInsertDocCategory, req, res);
};
router.post('/insertDocCategory', function (req, res) {

    commonDB.reqQuery(queryConfig.uiLearningConfig.selectMaxDocType, callbackSelectMaxDocType, req, res);
});

router.post('/insertTypoTrain', function (req, res) {
    var data = req.body.data;

    runInsertTypoTrain(data, req, res, function (ret) {
        res.send(ret);
    });
});

async function runInsertTypoTrain(data, req, res, callback) {
    try {
        let ret = await insertTypoTrain(data, req, res);
        callback(ret);
    } catch (err) {
        console.error(err);
    }
}

function insertTypoTrain(data, req, res) {

    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i = 0; i < data.length; i++) {
                if (data[i].typoText != null && (data[i].typoText != data[i].text)) {

                    var typoSplit = data[i].typoText.split(" ");
                    var textSplit = data[i].text.split(" ");

                    for (var ty = 0; ty < textSplit.length; ty++) {
                        if (typoSplit[ty] != textSplit[ty]) {
                            var selTypoCond = [];
                            selTypoCond.push(textSplit[ty].toLowerCase());
                            let selTypoRes = await conn.execute(selectTypo, selTypoCond);

                            if (selTypoRes.rows[0] == null) {
                                //insert
                                let insTypoRes = await conn.execute(insertTypo, selTypoCond);
                            } else {
                                //update
                                var updTypoCond = [];
                                updTypoCond.push(selTypoRes.rows[0].KEYWORD);
                                let updTypoRes = await conn.execute(updateTypo, updTypoCond);
                            }

                            var insTypoCorCond = [];
                            insTypoCorCond.push(req.session.userId);
                            insTypoCorCond.push(typoSplit[ty]);//originWord
                            insTypoCorCond.push(textSplit[ty]);//correctWord
                            insTypoCorCond.push("");//fileName
                            insTypoCorCond.push("U");
                            var insTypoCorRes = await conn.execute(queryConfig.uiLearningConfig.insertTypoCorrect, insTypoCorCond);
                        }
                    }

                }
            }

            resolve(data);

        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
}

async function runMakeTrainingSidData(data, req, res, callback) {
    try {
        let ret = await makeTrainingSidData(data, req, res);
        callback(ret);
    } catch (err) {
        console.error(err);
    }
}

function makeTrainingSidData(data, req, res) {

    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i in data) {
                var sid = "";
                locSplit = data[i].location.split(",");
                sid += locSplit[0] + "," + locSplit[1];

                let result = await conn.execute("SELECT EXPORT_SENTENCE_SID(:COND) SID FROM DUAL", [data[i].text.toLowerCase()]);

                if (result.rows[0] != null) {
                    sid += "," + result.rows[0].SID;
                }

                data[i].sid = sid;
            }

            resolve(data);

        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
}


// uiTrain
router.post('/uiTrain', function (req, res) {
    var data = req.body.data;

    runTrain(data, req, function (result) {
        if (result == "true") {
            //text-classification train
            var exeTextString = 'python ' + appRoot + '\\ml\\cnn-text-classification\\train.py'
            exec(exeTextString, defaults, function (err, stdout, stderr) {
                //label-mapping train
                var exeLabelString = 'python ' + appRoot + '\\ml\\cnn-label-mapping\\train.py'
                exec(exeLabelString, defaults, function (err1, stdout1, stderr1) {
                    res.send("ui 학습 완료");
                });
            });
        }
    });

});

async function runTrain(data, req, callback) {
    try {
        let res = await textLabelTrain(data, req);
        callback(res);
    } catch (err) {
        console.error(err);
    }
}

function textLabelTrain(data) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            var ctnm, csconm;
            for (var i = 0; i < data.length; i++) {
                if (data[i].originText != null) {
                    //console.log(data[i].originText);
                    var originSplit = data[i].originText.split(" ");
                    var textSplit = data[i].text.split(" ");

                    var textleng = Math.abs(data[i].originText.length - data[i].text.length);

                    if (textleng < 4) {
                        //typo train
                        for (var ty = 0; ty < textSplit.length; ty++) {
                            if (originSplit[ty] != textSplit[ty]) {
                                var selTypoCond = [];
                                selTypoCond.push(textSplit[ty].toLowerCase());
                                let selTypoRes = await conn.execute(selectTypo, selTypoCond);

                                if (selTypoRes.rows[0] == null) {
                                    //insert
                                    let insTypoRes = await conn.execute(insertTypo, selTypoCond);
                                } else {
                                    //update
                                    var updTypoCond = [];
                                    updTypoCond.push(selTypoRes.rows[0].KEYWORD);
                                    let updTypoRes = await conn.execute(updateTypo, updTypoCond);
                                }

                                var insTypoCorCond = [];
                                insTypoCorCond.push(req.session.regId);
                                insTypoCorCond.push(originSplit[ty]);//originWord
                                insTypoCorCond.push(textSplit[ty]);//correctWord
                                insTypoCorCond.push("");//fileName
                                insTypoCorCond.push("U");
                                var insTypoCorRes = await conn.execute(queryConfig.uiLearningConfig.insertTypoCorrect, insTypoCorCond);
                            }
                        }
                    } else {
    
                        if (data[i].labelMapping == "CT_NM_VALUE") {
                            ctnm = data[i];
                        }

                        if (data[i].labelMapping == "CSCO_NM_VALUE") {
                            csconm = data[i];
                        }
                        //domain dictionary train
                        /*
                        var os = 0;
                        var osNext = 0;
                        var updText = "";
                        for (var j = 1; j < textSplit.length; j++) {
                            updText += textSplit[j] + ' ';
                        }
                        updText.slice(0, -1);

                        var domainText = [];
                        domainText.push(textSplit[0]);
                        domainText.push(updText);

                        for (var ts = 0; ts < domainText.length; ts++) {

                            for (os; os < originSplit.length; os++) {
                                if (ts == 1) {
                                    var insDicCond = [];

                                    //originword
                                    insDicCond.push(originSplit[os]);

                                    //frontword
                                    if (os == 0) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os - 1]);
                                    }

                                    //correctedword
                                    if (osNext == os) {
                                        insDicCond.push(domainText[ts]);
                                    } else {
                                        insDicCond.push("<<N>>");
                                    }

                                    //rearword
                                    if (os == originSplit.length - 1) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os + 1]);
                                    }

                                    let insDomainDicRes = await conn.execute(insertDomainDic, insDicCond);

                                } else if (domainText[ts].toLowerCase() != originSplit[os].toLowerCase()) {
                                    var insDicCond = [];

                                    //originword
                                    insDicCond.push(originSplit[os]);

                                    //frontword
                                    if (os == 0) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os - 1]);
                                    }

                                    //correctedword
                                    insDicCond.push("<<N>>");

                                    //rearword
                                    if (os == originSplit.length - 1) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os + 1]);
                                    }

                                    let insDomainDicRes = await conn.execute(insertDomainDic, insDicCond);

                                } else {
                                    os++;
                                    osNext = os;
                                    break;
                                }
                            }

                        }
                        */
                    }
                }
            }

            if (csconm != null && ctnm != null) {
                selCtrCond = [];
                selCtrCond.push(csconm.text);
                selCtrCond.push(ctnm.text);

                let selCtrRes = await conn.execute(queryConfig.batchLearningConfig.selectContractMapping, selCtrCond);

                if (selCtrRes.rows[0] == null) {

                    var insCtrCond = [];
                    insCtrCond.push(csconm.originText);//extOgcompanyName
                    insCtrCond.push(ctnm.originText);//extCtnm
                    insCtrCond.push(csconm.text);//asOgcompanyName
                    insCtrCond.push(ctnm.text);//asCtnm

                    let insCtrRes = await conn.execute(queryConfig.batchLearningConfig.insertContractMapping, insCtrCond);
                }

                var csconmSplit = csconm.text.split(" ");
                var ctnmSplit = ctnm.text.split(" ");

                for (var cs in csconmSplit) {
                    var selTypoCond = [];
                    selTypoCond.push(csconmSplit[cs]);
                    let selTypoRes = await conn.execute(queryConfig.uiLearningConfig.selectTypo, selTypoCond);

                    if (selTypoRes.rows[0] == null) {
                        let insTypoRes = await conn.execute(queryConfig.uiLearningConfig.insertTypo, selTypoCond);
                    }
                }

                for (var cs in ctnmSplit) {
                    var selTypoCond = [];
                    selTypoCond.push(ctnmSplit[cs]);
                    let selTypoRes = await conn.execute(queryConfig.uiLearningConfig.selectTypo, selTypoCond);

                    if (selTypoRes.rows[0] == null) {
                        let insTypoRes = await conn.execute(queryConfig.uiLearningConfig.insertTypo, selTypoCond);
                    }
                }


            }

            for (var i in data) {
                var selectLabelCond = [];
                selectLabelCond.push(data[i].column);

                let result = await conn.execute(selectLabel, selectLabelCond);

                if (result.rows[0] == null) {
                    data[i].textClassi = 'undefined';
                } else {
                    data[i].textClassi = result.rows[0].LABEL;
                    data[i].labelMapping = result.rows[0].ENKEYWORD;
                }

                var insTextClassifiCond = [];
                insTextClassifiCond.push(data[i].text);
                insTextClassifiCond.push(data[i].textClassi);

                let insResult = await conn.execute(insertTextClassification, insTextClassifiCond);
            }

            for (var i in data) {
                if (data[i].textClassi == "fixlabel" || data[i].textClassi == "entryrowlabel") {
                    var insLabelMapCond = [];
                    insLabelMapCond.push(data[i].text);
                    insLabelMapCond.push(data[i].labelMapping);

                    let insLabelMapRes = await conn.execute(insertLabelMapping, insLabelMapCond);

                    //console.log(insLabelMapRes);
                }
            }

            resolve("true");

        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
}

// domainDictionary ML
router.post('/domainDictionary', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.domainDictionaryEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, nextType: 'tc' });
        });
    } catch (exception) {
        console.log(exception);
    }


});

// textClassification ML
router.post('/textClassification', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.textClassificationEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, nextType: 'st' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

// statement classifiction ML
router.post('/statementClassification', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.statementClassificationEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result.data, 'docCategory': result.docCategory, nextType: 'lm' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

// labelMapping ML
router.post('/labelMapping', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;
    var docCategory = (req.body.docCategory) ? req.body.docCategory : null;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.labelMappingEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, 'docCategory': docCategory, nextType: 'sc' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

//08.31
router.get('/formMapping2', function (req, res) {
    var data = [{ "location": "1018, 240, 411, 87", "text": "APEX" }, { "location": "1019, 338, 409, 23", "text": "Partner of Choice" }, { "location": "1562, 509, 178, 25", "text": "Voucher No" }, { "location": "1562, 578, 206, 25", "text": "Voucher Date" }, { "location": "206, 691, 274, 27", "text": "4153 Korean Re" }, { "location": "208, 756, 525, 34", "text": "Proportional Treaty Statement" }, { "location": "1842, 506, 344, 25", "text": "BV / HEO / 2018 / 05 / 0626" }, { "location": "1840, 575, 169, 25", "text": "01105 / 2018" }, { "location": "206, 848, 111, 24", "text": "Cedant" }, { "location": "206, 908, 285, 24", "text": "Class of Business" }, { "location": "210, 963, 272, 26", "text": "Period of Quarter" }, { "location": "207, 1017, 252, 31", "text": "Period of Treaty" }, { "location": "206, 1066, 227, 24", "text": "Our Reference" }, { "location": "226, 1174, 145, 31", "text": "Currency" }, { "location": "227, 1243, 139, 24", "text": "Premium" }, { "location": "226, 1303, 197, 24", "text": "Commission" }, { "location": "226, 1366, 107, 24", "text": "Claims" }, { "location": "227, 1426, 126, 24", "text": "Reserve" }, { "location": "227, 1489, 123, 24", "text": "Release" }, { "location": "227, 1549, 117, 24", "text": "Interest" }, { "location": "227, 1609, 161, 31", "text": "Brokerage" }, { "location": "233, 1678, 134, 24", "text": "Portfolio" }, { "location": "227, 1781, 124, 24", "text": "Balance" }, { "location": "574, 847, 492, 32", "text": ": Solidarity - First Insurance 2018" }, { "location": "574, 907, 568, 32", "text": ": Marine Cargo Surplus 2018 - Inward" }, { "location": "598, 959, 433, 25", "text": "01 - 01 - 2018 TO 31 - 03 - 2018" }, { "location": "574, 1010, 454, 25", "text": ": 01 - 01 - 2018 TO 31 - 12 - 2018" }, { "location": "574, 1065, 304, 25", "text": ": APEX / BORD / 2727" }, { "location": "629, 1173, 171, 25", "text": "JOD 1.00" }, { "location": "639, 1239, 83, 25", "text": "25.53" }, { "location": "639, 1299, 64, 25", "text": "5.74" }, { "location": "639, 1362, 64, 25", "text": "0.00" }, { "location": "639, 1422, 64, 25", "text": "7.66" }, { "location": "639, 1485, 64, 25", "text": "0.00" }, { "location": "639, 1545, 64, 25", "text": "0.00" }, { "location": "639, 1605, 64, 25", "text": "0.64" }, { "location": "648, 1677, 64, 25", "text": "0.00" }, { "location": "641, 1774, 81, 25", "text": "11 .49" }, { "location": "1706, 1908, 356, 29", "text": "APEX INSURANCE" }];

    process.on('uncaughtException', function (err) {
        console.log('formMapping uncaughtException : ' + err);
    });

    try {
        var arg = [];
        for (var i in data) {
            if (i == 5) {
                break;
            } else {
                arg.push(data[i]);
            }
        }

        aimain.runFromMLStudio(arg, function (result) {
            res.send(arg);
        });
    } catch (exception) {
        console.log(exception);
    }
});

//08.31
router.get('/trainFormMapping', function (req, res) {
    var data = [{ "location": "1018, 240, 411, 87", "text": "APEX" }, { "location": "1019, 338, 409, 23", "text": "Partner of Choice" }, { "location": "1562, 509, 178, 25", "text": "Voucher No" }, { "location": "1562, 578, 206, 25", "text": "Voucher Date" }, { "location": "206, 691, 274, 27", "text": "4153 Korean Re" }, { "location": "208, 756, 525, 34", "text": "Proportional Treaty Statement" }, { "location": "1842, 506, 344, 25", "text": "BV / HEO / 2018 / 05 / 0626" }, { "location": "1840, 575, 169, 25", "text": "01105 / 2018" }, { "location": "206, 848, 111, 24", "text": "Cedant" }, { "location": "206, 908, 285, 24", "text": "Class of Business" }, { "location": "210, 963, 272, 26", "text": "Period of Quarter" }, { "location": "207, 1017, 252, 31", "text": "Period of Treaty" }, { "location": "206, 1066, 227, 24", "text": "Our Reference" }, { "location": "226, 1174, 145, 31", "text": "Currency" }, { "location": "227, 1243, 139, 24", "text": "Premium" }, { "location": "226, 1303, 197, 24", "text": "Commission" }, { "location": "226, 1366, 107, 24", "text": "Claims" }, { "location": "227, 1426, 126, 24", "text": "Reserve" }, { "location": "227, 1489, 123, 24", "text": "Release" }, { "location": "227, 1549, 117, 24", "text": "Interest" }, { "location": "227, 1609, 161, 31", "text": "Brokerage" }, { "location": "233, 1678, 134, 24", "text": "Portfolio" }, { "location": "227, 1781, 124, 24", "text": "Balance" }, { "location": "574, 847, 492, 32", "text": ": Solidarity - First Insurance 2018" }, { "location": "574, 907, 568, 32", "text": ": Marine Cargo Surplus 2018 - Inward" }, { "location": "598, 959, 433, 25", "text": "01 - 01 - 2018 TO 31 - 03 - 2018" }, { "location": "574, 1010, 454, 25", "text": ": 01 - 01 - 2018 TO 31 - 12 - 2018" }, { "location": "574, 1065, 304, 25", "text": ": APEX / BORD / 2727" }, { "location": "629, 1173, 171, 25", "text": "JOD 1.00" }, { "location": "639, 1239, 83, 25", "text": "25.53" }, { "location": "639, 1299, 64, 25", "text": "5.74" }, { "location": "639, 1362, 64, 25", "text": "0.00" }, { "location": "639, 1422, 64, 25", "text": "7.66" }, { "location": "639, 1485, 64, 25", "text": "0.00" }, { "location": "639, 1545, 64, 25", "text": "0.00" }, { "location": "639, 1605, 64, 25", "text": "0.64" }, { "location": "648, 1677, 64, 25", "text": "0.00" }, { "location": "641, 1774, 81, 25", "text": "11 .49" }, { "location": "1706, 1908, 356, 29", "text": "APEX INSURANCE" }];

    process.on('uncaughtException', function (err) {
        console.log('formMapping uncaughtException : ' + err);
    });

    try {
        var arg = [];
        for (var i in data) {
            if (i == 5) {
                break;
            } else {
                arg.push(data[i]);
            }
        }

        aimain.addTrainFromMLStudio(arg, function (result) {
            res.send(arg);
        });
    } catch (exception) {
        console.log(exception);
    }
});

// 분류제외문장조회
router.post('/selectClassificationSt', function (req, res) {
    var returnObj;
    var filepath = req.body.filepath;
    var data = [];
    data.push(req.body.filepath);

    sync.fiber(function () {
        try {
            var result = sync.await(oracle.selectClassificationSt(data, sync.defer()));
            if (result.rows) {
                returnObj = { data: result.rows };
            } else {
                returnObj = { data: null };
            }
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

router.post('/selectLikeDocCategory', function (req, res) {
    var keyword = '%' + req.body.keyword + '%';
    var docTopType = req.body.docTopType;
    var returnObj;

    sync.fiber(function () {
        try {
            var result = sync.await(oracle.selectDocumentCategory(keyword, docTopType, sync.defer()));
            if (result.rows) {
                returnObj = { data : result.rows };
            } else {
                returnObj = { data: null };
            }
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

// 문서양식매핑
// router.post('/insertDoctypeMapping', function (req, res) {
// 	var returnObj;

// 	var data = {
// 		imgId: req.body.imgId,
// 		filepath: req.body.filepath,
// 		docName: req.body.docName,
// 		radioType: req.body.radioType,
// 		textList: req.body.textList
// 	}

// 	sync.fiber(function () {
// 		try {
// 			var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&?\\\=\(\'\"]/gi;
// 			let data = req.body;
// 			returnObj = sync.await(batch.insertDoctypeMapping(data, sync.defer()));

// 			var cnt = 0;
// 			var sentences = "";
// 			for (var i in returnObj.docSentenceList) {
// 				sentences = sentences + returnObj.docSentenceList[i].text.replace(regExp, "") + ",";
// 				cnt++;
// 				if (cnt == 20) { break; }
// 			}
// 			sentences = sentences.substring(0, sentences.length - 1);
// 			sentences = sentences + "||" + returnObj.docType + "||" + returnObj.docTopType;


// 			var encode = Buffer.from(sentences).toString("base64");
// 			pythonConfig.columnMappingOptions.args = [];
// 			pythonConfig.columnMappingOptions.args.push(encode);

// 			//console.log("pythonConfig.documentSentenceOptions");
// 			//console.log(pythonConfig.columnMappingOptions);
// 			//console.log("pythonConfig.documentSentenceOptions");

// 			var retResult = sync.await(PythonShell.run('docSentenceClassify.py', pythonConfig.columnMappingOptions, sync.defer()));
// 			//console.log(retResult);
// 		} catch (e) {
// 			console.log(e);
// 			returnObj = { code: 500, message: e };
// 		} finally {
// 			res.send(returnObj);
// 		}
// 	});
// });


router.post('/selectIcrLabelDef', function (req, res) {
    var returnObj;

    sync.fiber(function () {
        try {
            let docTopType = req.body.docToptype;
            var labelList = sync.await(oracle.selectIcrLabelDef(docTopType, sync.defer())).rows;
            returnObj = {code: 200, "labelList": labelList};
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

function exists(path) {
    try {
        fs.accessSync(path);
    } catch (err) {
        return false;
    }
    return true;
}

// [POST] linux server icrRest
var request = require('request');
exports.icrRest = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var filepath = req;
        var filename = filepath.slice(filepath.lastIndexOf("/") + 1);
        try {
            var formData = {
                file: {
                    value: fs.createReadStream(filepath),
                    options: {
                        filename: filename,
                    }
                }
            };
            console.time("icrRest Time");
    
            request.post({ url: propertiesConfig.icrRest.serverUrl + '/fileUpload', formData: formData }, function (err, httpRes, body) {
                if (err) res.send({ 'code': 500, 'error': err });
                console.timeEnd("icrRest Time");
                return done(null, body);
            }) 
        } catch (err) {
            reject(err);
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
        
// 문서양식매핑
router.post('/insertDoctypeMapping', function (req, res) {
    var returnObj;
        
    var data = {
        imgId: req.body.imgId,
        filepath: req.body.filepath,
        docName: req.body.docName,
        radioType: req.body.radioType,
        textList: req.body.textList
    }
    
    sync.fiber(function () {
        try {
            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            let data = req.body;
            returnObj = sync.await(batch.insertDoctypeMapping(data, sync.defer()));
                
            var  cnt = 0;
            var sentences = "";
            for (var i in returnObj.docSentenceList)
            {   
                if(returnObj.docSentenceList[i].text != null)
                {
                    sentences = sentences + returnObj.docSentenceList[i].text.replace(regExp,"") + ",";
                    cnt ++;
                    if(cnt == 100) {break;}
                }
                
            }
            sentences = sentences.substring(0, sentences.length -1);
            sentences = sentences+"||"+returnObj.docType+"||"+returnObj.docTopType;
            
            var retResult = sync.await(insertDocSentence(sentences,sync.defer()));
    
            // pythonConfig.columnMappingOptions.args = [];
            // pythonConfig.columnMappingOptions.args.push(sentences);
            // // pythonConfig.documentSentenceOptions.args.push(returnObj.docTopType);
            // // pythonConfig.documentSentenceOptions.args.push(returnObj.docType);
            // // pythonConfig.documentSentenceOptions.args.push(returnObj.docSentenceList);
    
            // console.log("pythonConfig.documentSentenceOptions");
            // console.log(pythonConfig.columnMappingOptions);
            // console.log("pythonConfig.documentSentenceOptions");
    
            // var retResult = sync.await(PythonShell.run('docSentenceClassify.py', pythonConfig.columnMappingOptions, sync.defer()));
            //console.log(retResult);
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});
var localRequest = require('sync-request');
function insertDocSentence(sentences, done) {
    return new Promise(async function (resolve, reject) {
        try {
                
            var res = localRequest('POST', propertiesConfig.icrRest.serverUrl + '/insertDocSentence', {
                headers:{'content-type':'application/x-www-form-urlencoded'},
                body: 'sentence='+sentences
            });
            var resJson = res.getBody('utf8');
            //pharsedOcrJson = ocrJson(resJson.regions);
            //var resJson = ocrParsing(res.getBody('utf8'));
    
            return done(null, resJson);
        } catch (err) {
            console.log(err);
            return done(null, 'error');
        } finally {
    
        }
    });   
};

module.exports = router;
