'use strict';

// var express = require('express');
// var fs = require('fs');
// var multer = require("multer");
// var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
// var request = require('request');
// var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
// var queryConfig = require(appRoot + '/config/queryConfig.js');
// var commonDB = require(appRoot + '/public/js/common.db.js');
// var commonUtil = require(appRoot + '/public/js/common.util.js');
// var pythonConfig = require(appRoot + '/config/pythonConfig');
// var PythonShell = require('python-shell')
var sync = require('../util/sync.js');
var oracle = require('../util/oracle.js');
// var execSync = require('sync-exec');
// var ocrUtil = require('../util/ocr.js');
// var Step = require('step');
// const xlsx = require('xlsx');
// const async = require("async");
var sync = require('../util/sync.js');
var difflib = require('difflib');
var predRegionConfig = require(appRoot + '/config/predRegionConfig');

var numeral = require('numeral');

//PKS 여기서부터 새로 시작


//module.exports = router;
module.exports = {
	classify: function (req, done) {
		sync.fiber(function () {
			try {
                //var retDataList =new Array();
                // mappingSid 추출
                var retReq = req;

                req = sync.await(getMappingSid(req, sync.defer()));
                if(req.docCategory.DOCTOPTYPE == 0)
                {
                    var docTypes = sync.await(refindDocTopType(req, sync.defer()));
                    if (docTypes[1] != 0) {
                        // mappingSid 추출
                        req = sync.await(getMappingSid(req, sync.defer()));
                        // 가변영역추출
                        req = sync.await(findEntry(req, docTypes[0], docTypes[1], sync.defer()));
                    } else {
                        req = retReq;
                    }
                }
                else
                {
                    // 가변영역추출
                    req = sync.await(findEntry(req,req.docCategory.DOCTYPE,req.docCategory.DOCTOPTYPE, sync.defer()));
                }

                //retDataList.push(req);
                req = sync.await(editOcrTextTypos(req, sync.defer()));
				return done(null, req);
			} catch (e) {
				console.log(e);
			}

		});
	}
};

// ocrtext 오타수정
function editOcrTextTypos(req, done) {
	sync.fiber(function () {
		try {

            var symspellList = sync.await(oracle.selectIcrSymspell(req.docCategory.DOCTOPTYPE, sync.defer()));
            var symspellListLength = symspellList.length;
            var ocrData = req.data;
            var ocrDataLength = ocrData.length;
            //var reqDataLength = req.data.length;
            for(var i = 0; i < symspellListLength; i++) {
                var dbIcrWord = symspellList[i].ICRWORD;
                var dbKeyWord = symspellList[i].KEYWORD; 
                for(var j = 0; j < ocrDataLength; j++) {
                    var ocrText =  ocrData[j].text;
                    // 전체 수정
                    if(dbIcrWord == ocrText) {
                        ocrData[j].text = dbKeyWord;
                    }
                    // 부분 수정
                    // if(ocrText.indexOf(dbIcrWord)!==-1)
                    // {
                    //     ocrText = ocrText.replace(dbIcrWord, dbKeyWord);
                    //     ocrData[j].text = ocrText;
                    // }
                }
            }
            
		} catch (e) {
			console.log(e);
		} finally {
			return done(null, req);
		}

	});
}

function getMappingSid(req, done) {
	sync.fiber(function () {
		try {
			var retData = [];
            var docType = req.docCategory.DOCTYPE;
            
            retData["docCategory"]= req.docCategory;
			for (var i in req.data) {
				var item = req.data[i];
			    // var sid = sync.await(oracle.selectSid(req.data[i], sync.defer()));
				var loc = req.data[i].location.split(',');
                var mappingSid = String(docType) + "," + String(loc[0]) + "," + String(loc[1]) + "," + String(parseInt(loc[0]) + parseInt(loc[2])) + ",0,0,0,0,0";
                //var mappingSid = String(docType) + "," + String(loc[0]) + "," + String(loc[1]) + "," + String(parseInt(loc[0]) + parseInt(loc[2])) + "," + String(req.data[i]["sid"]);
				req.data[i]["mappingSid"] = mappingSid;
			}
            retData["data"]= req.data;
			
		} catch (e) {
			console.log(e);
		} finally {
			return done(null, retData);
		}

	});
}


function refindDocTopType(req, done) {
	sync.fiber(function () {
		try {
            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            var docTopType = 0;
            var docType = 0;
            var maxNum = 0;
            var text = [];
            var strText = "";

            let docTypeList = sync.await(oracle.selectRefindDocTopTypeList(req, sync.defer()));

            for(var j in req.data)
            {
                //console.log( req.data[j].text + " [ "+j+" ] " + req.data[j].text.replace(regExp,""));
                text += (req.data[j].text.replace(regExp,"")) + ",";
                if(j == 20){
                    break;
                }
            }
            //console.log(text.length +" |||| "+text);
            if(text.length > 0)
            {
                strText = text.substring(0, text.length -1).toLowerCase();
                for(var i in docTypeList)
                {
                    var ratio = similar(strText, docTypeList[i].DATA);
                    if(ratio > maxNum)
                    {
                        maxNum = ratio;
                        docType = docTypeList[i].DOCTYPE;
                        docTopType = docTypeList[i].DOCTOPTYPE;
                    }
                }
            }
            
		} catch (e) {
			console.log(e);
		} finally {
            if(maxNum > 0.2)
            {
                return done(null, [docTopType,docType]);
            }
            else
            {
                return done(null, [docTopType,docType]);
            }
		}
	});
}

