'use strict';
var fs = require('fs');
var watch = require('node-watch');
var cron = require('node-cron');
var ftpClient = require('ftp-client');
var ftp = require('ftp');
var sync = require('./sync.js')
var oracle = require('./oracle.js');
var ocrUtil = require('../util/ocr.js');
var mlclassify = require('../util/mlClassify.js');
var propertiesConfig = require('../../config/propertiesConfig.js');
var date = require('date-utils');
var request = require('sync-request');

//FTP 서버 정보
var ftpConfig = propertiesConfig.ftp;
//var option = { logging: 'basic' };
//var uploadDir = 'C:\\Users\\Taiho\\Desktop\\upload'; //local 디렉토리 경로
var ftpScanDir = propertiesConfig.auto.ftpScanDir; // FTP file 디렉토리 경로

/********************************************************************************************************
                                           process function start
 *******************************************************************************************************/

// local 디렉토리 png 모니터링 (파일추가 및 덮어쓰기 : update, 파일제거 : remove)
var local = function () {
//    watch(uploadDir, { recursive: true, filter: /\.png$/ }, function (evt, name) {
//        console.log(evt); // update, remove
//        console.log('%s', name); // file path + file name
//    });
};

// 지정된 시간마다 FTP 서버의 특정 디렉토리에서 local 디렉토리에 없는 파일을 가져와 local 디렉토리로 다운로드
var remoteFTP = function () {
//    cron.schedule('*/10 * * * * *', function () {
//        var client = new ftpClient(ftpConfig, option);
//        client.connect(function () {
//            client.download('/', uploadDir, {
//                overwrite: 'none'
//            }, function (result) {
//                console.log(result); // file name Array
//            });
//        });
//    });
};

// 지정된 시간마다 FTP서버의 특정 디렉토리에서 파일 리스트를 가져와 DB와 비교하여 해당 row가 없으면 프로세스 수행, 있으면 continue
var remoteFTP_v2 = function () {

    cron.schedule('*/30 * * * * *', function () {
        sync.fiber(function () {
            try {
                var dt = new Date();                
                
                var execFileNames = [];
                // TBL_FTP_FILE_LIST 데이터 조회
                var fileNames = sync.await(getftpFileList(sync.defer()));

                // FTP 파일 리스트와 DB데이터 비교
                if (fileNames.length != 0) {
                    var result = sync.await(oracle.selectFtpFileList(fileNames, sync.defer()));
                    if (result.length != 0) {
                        for (var i in fileNames) {
                            var isOverlap = false;
                            for (var j in result) {
                                if (fileNames[i] === result[j].FILENAME) {
                                    isOverlap = true;
                                    break;
                                }
                            }
                            if (!isOverlap) execFileNames.push(fileNames[i]);
                        }
                    } else {
                        execFileNames = fileNames;
                    }
                }
                console.log('auto processing start ['+dt.toFormat('YYYY-MM-DD HH24:MI:SS')+'] -------------> fileName : [' + execFileNames.toString() + '] ');

                // ocr 및 ml 프로세스 실행
                if (execFileNames.lengh != 0) {
                    for (var i in execFileNames) {
                        // TBL_FTP_FILE_LIST tabel insert
                        sync.await(oracle.insertFtpFileListFromUi([propertiesConfig.auto.ftpFileUrl, execFileNames[i]], sync.defer()));
                    }

                    var apiData = [];
                    for (var i in execFileNames) {
                        // ftp file move ScanFiles -> uploads directory
                        sync.await(moveFtpFile(execFileNames[i], sync.defer()));

                        // ocr processing and label & entry mapping  
                        var resultData = sync.await(uiLearnTraining_auto(execFileNames[i], true, sync.defer()));                       
                        for (var j in resultData) {

                            var fileFullPath = resultData[j].fileinfo.filepath;
                            //var filePath = fileFullPath.substring(0, fileFullPath.lastIndexOf('/') + 1);
                            //var fileName = fileFullPath.substring(fileFullPath.lastIndexOf('/') + 1);

                            var mlData = resultData[j].data;
                            var labels = resultData[j].labelData;
                            // TBL_BATCH_PO_ML_EXPORT table에 exportData 가공
                            var exportData = sync.await(processingExportData(mlData, labels, sync.defer()));
                            // TBL_BATCH_PO_ML_EXPORT table insert
                            sync.await(oracle.insertBatchPoMlExportFromUi([resultData[j].docCategory.DOCTOPTYPE, fileFullPath, exportData], sync.defer()));

                            //api JSON processing
                            var result = sync.await(oracle.selectSingleBatchPoMlExport(fileFullPath, sync.defer()));
                            apiData.push({ 'data': result, 'labels': labels });
                        }                       
                    }
                    if (apiData.length != 0) {
                        sync.await(apiCall(apiData, sync.defer()));
                    }
                }
                console.log('auto processing end ['+dt.toFormat('YYYY-MM-DD HH24:MI:SS')+'] ---------------> fileName : [' + execFileNames.toString() + ']');
            } catch (e) {
                console.log(e);
            } finally {
            }
        });
    });
};

