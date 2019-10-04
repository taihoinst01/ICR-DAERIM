'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var oracle = require('./oracle.js');
var sync = require('./sync.js');
var date = require('date-utils');

app.use(bodyParser.json());

// app.use(function (req, res, next) {
//     //Enabling CORS 
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, contentType,Content-Type, Accept, Authorization");
//     next();
// });

//Setting up server
var server = app.listen(process.env.PORT || 5000, function () {
    var port = server.address().port;
    console.log("ApiServer now running on port", port);
 });

/********************************************************************************************************
                                           ApiServer
 *******************************************************************************************************/
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//POST API
app.post("/reviewRequest", function(req , res){
    sync.fiber(function () {
        var dt = new Date();
        console.log(dt.toFormat('YYYY-MM-DD HH24:MI:SS'));
        console.log("API SERVER CALL RETURN");
        var errmsg = "";
        var retCnt = 0;
        var retSequence = "";
        // console.log(req.body.data);
        // console.log(req.body.data.length);
        // if(req.body.dataCnt == req.body.data.length)
        // {
            if(req.body.data.length > 0)
            {
                for(var i = 0; i < req.body.data.length; i++)
                {
                    console.log("[ "+i+" ]"+req.body.data[i]);
                

                    if(!req.body.data[i].fileName){
                        console.log("fileName is required");
                        // return res.status(400).send({
                        //     result: 'F',
                        //     sequence:req.body.data[i].sequence,
                        //     errMsg: '파일명이 잘못되었습니다!!'
                        // });
                        errmsg = "파일명이 잘못되었습니다!!";

                    }else if (!req.body.data[i].sequence){
                        console.log("sequence is required");
                        // return res.status(400).send({
                        //     result: 'F',
                        //     sequence:req.body.data[i].sequence,
                        //     errMsg: '시퀀스 번호가 없습니다!!'
                        // });
                        errmsg = "시퀀스 번호가 없습니다!!";
                    }
                    else
                    {   
                        var fileNm = "";
                        console.log(req.body.data[i].fileName);
                        // console.log(req.body.data[i].fileName.substring(req.body.data[i].fileName.lastIndexOf('/')+1, req.body.data[i].fileName.length));
                        fileNm = req.body.data[i].fileName.substring(req.body.data[i].fileName.lastIndexOf('/')+1, req.body.data[i].fileName.length);
                        // console.log(fileNm.replace("org_",""));
                        fileNm = fileNm.replace("org_","");
                        fileNm = fileNm.split(".")[0].substring(0, fileNm.split(".")[0].length-2)+".pdf";
                        console.log(fileNm);
                        // console.log(req.body.data[i].sequence);
                        var retData = sync.await(oracle.getFtpFileList(fileNm, req.body.data[i].sequence, req.body.data[i].cdSite, sync.defer()));
                        console.log(retData);
                        if(retData.length < 1)
                        {
                            // return res.status(400).send({
                            //     result: 'F',
                            //     sequence:req.body.data[i].sequence,
                            //     errMsg: '존재하지 않는 데이터입니다!!'
                            // });
                            errmsg = "존재하지 않는 데이터입니다!!";
                            retSequence +=  req.body.data[i].sequence +",";
                        }
                        else
                        {
                            var result = sync.await(oracle.updateFtpFileList(fileNm, req.body.data[i].sequence, req.body.data[i].cdSite,
                                 req.body.data[i].bigo, req.body.data[i].ivgtrNoSral, req.body.data[i].ivgtrDate, req.body.data[i].ivgtrName, sync.defer()));
                            console.log(result);
                            if(result = 1)
                            {
                                
                                retCnt++;
                                // retSequence +=  req.body.data[i].sequence +",";
                                // return res.status(200).send({
                                //     result: 'S',
                                //     sequence:req.body.data[i].sequence,
                                //     errMsg: errmsg
                                // });
                            }
                            else{
                                console.log(result);
                            }
                        }
                    }
                }
                // retSequence = retSequence.substring(retSequence.length-1)
                console.log(retSequence.substring(0,retSequence.length-1));
                if(retCnt == req.body.data.length)
                {
                    return res.status(200).send({
                        result: 'S',
                        sequence:retSequence.substring(0,retSequence.length-1),
                        errMsg: errmsg
                    });
                }
                else
                {
                    return res.status(200).send({
                        result: 'F',
                        sequence:retSequence.substring(0,retSequence.length-1),
                        errMsg: errmsg
                    });
                }
                
            }
            else
            {
                return res.status(200).send({
                    result: 'F',
                    // sequence:req.body.data[i].sequence,
                    errMsg: '데이터가 없습니다!!'
                });
            }
    });
});

module.exports = app;