function findEntry(req, docTypeVal, docTopTypeVal, done) {
	sync.fiber(function () {
        try 
        {
            var retData = {};
            var subLabel = [];
            var fixSingleLabel = [];
            var fixMultiLabel = [];
            var fixLabel = [];
            var variLabel = [];
            let docTopTypeParam = [docTopTypeVal];
            let docTypeParam = [docTypeVal];
            
            let labelRows = sync.await(oracle.selectDocIdLabelDefList(docTopTypeParam, sync.defer()));

            //label data 추출
            let labelTrainRows = sync.await(oracle.selectLabelTrainDataList(docTypeParam, sync.defer()));

            for(var j in req.data) {
                if(labelTrainRows.length > 0) {
                    for (var k in labelTrainRows) {
                        if (predictionColumn(req.docCategory, req.data[j], labelTrainRows[k], 'L')) {
                            req.data[j]["colLbl"] = labelTrainRows[k].CLASS;
                            break;
                        }
                        else {
                            req.data[j]["colLbl"] = -1;
                        }
                    }
                }
                else {
                    req.data[j]["colLbl"] = -1;
                }
            }
            retData["docCategory"] = req.docCategory;
            retData["data"] = req.data;            

            //entry data 추출
            let entryTrainRows = sync.await(oracle.selectTrainDataList(docTypeParam, sync.defer()));
            
            for(var j in req.data) {
                for (var k in entryTrainRows) {
                    // if (entryTrainRows[k].CLASS != "760" && entryTrainRows[k].CLASS != "761" && entryTrainRows[k].CLASS != "502") {
                    if (req.docCategory.DOCTYPE == "329" || req.docCategory.DOCTYPE == "319" ||  req.docCategory.DOCTYPE == "316" ){
						if (predictionColumn(req.docCategory, req.data[j], entryTrainRows[k], 'E') && isValid(labelRows, entryTrainRows[k].CLASS, req.data[j]["text"])) {
							if (!req.data[j]["entryLbls"]) {
								req.data[j]["entryLbls"] = [entryTrainRows[k]];
							} else {
								req.data[j]["entryLbls"].push(entryTrainRows[k]);
							}
							//req.data[j]["entryLbl"] = entryTrainRows[k].CLASS;

							//break;
						}
                    }
                    else
                    {
                        // if (entryTrainRows[k].CLASS != "760" && entryTrainRows[k].CLASS != "761" && entryTrainRows[k].CLASS != "502") {
                            if (entryTrainRows[k].CLASS != "760" && entryTrainRows[k].CLASS != "761" && entryTrainRows[k].CLASS != "422") {
                            if (predictionColumn(req.docCategory, req.data[j], entryTrainRows[k], 'E') && isValid(labelRows, entryTrainRows[k].CLASS, req.data[j]["text"])) {
                                if (!req.data[j]["entryLbls"]) {
                                    req.data[j]["entryLbls"] = [entryTrainRows[k]];
                                } else {
                                    req.data[j]["entryLbls"].push(entryTrainRows[k]);
                                }
                                //req.data[j]["entryLbl"] = entryTrainRows[k].CLASS;
    
                                //break;
                            }
                        }
                    }
                }

                var minDis = 10000;
                if (req.data[j]["entryLbls"]) {
                    for (var k in req.data[j]["entryLbls"]) {
                        var entryItem = req.data[j]["entryLbls"][k];
                        var targetLoc = req.data[j].location.split(',');
                        var entryLoc = [entryItem.OCR_TEXT_X.split(',')[0], entryItem.OCR_TEXT_Y.split(',')[0], entryItem.OCR_TEXT_X.split(',')[1], entryItem.OCR_TEXT_Y.split(',')[1]];
                        var dx = Math.abs((targetLoc[0]) - (entryLoc[0]));
                        var dy = Math.abs((targetLoc[1]) - (entryLoc[1]));
                        var tragetDis = Math.sqrt((dx * dx) + (dy * dy));
                        if (tragetDis < minDis) {
                            minDis = tragetDis;
                            req.data[j]["entryLbl"] = entryItem.CLASS;
                            req.data[j]["amount"] = entryItem.AMOUNT;
                            if (entryItem.AMOUNT == "multi") {
                                req.data[j]["first"] = "Y";
                            }
                            delete req.data[j]["colLbl"];
                        }
                    }
                }
                
                // 예측 mlEntryLbl을 entryLbl로 넣기   
                if(req.docCategory.DOCSCORE < 0.3){
                    if(typeof req.data[j]["mlEntryLbl"] != "undefined" && typeof req.data[j]["entryLbl"] == "undefined" ){
                        // console.log("mlEntryLbl===>" + req.data[j]["mlEntryLbl"])
                        req.data[j]["entryLbl"] = req.data[j]["mlEntryLbl"];
                        delete req.data[j]["colLbl"];
                    }
                }             
                
            }         
            
            //Multy entry search
            var diffHeight = 200;
            for (var j in req.data) {
                var amount = req.data[j]["amount"];
                if(typeof amount != "undefined" && amount == "multi" && typeof req.data[j]["first"] != "undefined" && req.data[j]["first"] == "Y") {
                    //console.log(req.data[j]);
                    var firstEntry = req.data[j];
                    var preEntryHeight = req.data[j];
                    // console.log("req.docCategory.DOCTYPE ==> " + req.docCategory.DOCTYPE);
                    for (var k in req.data) {
                        // if (req.docCategory.DOCTYPE == "422"){
                        //     var entryHeight = req.data[k]["location"].split(",");
                        //     if (multiEntryCheck(firstEntry, req.data[k] , req.docCategory.DOCTYPE) && parseInt(entryHeight[1]) < 1800) {
                        //         req.data[k]['entryLbl'] = firstEntry['entryLbl'];
                        //         req.data[k]["amount"] = firstEntry['amount'];
                        //         preEntryHeight = req.data[k];
                        //     }
                        // } 
                        // else 
                        // if (multiEntryCheck(firstEntry, req.data[k] , req.docCategory.DOCTYPE) && entryHeightCheck(preEntryHeight, req.data[k], diffHeight)) {
                        if (multiEntryCheck(firstEntry, req.data[k] , req.docCategory.DOCTYPE)) {
                            req.data[k]['entryLbl'] = firstEntry['entryLbl'];
                            req.data[k]["amount"] = firstEntry['amount'];
                            preEntryHeight = req.data[k];
                        }
                    }
                }
            }
            
            // Add single entry text
            req.data = sync.await(addEntryTextOfLabel(req.data,req.docCategory.DOCTOPTYPE, sync.defer()));        

            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            //예외처리 등록
            for(var j in req.data)
            {
                if(req.docCategory.DOCTOPTYPE == 58) {
                    //761 사업자등록번호
                    if(req.data[j]["entryLbl"] == 761)
                    {
                        if(req.data[j]["text"] == "615-81-45657산단5로100-235"){
                            req.data[j]["text"] = "615-81-456575"
                        }
                    }
                    else if(req.data[j]["entryLbl"] == 852)
                    {
                        
                        req.data[j]["text"] = "대림산업(주)"
                        
                    }
                    

                    //납품용적
                    if(req.data[j]["entryLbl"] == 767)
                    {
                        var regex= /[^0-9]/g;
                        req.data[j]["text"] = req.data[j]["text"].replace(regex,"");
                        if(req.data[j]["text"].indexOf(",") !== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace(",","");
                        }

                        if(req.data[j]["text"].indexOf(".") == -1)
                        {
                            if(req.data[j]["text"].substring(req.data[j]["text"].length-3) == "000")
                            {
                                req.data[j]["text"] = req.data[j]["text"].substring(0, req.data[j]["text"].length-3) + "."+req.data[j]["text"].substring(req.data[j]["text"].length, req.data[j]["text"].length-3);
                            }
                            else if(req.data[j]["text"].substring(req.data[j]["text"].length-2) == "00")
                            {
                                req.data[j]["text"] = req.data[j]["text"].substring(0, req.data[j]["text"].length-2) + "."+req.data[j]["text"].substring(req.data[j]["text"].length, req.data[j]["text"].length-2);
                            }
                        }
                        if(req.data[j]["text"].substring(req.data[j]["text"].length-1) == ".")
                        {
                            req.data[j]["text"] = req.data[j]["text"] +"00";
                        }
                    }

                    //납품출발시간
                    if(req.data[j]["entryLbl"] == 766)
                    {
                        if(req.data[j]["text"].indexOf("도") !== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace("도","");
                        }

                        if(req.data[j]["text"].replace( /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g,"").length == 4)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace( /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g,"");
                            req.data[j]["text"] = req.data[j]["text"].substring(0,2) + "시" + req.data[j]["text"].substring(2) + "분";
                        }

                        req.data[j]["text"] =  req.data[j]["text"].replace("분분","분")
                        req.data[j]["text"] =  req.data[j]["text"].replace("시각","")
                        
                    }

                    // 운반차순서
                    if(req.data[j]["entryLbl"] == 792)
                    {
                        
                        if(req.data[j]["text"].indexOf(".")!== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace(".","");
                        }
                        if(req.data[j]["text"].indexOf("시")!== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace("시","");
                        }
                        if(req.data[j]["text"].toLowerCase().indexOf("no") !== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].toLowerCase().replace("no","");
                        }
                        
                    }

                    //누계
                    if(req.data[j]["entryLbl"] == 768)
                    {
                        var regex= /[^0-9]/g;
                        req.data[j]["text"] = req.data[j]["text"].replace(regex,"");

                        if(req.data[j]["text"].indexOf(",") !== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace(",","");
                        }

                        if(req.data[j]["text"].indexOf(".") == -1)
                        {
                            if(req.data[j]["text"].substring(req.data[j]["text"].length-3) == "000")
                            {
                                req.data[j]["text"] = req.data[j]["text"].substring(0, req.data[j]["text"].length-3) + "."+req.data[j]["text"].substring(req.data[j]["text"].length, req.data[j]["text"].length-3);
                            }
                            else if(req.data[j]["text"].substring(req.data[j]["text"].length-2) == "00")
                            {
                                req.data[j]["text"] = req.data[j]["text"].substring(0, req.data[j]["text"].length-2) + "."+req.data[j]["text"].substring(req.data[j]["text"].length, req.data[j]["text"].length-2);
                            }
                        }
                        if(req.data[j]["text"].substring(req.data[j]["text"].length-1) == ".")
                        {
                            req.data[j]["text"] = req.data[j]["text"] +"00";
                        }
                    }

                    //콘크리트
                    if(req.data[j]["entryLbl"] == 769)
                    {
                        if(req.data[j]["text"] == "콘크리트따른구분" || req.data[j]["text"] == "콘크리트보통따른구분/" || req.data[j]["text"] == "따른구분/보통콘크리트" || req.data[j]["text"] == "따른구분콘크리트" || req.data[j]["text"] == "따른구분보통콘크리트" || req.data[j]["text"] == "방보콘크리트" || req.data[j]["text"] == "통콘크리트" || req.data[j]["text"] == "보콘크리트")
                        {
                            req.data[j]["text"] = "보통콘크리트";
                        }
                        
                    }

                    //굵은굴재
                    if(req.data[j]["entryLbl"] == 770)
                    {
                        if((req.data[j]["text"].indexOf("시")!== -1) || (req.data[j]["text"].indexOf("시방")!== -1))
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace( /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g,"");
                        }
                        if(req.data[j]["text"].indexOf("mm") !== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace("mm","");
                        }
                        if(req.data[j]["text"] == "125" || req.data[j]["text"] == "25방배합" || req.data[j]["text"] == "25.방" || req.data[j]["text"] == "25방배합" || req.data[j]["text"] == "방25배합" || req.data[j]["text"] == "125." || req.data[j]["text"] == "2" || req.data[j]["text"] == "255" || req.data[j]["text"] == "05")
                        {
                            req.data[j]["text"] = "25";
                        }

                        
                    }
                    //호칭강도
                    if(req.data[j]["entryLbl"] == 771)
                    {
                        if(req.data[j]["text"] == "표18(g/" || req.data[j]["text"]=="표18(/" || req.data[j]["text"]=="118.표(g" || req.data[j]["text"]=="18(g")
                        {
                            req.data[j]["text"] = "18";
                        }

                        if(req.data[103]["text"].substring(req.data[103]["text"].length-1) == ".")
                        {
                            req.data[j]["text"] = req.data[j]["text"].substring(0,req.data[j]["text"].length-1 );
                        }
                        if(req.data[j]["text"] == "121" || req.data[j]["text"] == "21/" || req.data[j]["text"] == "1")
                        {
                            req.data[j]["text"] = "21";
                        }
                        
                    }
                    //슬럼프 150()
                    if(req.data[j]["entryLbl"] == 772)
                    {
                        if(req.data[j]["text"].indexOf("mm") !== -1)
                        {
                            req.data[j]["text"] = req.data[j]["text"].replace("mm","");
                        }

                        if(req.data[j]["text"] == "1500" || req.data[j]["text"] == "1150" || req.data[j]["text"] == "1501" || req.data[j]["text"] == "15")
                        {
                            req.data[j]["text"] = "150";
                        }
                    }

                    //시멘트
                    if(req.data[j]["entryLbl"] == 773)
                    {
                        if(req.data[j]["text"] == "포틀랜드시멘트1종따른구분" || req.data[j]["text"] == "포들랜드시멘트1종따른구분" || req.data[j]["text"] == ")따른구분시멘트종류에포틀랜드시멘트1종" || req.data[j]["text"] == "시멘트종류에따른구분)포틀랜드시멘트1종" || req.data[j]["text"] == "따른구분포틀랜드시멘트종" || req.data[j]["text"] == "틀랜드시멘트1종")
                        {
                            req.data[j]["text"] = "포틀랜드시멘트1종";
                        }

                        if(req.data[j]["text"] == "포틀랜드시멘트1종O로슬래그시메트2")
                        {
                            req.data[j]["text"] = "포틀랜드시멘트1종";
                        }

                        if(req.data[j]["text"] == "랜드시멘트1종(70")
                        {
                            req.data[j]["text"] = "포틀랜드시멘트1종70";
                        }

                        if(req.data[j]["text"] == "보통포틀멘E" || req.data[j]["text"] == "보통포틀랜드시멘E1" || req.data[j]["text"] == "보통포틀랜시1" || req.data[j]["text"] == "보통틀랜드시멘E1" || req.data[j]["text"] == "보통포틀드시멘")
                        {
                            req.data[j]["text"] = "보통포틀랜드시멘트1종";
                        }
                        
                    }
                }
                else if (req.docCategory.DOCTOPTYPE == 61) 
                {
                    if(req.docCategory.DOCTYPE == 422 ){
                        if(req.data[j]["entryLbl"] == "877"){
                            var entry877 = "";
                            entry877 = req.data[j].text.replace(regExp,"");
                            if(entry877.substring(entry877.length-3, entry877.length) == "000"){
                                // console.log(numeral(entry877.substring(0,entry877.length-3)).format('0,0')+".000");
                                req.data[j].text = numeral(entry877.substring(0,entry877.length-3)).format('0,0')+".000";
                            }
                        }
                        else if(req.data[j]["entryLbl"] == "873"){
                            var entry873 = "";
                            entry873 = req.data[j].text.replace(regExp,"");
                            if(entry873.length == 14)
                            {
                                if(entry873.substring(entry873.length-6, entry873.length) == "000000"){
                                    entry873 = entry873.substring(0,entry873.length-6);
                                    console.log(entry873.substring(0,4) + "-" +entry873.substring(4,6)+ "-" +entry873.substring(6,8));
                                    req.data[j].text = entry873.substring(0,4) + "-" +entry873.substring(4,6)+ "-" +entry873.substring(6,8);
                                }
                            }
                            else if(entry873.length == 8)
                            {
                                console.log(entry873.substring(0,4) + "-" +entry873.substring(4,6)+ "-" +entry873.substring(6,8));
                                req.data[j].text = entry873.substring(0,4) + "-" +entry873.substring(4,6)+ "-" +entry873.substring(6,8);
                            }
                        }
                    }
                    
                }
                // else if (req.docCategory.DOCTOPTYPE == 51) {
                //     //품목명 예외처리
                //     if(req.data[j]["entryLbl"] == 504 || req.data[j]["entryLbl"] == 505 || req.data[j]["entryLbl"] == 506 ||req.data[j]["entryLbl"] == 543) {
                //         if(req.data[j]["text"].indexOf("품명및") !== -1 || req.data[j]["text"].indexOf("이하여백") !== -1 || req.data[j]["text"].indexOf("***") !== -1 || req.data[j]["text"].indexOf("이여") !== -1 || req.data[j]["text"].indexOf("*하백") !== -1 || req.data[j]["text"].indexOf("**") !== -1)
                //         {
                //             delete req.data[j]["entryLbl"];
                //         }

                //         if(req.data[j]["text"].indexOf("비고:") !== -1 || req.data[j]["text"].indexOf("계좌:") !== -1 || req.data[j]["text"].indexOf("TEL:") !== -1 || req.data[j]["text"].indexOf("여백**") !== -1 || req.data[j]["text"].indexOf("***이하") !== -1 || req.data[j]["text"].indexOf("품명") !== -1)
                //         {
                //             delete req.data[j]["entryLbl"];
                //         }

                //         if(req.data[j]["text"].indexOf("품 명 및 규 격") !== -1 || req.data[j]["text"].indexOf("하백") !== -1)
                //         {
                //             delete req.data[j]["entryLbl"];
                //         }
                //     }
                //     // 540 공급자 받는자
                //     if(req.data[j]["entryLbl"] == 540)
                //     {
                //         if(req.data[j]["text"] == "호(주)통광")
                //         {
                //             req.data[j]["text"] = "(주)통광";
                //         }

                //         if(req.data[j]["text"] == "대림에스엠(주)성")
                //         {
                //             req.data[j]["text"] = "대림에스엠(주)";
                //         }

                //         if(req.data[j]["text"] == "호(주)대유스틸")
                //         {
                //             req.data[j]["text"] = "(주)대유스틸";
                //         }      
                //         if(req.data[j]["text"] == "호대림산업(주)" || req.data[j]["text"] == "상호대림산업(주)" || req.data[j]["text"] == "대림산업주)(" || req.data[j]["text"] == "독번역편한세상캐슬대림산업(주)" || req.data[j]["text"] == "호주)대림산업(")
                //         {
                //             req.data[j]["text"] = "대림산업(주)";
                //         }                  
                //     }
                //     // 541 현장명
                //     if(req.data[j]["entryLbl"] == 541)
                //     {
                //         if(req.data[j]["text"] == "명녹번역e편한세상")
                //         {
                //             req.data[j]["text"] = "녹번역e편한세상";
                //         }
                        
                //         if(req.data[j]["text"] == "독번") {
                //             req.data[j]["text"] = "녹번";
                //         }

                //         if(req.data[j]["text"] == "독번역e-편한세상") {
                //             req.data[j]["text"] = "녹번역e-편한세상";
                //         }  
                //     }
                //     // 502 공급자
                //     if(req.data[j]["entryLbl"] == 502)
                //     {
                //         if(req.data[j]["text"] == "호광일볼트")
                //         {
                //             req.data[j]["text"] = "광일볼트상사";
                //         }

                //         if(req.data[j]["text"] == "대림산업(주)녹번역편한세상캐슬" || req.data[j]["text"] == "Tot대림산업(주)" || req.data[j]["text"] == "호대림산업(주)")
                //         {
                //             req.data[j]["text"] = "대림산업(주)";
                //         }

                //         if(req.data[j]["text"] == ")백광도시개발군")
                //         {
                //             req.data[j]["text"] = "백광도시개발";
                //         }

                //         if(req.data[j]["text"] == "대치가설산업경기도여주시" || req.data[j]["text"] == "대치가설산업여주시경기도")
                //         {
                //             req.data[j]["text"] = "대치가설산업";
                //         }

                //         if(req.data[j]["text"] == "대림에스엠(주)성" || req.data[j]["text"] == "대림에스엠()주" || req.data[j]["text"] == "대림에스엠()성주" || req.data[j]["text"] == "대림(주)성에스엠" || req.data[j]["text"] == "대림에스엠)(주" || req.data[j]["text"] == "대림에스엠)성(주")
                //         {
                //             req.data[j]["text"] = "대림에스엠(주)";
                //         }

                //         if(req.data[j]["text"] == ")웍스코퍼레이성(" || req.data[j]["text"] == ")웍스코퍼레이성" || req.data[j]["text"] == ")웍스코퍼레이션퍼레이션성")
                //         {
                //             req.data[j]["text"] = "웍스코퍼레이션";
                //         }

                //         if(req.data[j]["text"] == "우신케이판미")
                //         {
                //             req.data[j]["text"] = "우신케이블판매";
                //         }

                //         if(req.data[j]["text"] == "(광지세이프티주)" || req.data[j]["text"] == "호)광지세이프티(주" || req.data[j]["text"] == "호(주)광지세이프티")
                //         {
                //             req.data[j]["text"] = "광지세이프티(주)";
                //         }

                //         req.data[j]["text"].replace("명독","녹");

                //     }

                    
                // }
                
            }

            retData["docCategory"] = req.docCategory;
            retData["data"] = req.data;

            //console.log(retData);
            
        } catch (e) {
            console.log(e);
        } finally {
            return done(null, retData);
        }

	});
}