var autoTest = function () {

    sync.fiber(function () {
        try {
            var execFileNames = ['E79223B9X111737_06102019_130309_001313.pdf', 'E79223B9X111737_06182019_141952_001790.pdf'];
            var apiData = [];
            for (var i in execFileNames) {

                // ocr processing and label & entry mapping  
                var resultData = sync.await(uiLearnTraining_auto(execFileNames[i], true, sync.defer()));
                for (var j in resultData) {

                    var fileFullPath = resultData[j].fileinfo.filepath;
                    //var filePath = fileFullPath.substring(0, fileFullPath.lastIndexOf('/') + 1);
                    //var fileName = fileFullPath.substring(fileFullPath.lastIndexOf('/') + 1);

                    var mlData = resultData[j].data;
                    var labels = resultData[j].labelData;
                    // TBL_BATCH_PO_ML_EXPORT table에 exportData 가공
                    //var exportData = sync.await(processingExportData(mlData, labels, sync.defer()));
                    // TBL_BATCH_PO_ML_EXPORT table insert
                    //sync.await(oracle.insertBatchPoMlExportFromUi([resultData[j].docCategory.DOCTOPTYPE, fileFullPath, exportData], sync.defer()));

                    //api JSON processing
                    var result = sync.await(oracle.selectSingleBatchPoMlExport(fileFullPath, sync.defer()));
                    apiData.push({ 'data': result, 'labels': labels });
                }
            }
            //fs.writeFileSync('C:\\Users\\Taiho\\Desktop\\11.json', JSON.stringify(apiData), 'utf8');
            if (apiData.length != 0) {
                sync.await(apiCall(apiData, sync.defer()));
            }
        } catch (e) {
            console.log(e);
        } finally {
        }
    });
};

/********************************************************************************************************
                                           process function end
 *******************************************************************************************************/

/********************************************************************************************************
                                           local function start
 *******************************************************************************************************/

// FTP server에서 특정 디렉토리 파일 리스트 가져오기
function getftpFileList(done) {
    sync.fiber(function () {
        try {
            var c = new ftp();
            var fileNames = [];
            c.on('ready', function () {
                c.list(ftpScanDir, function (err, list) {
                    if (err) throw err;
                    for (var i in list) {
                        var ext = list[i].name.substring(list[i].name.lastIndexOf('.') + 1);
                        var size = list[i].size;
                        if (ext == 'pdf' && size > 0) fileNames.push(list[i].name);
                    }
                    c.end();
                    return done(null, fileNames);
                });
            });
            c.connect(ftpConfig);
        } catch (e) {
            throw e;
        }
    });
}

