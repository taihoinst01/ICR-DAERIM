'use strict';
var express = require('express');
var router = express.Router();
var appRoot = require('app-root-path').path;
var request = require('sync-request');
var dbConfig = require(appRoot + '/config/dbConfig');
var queryConfig = require(appRoot + '/config/queryConfig.js');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var oracledb = require('oracledb');
var oracle = require('../util/oracle.js');
var sync = require('../util/sync.js');

/***************************************************************
 * Router
 * *************************************************************/

router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});

// 문서등록 (GET)
router.get('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/docManagement', { currentUser: req.user });
    else res.redirect("/logout");
});

// 문서등록 (POST)
router.post('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/invoiceManagement', { currentUser: req.user });
    else res.redirect("/logout");
});

// 문서 TopType 조회하기
router.post('/selectDocTopType', function (req, res) {
    sync.fiber(function () {
        var returnJson;

        try {
            let docToptypeList = sync.await(oracle.selectDocTopType([req.session.userId], sync.defer()));

            returnJson = { 'docToptypeList': docToptypeList };
        } catch (e) {
            console.log(e);
            returnJson = { 'error': e };
        } finally {
            res.send(returnJson);
        }
    });
});

// 문서관리 ocr data 조회하기
router.post('/selectBatchPoMlExport', function (req, res) {
    sync.fiber(function () {
        var returnJson;

        try {
            let cdSite = (req.body.cdSite) ? req.body.cdSite : null;
            let docTopType = req.body.docTopType;
            let startDate = (req.body.startDate) ? req.body.startDate.replace(/-/gi, '') + '000000' : null;
            let endDate = (req.body.endDate) ? req.body.endDate.replace(/-/gi, '') + '235959' : null;
            let processState = (req.body.processState) ? req.body.processState : null;
            let pagingCount = (req.body.pagingCount) ? req.body.pagingCount : 1;
            let docLabelList = sync.await(oracle.selectDocLabelDefList([docTopType], sync.defer()));

            let result = sync.await(oracle.selectBatchPoMlExport([ docTopType, startDate, endDate ], processState, pagingCount, cdSite, sync.defer()));

            returnJson = { 'docDataList': result[1], 'docLabelList': docLabelList, 'totCount': result[0] };
        } catch (e) {
            console.log(e);
            returnJson = { 'error': e };
        } finally {
            res.send(returnJson);
        }
    });
});

// ocr data 전송하기
router.post('/sendOcrData', function (req, res) {
    sync.fiber(function () {
        var returnJson;
        var apiCallCount = 0;
        try {
            var reqParams = {
                data: req.body.sendData,
                dataCnt: req.body.dataCnt
            };
            console.log(reqParams)
            do {
                var apiResponse = request('POST', propertiesConfig.api.invoiceApi, { json: reqParams });
                var apiRes = JSON.parse(apiResponse.getBody('utf8'));
                console.log(apiRes);

                if (apiRes.success == false || apiRes.success == "false") {
                    var cdSite = apiRes.cdSite;

                    for (var i = 0; i < apiRes.error.sequence.length; i++) {
                        var seq = apiRes.error.sequence[i].seq;
                        var errMsg = apiRes.error.sequence[i].errMsg;

                        sync.await(oracle.updateFtpFileListErrMsg(seq, cdSite, errMsg, sync.defer()));
                    }
                }

                apiCallCount++;
            } while (apiRes.success == 'false' && apiCallCount < 2);           
            
            returnJson = apiRes;
        } catch (e) {
            console.log(e);
            returnJson = { 'error': e };
        } finally {
            res.send(returnJson);
        }
    });
});

// 문서 데이터 수정
router.post('/updateBatchPoMlExport', function (req, res) {
    sync.fiber(function () {
        try {
            var filePath = req.body.filePath;
            var data = req.body.data;
            var saveData = '[';
            var typoData = req.body.typoData;
            var numTypoData = req.body.numTypoData;
            var docTopType = req.body.docTopType;
            var returnJson;
            //var exportData = sync.await(oracle.selectSingleBatchPoMlExportFromFilePath(filePath, sync.defer()));
            //exportData = exportData.replace(/[\[\]\"]/gi, '');
            //var exportDataArr = exportData.split(',');
            for (var i = 0; i < data.length; i++) {
                if (data[i].type == 'single') {
                    if (data[i].value) {
                        saveData += '"0::' + data[i].value + '",';
                    } else {
                        saveData += 'null,';
                    }
                } else {
                    var emptyCnt = 0;
                    for (var j = 0; j < data[i].value.length; j++) {
                        var yLocTemp = (j + 1) * 50;
                        if (data[i].value[j]) {
                            if (j != 0) saveData += ' | ';
                            saveData += '"' + yLocTemp + '::' + data[i].value[j] + '';
                        } else {
                            emptyCnt++;
                        }                        
                    }
                    if (emptyCnt == data[i].value.length) {
                        saveData += 'null,';
                    } else {
                        saveData += '",';
                    }
                }
            }
            saveData = saveData.slice(0, -1);
            saveData += ']';
            if (numTypoData.length > 0) {
                sync.await(oracle.insertNumTypo(numTypoData, docTopType, sync.defer()));
            }
            sync.await(oracle.insertIcrSymspell(typoData, docTopType, sync.defer()));
            sync.await(oracle.updateBatchPoMlExport(filePath, saveData, sync.defer()));
            returnJson = { 'data': saveData };
        } catch (e) {
            console.log(e);
            returnJson = { 'error': e };
        } finally {
            res.send(returnJson);
        }
    });
});

module.exports = router;