function addEntryTextOfLabel(data, docTopType, done) {
    sync.fiber(function () {
        try {           
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < data.length; j++) {                   
                    if (i != j && data[i]["entryLbl"] && data[j]["entryLbl"] && data[i]["entryLbl"] == data[j]["entryLbl"]) {
                        var targetLoc = data[i]["location"].split(',');
                        var compareLoc = data[j]["location"].split(',');
                        if (data[i]["amount"] == "single" && data[j]["amount"] == "single") { // 싱글
                            if ((data[i]["entryLbl"] == "769" || data[i]["entryLbl"] == "773") &&
                                (Number(compareLoc[1]) - Number(targetLoc[1])) > 30) { // 콘크리트종류 or 시멘트 종류
                                // 붙여진 text 정보를 확인하기 위한 용도 (텍스트가 붙여지면 entryLbls로는 확인이 어려움)
                                if (data[i]["addItem"]) {
                                    data[i]["addItem"].push(JSON.parse(JSON.stringify(data[j])));
                                } else {
                                    data[i]["addItem"] = [JSON.parse(JSON.stringify(data[i])), JSON.parse(JSON.stringify(data[j]))];
                                    delete data[i]["entryLbls"];
                                }

                                //예측값 출력 안되게
                                if(typeof data[i]["mlEntryLbl"] != "undefined" && typeof data[i]["entryLbl"] != "undefined" && typeof data[j]["entryLbl"] != "undefined"){
                                    // console.log("no undefined" + data[i]["text"]);
                                    break;
                                }
                                // 텍스트와 위치 데이터 가공
                                data[i]["text"] = data[i]["text"] + data[j]["text"];
                                data[i]["location"] = targetLoc[0] + ',' + targetLoc[1]
                                    + ',' + (compareLoc[2])
                                    + ',' + (Number(targetLoc[3]) + Number(compareLoc[3]) + (Number(compareLoc[1]) - (Number(targetLoc[1]) + Number(targetLoc[3]))))

                                // 붙여진 text row 제거하고 배열 인덱스 한단계 전으로 돌아가서 현재 row 기준으로 다시 실행 
                                data.splice(j, 1);
                                i--;
                                break;
                            } else {
                                if (data[i]["addItem"]) {
                                    data[i]["addItem"].push(JSON.parse(JSON.stringify(data[j])));
                                } else {
                                    data[i]["addItem"] = [JSON.parse(JSON.stringify(data[i])), JSON.parse(JSON.stringify(data[j]))];
                                    delete data[i]["entryLbls"];
                                }

                                if (Number(targetLoc[0]) < Number(compareLoc[0])) {
                                    //예측값 출력 안되게 
                                    if(typeof data[j]["mlEntryLbl"] != "undefined" && typeof data[j]["entryLbl"] != "undefined" && typeof data[i]["entryLbl"] != "undefined"){
                                        // console.log("no undefined" + data[i]["text"]);
                                        delete data[i]["entryLbls"];
                                        break;
                                    } else {
                                        data[i]["text"] += data[j]["text"];
                                        data[i]["location"] = targetLoc[0] + ',' + targetLoc[1]
                                            + ',' + (Number(compareLoc[0]) + Number(compareLoc[2]) - Number(targetLoc[0]))
                                            + ',' + ((Number(targetLoc[3]) > Number(compareLoc[3])) ? targetLoc[3] : compareLoc[3])
                                    }
                                    
                                } else {
                                    data[i]["text"] = data[j]["text"] + data[i]["text"];
                                    data[i]["location"] = compareLoc[0] + ',' + compareLoc[1]
                                        + ',' + (Number(targetLoc[0]) + Number(targetLoc[2]) - Number(compareLoc[0]))
                                        + ',' + ((Number(targetLoc[3]) > Number(compareLoc[3])) ? targetLoc[3] : compareLoc[3])
                                }       
                                data.splice(j, 1);
                                i--;
                                break;
                            }
                        } 
                        // else if (data[i]["amount"] == "multi" && data[j]["amount"] == "multi") { // 멀티
                        //     var yGap = ((Number(targetLoc[1]) - Number(compareLoc[1])) > 0) ? (Number(targetLoc[1]) - Number(compareLoc[1])) : -(Number(targetLoc[1]) - Number(compareLoc[1]));

                        //     // 텍스트와 위치 데이터 가공                        
                        //     if (Number(targetLoc[0]) < Number(compareLoc[0]) && yGap < 7) {                               
                        //         // 붙여진 text 정보를 확인하기 위한 용도 (텍스트가 붙여지면 entryLbls로는 확인이 어려움)
                        //         if (data[i]["addItem"]) {
                        //             data[i]["addItem"].push(JSON.parse(JSON.stringify(data[j])));
                        //         } else {
                        //             data[i]["addItem"] = [JSON.parse(JSON.stringify(data[i])), JSON.parse(JSON.stringify(data[j]))];
                        //             delete data[i]["entryLbls"];
                        //         }
                                
                        //         data[i]["text"] += data[j]["text"];
                        //         data[i]["location"] = targetLoc[0] + ',' + targetLoc[1]
                        //             + ',' + (Number(compareLoc[0]) + Number(compareLoc[2]) - Number(targetLoc[0]))
                        //             + ',' + ((Number(targetLoc[3]) > Number(compareLoc[3])) ? targetLoc[3] : compareLoc[3])
                        //         data.splice(j, 1);
                        //         i--;
                        //         break;
                        //     }
                        // } 
                        else if (data[i]["entryLbl"] == "760" || data[i]["entryLbl"] == "761" || data[i]["entryLbl"] == "502" || data[i]["entryLbl"] == "422") {
                        } else {
                            if(docTopType == "58")
                            {
                                if (data[i]["addItem"]) {
                                    data[i]["addItem"].push(JSON.parse(JSON.stringify(data[j])));
                                } else {
                                    data[i]["addItem"] = [JSON.parse(JSON.stringify(data[i])), JSON.parse(JSON.stringify(data[j]))];
                                    delete data[i]["entryLbls"];
                                }
    
                                if (Number(targetLoc[0]) < Number(compareLoc[0])) {
                                    data[i]["text"] += data[j]["text"];
                                    data[i]["location"] = targetLoc[0] + ',' + targetLoc[1]
                                        + ',' + (Number(compareLoc[0]) + Number(compareLoc[2]) - Number(targetLoc[0]))
                                        + ',' + ((Number(targetLoc[3]) > Number(compareLoc[3])) ? targetLoc[3] : compareLoc[3])
                                } else {
                                    data[i]["text"] = data[j]["text"] + data[i]["text"];
                                    data[i]["location"] = compareLoc[0] + ',' + compareLoc[1]
                                        + ',' + (Number(targetLoc[0]) + Number(targetLoc[2]) - Number(compareLoc[0]))
                                        + ',' + ((Number(targetLoc[3]) > Number(compareLoc[3])) ? targetLoc[3] : compareLoc[3])
                                }
                                data.splice(j, 1);
                                i--;
                                break;
                            }
                            
                        }                        
                    }
                }
            }
        } catch (e) {
            console.log(e);
        } finally {
            return done(null, data);
        }

    });
}

