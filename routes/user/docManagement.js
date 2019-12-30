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
var xlsx = require('node-xlsx');
var fs = require('fs');
// var batch = require('../util/batch.js');

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
            let fileName = (req.body.fileName) ? req.body.fileName : null;
            let sequence = (req.body.sequence) ? req.body.sequence : null;
            let docTopType = req.body.docTopType;
            let startDate = (req.body.startDate) ? req.body.startDate.replace(/-/gi, '') + '000000' : null;
            let endDate = (req.body.endDate) ? req.body.endDate.replace(/-/gi, '') + '235959' : null;
            let processState = (req.body.processState) ? req.body.processState : null;
            let pagingCount = (req.body.pagingCount) ? req.body.pagingCount : 1;
            let docLabelList = sync.await(oracle.selectDocLabelDefList([docTopType], sync.defer()));

            let result = sync.await(oracle.selectBatchPoMlExport([ docTopType, startDate, endDate ], processState, pagingCount, cdSite, fileName, sequence, sync.defer()));

            returnJson = { 'docDataList': result[1], 'docLabelList': docLabelList, 'totCount': result[0] };
        } catch (e) {
            console.log(e);
            returnJson = { 'error': e };
        } finally {
            res.send(returnJson);
        }
    });
});


// 보고서 생성 후 Excel 다운로드
router.post('/selectReportExport', function (req, res) {
    sync.fiber(function () {
        var returnJson;

        try {
            let cdSite = (req.body.cdSite) ? req.body.cdSite : null;
            let fileName = (req.body.fileName) ? req.body.fileName : null;
            let sequence = (req.body.sequence) ? req.body.sequence : null;
            let docTopType = req.body.docTopType;
            let startDate = (req.body.startDate) ? req.body.startDate.replace(/-/gi, '') + '000000' : null;
            let endDate = (req.body.endDate) ? req.body.endDate.replace(/-/gi, '') + '235959' : null;
            let processState = (req.body.processState) ? req.body.processState : null;
            let pagingCount = (req.body.pagingCount) ? req.body.pagingCount : 1;
            let docLabelList = sync.await(oracle.selectDocLabelDefList([docTopType], sync.defer()));

            let result = sync.await(oracle.selectReportExport([ docTopType, startDate, endDate ], processState, pagingCount, cdSite, fileName, sequence, sync.defer()));

            returnJson = { 'docDataList': result[1], 'docLabelList': docLabelList, 'totCount': result[0] };
            var options ={};
            var sheetName = "";
            
            if(docTopType == "51"){ sheetName = "일반송장"; }
            else if(docTopType == "58"){ sheetName = "레미콘송장"; }
            else if(docTopType == "61"){ sheetName = "철근송장"; }
            
            var data = new Array();

            var header = [];
            var results = [];
            
            header.push("NO");
            header.push("스캔시간");
            header.push("파일명");
            header.push("현장코드");

            for(var i = 0; i < docLabelList.length; i++)
            {
                header.push(docLabelList[i].KORNM);
            }

            header.push("성공");
            header.push("실패");
            header.push("평균");
            
            data.push(header);

            if(docTopType == "58")
            {
                options = {'!cols': [{ wch: 6 }, { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 50 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 25 }
                    , { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 } ]};
                
            }
            else if (docTopType == "51")
            {
                options = {'!cols': [{ wch: 6 },{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }]};
            }
            else if(docTopType == "61")
            {
                options = {'!cols': [{ wch: 6 },{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
                    , { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }]};
            }

            if(docTopType == "58")
            {   
                var totalAverage = 0;
                var totalSuccess = 0;
                var totalfail = 0;
                for(var m = 0; m < result[1].length; m++)
                {
                    var results = [];
                    var items = result[1][m].EXPORTDATA;
                    results.push(m+1);
                    results.push(result[1][m].AUTOSENDTIME);
                    results.push(result[1][m].FILENAME.substring(result[1][m].FILENAME.lastIndexOf('/') + 1));
                    results.push(result[1][m].APISITECD);
                    items = items.replace(/\"/gi, '').slice(1, -1);
                    items = items.split(',');
                    var successCnt = 0;
                    var failCnt = 0;
                    var average = 0;
                    for (var j = 0; j < items.length; j++) {
                        if (items[j] == 'null') {
                            results.push("");
                            failCnt++;
                        } else {
                            var textVal = (items[j].split('::')[1]) ? items[j].split('::')[1] : items[j];
                            results.push(textVal);
                            if(j == 0 || j == 1 || j == 2 ||  j == 7 || j == 11 || j == 13 )
                            {
                                if(stringCheck(textVal,"")){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else if(j == 4){
                                if(remiconTimeCheck(textVal)){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else if(j == 5){
                                if(numberCheck(textVal, 1)){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else if(j == 6){
                                if(numberCheck(textVal, "")){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else if(j == 8 || j == 9){
                                if(numberCheck(textVal, 2)){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else if(j == 10){
                                if(numberCheck(textVal, 3)){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else if(j == 14){
                                if(dateCheck(textVal, docTopType)){
                                    successCnt ++;
                                }else{
                                    failCnt ++;
                                }
                            }
                            else{
                                successCnt ++;
                            }
                            // successCnt ++;
                        }
                    }
                    results.push(successCnt);
                    totalSuccess = Number(totalSuccess) + Number(successCnt);
                    results.push(failCnt);
                    totalfail = Number(totalfail) + Number(failCnt);
                    average = ((successCnt / (successCnt + failCnt)) * 100).toFixed(2) ;
                    results.push(average);
                    totalAverage = Number(totalAverage) + Number(average) ;
                    data.push(results);
                }
                // console.log( (totalAverage / result[1].length).toFixed(2)   );
                // console.log( ((totalSuccess / (totalSuccess + totalfail)) * 100).toFixed(2) );
                // data.push(((totalSuccess / (totalSuccess + totalfail)) * 100).toFixed(2));
            }
            else if(docTopType == "51") //일반송장
            {
                var multiLabelNumArr = [];
                
                var docDataList = result[1];
                // Multi Label 순서 구하기
                for (var i in docLabelList) {
                    if (docLabelList[i].AMOUNT == "multi") multiLabelNumArr.push(i);
                }
                
                for (var m in docDataList) {
                    var multiLabelYLocArr = [];
                    var multiEntryInfo = getMultiLabelYLoc1(docDataList[m].EXPORTDATA, multiLabelNumArr);
                    multiLabelYLocArr = multiEntryInfo.dataArr;

                    var totalAverage = 0;
                    var totalSuccess = 0;
                    var totalfail = 0;
                    var successCnt = 0;
                    var failCnt = 0;
                    var average = 0;


                    for (var k =0; k < multiEntryInfo.dataCount; k++) {
                        var results = [];
                        if (k == 0) {
                            results.push(docDataList[m].RNUM);
                            results.push(docDataList[m].AUTOSENDTIME);
                            results.push(docDataList[m].FILENAME.substring(docDataList[m].FILENAME.lastIndexOf('/') + 1));
                            results.push(docDataList[m].APISITECD);
                        }
                        else
                        {
                            results.push("");
                            results.push("");
                            results.push("");
                            results.push("");
                        }

                        var items = docDataList[m].EXPORTDATA;
                        items = items.replace(/\"/gi, '').slice(1, -1);
                        items = items.split(',');
                        var itemsCnt = 0;
                        itemsCnt = items.length;
                        var totalFlag = false;
                        var silgleFlag = false;
                        for (var j in items) { 
                            if (items[j] == 'null' && multiLabelNumArr.indexOf(j) != -1) {
                                results.push("");
                                failCnt ++;   
                                
                            }
                            else if (items[j] == 'null' && multiLabelNumArr.indexOf(j) == -1)
                            {
                                results.push("");
                                if(k == 0)
                                {
                                    failCnt ++;
                                }
                            }
                            else if (multiLabelNumArr.indexOf(j) != -1  && items[j].split('::')[1])
                            {
                                var yLoc = Number(multiLabelYLocArr[k].yLoc);
                                if (items[j].split(' | ').length > 0) {
                                    var isEmpty = true;
                                    for (var l in items[j].split(' | ')) {
                                        if (Math.abs(Number(items[j].split(' | ')[l].split('::')[0]) - yLoc) < 20) {
                                            var textVal = items[j].split(' | ')[l].split('::')[1];                                
                                            results.push(textVal);
                                            if(textVal != "")
                                            {
                                                if(j == 3){
                                                    if(numberCheck(textVal,"")){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }
                                                else if(j == 7){
                                                    if(dateCheck(textVal, docTopType)){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }else{
                                                    successCnt ++;
                                                }
                                            }
                                            else
                                            {
                                                
                                                failCnt ++;
                                            }
                                            isEmpty = false;
                                            break;
                                        }
                                    }
                                    if (isEmpty)
                                    { 
                                        results.push("");  
                                        failCnt ++;
                                    };
            
                                } else {
                                    results.push("");
                                }
                            }
                            else
                            {
                                var textVal = '';
                                var itemArr = items[j].split(' | ');
                                var isEmpty = false;
                                if(k == 0)
                                {
                                    textVal = (itemArr[0].split('::')[1]) ? itemArr[0].split('::')[1] : itemArr[0] + ((h == 0) ? '' : ' | ');
                                    results.push(textVal);
                                    if(textVal != "")
                                    {
                                        if(j == 3){
                                            if(numberCheck(textVal,"")){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }else if(j == 7){
                                            if(dateCheck(textVal, docTopType)){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }else{
                                            successCnt ++;
                                        }
                                    }
                                    else
                                    {
                                        failCnt ++;
                                    }
                                }
                                else
                                {
                                    results.push("");
                                    
                                }
                            }
                            
                            if(k == (multiEntryInfo.dataCount-1))
                            {
                                totalFlag = true;
                            }
                        }
                        if(totalFlag)
                        {
                            // console.log("success : " + successCnt);
                            // console.log("fail : " + failCnt);
                            results.push(successCnt);
                            results.push(failCnt);
                            average = ((successCnt / (successCnt + failCnt)) * 100).toFixed(2) ;
                            results.push(average);
                        }
                        
                        data.push(results);
                    }
                }
            }
            else if(docTopType == "61") //철근송장
            {
                var multiLabelNumArr = [];
                
                var docDataList = result[1];
                // Multi Label 순서 구하기
                for (var i in docLabelList) {
                    if (docLabelList[i].AMOUNT == "multi") multiLabelNumArr.push(i);
                }
                
                for (var m in docDataList) {
                    var multiLabelYLocArr = [];
                    var multiEntryInfo = getMultiLabelYLoc1(docDataList[m].EXPORTDATA, multiLabelNumArr);
                    multiLabelYLocArr = multiEntryInfo.dataArr;

                    var totalAverage = 0;
                    var totalSuccess = 0;
                    var totalfail = 0;
                    var successCnt = 0;
                    var failCnt = 0;
                    var average = 0;


                    for (var k =0; k < multiEntryInfo.dataCount; k++) {
                        var results = [];
                        if (k == 0) {
                            results.push(docDataList[m].RNUM);
                            results.push(docDataList[m].AUTOSENDTIME);
                            results.push(docDataList[m].FILENAME.substring(docDataList[m].FILENAME.lastIndexOf('/') + 1));
                            results.push(docDataList[m].APISITECD);
                        }
                        else
                        {
                            results.push("");
                            results.push("");
                            results.push("");
                            results.push("");
                        }

                        var items = docDataList[m].EXPORTDATA;
                        items = items.replace(/\"/gi, '').slice(1, -1);
                        items = items.split(',');
                        var itemsCnt = 0;
                        itemsCnt = items.length;
                        var totalFlag = false;
                        var silgleFlag = false;
                        for (var j in items) { 
                            if (items[j] == 'null' && multiLabelNumArr.indexOf(j) != -1) {
                                results.push("");
                                failCnt ++;   
                                
                            }
                            else if (items[j] == 'null' && multiLabelNumArr.indexOf(j) == -1)
                            {
                                results.push("");
                                if(k == 0)
                                {
                                    failCnt ++;
                                }
                            }
                            else if (multiLabelNumArr.indexOf(j) != -1  && items[j].split('::')[1])
                            {
                                var yLoc = Number(multiLabelYLocArr[k].yLoc);
                                if (items[j].split(' | ').length > 0) {
                                    var isEmpty = true;
                                    for (var l in items[j].split(' | ')) {
                                        if (Math.abs(Number(items[j].split(' | ')[l].split('::')[0]) - yLoc) < 20) {
                                            var textVal = items[j].split(' | ')[l].split('::')[1];                                
                                            results.push(textVal);
                                            if(textVal != "")
                                            {
                                                if(j == 4){
                                                    if(numberHyphenCheck(textVal)){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }
                                                else if(j == 6 || j == 8 || j == 9 || j == 11){
                                                    if(numberCheck(textVal,"")){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }
                                                else if(j == 10 ){
                                                    if(stringCheck(textVal,"HD")){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }
                                                else if(j == 7 ){
                                                    if(numberCheck(textVal,1)){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }
                                                else if(j == 2 ){
                                                    if(dateCheck(textVal,docTopType)){
                                                        successCnt ++;
                                                    }else{
                                                        failCnt ++;
                                                    }
                                                }
                                                else{
                                                    successCnt ++;
                                                }
                                            }
                                            else
                                            {
                                                
                                                failCnt ++;
                                            }
                                            isEmpty = false;
                                            break;
                                        }
                                    }
                                    if (isEmpty)
                                    { 
                                        results.push("");  
                                        failCnt ++;
                                    };
            
                                } else {
                                    results.push("");
                                }
                            }
                            else
                            {
                                var textVal = '';
                                var itemArr = items[j].split(' | ');
                                var isEmpty = false;
                                if(k == 0)
                                {
                                    textVal = (itemArr[0].split('::')[1]) ? itemArr[0].split('::')[1] : itemArr[0] + ((h == 0) ? '' : ' | ');
                                    results.push(textVal);
                                    if(textVal != "")
                                    {
                                        if(j == 4){
                                            if(numberHyphenCheck(textVal)){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }
                                        else if(j == 6 || j == 8 || j == 9 || j == 11){
                                            if(numberCheck(textVal,"")){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }
                                        else if(j == 10 ){
                                            if(stringCheck(textVal,"HD")){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }
                                        else if(j == 7 ){
                                            if(numberCheck(textVal,1)){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }
                                        else if(j == 2 ){
                                            if(dateCheck(textVal,docTopType)){
                                                successCnt ++;
                                            }else{
                                                failCnt ++;
                                            }
                                        }
                                        else{
                                            successCnt ++;
                                        }
                                        
                                    }
                                    else
                                    {
                                        failCnt ++;
                                    }
                                }
                                else
                                {
                                    results.push("");
                                    
                                }
                            }
                            
                            if(k == (multiEntryInfo.dataCount-1))
                            {
                                totalFlag = true;
                            }
                        }
                        if(totalFlag)
                        {
                            // console.log("success : " + successCnt);
                            // console.log("fail : " + failCnt);
                            results.push(successCnt);
                            results.push(failCnt);
                            average = ((successCnt / (successCnt + failCnt)) * 100).toFixed(2) ;
                            results.push(average);
                        }
                        
                        data.push(results);
                    }
                }
            }

            var buffer = xlsx.build([{name:sheetName, data: data}], options);
            fs.writeFile(sheetName+"_"+getTimeStamp()+".xlsx", buffer, (err) => {
                if (err) throw err;
                console.log("Report Create Done....");
                // res.download("D://bob", sheetName+"_"+getTimeStamp()+".xlsx", function(err) {
                //     console.log('download callback called');
                //     if( err ) {
                //         console.log('something went wrong');
                //     }
        
                // }); // pass in the path to the newly created file
        
            })

        } catch (e) {
            console.log(e);
            returnJson = { 'error': e };
        } finally {
            returnJson = { 'error': "SUCCESS" }
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
            // console.log(JSON.stringify(reqParams))
            do {
                var apiResponse = request('POST', propertiesConfig.api.invoiceApi, { json: reqParams });
                var apiRes = JSON.parse(apiResponse.getBody('utf8'));
                console.log(apiRes);

                if (apiRes.success == false || apiRes.success == "false") {
                    var cdSite = apiRes.cdSite;

                    for (var i = 0; i < apiRes.error.sequence.length; i++) {
                        var seq = apiRes.error.sequence[i].seq;
                        var errMsg = apiRes.error.sequence[i].errMsg;
                        var returnBigo = reqParams.data[0].returnBigo;

                        sync.await(oracle.updateFtpFileListErrMsg(seq, cdSite, errMsg, returnBigo,sync.defer()));
                    }
                }
                else
                {   
                    var cdSite = apiRes.cdSite;
                    for (var i = 0; i < reqParams.data.length; i++) {
                        var seq = reqParams.data[i].sequence;
                        var returnBigo = reqParams.data[0].returnBigo;
                        sync.await(oracle.updateFtpFileListErrMsg(seq, cdSite, '', returnBigo,sync.defer()));
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

// 가장 많은 multi entry의 y축 좌표값 구하기
function getMultiLabelYLoc1(exportData, multiLabelNumArr) {
    
    try {
       
            var returnArr = [];
            var maxEntryCount = 1;
            var exportDataArr = exportData.replace(/\"/gi, '').slice(1, -1).split(',');
            var maxColNum = 0;

            // 가장 많은 multi entry 개수 구하기
            for (var j in exportDataArr) {
                if (exportDataArr[j] != "null" && multiLabelNumArr.indexOf(j) != -1) {
                    var entryCount = exportDataArr[j].split(' | ').length;
                    if (maxEntryCount <= entryCount) {
                        maxEntryCount = entryCount;
                        maxColNum = j;
                    }
                }
            }

            // 가장 많은 multi entry y좌표 구하기
            var items = exportData;
            items = items.replace(/\"/gi, '').slice(1, -1);
            items = items.split(',');
            for (var m in items[maxColNum].split(' | ')) {
                returnArr.push({
                    'num': m,
                    'yLoc': items[maxColNum].split(' | ')[m].split('::')[0],
                    'text': items[maxColNum].split(' | ')[m].split('::')[1]
                });
            }

            return { dataArr : returnArr, dataCount: maxEntryCount };

    }
    catch(e){
        throw e;
    }
    
}

function getTimeStamp() {
    var d = new Date();
    var s =
      leadingZeros(d.getFullYear(), 4) +
      leadingZeros(d.getMonth() + 1, 2) +
      leadingZeros(d.getDate(), 2) +
  
      leadingZeros(d.getHours(), 2) +
      leadingZeros(d.getMinutes(), 2) +
      leadingZeros(d.getSeconds(), 2);
  
    return s;
  }

  function leadingZeros(n, digits) {
    var zero = '';
    n = n.toString();
  
    if (n.length < digits) {
      for (var i = 0; i < digits - n.length; i++)
        zero += '0';
    }
    return zero + n;
}


/*

1.숫자 이면서 숫자 자리숫 체크
-> 숫자, 자리수 변수

2.시간타입 체크
XX시XX분


3. 날짜타입 체크

XXXX년XX월XX일 -> 레미콘

2019-12-20(금) -> 일반

2019-12-26 -> 철근

4. 문자여부 체크 O

5. 문자여부 및 HD 포한여부 체크 O


6. 숫자여부 체크

*/

function stringCheck(str, chkStr) {
    var result = false; 
    if(chkStr != ""){
        if(isNaN(str)){
            if(str != undefined){
                if(str.indexOf(chkStr) !== -1){ result = true; }
            }
            
        }
    }else{
        if(isNaN(str)){    result = true;    }
    }
    return result;
}

function numberCheck(num, length) {
    var result = false;
    if(length != ""){
        if(!isNaN(num)){
            if(num.indexOf(".00") || num.indexOf(".000") )
            {
                num = num.replace(".000","").replace(".00","");
            }
            if(num.length == length){ result = true; }
        }
    }else{
        if(!isNaN(num)){ result = true; }
    }
    return result;
}

function numberHyphenCheck(num) {
    var result = false;
    if(num.indexOf("-")){
        num = num.replace("-","");
        if(!isNaN(num)){
            result = true;
        }
    }else{
        if(!isNaN(num)){
            result = true;
        }
    }
    return result;
}

function remiconTimeCheck(time) {
    var result = false;
    var pattern = /[0-9]{2}시[0-9]{2}분/; 
    if(pattern.test(time))
    {
        result = true;
    }
    
    return result;
}


function dateCheck(date, docType) {
    var result = false;
    var remiconPattern = /^[0-9]{4}년[0-9]{2}월[0-9]{2}일/g; 
    var generalPattern1 = /^[0-9]{4}년[0-9]{2}월[0-9]{2}일/g; 
    var generalPattern2 = /^[0-9]{4}-[0-9]{2}-[0-9]{2}/g; 
    var rebarPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}/g; 
    
    if(docType == "58")
    {
        if(remiconPattern.test(date))
        {
            result = true;
        }
    }
    else if(docType == "61")
    {
        if(rebarPattern.test(date))
        {
            result = true;
        }
    }
    else if(docType == "51")
    {
        if(generalPattern1.test(date) || generalPattern2.test(date))
        {
            result = true;
        }
    }
    // console.log(date +"||"+ result);
    return result;
}





module.exports = router;