// FTP server file move (ScanFiles -> uploads)
function moveFtpFile(fileName, done) {
    var ftpFilePath = propertiesConfig.auto.ftpFilePath + fileName;
    var localFilePath = propertiesConfig.auto.localFilePath + fileName;
    var destFtpFilePath = propertiesConfig.auto.destFtpFilePath + fileName;

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

// ocr process and entry mapping
function uiLearnTraining_auto(filepath, isAuto, callback) {
    sync.fiber(function () {
        try {
            var icrRestResult = sync.await(ocrUtil.icrRest(filepath, isAuto, sync.defer()));

            var resPyArr = JSON.parse(icrRestResult);
            var retData = {};
            var retDataList = [];
            var docCategory = {};
            for (var i in resPyArr) {
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
                    retData.docCategory.DOCTYPE = 0;
                    retData.docCategory.DOCTOPTYPE = 0;
                }

                retData.labelData = labelData.rows;

                // 정규식 적용
                for(var ii= 0; ii < resPyArr[i].data.length; ii++){
                    // if(retData.data[ii]["colLbl"] != -1){
                    if(retData.data[ii]["entryLbl"]){
                        for(var jj = 0; jj < labelData.rows.length; jj++) {
                            if(retData.data[ii]["entryLbl"] == labelData.rows[jj].SEQNUM) {
                                var re = new RegExp(labelData.rows[jj].VALID,'gi');   
                                var keyParts = retData.data[ii]["text"].match(re); 
                                // if(keyParts != null)
                                // {
                                //     retData.data[ii]["text"] = keyParts.toString().replace(/,/gi,'');
                                // }
                                if(keyParts != null && labelData.rows[jj].SEQNUM !="877" && labelData.rows[jj].SEQNUM !="504")
                                {
                                    retData.data[ii]["text"] = keyParts.toString().replace(/,/gi,'');
                                }
                            }                                
                        }
                    }                        
                }

                retData = sync.await(oracle.selectNumTypo(retData, labelData, sync.defer()));

                retData.fileinfo = {
                    filepath: propertiesConfig.auto.ftpFileUrl + resPyArr[i].originFileName,
                    convertFilepath: propertiesConfig.auto.ftpFileUrl + resPyArr[i].convertFileName
                };

                retDataList.push(retData);
            }
            callback(null, retDataList);

        } catch (e) {
            //자동화 오류시 서버가 안죽게...
            console.log(icrRestResult);
            callback(null, null);
            // throw e;
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

//api JSON parameters and call
function apiCall(apiData, done) {
    sync.fiber(function () {
        try {
            var reqParams = {
                dataCnt: String(apiData.length),
                data: []
            };
            for (var i = 0; i < apiData.length; i++) reqParams.data.push({});
            for (var i = 0; i < apiData.length; i++) {
                var fileName = apiData[i].data.FILENAME.substring(apiData[i].data.FILENAME.lastIndexOf('/')+1, apiData[i].data.FILENAME.length);
                var senedFileName = apiData[i].data.FILENAME.substring(0,apiData[i].data.FILENAME.lastIndexOf('/')+1)+"org_"+apiData[i].data.FILENAME.substring(apiData[i].data.FILENAME.lastIndexOf('/')+1);
                reqParams.data[i]["inviceType"] = apiData[i].data.ENGNM;
                //reqParams.data[i]["sequence"] = apiData[i].data.SEQ;
                reqParams.data[i]["sequence"] = apiData[i].data.API_SEQ;
                // reqParams.data[i]["fileName"] = apiData[i].data.FILENAME.replace('.pdf', '-0.jpg').replace('/uploads/','/img/');
                reqParams.data[i]["fileName"] = senedFileName.replace('.pdf', '-0.jpg').replace('/uploads/','/img/');
                //reqParams.data[i]["cdSite"] = 'DAE100083';
                reqParams.data[i]["editFileName"] = '';
                reqParams.data[i]["cdSite"] = fileName.split('_')[0];
                reqParams.data[i]["scanDate"] = apiData[i].data.AUTOSENDTIME;
                reqParams.data[i]["ivgtrNoSral"] = 0;
                reqParams.data[i]["ivgtrRes"] = "N";
                reqParams.data[i]["ocrData"] = [];
                for (var j = 0; j < apiData[i].labels.length; j++) reqParams.data[i]["ocrData"].push({});

                var mlData = apiData[i].data.EXPORTDATA.replace(/[\[\]\"]/gi, '').split(',');
                var maxEntryCnt = 0;
                var maxCnt = 0;
                var maxYLoc = [];
                for (var j = 0; j < apiData[i].labels.length; j++) {
                    if (apiData[i].labels[j].AMOUNT == 'multi') {
                        for (var k in mlData[j].split(' | ')) {
                            if (maxEntryCnt < mlData[j].split(' | ').length) {
                                maxEntryCnt = mlData[j].split(' | ').length;
                                maxCnt = j;
                            }
                        }
                    }
                }

                for (var j = 0; j < mlData[maxCnt].split(' | ').length; j++) {
                    maxYLoc.push({
                        'yLoc': mlData[maxCnt].split(' | ')[j].split('::')[0]
                    });
                }

                for (var j = 0; j < apiData[i].labels.length; j++) {
                    var cnt = '1';
                    if (apiData[i].labels[j].AMOUNT == 'multi') cnt = String(mlData[maxCnt].split(' | ').length);
                    reqParams.data[i]["ocrData"][j] = {
                        "engKey": apiData[i].labels[j].ENGNM,
                        "korKey": apiData[i].labels[j].KORNM,
                        "cnt": cnt,
                        "keyValue": []
                    };
                    if (apiData[i].labels[j].AMOUNT == 'single') {
                        if (mlData[j] == "null") {
                            reqParams.data[i]["ocrData"][j]["keyValue"].push({ "value": "" });
                        } else {
                            reqParams.data[i]["ocrData"][j]["keyValue"].push({ "value": mlData[j].split('::')[1] });
                        }
                    } else {
                        for (var m in maxYLoc) {
                            var isCorrect = false;
                            for (var k in mlData[j].split(' | ')) {
                                if (Math.abs(Number(mlData[j].split(' | ')[k].split('::')[0]) - Number(maxYLoc[m].yLoc)) < 20) {
                                    reqParams.data[i]["ocrData"][j]["keyValue"].push({ "value": mlData[j].split(' | ')[k].split('::')[1] });
                                    isCorrect = true;
                                    break;
                                }
                            }
                            if (!isCorrect) reqParams.data[i]["ocrData"][j]["keyValue"].push({ "value": "" });
                        }
                    }                  
                }
            }
            //fs.writeFileSync('C:\\Users\\Taiho\\Desktop\\test.json', JSON.stringify(reqParams), 'utf8');
            console.log(reqParams)            
            var apiCallCount = 0;
            do {
                var apiResponse = request('POST', propertiesConfig.api.invoiceApi, { json: reqParams });
                var apiRes = JSON.parse(apiResponse.getBody('utf8'));
                console.log(apiRes)
                apiCallCount++;
            } while (apiRes.success == 'false' && apiCallCount < 2);
            
            return done(null, null);

        } catch (e) {
            throw e;
        }

    });
}

/********************************************************************************************************
                                           local function end
 *******************************************************************************************************/

module.exports = {
    local: local,
    remoteFTP: remoteFTP,
    remoteFTP_v2: remoteFTP_v2,
    autoTest: autoTest
};