function entryHeightCheck(data1, data2, diffHeight) {
    var check = false;
    data1 = data1['location'].split(',');
    data2 = data2['location'].split(',');
    var res = parseInt(data2[1]) - parseInt(data1[1]);

    // if(docType == 422)
    // {
    //     if (res < 600) {
    //         check = true;
    //     }
    // }
    // else
    // {
    //     if (res < diffHeight) {
    //         check = true;
    //     }
    // }

    if (res < diffHeight) {
        check = true;
    }
    

    return check;
}

function multiEntryCheck(firstEntry, entry, doctype) {
    var check = false;
    var firstLoc = firstEntry['location'].split(',');
    var entryLoc = entry['location'].split(',');

    // console.log("multiEntryCheck doctype===>" + doctype);
    // console.log("multiEntryCheck firstEntry===>" + firstEntry['entryLbl']);
    
    // if(doctype == 340) {
    //     // 504 품목명
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 50, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     } else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    // } else if(doctype == 341) {
    //     // 504 품목명
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 80, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     } else if (firstEntry['entryLbl'] == 505 && verticalCheck(firstLoc, entryLoc, 10, -10) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     } else if (firstEntry['entryLbl'] == 543 && verticalCheck(firstLoc, entryLoc, 80, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     } else if (firstEntry['entryLbl'] == 506 && verticalCheck(firstLoc, entryLoc, 50, -50) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    // // 일반송자_광일볼트상사
    // }else if(doctype == 348){
    //     // 504 품목명
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 100, -300) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if(firstEntry['entryLbl'] == 506 && verticalCheck(firstLoc, entryLoc, 100, -50) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
        
    // // 355 일반송장_남양씨피엠
    // }else if(doctype == 355){
    //     // 504 품목명
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 150, -300) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    // // 358 대림에스엠
    // }else if(doctype == 358){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 10, -10) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    // }else if(doctype == 363) {
    //     // 504 품목명
    //     if(firstEntry['entryLbl'] == 505 && verticalCheck(firstLoc, entryLoc, 20, -20) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }
    // // 364 대유스틸
    // }else if(doctype == 364){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }

    // // 367 대치가설산업
    // }else if(doctype == 367){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 10, -10) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }    
    // // 355 삼성에스앤에이치
    // }else if(doctype == 355){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 10, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    // // 380 광지세이프티02
    // }else if(doctype == 380){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 10, -150) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if(firstEntry['entryLbl'] == 505 && verticalCheck(firstLoc, entryLoc, 100, -50) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }
    //     else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    
    // // 380 광지세이프티02
    // }else if(doctype == 383){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 200, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if(firstEntry['entryLbl'] == 505 && verticalCheck(firstLoc, entryLoc, 100, -50) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }
    //     else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     }
    
    // // 387 미래테크
    // }else if(doctype == 387){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 100, -150) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if(firstEntry['entryLbl'] == 505 && verticalCheck(firstLoc, entryLoc, 100, -50) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }
    // // 343 대림씨엔에스
    // }else if(doctype == 343){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 100, -150) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if(firstEntry['entryLbl'] == 541 && verticalCheck(firstLoc, entryLoc, 100, -150) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }
    // // 343 광지세이프티01
    // }else if(doctype == 344){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }else if(firstEntry['entryLbl'] == 541 && verticalCheck(firstLoc, entryLoc, 100, -150) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     }    
    
    // // 336 대림에스엠
    // }else if(doctype == 336){        
    //     if(firstEntry['entryLbl'] == 504 && verticalCheck(firstLoc, entryLoc, 50, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)){
    //         check = true;
    //     } else if(verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
    //         check = true;
    //     } 
    // }
    if(doctype == 422) {
        // var deleteY =0;
        // if(entry["text"] == "TOTAL" && Number(entryLoc[1]) > 2000)
        // {
        //     console.log(entry["text"]);
        //     console.log(entryLoc[1]);
        //     deleteY = Number(entryLoc[1]);
        // }
        // else
        // {
        //     deleteY = 5000
        // }
        if(entry["text"] != "TOTAL" && entry["text"] != "인수확인자" && entry["text"] != "제품의포장" && entry["text"] != "(인)" && entry["text"] != "포장"
            && entry["text"] != "제품의" && entry["text"] != "포장@" && entry["text"] != "하" && entry["text"] != "인" && entry["text"] != "제품의포장@"
            && entry["text"] != "품의"
            )
        // if(Number(entryLoc[1]) < deleteY)
        {
            if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
                check = true;
            }
        }
    }
    else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
        check = true;
    }

    return check;
}


function multiDeleteEntryCheck(deleteEntry, entry, doctype) {
    var check = false;
    var firstLoc = firstEntry['location'].split(',');
    var entryLoc = entry['location'].split(',');

    if(doctype == 422) {
        console.log(entry["text"]);
        if(entry["text"] != "TOTAL" && entry["text"] != "인수확인자" && entry["text"] != "제품의포장" && entry["text"] != "(인)")
        {
            console.log("11111111");
            if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
                check = true;
            }
        }
        // else
        // {
        //     console.log("2222222");
        //     check = false;
        // }
    }
    else if (verticalCheck(firstLoc, entryLoc, 100, -100) && locationCheck(firstLoc[1], entryLoc[1], 0, -2000)) {
        check = true;
    }

    return check;
}


// function verticalCheck(data1, data2, plus, minus) {
//     var check = false;

//     var dataWidthLoc2 = (parseInt(data2[0]) + parseInt(data2[0]) + parseInt(data2[2])) / 2;
//     var leftRange = parseInt(data1[0]) + minus;
//     var rigthRange = parseInt(data1[0]) + parseInt(data1[0]) + parseInt(data1[2]) + plus;

//     if (leftRange < dataWidthLoc2 && dataWidthLoc2 < rigthRange) {
//         check = true;
//     }

//     return check;
// }


function verticalCheck(data1, data2, plus, minus) {
    var check = false;
    var dataWidthLoc1 = (parseInt(data1[0]) + parseInt(data1[0]) + parseInt(data1[2])) / 2;
    var dataWidthLoc2 = (parseInt(data2[0]) + parseInt(data2[0]) + parseInt(data2[2])) / 2;

    var res = dataWidthLoc1 - dataWidthLoc2;

    if (res < plus && res > minus) {
        check = true;
    }

    return check;
}


function locationCheck(data1, data2, plus, minus) {
    var res = parseInt(data1) - parseInt(data2);
    var check = false;
    if (res < plus && res > minus) {
        check = true;
    }

    return check;
}

// db 컬럼 정규식과 현재 타겟 text 비교
function isValid(list, cls, text) {
    for (var i in list) {
        if (list[i].SEQNUM == cls) {
            var reg = new RegExp(list[i].VALID);
            return reg.test(text);
        }
    }
    return false;
}

function similar(str, data) {
    return new difflib.SequenceMatcher(null,str, data).ratio();
}

// label, entry 예측 범위 지정 (기준점 : 좌상단, 우하단)
function predictionColumn(docCategory, targetData, dbRowData, type) {
    var mapJson = predRegionConfig;
    var loc = targetData.location.split(",");   

    // 좌상단 좌표를 기준으로 영역 계산
    var tgXLoc = Number(loc[0]), tgYLoc = Number(loc[1]);
    var dbXLoc = (type == 'L') ? Number(dbRowData.LOCATION_X.split(",")[0]) : Number(dbRowData.OCR_TEXT_X.split(",")[0]);
    var dbYLoc = (type == 'L') ? Number(dbRowData.LOCATION_Y.split(",")[0]) : Number(dbRowData.OCR_TEXT_Y.split(",")[0]);
    var upYLoc = dbYLoc, rightXLoc = dbXLoc, downYLoc = dbYLoc, leftXLoc = dbXLoc;

    // if (mapJson[docCategory.DOCTYPE] && mapJson[docCategory.DOCTYPE][dbRowData.CLASS] && mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['LU']
    //     && mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['LU'][type]) {
    //     upYLoc -= mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['LU'][type].up,
    //         rightXLoc += mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['LU'][type].right,
    //         downYLoc += mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['LU'][type].down,
    //         leftXLoc -= mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['LU'][type].left;
    // } else {
    //     upYLoc -= mapJson['default']['LU'][type].up,
    //         rightXLoc += mapJson['default']['LU'][type].right,
    //         downYLoc += mapJson['default']['LU'][type].down,
    //         leftXLoc -= mapJson['default']['LU'][type].left;
    // }
    // DOCTOPTYP별로 config 호출
    if (mapJson[docCategory.DOCTOPTYPE] != "") {        
        upYLoc -= mapJson[docCategory.DOCTOPTYPE]['LU'][type].up,
            rightXLoc += mapJson[docCategory.DOCTOPTYPE]['LU'][type].right,
            downYLoc += mapJson[docCategory.DOCTOPTYPE]['LU'][type].down,
            leftXLoc -= mapJson[docCategory.DOCTOPTYPE]['LU'][type].left;
    } else {
        upYLoc -= mapJson['default']['LU'][type].up,
            rightXLoc += mapJson['default']['LU'][type].right,
            downYLoc += mapJson['default']['LU'][type].down,
            leftXLoc -= mapJson['default']['LU'][type].left;
    }

    var isLUCheck = (leftXLoc <= tgXLoc && tgXLoc <= rightXLoc) && (upYLoc <= tgYLoc && tgYLoc <= downYLoc);

    // 우하단 좌표를 기준으로 영역 계산
    var tgXLoc = Number(loc[0]) + Number(loc[2]), tgYLoc = Number(loc[1]) + Number(loc[3]);
    var dbXLoc = (type == 'L') ? Number(dbRowData.LOCATION_X.split(",")[0]) + Number(dbRowData.LOCATION_X.split(",")[1]) : Number(dbRowData.OCR_TEXT_X.split(",")[0]) + Number(dbRowData.OCR_TEXT_X.split(",")[1]);
    var dbYLoc = (type == 'L') ? Number(dbRowData.LOCATION_Y.split(",")[0]) + Number(dbRowData.LOCATION_Y.split(",")[1]) : Number(dbRowData.OCR_TEXT_Y.split(",")[0]) + Number(dbRowData.OCR_TEXT_Y.split(",")[1]);
    var upYLoc = dbYLoc, rightXLoc = dbXLoc, downYLoc = dbYLoc, leftXLoc = dbXLoc;

    if (mapJson[docCategory.DOCTYPE] && mapJson[docCategory.DOCTYPE][dbRowData.CLASS] && mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['RD']
        && mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['RD'][type]) {
        upYLoc -= mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['RD'][type].up,
            rightXLoc += mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['RD'][type].right,
            downYLoc += mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['RD'][type].down,
            leftXLoc -= mapJson[docCategory.DOCTYPE][dbRowData.CLASS]['RD'][type].left;
    } else {
        upYLoc -= mapJson['default']['RD'][type].up,
            rightXLoc += mapJson['default']['RD'][type].right,
            downYLoc += mapJson['default']['RD'][type].down,
            leftXLoc -= mapJson['default']['RD'][type].left;
    }
    var isRDCheck = (leftXLoc <= tgXLoc && tgXLoc <= rightXLoc) && (upYLoc <= tgYLoc && tgYLoc <= downYLoc);

    return (isLUCheck || isRDCheck) ? true : false;
}

// function predictionColumn(docCategory, targetData, dbRowData, type) {
//     var loc = targetData.location.split(",");   
//     var dbXLoc = (type == 'L') ? Number(dbRowData.LOCATION_X.split(",")[0]) : Number(dbRowData.OCR_TEXT_X.split(",")[0]);
//     var dbYLoc = (type == 'L') ? Number(dbRowData.LOCATION_Y.split(",")[0]) : Number(dbRowData.OCR_TEXT_Y.split(",")[0]);

//     return (loc[0] == dbXLoc && loc[1] == dbYLoc);
// }
