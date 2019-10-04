var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT;

var appRoot = require('app-root-path').path;
var dbConfig = require(appRoot + '/config/dbConfig');
var queryConfig = require(appRoot + '/config/queryConfig');
var execSync = require('child_process').execSync;
var fs = require('fs');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var request = require('sync-request');
var sync = require('./sync.js');
var oracle = require('./oracle.js');

exports.selectUserInfo = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result
        var userSql;
        var returnObj = [];

        try {
            conn = await oracledb.getConnection(dbConfig);
            userSql = "SELECT * FROM TBL_OCR_COMM_USER WHERE 1=1 ";
            if (req.keyword != '') {
                userSql += "AND USERID LIKE '%" + req.keyword + "%' ";
            }
            if (req.docManagerChk || req.icrManagerChk || req.middleManagerChk || req.approvalManagerChk) {
                userSql += "AND ( ";
                if (req.docManagerChk) {
                    userSql += "SCANAPPROVAL = 'Y' OR ";
                }
                if (req.icrManagerChk) {
                    userSql += "ICRAPPROVAL = 'Y' OR ";
                }
                if (req.middleManagerChk) {
                    userSql += "MIDDLEAPPROVAL = 'Y' OR ";
                }
                if (req.approvalManagerChk) {
                    userSql += "LASTAPPROVAL = 'Y' OR ";
                }
                userSql = userSql.substring(0, userSql.length - 3);
                userSql += ") ORDER BY USERID ASC";
            }            
 
            result = await conn.execute(userSql);
            if (result.rows.length > 0) {
                returnObj = result.rows;
            }

            return done(null, returnObj);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.select = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = `SELECT EXPORT_SENTENCE_SID(LOWER(:COND)) SID FROM DUAL`;
            for (var i in req) {
                var sid = "";
                locSplit = req[i].location.split(",");
                //sid += locSplit[0] + "," + locSplit[1];
                sid += locSplit[0] + "," + locSplit[1] + "," + (Number(locSplit[0]) + Number(locSplit[2]));

                var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
                let result = await conn.execute(sqltext, [req[i].text.replace(regExp, "")]);

                if (result.rows[0] != null) {
                    sid += "," + result.rows[0].SID;
                    //sid += result.rows[0].SID;
                }
                req[i].sid = sid;
            }

            return done(null, req);
        } catch (err) { 
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.select2 = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = `SELECT EXPORT_SENTENCE_SID(:COND) SID FROM DUAL`;
            for (var i in req) {
                var sid = "";
                locSplit = req[i].location.split(",");
                sid += locSplit[0] + "," + locSplit[1] + "," + (Number(locSplit[0]) + Number(locSplit[2]));

                let result = await conn.execute(sqltext, [req[i].text]);

                if (result.rows[0] != null) {
                    sid += "," + result.rows[0].SID;
                }
                req[i].sid = sid;
            }

            return done(null, req);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectLegacyFileData = function (req, done) {
    return new Promise(async function (resolve, reject) {
      var res = [];
      let conn;
      try {
          conn = await oracledb.getConnection(dbConfig);
          let resAnswerFile = await conn.execute(`SELECT * FROM TBL_BATCH_ANSWER_FILE WHERE IMGID LIKE :term `, [req], { outFormat: oracledb.OBJECT });
        
  
        for (let row in resAnswerFile.rows) {
          tempDictFile = {};
          tempDictFile['IMGID'] = resAnswerFile.rows[row].IMGID;
          tempDictFile['PAGENUM'] = resAnswerFile.rows[row].PAGENUM;
          tempDictFile['FILEPATH'] = resAnswerFile.rows[row].FILEPATH;
          tempDictFile['FILENAME'] = tempDictFile['FILEPATH'].substring(tempDictFile['FILEPATH'].lastIndexOf('/') + 1, tempDictFile['FILEPATH'].length);
  
          let answerDataArr = await conn.execute(`SELECT * FROM TBL_BATCH_ANSWER_DATA WHERE IMGID = :imgId AND TO_NUMBER(IMGFILESTARTNO)\
           <= :imgStartNo AND TO_NUMBER(IMGFILESTARTNO) <= :imgStartNo`, [tempDictFile['IMGID'], tempDictFile['PAGENUM'], tempDictFile['PAGENUM']]);
          
          for (let row2 in answerDataArr.rows) {
            let tempdict = {};

            tempDictFile['LEGACY'] = answerDataArr.rows[row2];

          }
          res.push(tempDictFile);
        }
        return done(null, res);
      } catch (err) { // catches errors in getConnection and the query
        console.log(err);
        return done(null, null);
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
  };

  exports.selectDomainDict = function (req, done) {
    return new Promise(async function (resolve, reject) {
      var conn;
      let returnObj = null;
      let selectContractMapping = `SELECT asOgcompanyName legacy FROM tbl_contract_mapping WHERE extOgcompanyName = :extOgcompanyName`;
      try {
        conn = await oracledb.getConnection(dbConfig);
        let result = await conn.execute(selectContractMapping, req, {outFormat: oracledb.OBJECT});
        if (result.rows[0] != null) {
          returnObj = result.rows[0].LEGACY;
        } else {
          returnObj = null;
        }
  
        return done(null, returnObj);
      } catch (err) {
        reject(err);
      } finally {
        if (conn) {
          try {
            await conn.release();
          } catch (e) {
            console.error(e);
          }
        }
      }
    });
  };
exports.selectDocCategory = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        var returnReq = {};   
        var docInfo = req[req.length - 1];
        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = queryConfig.mlConfig.selectDocCategory;

            if (docInfo.docType) {

            } else {
                docInfo.docType = 0;
            }

            let result = await conn.execute(sqltext, [docInfo.docType]);

            returnReq.data = req;
            returnReq.data.splice(req.length - 1, 1);           
            if (result.rows[0] != null) {
                returnReq.docCategory = result.rows;
                returnReq.docCategory[0].score = docInfo.docAccu;
            }

            return done(null, returnReq);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectContractMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = queryConfig.mlConfig.selectContractMapping;
            var extOgCompanyName;
            var extCtnm;

            for (var i in req.data) {
                if (req.data[i].colLbl && req.data[i].colLbl == 0) {
                    extOgCompanyName = req.data[i].text;
                } else if (req.data[i].colLbl && req.data[i].colLbl == 1) {
                    extCtnm = req.data[i].text;
                }
            }

            if (extOgCompanyName && extCtnm) {
                let result = await conn.execute(sqltext, [extOgCompanyName, extCtnm]);
                if (result.rows[0] != null) {
                    req.extOgAndCtnm = result.rows;
                }
            }

            return done(null, req);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectContractMapping2 = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        var returnObj;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = queryConfig.mlConfig.selectContractMapping;

            if (req[0] && req[1]) {
                let result = await conn.execute(sqltext, [req[0], req[1]]);
                if (result.rows[0] != null) {
                    returnObj = result.rows[0];
                } else {
                    returnObj = null;
                }
            } else {
                returnObj = null;
            }

            return done(null, returnObj);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertLabelMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);

            var labelClass;
            let selectSqlText = `SELECT SEQNUM FROM TBL_FORM_LABEL_MAPPING WHERE DATA = :DATA`;
            let insertSqlText = `INSERT INTO TBL_FORM_LABEL_MAPPING (SEQNUM, DATA, CLASS, REGDATE) VALUES (SEQ_FORM_LABEL_MAPPING.NEXTVAL,:DATA,:CLASS,SYSDATE)`;
            let updateSqlText = `UPDATE TBL_FORM_LABEL_MAPPING SET DATA = :DATA , CLASS = :CLASS , REGDATE = SYSDATE WHERE SEQNUM = :SEQNUM`;

            //var userModifyData = [];
            for (var i in req.data) {
                labelClass = 3
                if (req.data[i].colLbl && req.data[i].colLbl == 0) {
                    labelClass = 1
                    /*
                    if (req.data[i].oriColLbl != null && req.data[i].colLbal != req.data[i].oriColLbl) {
                        userModifyData.push(req.data[i]);
                    }
                    */
                }else if(req.data[i].colLbl && req.data[i].colLbl == 1) {
                    labelClass = 2
                    /*
                    if (req.data[i].oriColLbl != null && req.data[i].ColLbal != req.data[i].oriColLbl) {
                        userModifyData.push(req.data[i]);
                    }
                    */
                }

                var result = await conn.execute(selectSqlText, [req.data[i].sid]);
                if (result.rows[0]) {
                    await conn.execute(updateSqlText, [req.data[i].sid, labelClass, result.rows[0].SEQNUM]);
                } else {
                    await conn.execute(insertSqlText, [req.data[i].sid, labelClass]);
                }

            }
            return done(null, req);
        } catch (err) { 
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertDocMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let selectSqlText = `SELECT SEQNUM FROM TBL_FORM_MAPPING WHERE DATA = :DATA`;
            let insertSqlText = `INSERT INTO TBL_FORM_MAPPING (SEQNUM, DATA, CLASS, REGDATE) VALUES (SEQ_FORM_MAPPING.NEXTVAL,:DATA,:CLASS,SYSDATE)`;
            let updateSqlText = `UPDATE TBL_FORM_MAPPING SET DATA = :DATA , CLASS = :CLASS , REGDATE = SYSDATE WHERE SEQNUM = :SEQNUM`;

            insClass = 0;
            insCompanyData = '0,0,0,0,0,0,0';
            insContractData = '0,0,0,0,0,0,0';

            if (req.docCategory[0]) {
                insClass = req.docCategory[0].DOCTYPE;
            }

            for (var i in req.data) {
                if (req.data[i].colLbl && req.data[i].colLbl == 0) {
                    insCompanyData = req.data[i].sid;
                }
                if (req.data[i].colLbl && req.data[i].colLbl == 1) {
                    insContractData = req.data[i].sid;
                }
            }

            if (insCompanyData && insContractData) {
                var sid = insCompanyData + "," + insContractData;
                var result = await conn.execute(selectSqlText, [sid]);
                if (result.rows[0]) {
                    await conn.execute(updateSqlText, [sid, insClass, result.rows[0].SEQNUM]);
                } else {
                    await conn.execute(insertSqlText, [sid, insClass]);
                }
            }
            return done(null, req);
        } catch (err) { 
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertColumnMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let selectSqlText = `SELECT SEQNUM FROM TBL_COLUMN_MAPPING_TRAIN WHERE DATA = :DATA AND CLASS = :CLASS`;
            let insertSqlText = `INSERT INTO TBL_COLUMN_MAPPING_TRAIN (SEQNUM, DATA, CLASS, REGDATE) VALUES (SEQ_COLUMN_MAPPING_TRAIN.NEXTVAL,:DATA,:CLASS,SYSDATE)`;

            var result = await conn.execute(selectSqlText, [req.sid, req.colLbl]);
            if (result.rows[0]) {
                //await conn.execute(updateSqlText, [req.data[i].sid, req.data[i].colLbl, result.rows[0].SEQNUM]);
            } else {

                sidSplit = req.sid.split(",");
                var len = sidSplit.length;
                var textSid = sidSplit[len - 5] + "," + sidSplit[len - 4] + "," + sidSplit[len - 3] + "," + sidSplit[len - 2] + "," + sidSplit[len - 1];

                if ( !((req.colLbl >= 3 && req.colLbl <= 34) && (textSid == "0,0,0,0,0" || textSid == "1,1,1,1,1")) ) {
                    await conn.execute(insertSqlText, [req.sid, req.colLbl]);
                }
                
            }
            return done(null, req);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertBatchColumnMapping = function (req, docTopType, before, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);

            let selectSqlText = `SELECT SEQNUM FROM TBL_BATCH_COLUMN_MAPPING_TRAIN WHERE DATA = :data`;
            let insertSqlText = `INSERT INTO TBL_BATCH_COLUMN_MAPPING_TRAIN (SEQNUM, DATA, CLASS, REGDATE) VALUES (SEQ_BATCH_COLUMN_MAPPING_TRAIN.NEXTVAL,:data,:class,SYSDATE)`;
            let selectLearnListSqlText = `SELECT DOCTYPE FROM TBL_BATCH_LEARN_LIST WHERE FILEPATH = :filepath`;
            let updateBatchColumnMapping = 'UPDATE TBL_BATCH_COLUMN_MAPPING_TRAIN SET CLASS = :class WHERE DATA = :data';

            //var resLearnList = await conn.execute(selectLearnListSqlText, [filepath]);
            let insertNewSqlLabelText = `
            INSERT INTO TBL_NEW_BATCH_LABEL_MAPPING 
            (SEQNUM, REGDATE, DOCTYPE, OCR_TEXT, LOCATION_X, LOCATION_Y, CLASS, X_TEXT1, X_TEXT2, X_TEXT3, X_TEXT4, Y_TEXT1, Y_TEXT2, Y_TEXT3, Y_TEXT4) 
            VALUES (SEQ_NEW_BATCH_LABEL_MAPPING.NEXTVAL, SYSDATE, :data1, :data2, :data3, :data4, :data5, :data6, :data7, :data8, :data9, :data10, :data11, :data12, :data13)`;

            let insertNewSqlText = `
            INSERT INTO TBL_NEW_BATCH_COLUMN_MAPPING 
            (SEQNUM, CLASS, REGDATE, DOCTYPE, OCR_TEXT, OCR_TEXT_X, OCR_TEXT_Y) 
            VALUES (SEQ_NEW_BATCH_COLUMN_MAPPING.NEXTVAL,:class, SYSDATE, :docTop, :text, :text_x, :text_y
            )`;
            
            
            /*
            let insertNewSqlText = `
            INSERT INTO TBL_NEW_BATCH_COLUMN_MAPPING 
            (SEQNUM, CLASS, REGDATE, DOCTYPE, OCR_TEXT, OCR_TEXT_X, OCR_TEXT_Y, RELATION_LABEL1, RELATION_LABEL1_X
                , RELATION_LABEL1_Y, RELATION_LABEL2, RELATION_LABEL2_X, RELATION_LABEL2_Y, RELATION_LABEL3, RELATION_LABEL3_X
                , RELATION_LABEL3_Y, RELATION_LABEL4, RELATION_LABEL4_X, RELATION_LABEL4_Y) 
            VALUES (SEQ_NEW_BATCH_COLUMN_MAPPING.NEXTVAL,:class, SYSDATE, :docTop, :text, :text_x, :text_y
                    , :relation1, :relation1_x, :relation1_y, :relation2, :relation2_x, :relation2_y
                    , :relation3, :relation3_x, :relation3_y, :relation4, :relation4_x, :relation4_y
                )`;

            let insertNewSqlText = `
            INSERT INTO TBL_NEW_BATCH_COLUMN_MAPPING 
            (SEQNUM, CLASS, REGDATE, DOCTYPE, OCR_TEXT, X_TEXT1, X_TEXT2, X_TEXT3, X_TEXT4, Y_TEXT1, Y_TEXT2, Y_TEXT3, Y_TEXT4) 
            VALUES (SEQ_NEW_BATCH_COLUMN_MAPPING.NEXTVAL,:class, SYSDATE, :data1, :data2, :data3, :data4, :data5, :data6, :data7, :data8, :data9, :data10)`;

            await conn.execute(insertNewSqlText, [req.colLbl+"", ocrData[0], ocrData[1], ocrData[5], ocrData[6], ocrData[7], ocrData[8], ocrData[9], ocrData[10], ocrData[11], ocrData[12]]);
            */
            


           var ocrData = req.inputOcrData;
            if (req.colType == 'L') {
                await conn.execute(insertNewSqlLabelText, [ocrData[0]+"", ocrData[1], ocrData[2], ocrData[3], ocrData[4], ocrData[5], ocrData[6], ocrData[7], ocrData[8], ocrData[9], ocrData[10], ocrData[11], ocrData[12]]);
            } else if (req.colType == 'E') {
                await conn.execute(insertNewSqlText, [req.colLbl+"", ocrData[0]+"", ocrData[1], ocrData[2], ocrData[3]
                //, ocrData[5], ocrData[6], ocrData[7], ocrData[8], ocrData[9], ocrData[10], ocrData[11], ocrData[12]
                //, ocrData[13], ocrData[14], ocrData[15], ocrData[16], ocrData[17]
                                ]);
            }
            
            return done(null, req);

            var sidSplit = req.sid.split(",");
            var len = sidSplit.length;
            var textSid = sidSplit[len - 5] + "," + sidSplit[len - 4] + "," + sidSplit[len - 3] + "," + sidSplit[len - 2] + "," + sidSplit[len - 1];

            var locSplit = req.location.split(",");

            var sid = docTopType + "," + req.sid;

            var result = await conn.execute(selectSqlText, [sid]);

            if (result.rows.length == 0) {
                if ((req.colLbl != 0 && textSid != "0,0,0,0,0") && !(req.colLbl == -1 && textSid == "1,1,1,1,1")) {
                    await conn.execute(insertSqlText, [sid, req.colLbl]);
                }
            } else {
                await conn.execute(updateBatchColumnMapping, [req.colLbl, sid]);
            }

            return done(null, req);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertBatchColumnMappingFromUi = function (req, docType, before, done) {
    return new Promise(async function (resolve, reject) {
        var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
        let conn;
        let result;
        let selectSid = `SELECT EXPORT_SENTENCE_SID(LOWER(:COND)) SID FROM DUAL `;
        let selectBatchColumnMapping = `SELECT SEQNUM FROM TBL_BATCH_COLUMN_MAPPING_TRAIN WHERE DATA = :data AND CLASS = :class `;
        let insertBatchColumnMapping = `INSERT INTO TBL_BATCH_COLUMN_MAPPING_TRAIN VALUES 
                                        (SEQ_COLUMN_MAPPING_TRAIN.NEXTVAL, :data, :class, sysdate) `;
        let updateBatchColumnMapping = 'UPDATE TBL_BATCH_COLUMN_MAPPING_TRAIN SET CLASS = :class WHERE DATA = :data';

        try {
            conn = await oracledb.getConnection(dbConfig);
            
            result = await conn.execute(selectSid, [req.text.replace(regExp, "")]);
            if (result.rows[0].SID) {              
                var locArr = req.location.split(',');
                var sid = result.rows[0].SID;
                var colSid = docType + ',' + locArr[0] + ',' + locArr[1] + ',' + (Number(locArr[0]) + Number(locArr[2])) + ',' + result.rows[0].SID;
                req.colSid = colSid;
                result = await conn.execute(selectBatchColumnMapping, [colSid, before.colLbl]);
                if ( result.rows.length == 0 && !(((req.colLbl >= 5 && req.colLbl <= 34) || req.colLbl == 36) && (sid == "0,0,0,0,0" || sid == "1,1,1,1,1")) ) {
                    await conn.execute(insertBatchColumnMapping, [colSid, req.colLbl]);
                    return done(null, req);
                } else {
                    if (result.rows.length > 0 && req.colLbl == 38) {
                        await conn.execute(updateBatchColumnMapping, [req.colLbl, colSid]);
                    }
                    return done(null, null);
                }
            }          

        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });

};

exports.insertColumnMapping2 = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let selectSqlText = `SELECT SEQNUM FROM TBL_COLUMN_MAPPING_TRAIN_1 WHERE DATA = :DATA AND CLASS = :CLASS`;
            let insertSqlText = `INSERT INTO TBL_COLUMN_MAPPING_TRAIN_1 (SEQNUM, DATA, CLASS, REGDATE) VALUES (SEQ_COLUMN_MAPPING_TRAIN.NEXTVAL,:DATA,:CLASS,SYSDATE)`;
            let updateSqlText = `UPDATE TBL_COLUMN_MAPPING_TRAIN_1 SET DATA = :DATA, CLASS = :CALSS, REGDATE = SYSDATE WHERE SEQNUM = :SEQNUM`;

            for (var i in req.data) {
                var result = await conn.execute(selectSqlText, [req.data[i].sid, req.data[i].colLbl]);
                if (result.rows[0]) {
                    //await conn.execute(updateSqlText, [req.data[i].sid, req.data[i].colLbl, result.rows[0].SEQNUM]);
                } else {
                    await conn.execute(insertSqlText, [req.data[i].sid, req.data[i].colLbl]);
                }

            }
            return done(null, req);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectOcrFilePaths = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var res = [];
        let conn;
        let colNameArr = ['SEQNUM', 'FILEPATH', 'ORIGINFILENAME'];
        try {
            conn = await oracledb.getConnection(dbConfig);
            //let result = await conn.execute(`SELECT SEQNUM,FILEPATH,ORIGINFILENAME FROM TBL_OCR_FILE WHERE IMGID IN (${req.map((name, index) => `:${index}`).join(", ")})`, req);
            //let result = await conn.execute(`SELECT FILENAME, FILEPATH, CONVERTEDIMGPATH FROM TBL_BATCH_LEARN_DATA WHERE IMGID = :imgId`, [req[0]]);
            var dataImgPath = req[0];
            var answerImgPath = dataImgPath.replace("/MIG", "");

            let resAnswer = await conn.execute(`SELECT IMGID, FILEPATH FROM TBL_BATCH_ANSWER_FILE WHERE FILEPATH = :filepath`, [answerImgPath]);
            let result = await conn.execute(`SELECT IMGID, FILENAME, FILEPATH, CONVERTEDIMGPATH FROM TBL_BATCH_LEARN_DATA WHERE filepath = :imgId`, [req[0]]);

            var imgId = [];
            if (resAnswer.rows.length > 0 && resAnswer.rows[0].IMGID != result.rows[0].IMGID) {
                imgId.push(resAnswer.rows[0].IMGID);
                imgId.push(dataImgPath);
                let resUpd = await conn.execute(`UPDATE TBL_BATCH_LEARN_DATA SET IMGID = :imgId WHERE FILEPATH = :filepath`, imgId);
            } else {
                var d = new Date();
                var tempId = d.isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000;
                imgId.push(tempId);
                imgId.push(dataImgPath);
                let resUpd = await conn.execute(`UPDATE TBL_BATCH_LEARN_DATA SET IMGID = :imgId WHERE FILEPATH = :filepath`, imgId);
            }



            for (var row = 0; row < result.rows.length; row++) {
                var dict = {};

                dict.IMGID = imgId[0];
                dict.FILENAME = result.rows[row].FILENAME;
                dict.FILEPATH = result.rows[row].FILEPATH;
                dict.CONVERTEDIMGPATH = result.rows[row].CONVERTEDIMGPATH;
                res.push(dict);

            }

            return done(null, res);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectBatchLearnList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var res = [];
        let conn;

        var condQuery
        if (!commonUtil.isNull(req.body.addCond)) {
            if (req.body.addCond == "LEARN_N") condQuery = "((STATUS != 'D' AND STATUS != 'R') OR STATUS IS NULL OR STATUS = 'T')";
            else if (req.body.addCond == "LEARN_Y") condQuery = "(STATUS = 'D')";
        }

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var rowNum = req.body.moreNum;
            var query = `select bll.* from 
                        (select ROW_NUMBER() OVER(ORDER BY REGDATE DESC, FILEPATH) AS NUM, 
                        COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, 
                        CEIL((ROW_NUMBER() OVER(ORDER BY REGDATE DESC, FILEPATH))/ 30) PAGEIDX, 
                        IMGID, STATUS, FILEPATH, DOCTYPE, REGDATE, IMGCOUNT
                        from (
                            SELECT IMGID, STATUS, FILEPATH, A.DOCTYPE, REGDATE, IMGCOUNT
                            FROM TBL_BATCH_LEARN_LIST A
                            WHERE A.DOCTOPTYPE = ` + req.body.docToptype + `
                            ) WHERE` + condQuery + `) bll
                        WHERE PAGEIDX = :pageIdx`;
            let resAnswerFile = await conn.execute(query, [req.body.page]);
            return done(null, resAnswerFile.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectBatchLearnListTest = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var res = [];
        let conn;

        var condQuery
        if (!commonUtil.isNull(req.body.addCond)) {
            if (req.body.addCond == "LEARN_N") condQuery = "((STATUS != 'D' AND STATUS != 'R') OR STATUS IS NULL OR STATUS = 'T')";
            else if (req.body.addCond == "LEARN_Y") condQuery = "(STATUS = 'D')";
        }

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var rowNum = req.body.moreNum;
            let resAnswerFile = await conn.execute(`select bll.* from 
                                                        (select ROW_NUMBER() OVER(ORDER BY REGDATE DESC, FILEPATH) AS NUM, 
                                                        COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, 
                                                        CEIL((ROW_NUMBER() OVER(ORDER BY REGDATE DESC, FILEPATH))/ 40) PAGEIDX, 
                                                        IMGID, STATUS, FILEPATH, DOCTYPE, DOCNAME, REGDATE
                                                        from (
                                                            SELECT IMGID, STATUS, FILEPATH, A.DOCTYPE, B.DOCNAME, REGDATE
                                                            FROM TBL_BATCH_LEARN_LIST A,
                                                            TBL_DOCUMENT_CATEGORY B
                                                            WHERE A.DOCTYPE = B.DOCTYPE(+)
                                                            ) WHERE` + condQuery + `) bll
                                                        WHERE PAGEIDX = :pageIdx`
                                                    , [req.body.page]);
            return done(null, resAnswerFile.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};


// exports.selectBatchLearnList = function (req, done) {
//     return new Promise(async function (resolve, reject) {
//         var res = [];
//         let conn;
//         let colNameArr = ['SEQNUM', 'FILEPATH', 'ORIGINFILENAME'];
//         var condQuery
//         if (!commonUtil.isNull(req.body.addCond)) {
//             if (req.body.addCond == "LEARN_N") condQuery = "((L.STATUS != 'D' AND L.STATUS != 'R') OR L.STATUS IS NULL OR L.STATUS = 'T')";
//             else if (req.body.addCond == "LEARN_Y") condQuery = "(L.STATUS = 'D')";
//         }

//         try {
//             conn = await oracledb.getConnection(dbConfig);          
//             var rowNum = req.body.moreNum;
//             let resAnswerFile = await conn.execute(`SELECT T.IMGID, T.PAGENUM, T.FILEPATH, T.DOCTYPE 
//                                                     FROM (
//                                                       SELECT F.IMGID, F.PAGENUM, F.FILEPATH, L.DOCTYPE
//                                                       FROM 
//                                                         TBL_BATCH_ANSWER_FILE F 
//                                                         LEFT OUTER JOIN TBL_BATCH_LEARN_LIST L 
//                                                         ON F.FILEPATH = L.FILEPATH 
//                                                       WHERE ` + condQuery + `
//                                                       AND F.FILEPATH LIKE '/2018/%' 
//                                                       ORDER BY F.FILEPATH ASC
//                                                     ) T
//                                                     WHERE ROWNUM <= :num `, [req.body.moreNum]);
            
//             for (var i = 0; i < resAnswerFile.rows.length; i++) {
//                 var imgId = resAnswerFile.rows[i].IMGID;
//                 var imgStartNo = resAnswerFile.rows[i].PAGENUM;
//                 var filepath = resAnswerFile.rows[i].FILEPATH;
//                 var filename = filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length);

//                 let resAnswerData = await conn.execute(`SELECT * FROM TBL_BATCH_ANSWER_DATA WHERE IMGID = :imgId AND TO_NUMBER(IMGFILESTARTNO) <= :imgStartNo AND TO_NUMBER(IMGFILEENDNO) >= :imgStartNo `, [imgId, imgStartNo, imgStartNo]);
//                 for (var row = 0; row < resAnswerData.rows.length; row++) {
// 					resAnswerData.rows[row].FILEPATH = filepath;
//                     resAnswerData.rows[row].FILENAME = filename;
// 					if(resAnswerFile.rows[i].DOCTYPE){
// 						let resBatchLearnList = await conn.execute(`SELECT * FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = :docType `, [resAnswerFile.rows[i].DOCTYPE]);
// 						if(resBatchLearnList.rows.length > 0){
// 							resAnswerData.rows[row].DOCTYPE = resAnswerFile.rows[i].DOCTYPE;
// 							resAnswerData.rows[row].DOCNAME = resBatchLearnList.rows[0].DOCNAME;
// 						}
// 					}
//                 }

//                 if (resAnswerData.rows.length > 0) {
//                     res.push(resAnswerData);
//                 }
//             }

//             return done(null, res);
//         } catch (err) { // catches errors in getConnection and the query
//             console.log(err);
//             return done(null, "error");
//         } finally {
//             if (conn) {   // the conn assignment worked, must release
//                 try {
//                     await conn.release();
//                 } catch (e) {
//                     console.error(e);
//                 }
//             }
//         }
//     });
// };


exports.convertTiftoJpg = function (originFilePath, done) {
    try {
        convertedFileName = originFilePath.split('.')[0] + '.jpg';
        execSync('module\\imageMagick\\convert.exe -density 800x800 ' + propertiesConfig.filepath.answerFileFrontPath + originFilePath + ' ' + propertiesConfig.filepath.answerFileFrontPath + convertedFileName);
            
        return done(null, convertedFileName);
    } catch (err) {
        console.log(err);
        return done(null, "error");
    } finally {

    }
};

exports.convertTiftoJpg2 = function (originFilePath, done) {
    try {
        var originFileName = originFilePath.substring(originFilePath.lastIndexOf('/') + 1, originFilePath.length);
        convertedFileName = originFileName.split('.')[0] + '.jpg';
        var ofile = './uploads/' + convertedFileName;

        execSync('module\\imageMagick\\convert.exe -density 800x800 ' + propertiesConfig.filepath.answerFileFrontPath + originFilePath + ' ' + ofile);
        
        return done(null, convertedFileName);
    } catch (err) {
        console.log(err);
        return done(null, "error");
    } finally {

    }
};

/*
exports.callApiOcr = function (req, done) {
    var pharsedOcrJson = "";
    try {
        var uploadImage = fs.readFileSync(req, 'binary');
        var base64 = new Buffer(uploadImage, 'binary').toString('base64');
        var binaryString = new Buffer(base64, 'base64').toString('binary');
        uploadImage = new Buffer(binaryString, "binary");

        var res = request('POST', propertiesConfig.ocr.uri, {
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

        return done(null, res.getBody('utf8'));
    } catch (err) {
        console.log(err);
        return done(null, 'error');
    } finally {

    }
};
*/

exports.insertOcrData = function (filepath, ocrData, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            let resfile = await conn.execute(`SELECT * FROM TBL_BATCH_OCR_DATA WHERE FILEPATH = :filepath `, [filepath]);

            if (resfile.rows.length == 0) {
                let resIns = await conn.execute(`INSERT INTO TBL_BATCH_OCR_DATA VALUES(seq_batch_ocr_data.nextval, :filepath, :ocrData) `, [filepath, ocrData], { autoCommit: true });
            }

            return done(null, result.rowsAffected);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, "error");
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
};

exports.deleteOcrData = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            let resfile = await conn.execute(`DELETE FROM TBL_BATCH_OCR_DATA WHERE SEQNUM = :seqnum`, [req]);

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, "error");
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
};

function ocrJson(regions) {
    var data = [];
    for (var i = 0; i < regions.length; i++) {
        for (var j = 0; j < regions[i].lines.length; j++) {
            var item = '';
            for (var k = 0; k < regions[i].lines[j].words.length; k++) {
                item += regions[i].lines[j].words[k].text + ' ';
            }
            //data.push({ 'location': regions[i].lines[j].boundingBox, 'text': item.trim() });
            data.push({ 'location': regions[i].lines[j].boundingBox, 'text': item.trim().replace(/'/g, '`') });
        }
    }
    return data;
}

exports.selectLegacyData = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var res = [];
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            var tempImageFileName = req;
            let result = await conn.execute(`SELECT * FROM TBL_BATCH_ANSWER_DATA WHERE IMGID = :IMGID`, [req]);

            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, "error");
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
};

exports.insertRegacyData = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var res = [];
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i = 0; i < req.length; i++) {

                let LearnDataRes = await conn.execute("select count(*) as COUNT, max(FILENAME) as FILENAME, max(FILEPATH) AS FILEPATH from tbl_batch_learn_data where imgid = :imgid", [req[i].IMGID]);

                if (i + 1 <= LearnDataRes.rows[0].COUNT) {

                    var dataArr = [
                        "N",
                        commonUtil.nvl(req[i].ENTRYNO),
                        commonUtil.nvl(req[i].STATEMENTDIV),
                        commonUtil.nvl(req[i].CONTRACTNUM),
                        commonUtil.nvl(req[i].OGCOMPANYCODE),
                        commonUtil.nvl(req[i].OGCOMPANYNAME),
                        commonUtil.nvl(req[i].BROKERCODE),
                        commonUtil.nvl(req[i].BROKERNAME),
                        commonUtil.nvl(req[i].CTNM),
                        commonUtil.nvl(req[i].INSSTDT),
                        commonUtil.nvl(req[i].INSENDDT),
                        commonUtil.nvl(req[i].UY),
                        commonUtil.nvl(req[i].CURCD),
                        commonUtil.nvl2(req[i].PAIDPERCENT, 0),
                        commonUtil.nvl2(req[i].PAIDSHARE, 0),
                        commonUtil.nvl2(req[i].OSLPERCENT, 0),
                        commonUtil.nvl2(req[i].OSLSHARE, 0),
                        commonUtil.nvl2(req[i].GROSSPM, 0),
                        commonUtil.nvl2(req[i].PM, 0),
                        commonUtil.nvl2(req[i].PMPFEND, 0),
                        commonUtil.nvl2(req[i].PMPFWOS, 0),
                        commonUtil.nvl2(req[i].XOLPM, 0),
                        commonUtil.nvl2(req[i].RETURNPM, 0),
                        commonUtil.nvl2(req[i].GROSSCN, 0),
                        commonUtil.nvl2(req[i].CN, 0),
                        commonUtil.nvl2(req[i].PROFITCN, 0),
                        commonUtil.nvl2(req[i].BROKERAGE, 0),
                        commonUtil.nvl2(req[i].TAX, 0),
                        commonUtil.nvl2(req[i].OVERRIDINGCOM, 0),
                        commonUtil.nvl2(req[i].CHARGE, 0),
                        commonUtil.nvl2(req[i].PMRESERVERTD, 0),
                        commonUtil.nvl2(req[i].PFPMRESERVERTD, 0),
                        commonUtil.nvl2(req[i].PMRESERVERLD, 0),
                        commonUtil.nvl2(req[i].PFPMRESERVERLD, 0),
                        commonUtil.nvl2(req[i].CLAIM, 0),
                        commonUtil.nvl2(req[i].LOSSRECOVERY, 0),
                        commonUtil.nvl2(req[i].CASHLOSS, 0),
                        commonUtil.nvl2(req[i].CASHLOSSRD, 0),
                        commonUtil.nvl2(req[i].LOSSRR, 0),
                        commonUtil.nvl2(req[i].LOSSRR2, 0),
                        commonUtil.nvl2(req[i].LOSSPFEND, 0),
                        commonUtil.nvl2(req[i].LOSSPFWOA, 0),
                        commonUtil.nvl2(req[i].INTEREST, 0),
                        commonUtil.nvl2(req[i].TAXON, 0),
                        commonUtil.nvl2(req[i].MISCELLANEOUS, 0),
                        commonUtil.nvl2(req[i].PMBL, 0),
                        commonUtil.nvl2(req[i].CMBL, 0),
                        commonUtil.nvl2(req[i].NTBL, 0),
                        commonUtil.nvl2(req[i].CSCOSARFRNCNNT2, 0),
                        'L',
                        LearnDataRes.rows[0].FILENAME,
                        LearnDataRes.rows[0].FILEPATH
                    ];

                    //update
                    console.log("update");
                    var andCond = "('" + req[i].IMGID + "') and subnum = " + (parseInt(i) + 1);
                    let updLearnDataRes = await conn.execute(queryConfig.batchLearningConfig.updateBatchLearningData + andCond, dataArr);
                } else {
                    //insert

                    var insArr = [
                        req[i].IMGID,
                        commonUtil.nvl(req[i].ENTRYNO),
                        commonUtil.nvl(req[i].STATEMENTDIV),
                        commonUtil.nvl(req[i].CONTRACTNUM),
                        commonUtil.nvl(req[i].OGCOMPANYCODE),
                        commonUtil.nvl(req[i].OGCOMPANYNAME),
                        commonUtil.nvl(req[i].BROKERCODE),
                        commonUtil.nvl(req[i].BROKERNAME),
                        commonUtil.nvl(req[i].CTNM),
                        commonUtil.nvl(req[i].INSSTDT),
                        commonUtil.nvl(req[i].INSENDDT),
                        commonUtil.nvl(req[i].UY),
                        commonUtil.nvl(req[i].CURCD),
                        commonUtil.nvl(req[i].PAIDPERCENT, 0),
                        commonUtil.nvl(req[i].PAIDSHARE, 0),
                        commonUtil.nvl(req[i].OSLPERCENT, 0),
                        commonUtil.nvl(req[i].OSLSHARE, 0),
                        commonUtil.nvl(req[i].GROSSPM, 0),
                        commonUtil.nvl(req[i].PM, 0),
                        commonUtil.nvl(req[i].PMPFEND, 0),
                        commonUtil.nvl(req[i].PMPFWOS, 0),
                        commonUtil.nvl(req[i].XOLPM, 0),
                        commonUtil.nvl(req[i].RETURNPM, 0),
                        commonUtil.nvl(req[i].GROSSCN, 0),
                        commonUtil.nvl(req[i].CN, 0),
                        commonUtil.nvl(req[i].PROFITCN, 0),
                        commonUtil.nvl(req[i].BROKERAGE, 0),
                        commonUtil.nvl(req[i].TAX, 0),
                        commonUtil.nvl(req[i].OVERRIDINGCOM, 0),
                        commonUtil.nvl(req[i].CHARGE, 0),
                        commonUtil.nvl(req[i].PMRESERVERTD, 0),
                        commonUtil.nvl(req[i].PFPMRESERVERTD, 0),
                        commonUtil.nvl(req[i].PMRESERVERLD, 0),
                        commonUtil.nvl(req[i].PFPMRESERVERLD, 0),
                        commonUtil.nvl(req[i].CLAIM, 0),
                        commonUtil.nvl(req[i].LOSSRECOVERY, 0),
                        commonUtil.nvl(req[i].CASHLOSS, 0),
                        commonUtil.nvl(req[i].CASHLOSSRD, 0),
                        commonUtil.nvl(req[i].LOSSRR, 0),
                        commonUtil.nvl(req[i].LOSSRR2, 0),
                        commonUtil.nvl(req[i].LOSSPFEND, 0),
                        commonUtil.nvl(req[i].LOSSPFWOA, 0),
                        commonUtil.nvl(req[i].INTEREST, 0),
                        commonUtil.nvl(req[i].TAXON, 0),
                        commonUtil.nvl(req[i].MISCELLANEOUS, 0),
                        commonUtil.nvl(req[i].PMBL, 0),
                        commonUtil.nvl(req[i].CMBL, 0),
                        commonUtil.nvl(req[i].NTBL, 0),
                        commonUtil.nvl(req[i].CSCOSARFRNCNNT2, 0),
                        (parseInt(i) + 1),
                        'L',
                        LearnDataRes.rows[0].FILENAME,
                        LearnDataRes.rows[0].FILEPATH
                    ];

                    console.log("insert");
                    let insLearnDataRes = await conn.execute(queryConfig.batchLearningConfig.insertBatchLearningData, insArr);
                }

            }

            return done(null, "done legary insert");
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.insertMLData = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var insSql = queryConfig.batchLearningConfig.insertMlExport;
            var delSql = queryConfig.batchLearningConfig.deleteMlExport;

            let delRes = await conn.execute(delSql, [req.fileinfo.filepath], { autoCommit: true });

            for (var i in req.data) {
                var cond = [];
                cond.push(req.fileinfo.imgId);
                cond.push(req.fileinfo.filepath);
                cond.push(req.data[i].colLbl);
                cond.push(req.data[i].text);
                cond.push(req.data[i].location);
                cond.push(req.data[i].sid);
                cond.push(req.data[i].entryLbl);

                if (cond.length == 7 && (cond[2] > 0 || cond[6] > 0)) {
                    let colData = await conn.execute(insSql, cond);
                }
            }

            return done(null, "mlExport");
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.insertSamMLData = function (filepath, imgid, retData, docLabelDefList, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var insSql = `INSERT INTO TBL_BATCH_PO_ML_EXPORT VALUES(SEQ_BATCH_PO_ML_EXPORT.NEXTVAL, :docid, :filename, :exportData)`;
            var delSql = `DELETE FROM TBL_BATCH_PO_ML_EXPORT WHERE FILENAME = :filename`;
            var selSql = `SELECT DOCTOPTYPE,DOCTYPE FROM TBL_BATCH_LEARN_LIST WHERE IMGID =:imgid`

            filepath = filepath.substring(filepath.lastIndexOf("/") + 1, filepath.length);
            var fileName = filepath.substring(0, filepath.lastIndexOf("."));
            var selMlExportSql = "SELECT * FROM TBL_BATCH_ML_EXPORT WHERE ENTRYLABEL IS NOT NULL AND IMGID = " + imgid + " ";

            let delRes = await conn.execute(delSql, [filepath], { autoCommit: true });

            let selMlExportRes = await conn.execute(selMlExportSql);
            let selRes = await conn.execute(selSql, [imgid]);

            var arrayList = [];
            var multiSwitch = false;

            for (var i = 0; i < retData.data.length; i++) {
                var data = retData.data[i];
                var dataLocation = data.location.split(",");

                for (var k = 0; k < docLabelDefList.length; k++) {
                    if (docLabelDefList[k].AMOUNT == "multi" && data.entryLbl == docLabelDefList[k].SEQNUM) {
                        var bool = false;

                        if (arrayList.length == 0) {
                            var array = [];
                            array.push(data);
                            arrayList.push(array);
                        } else {
                            var aLength = arrayList.length;
                            for (var l = 0; l < aLength; l++) {
                                var mlLocation = arrayList[l][0].location.split(",");
                                if (dataLocation[1] - mlLocation[1] < 20 && dataLocation[1] - mlLocation[1] > -20) {
                                    data.fileName = filepath;
                                    arrayList[l].push(data);
                                    break;
                                }

                                if (l == aLength - 1) {
                                    bool = true;
                                }
                            }

                            if (bool) {
                                var array = [];
                                data.fileName = filepath;
                                array.push(data);
                                arrayList.push(array);
                                bool = false;
                            }
                        }
                    }
                }
            }

            for (var j = 0; j < arrayList.length; j++) {
                var cond = [];
                cond.push(selRes.rows[0].DOCTOPTYPE);
                cond.push(filepath);
                var exportData = [];
                var bool2 = false;
                multiSwitch = true;

                for (var k = 0; k < docLabelDefList.length; k++) {
                    if (docLabelDefList[k].AMOUNT == "single") {
                        
                        bool2 = false;
                        for (var l = 0; l < retData.data.length; l++) {    
                            if (docLabelDefList[k].SEQNUM == retData.data[l].entryLbl) {
                                exportData.push(retData.data[l].text != undefined ? retData.data[l].text : null);
                                bool2 = true;
                                break;
                            }
                        }

                        if (bool2 == false) {
                            exportData.push(null);
                        }
                    }

                    if (docLabelDefList[k].AMOUNT == "multi") {
                        var text = "";
                        var location = "";
                        var entryLbl = "";

                        for (var l = 0; l < arrayList[j].length; l++) {
                            if (docLabelDefList[k].SEQNUM == arrayList[j][l].entryLbl) {
                                text = arrayList[j][l].text;
                                location = arrayList[j][l].location;
                                entryLbl = arrayList[j][l].entryLbl;
                                break;
                            }
                        }

                        exportData.push(text != undefined ? text : null);
                    }
                }
                cond.push(JSON.stringify(exportData));

                await conn.execute(insSql, cond, { autoCommit: true });
            }

            if (multiSwitch == false) {
                var cond = [];
                cond.push(selRes.rows[0].DOCTOPTYPE);
                cond.push(filepath);
                var exportData = [];

                for (var k = 0; k < docLabelDefList.length; k++) {
                    bool2 = false;
                    for (var l = 0; l < retData.data.length; l++) {
                        if (docLabelDefList[k].SEQNUM == retData.data[l].entryLbl) {
                            exportData.push(retData.data[l].text != undefined ? retData.data[l].text : null);
                            bool2 = true;
                            break;
                        }
                    }

                    if (bool2 == false && docLabelDefList[k].AMOUNT != "not") {
                        exportData.push(null);
                    }
                }
                cond.push(JSON.stringify(exportData));

                await conn.execute(insSql, cond, { autoCommit: true });
            }

            return done(null, "mlExport");
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

// exports.insertSamMLData = function (filepath, imgid, done) {
//     return new Promise(async function (resolve, reject) {
//         let conn;

//         try {
//             conn = await oracledb.getConnection(dbConfig);
//             var insSql = `INSERT INTO TBL_BATCH_PO_ML_EXPORT VALUES(SEQ_BATCH_PO_ML_EXPORT.NEXTVAL, :docid, :filename, :exportData)`;
//             var delSql = `DELETE FROM TBL_BATCH_PO_ML_EXPORT WHERE FILENAME = :filename`;
//             var selSql = `SELECT DOCTOPTYPE,DOCTYPE FROM TBL_BATCH_LEARN_LIST WHERE IMGID =:imgid`

//             filepath = filepath.substring(filepath.lastIndexOf("/") + 1, filepath.length);
//             var fileName = filepath.substring(0, filepath.lastIndexOf("."));
//             var selMlExportSql = "SELECT * FROM TBL_BATCH_ML_EXPORT WHERE ENTRYLABEL IS NOT NULL AND IMGID = " + imgid + " ";

//             let delRes = await conn.execute(delSql, [filepath], { autoCommit: true });

//             let selMlExportRes = await conn.execute(selMlExportSql);
//             let selRes = await conn.execute(selSql, [imgid]);

//             if (selRes.rows[0].DOCTOPTYPE == "40") {
//                 var itemList = new Array(0, 0, 0, 0, 0, 0, 0);

//                 var mlObj = {};
//                 var poMlList = [];

//                 for (var i = 0; i < selMlExportRes.rows.length; i++) {
//                     var data = selMlExportRes.rows[i];
//                     if (data.ENTRYLABEL == "281") {
//                         itemList[0]++;
//                     } else if (data.ENTRYLABEL == "282") {
//                         itemList[1]++;
//                     } else if (data.ENTRYLABEL == "283") {
//                         itemList[2]++;
//                     } else if (data.ENTRYLABEL == "284") {
//                         itemList[3]++;
//                     } else if (data.ENTRYLABEL == "285") {
//                         itemList[4]++;
//                     } else if (data.ENTRYLABEL == "286") {
//                         itemList[5]++;
//                     } else if (data.ENTRYLABEL == "287") {
//                         itemList[6]++;
//                     } else if (data.ENTRYLABEL == "263") {
//                         mlObj.companyName = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "264") {
//                         mlObj.TotalAmount = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "265") {
//                         mlObj.Nation = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "266") {
//                         mlObj.Taxes = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "267") {
//                         mlObj.GST = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "268") {
//                         mlObj.BilledTo = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "269") {
//                         mlObj.ToAccountPayable = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "270") {
//                         mlObj.AccountName = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "271") {
//                         mlObj.Bankname = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "272") {
//                         mlObj.BankAccount = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "273") {
//                         mlObj.AccountNo = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "274") {
//                         mlObj.IBANCODE = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "275") {
//                         mlObj.Swift = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "276") {
//                         mlObj.Bankaddress = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "277") {
//                         mlObj.BankCurrency = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "278") {
//                         mlObj.DueDate = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "279") {
//                         mlObj.paymentTerms = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "280") {
//                         mlObj.payableNet = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "300") {
//                         mlObj.InvoiceNo = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "301") {
//                         mlObj.DocDate = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "302") {
//                         mlObj.Currency = data.COLVALUE;
//                     }
//                 }

//                 var itemMax = Math.max.apply(null, itemList);
//                 var entryLbl = 0;

//                 for (var i = 0; i < itemList.length; i++) {
//                     if (itemList[i] == itemMax) {
//                         if (i == 0) {
//                             entryLbl = "281";
//                         } else if (i == 1) {
//                             entryLbl = "282";
//                         } else if (i == 2) {
//                             entryLbl = "283";
//                         } else if (i == 3) {
//                             entryLbl = "284";
//                         } else if (i == 4) {
//                             entryLbl = "285";
//                         } else if (i == 5) {
//                             entryLbl = "286";
//                         } else if (i == 6) {
//                             entryLbl = "287";
//                         }
//                         break;
//                     }
//                 }

//                 var mlList = [];

//                 if (entryLbl != 0 && itemMax != 0) {
//                     for (var i = 0; i < selMlExportRes.rows.length; i++) {
//                         var data = selMlExportRes.rows[i];

//                         if (data.ENTRYLABEL == entryLbl) {
//                             var list = [];
//                             list.push(data);
//                             mlList.push(list);
//                         }
//                     }

//                     for (var i = 0; i < selMlExportRes.rows.length; i++) {
//                         var data = selMlExportRes.rows[i];
//                         if (data.ENTRYLABEL != entryLbl) {
//                             var mappingSid = data.LOCATION.split(",");

//                             for (var j = 0; j < mlList.length; j++) {
//                                 var cData = mlList[j][0].LOCATION.split(",");

//                                 if (data.FILEPATH == mlList[j][0].FILEPATH && (mappingSid[1] - cData[1] < 40 && mappingSid[1] - cData[1] > -40)) {
//                                     mlList[j].push(data);
//                                 }

//                                 if (selRes.rows[0].DOCTYPE == "21" && data.FILEPATH == mlList[j][0].FILEPATH && (mappingSid[1] - cData[1] < 100 && mappingSid[1] - cData[1] > -100)) {
//                                     mlList[j].push(data);
//                                 }
//                             }
//                         }
//                     }

//                     for (var i = 0; i < mlList.length; i++) {
//                         var data = mlList[i];

//                         var obj = {};
//                         obj.companyName = mlObj.companyName;
//                         obj.TotalAmount = mlObj.TotalAmount;
//                         obj.Nation = mlObj.Nation;
//                         obj.Taxes = mlObj.Taxes;
//                         obj.GST = mlObj.GST;
//                         obj.BilledTo = mlObj.BilledTo;
//                         obj.ToAccountPayable = mlObj.ToAccountPayable;
//                         obj.Bankname = mlObj.Bankname;
//                         obj.BankAccount = mlObj.BankAccount;
//                         obj.AccountNo = mlObj.AccountNo;
//                         obj.IBANCODE = mlObj.IBANCODE;
//                         obj.Swift = mlObj.Swift;
//                         obj.Bankaddress = mlObj.Bankaddress;
//                         obj.BankCurrency = mlObj.BankCurrency;
//                         obj.DueDate = mlObj.DueDate;
//                         obj.paymentTerms = mlObj.paymentTerms;
//                         obj.InvoiceNo = mlObj.InvoiceNo;
//                         obj.DocDate = mlObj.DocDate;
//                         obj.Currency = mlObj.Currency;

//                         for (var j = 0; j < data.length; j++) {

//                             if (data[j].ENTRYLABEL == "281") {
//                                 obj.quantity = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "282") {
//                                 obj.reference = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "283") {
//                                 obj.description = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "284") {
//                                 obj.listPrice = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "285") {
//                                 obj.UnitPrice = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "286") {
//                                 obj.Amount = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "287") {
//                                 obj.VAT = data[j].COLVALUE;
//                             }
//                         }
//                         poMlList.push(obj);
//                     }

//                 } else {
//                     var obj = {};
//                     obj.companyName = mlObj.companyName;
//                     obj.TotalAmount = mlObj.TotalAmount;
//                     obj.Nation = mlObj.Nation;
//                     obj.Taxes = mlObj.Taxes;
//                     obj.GST = mlObj.GST;
//                     obj.BilledTo = mlObj.BilledTo;
//                     obj.ToAccountPayable = mlObj.ToAccountPayable;
//                     obj.Bankname = mlObj.Bankname;
//                     obj.BankAccount = mlObj.BankAccount;
//                     obj.AccountNo = mlObj.AccountNo;
//                     obj.IBANCODE = mlObj.IBANCODE;
//                     obj.Swift = mlObj.Swift;
//                     obj.Bankaddress = mlObj.Bankaddress;
//                     obj.BankCurrency = mlObj.BankCurrency;
//                     obj.DueDate = mlObj.DueDate;
//                     obj.paymentTerms = mlObj.paymentTerms;
//                     obj.InvoiceNo = mlObj.InvoiceNo;
//                     obj.DocDate = mlObj.DocDate;
//                     obj.Currency = mlObj.Currency;

//                     poMlList.push(obj);
//                 }

//                 for (var i = 0; i < poMlList.length; i++) {
//                     var cond = [];
//                     cond.push(selRes.rows[0].DOCTOPTYPE);
//                     cond.push(filepath);
//                     var exportData = [];
//                     exportData.push(poMlList[i].companyName != undefined ? poMlList[i].companyName : "null");
//                     exportData.push(poMlList[i].TotalAmount != undefined ? poMlList[i].TotalAmount : "null");
//                     exportData.push(poMlList[i].Nation != undefined ? poMlList[i].Nation : "null");
//                     exportData.push(poMlList[i].Taxes != undefined ? poMlList[i].Taxes : "null");
//                     exportData.push(poMlList[i].GST != undefined ? poMlList[i].GST : "null");
//                     exportData.push(poMlList[i].BilledTo != undefined ? poMlList[i].BilledTo : "null");
//                     exportData.push(poMlList[i].ToAccountPayable != undefined ? poMlList[i].ToAccountPayable : "null");
//                     exportData.push(poMlList[i].AccountName != undefined ? poMlList[i].AccountName : "null");
//                     exportData.push(poMlList[i].Bankname != undefined ? poMlList[i].Bankname : "null");
//                     exportData.push(poMlList[i].BankAccount != undefined ? poMlList[i].BankAccount : "null");
//                     exportData.push(poMlList[i].AccountNo != undefined ? poMlList[i].AccountNo : "null");
//                     exportData.push(poMlList[i].IBANCODE != undefined ? poMlList[i].IBANCODE : "null");
//                     exportData.push(poMlList[i].Swift != undefined ? poMlList[i].Swift : "null");
//                     exportData.push(poMlList[i].Bankaddress != undefined ? poMlList[i].Bankaddress : "null");
//                     exportData.push(poMlList[i].BankCurrency != undefined ? poMlList[i].BankCurrency : "null");
//                     exportData.push(poMlList[i].DueDate != undefined ? poMlList[i].DueDate : "null");
//                     exportData.push(poMlList[i].paymentTerms != undefined ? poMlList[i].paymentTerms : "null");
//                     exportData.push(poMlList[i].payableNet != undefined ? poMlList[i].payableNet : "null");
//                     exportData.push(poMlList[i].quantity != undefined ? poMlList[i].quantity : "null");
//                     exportData.push(poMlList[i].reference != undefined ? poMlList[i].reference : "null");
//                     exportData.push(poMlList[i].description != undefined ? poMlList[i].description : "null");
//                     exportData.push(poMlList[i].listPrice != undefined ? poMlList[i].listPrice : "null");
//                     exportData.push(poMlList[i].UnitPrice != undefined ? poMlList[i].UnitPrice : "null");
//                     exportData.push(poMlList[i].Amount != undefined ? poMlList[i].Amount : "null");
//                     exportData.push(poMlList[i].VAT != undefined ? poMlList[i].VAT : "null");
//                     exportData.push(poMlList[i].InvoiceNo != undefined ? poMlList[i].InvoiceNo : "null");
//                     exportData.push(poMlList[i].DocDate != undefined ? poMlList[i].DocDate : "null");
//                     exportData.push(poMlList[i].Currency != undefined ? poMlList[i].Currency : "null");

//                     cond.push(JSON.stringify(exportData));

//                     await conn.execute(insSql, cond, { autoCommit: true });
//                 }

//             } else {
//                 var itemList = new Array(0, 0, 0, 0, 0, 0);

//                 var mlObj = {};
//                 var poMlList = [];
//                 for (var i = 0; i < selMlExportRes.rows.length; i++) {
//                     console.log(selMlExportRes.rows[i]);
//                     var data = selMlExportRes.rows[i];
//                     if (data.ENTRYLABEL == "234") {
//                         itemList[0]++;
//                     } else if (data.ENTRYLABEL == "228") {
//                         itemList[1]++;
//                     } else if (data.ENTRYLABEL == "229") {
//                         itemList[2]++;
//                     } else if (data.ENTRYLABEL == "231") {
//                         itemList[3]++;
//                     } else if (data.ENTRYLABEL == "232") {
//                         itemList[4]++;
//                     } else if (data.ENTRYLABEL == "233") {
//                         itemList[5]++;
//                     } else if (data.ENTRYLABEL == "221") {
//                         mlObj.buyer = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "222") {
//                         mlObj.poNumber = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "223") {
//                         mlObj.poDate = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "224") {
//                         mlObj.deliveryAddress = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "226") {
//                         mlObj.totalPrice = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "227") {
//                         mlObj.currency = data.COLVALUE;
//                     } else if (data.ENTRYLABEL == "230") {
//                         mlObj.requestDeliveryDate = data.COLVALUE;
//                     }
//                 }

//                 var itemMax = Math.max.apply(null, itemList);
//                 var entryLbl = 0;

//                 for (var i = 0; i < itemList.length; i++) {
//                     if (itemList[i] == itemMax) {
//                         if (i == 0) {
//                             entryLbl = "234";
//                         } else if (i == 1) {
//                             entryLbl = "228";
//                         } else if (i == 2) {
//                             entryLbl = "229";
//                         } else if (i == 3) {
//                             entryLbl = "231";
//                         } else if (i == 4) {
//                             entryLbl = "232";
//                         } else if (i == 5) {
//                             entryLbl = "233";
//                         }
//                         break;
//                     }
//                 }

//                 var mlList = [];

//                 if (entryLbl != 0) {
//                     for (var i = 0; i < selMlExportRes.rows.length; i++) {
//                         var data = selMlExportRes.rows[i];

//                         if (data.ENTRYLABEL == entryLbl) {
//                             var list = [];
//                             list.push(data);
//                             mlList.push(list);
//                         }
//                     }

//                     for (var i = 0; i < selMlExportRes.rows.length; i++) {
//                         var data = selMlExportRes.rows[i];
//                         if (data.ENTRYLABEL != entryLbl && data.ENTRYLABEL != "230") {
//                             var mappingSid = data.LOCATION.split(",");

//                             for (var j = 0; j < mlList.length; j++) {
//                                 var cData = mlList[j][0].LOCATION.split(",");

//                                 if (data.FILEPATH == mlList[j][0].FILEPATH && (mappingSid[1] - cData[1] < 40 && mappingSid[1] - cData[1] > -40)) {
//                                     mlList[j].push(data);
//                                 }

//                                 if (data.ENTRYLABEL == "229" && data.FILEPATH == mlList[j][0].FILEPATH && (mappingSid[1] - cData[1] < 80 && mappingSid[1] - cData[1] > -80)) {
//                                     mlList[j].push(data);
//                                 }
//                             }
//                         }
//                     }

//                     for (var i = 0; i < mlList.length; i++) {
//                         var data = mlList[i];

//                         var obj = {};
//                         obj.buyer = mlObj.buyer;
//                         obj.poNumber = mlObj.poNumber;
//                         obj.poDate = mlObj.poDate;
//                         obj.deliveryAddress = mlObj.deliveryAddress;
//                         obj.totalPrice = mlObj.totalPrice;
//                         obj.currency = mlObj.currency;
//                         obj.requestDeliveryDate = mlObj.requestDeliveryDate;

//                         for (var j = 0; j < data.length; j++) {

//                             if (data[j].ENTRYLABEL == "228") {
//                                 obj.material = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "229") {
//                                 obj.ean = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "231") {
//                                 obj.quantity = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "232") {
//                                 obj.unitPrice = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "233") {
//                                 obj.itemTotal = data[j].COLVALUE;
//                             } else if (data[j].ENTRYLABEL == "234") {
//                                 obj.serialNumber = data[j].COLVALUE;
//                             }
//                         }
//                         poMlList.push(obj);
//                     }

//                 }

//                 for (var i = 0; i < poMlList.length; i++) {
//                     var cond = [];
//                     cond.push(selRes.rows[0].DOCTOPTYPE);
//                     cond.push(filepath);
//                     var exportData = [];
//                     exportData.push(poMlList[i].buyer != undefined ? poMlList[i].buyer : "null");
//                     exportData.push(poMlList[i].poNumber != undefined ? poMlList[i].poNumber : "null");
//                     exportData.push(poMlList[i].poDate != undefined ? poMlList[i].poDate : "null");
//                     exportData.push(poMlList[i].deliveryAddress != undefined ? poMlList[i].deliveryAddress : "null");
//                     exportData.push(poMlList[i].totalPrice != undefined ? poMlList[i].totalPrice : "null");
//                     exportData.push(poMlList[i].currency != undefined ? poMlList[i].currency : "null");
//                     exportData.push(poMlList[i].material != undefined ? poMlList[i].material : "null");
//                     exportData.push(poMlList[i].ean != undefined ? poMlList[i].ean : "null");
//                     exportData.push(poMlList[i].requestDeliveryDate != undefined ? poMlList[i].requestDeliveryDate : "null");
//                     exportData.push(poMlList[i].quantity != undefined ? poMlList[i].quantity : "null");
//                     exportData.push(poMlList[i].unitPrice != undefined ? poMlList[i].unitPrice : "null");
//                     exportData.push(poMlList[i].itemTotal != undefined ? poMlList[i].itemTotal : "null");
//                     exportData.push(poMlList[i].serialNumber != undefined ? poMlList[i].serialNumber : "null");

//                     cond.push(JSON.stringify(exportData));

//                     await conn.execute(insSql, cond, { autoCommit: true });
//                 }
//             }
            
//             return done(null, "mlExport");
//         } catch (err) { // catches errors in getConnection and the query
//             console.log(err);
//             return done(null, "error");
//         } finally {
//             if (conn) {   // the conn assignment worked, must release
//                 try {
//                     await conn.release();
//                 } catch (e) {
//                     console.error(e);
//                 }
//             }
//         }
//     });
// };

exports.insertMLDataCMD = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            if (req.length) {
                conn = await oracledb.getConnection(dbConfig);

                let delSql = queryConfig.batchLearningConfig.deleteMlExport;
                await conn.execute(delSql, [req[0].filepath]);

                let resCol = await conn.execute("SELECT * FROM TBL_COLUMN_MAPPING_CLS");
                let insSql = queryConfig.batchLearningConfig.insertMlExport;

                for (let i = 0; i < req.length; i++) {
                    let cond = [];
                    cond.push(req[i].imgid);
                    cond.push(req[i].filepath);

                    for (let row = 0; row < resCol.rows.length; row++) {
                        if (req.mlData[0][i].label == resCol.rows[row].COLTYPE) {
                            cond.push(resCol.rows[row].COLNUM);
                        }
                    }

                    cond.push(req[i].text);
                    cond.push(req[i].location);
                    cond.push(req[i].sid);

                    if (cond.length == 6) {
                        await conn.execute(insSql, cond);
                    }
                }
            }

            return done(null, "mlExport");
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.insertOcrSymspell = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var reqArr = req[0].text.split(' ');
            for (var i in reqArr) {
                result = await conn.execute(queryConfig.uiLearningConfig.selectTypo, [reqArr[i]]);
                if (result.rows.length == 0) {
                    result = await conn.execute(queryConfig.uiLearningConfig.insertTypo, [reqArr[i]]);
                } else {
                    //result = await conn.execute(queryConfig.uiLearningConfig.updateTypo, [reqArr[i]]);
                }
            }

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
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
};

exports.insertOcrSymspellForCurcd = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var isTypoMapping = true;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var reqArr = req[0].text.split(' ');
            for (var i in reqArr) {
                result = await conn.execute(queryConfig.uiLearningConfig.selectTypo, [reqArr[i]]);
                if (result.rows.length == 0) {
                    await conn.execute(queryConfig.uiLearningConfig.insertTypo, [reqArr[i]]);
                } else {
                    //result = await conn.execute(queryConfig.uiLearningConfig.updateTypo, [reqArr[i]]);
                    isTypoMapping = false;
                }
            }

            // insert tbl_curcd_mapping
            if (!isTypoMapping) {
                result = await conn.execute(queryConfig.uiLearningConfig.selectCurcdMapping, [req[1].text, req[0].text]);
                if (result.rows.length == 0) {
                    await conn.execute(queryConfig.uiLearningConfig.insertCurcdMapping, [req[1].text, req[0].text]);
                }
            }

            return done(null, null);
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
};
exports.selectSid = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = `SELECT EXPORT_SENTENCE_SID(LOWER(:COND)) SID FROM DUAL`;
            var sid = "";
            locSplit = req.location.split(",");
            //need check
            //sid += locSplit[0] + "," + locSplit[1] + "," + (Number(locSplit[0]) + Number(locSplit[2]));

            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            let result = await conn.execute(sqltext, [req.text.replace(regExp,"")]);

            if (result.rows[0] != null) {
                //sid += "," + result.rows[0].SID;
                sid += result.rows[0].SID;
            }
            return done(null, sid);
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};
  
exports.insertOcrSymsSingle = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            let selectTypo = `SELECT seqNum FROM tbl_ocr_symspell WHERE keyword=LOWER(:keyWord) `;
            let insertTypo = `INSERT INTO tbl_ocr_symspell(seqNum, keyword, frequency) VALUES (seq_ocr_symspell.nextval, LOWER(:keyWord), 1)`;
            conn = await oracledb.getConnection(dbConfig);
            var reqArr = req.text.split(' ');
            var result;
            var numExp = /[0-9]/gi;
            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            for (var i in reqArr) {

                result = await conn.execute(selectTypo, [reqArr[i].replace(regExp, "")]);
                if (result.rows.length == 0) {
                    var exceptNum = reqArr[i].replace(numExp, "");

                    if (exceptNum != "") {
                        reqArr[i] = reqArr[i].replace(regExp, "");
                        exceptNum = reqArr[i].replace(numExp, "");
                        if (reqArr[i] != "" || exceptNum != "") {
                            result = await conn.execute(insertTypo, [reqArr[i]]);
                        }
                    }
                } else {
                    //result = await conn.execute(queryConfig.uiLearningConfig.updateTypo, [reqArr[i]]);
                }
            }

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
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
};

exports.insertOcrSymsDoc = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            let selectTypo = `SELECT seqNum FROM tbl_ocr_symspell WHERE keyword=LOWER(:keyWord) `;
            let insertTypo = `INSERT INTO tbl_ocr_symspell(seqNum, keyword, frequency) VALUES (seq_ocr_symspell.nextval, LOWER(:keyWord), 1) `;
            conn = await oracledb.getConnection(dbConfig);
            var reqArr = req.text.split(' ');
            var result;
            //var numExp = /[0-9]/gi;
            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            for (var i in reqArr) {

                result = await conn.execute(selectTypo, [reqArr[i].replace(regExp, "")]);
                if (result.rows.length == 0) {
                    await conn.execute(insertTypo, [reqArr[i].replace(regExp, "")]);
                    conn.commit();
                    /*
                    var exceptNum = reqArr[i].replace(numExp, "");
  
                    if (exceptNum != "") {
                        reqArr[i] = reqArr[i].replace(regExp, "");
                        exceptNum = reqArr[i].replace(numExp, "");
                        if (reqArr[i] != "" || exceptNum != "") {
                            result = await conn.execute(insertTypo, [reqArr[i]]);
                            conn.commit();
                        }
                    }
                    */
                } else {
                    //result = await conn.execute(queryConfig.uiLearningConfig.updateTypo, [reqArr[i]]);
                }
            }

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
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
};

exports.insertContractMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            selContract = await conn.execute(`SELECT * FROM TBL_CONTRACT_MAPPING WHERE EXTOGCOMPANYNAME = :extog `, [req[0]]);

            selContractAsog = await conn.execute(`SELECT * FROM TBL_CONTRACT_MAPPING WHERE EXTOGCOMPANYNAME = :extog AND ASOGCOMPANYNAME = :asog `, [req[0], req[2]]);

            if (selContract.rows.length == 0 && selContractAsog.rows.length == 0) {
                result = await conn.execute(queryConfig.uiLearningConfig.insertContractMapping2, [req[0], req[1], req[2], req[3]]);
            } else {

                if (selContract.rows.length > 0 && selContractAsog.rows.length == 0) {
                    updContract = await conn.execute(`UPDATE TBL_CONTRACT_MAPPING SET ASOGCOMPANYNAME = :asog WHERE EXTOGCOMPANYNAME = :extog`, [req[2], req[0]]);
                }
            }

            return done(null, null);
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
};

exports.insertSymspell = function (item, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            text = item.text.split(" ");

            for (var i = 0; i < text.length; i++) {
                var selRes = await conn.execute('SELECT * FROM TBL_OCR_SYMSPELL_KO WHERE KEYWORD = :keywrod', [text[i]]);

                if (selRes.rows.length == 0) {
                    await conn.execute('INSERT INTO TBL_OCR_SYMSPELL_KO VALUES (SEQ_OCR_SYMSPELL_KO.NEXTVAL, :keyword, 1)', [text[i]]);
                }
            }

            return done(null, null);
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
};

exports.selectCurCd = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let sql = "SELECT beforeText, afterText FROM tbl_curcd_mapping WHERE beforeText = '" + req + "'";
            result = await conn.execute(sql);

            if (result.rows.length > 0) {
                if (result.rows.length == 1) {
                    return done(null, result.rows[0].AFTERTEXT);
                } else {
                    for (var i in result.rows) {
                        var row = result.rows[i];
                        if (req == row.BEFORETEXT) {
                            return done(null, row.AFTERTEXT);
                        }
                    }
                    return done(null, result.rows[0].AFTERTEXT);
                }
            } else {
                return done(null, req);
            }
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectCurcdMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.uiLearningConfig.selectCurcdMapping2, [req]);

            if (result.rows) {
                return done(null, result.rows[0]);
            } else {
                return done(null, null);
            }
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
};

exports.selectColumn = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.dbcolumnsConfig.selectColMappingCls);
            return done(null, result.rows);
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
};

exports.selectLegacyFilepath = function (req, done) {
    return new Promise(async function (resolve, reject) {
        var res = [];
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);
            console.log(req);
            let resAnswerFile = await conn.execute(`SELECT * FROM TBL_BATCH_ANSWER_FILE WHERE FILEPATH = :filepath`, [req]);
            for (var i = 0; i < resAnswerFile.rows.length; i++) {
                var imgId = resAnswerFile.rows[i].IMGID;
                var imgStartNo = resAnswerFile.rows[i].PAGENUM;
                var filepath = resAnswerFile.rows[i].FILEPATH;
                var filename = filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length);

                let resAnswerData = await conn.execute(`SELECT * FROM TBL_BATCH_ANSWER_DATA WHERE IMGID = :imgId AND TO_NUMBER(IMGFILESTARTNO) <= :imgStartNo AND TO_NUMBER(IMGFILEENDNO) >= :imgStartNo`, [imgId, imgStartNo, imgStartNo]);
                for (var row = 0; row < resAnswerData.rows.length; row++) {
                    resAnswerData.rows[row].FILEPATH = filepath;
                    resAnswerData.rows[row].FILENAME = filename;
                }

                res.push(resAnswerData);
            }

            return done(null, res);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error getlegacy");
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
};
/*
exports.selectFormLabelMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.mlConfig.selectFormLabelMapping);

            return done(null, result.rows);
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
};
*/
exports.selectFormLabelMappingFromMLStudio = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            var inQuery = "(";
            for (var i in req.data) {
                inQuery += "'" + req.data[i].sid + "',";
            }
            inQuery = inQuery.substring(0, inQuery.length - 1);
            inQuery += ")";
            result = await conn.execute(queryConfig.mlConfig.selectFormLabelMapping + inQuery);
            if (result.rows.length > 0) {
                for (var i in req.data) {
                    for (var j in result.rows) {
                        var row = result.rows[j];
                        if (req.data[i].sid == row.DATA) {
                            req.data[i].formLabel = row.CLASS;
                            break;
                        }
                    }
                }
            }

            return done(null, req);
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
};

exports.selectFormMappingFromMLStudio = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var param = []
            var ogCompany = [];
            var ctnm = [];
            for (var i in req.data) {
                if (req.data[i].formLabel == 1) {
                    ogCompany.push(req.data[i].sid);
                } else if (req.data[i].formLabel == 2) {
                    ctnm.push(req.data[i].sid);
                }
            }
            if (ogCompany.length == 1 && ctnm.length == 1) {
                param.push(ogCompany[0] + ',' + ctnm[0]);
            } else if (ogCompany.length > 1 && ctnm.length == 1) {
                for (var i in ogCompany) {
                    param.push(ogCompany[i] + ',' + ctnm[0]);
                }
            } else if (ogCompany.length == 1 && ctnm.length > 1) {
                for (var i in ctnm) {
                    param.push(ogCompany[0] + ',' + ctnm[i]);
                }
            }
            for (var i in param) {
                result = await conn.execute(queryConfig.mlConfig.selectFormMapping, [param[i]]);
                if (result.rows.length > 0) {
                    result = await conn.execute(queryConfig.mlConfig.selectDocCategory, [result.rows[0].CLASS]);
                    if (result.rows.length > 0) {
                        req.docCategory = result.rows[0];
                        break;
                    }
                }
            }

            return done(null, req);
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
};

exports.selectDocCategoryFromMLStudio = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute(queryConfig.mlConfig.selectDocCategory, [req.docCategory.DOCTYPE]);
            if (result.rows.length > 0) {
                req.docCategory = result.rows[0];
            } 

            return done(null, req);
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
}; 
exports.selectColumnMappingFromMLStudio = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            /*
            var inQuery = "(";
            for (var i in req.data) {
                inQuery += "'" + req.docCategory.DOCTYPE + "," + req.data[i].sid + "',";
            }
            inQuery = inQuery.substring(0, inQuery.length - 1);
            inQuery += ")";
            */
            result = await conn.execute(queryConfig.mlConfig.selectColumnMapping);

            if (result.rows.length > 0) {
                for (var i in req.data) {
                    for (var j in result.rows) {
                        var row = result.rows[j];
                        if (req.data[i].sid == row.DATA) {
                            req.data[i].colLbl = row.CLASS;
                            break;
                        }
                        /*
                        if (req.docCategory.DOCTYPE + "," + req.data[i].sid == row.DATA) {
                            req.data[i].colLbl = row.CLASS;
                            break;
                        }
                        */
                    }
                }
            }         

            return done(null, req);
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
};

exports.selectBatchLearnMlList = function (arg, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var param = [arg.docToptype]
            var filenameList = arg.filenameList;
            var inQuery = "(";
            for (var i in filenameList) {
                inQuery += "'" + filenameList[i] + "',";
            }
            inQuery = inQuery.substring(0, inQuery.length - 1);
            inQuery += ")";

            var selectQuery = 'SELECT DOCID, EXPORTDATA, FILENAME FROM TBL_BATCH_PO_ML_EXPORT WHERE DOCID = :docId AND FILENAME IN ' + inQuery;
            result = await conn.execute(selectQuery, param);


            return done(null, result.rows);
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
};

exports.selectPoMlExport = function (filename, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(`SELECT EXPORTDATA FROM TBL_BATCH_PO_ML_EXPORT WHERE FILENAME = :filename`,[filename]);
            return done(null, result);
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
};

exports.selectAnswerData = function (arg, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var docToptype = arg.docToptype;

            var query = "select docid, answerdata, filename from tbl_batch_po_answer_data where docid = :doctoptype";
                        
            result = await conn.execute(query, [docToptype]);


            return done(null, result.rows);
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
};

exports.selectBatchLearnAnswerData = function (arg, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var filenameList = arg.filenameList;
            var docToptype = arg.docToptype;
            var inQuery = "(";
            for (var i in filenameList) {
                inQuery += "'" + filenameList[i] + "',";
            }
            inQuery = inQuery.substring(0, inQuery.length - 1);
            inQuery += ")";

            var query = "select docid, answerdata, filename from tbl_batch_po_answer_data where docid = :doctoptype and filename in" + inQuery;
                        
            result = await conn.execute(query, [docToptype]);


            return done(null, result.rows);
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
};

exports.addBatchTraining = function (filepath, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        var retData = 0;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var inQuery = "('" + filepath + "')";
            let result = await conn.execute(queryConfig.batchLearningConfig.selectBatchLearnMlList + inQuery);

            for (var row in result.rows) {
                var sid = result.rows[row].SID;
                var colLbl = result.rows[row].COLLABEL;

                var resSelColData = await conn.execute(`SELECT * FROM TBL_COLUMN_MAPPING_TRAIN WHERE DATA = :data AND CLASS = :class`, [sid, colLbl]);

                if (resSelColData.rows.length == 0) {
                    var resInsColData = await conn.execute(queryConfig.mlConfig.insertColMapping, [sid, colLbl]);
                    retData++;
                }
            }

            return done(null, retData);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectColumnMappingCls = function (filePathList, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.dbcolumnsConfig.selectColMappingCls);


            return done(null, result);
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
};

exports.selectTypoMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i in req) {
                var inQuery = "(";
                var wordArr = req[i].text.split(' ');
                for (var j in wordArr) {
                    inQuery += "'" + wordArr[j] + "',";
                }
                inQuery = inQuery.substring(0, inQuery.length - 1);
                inQuery += ")";
                result = await conn.execute(queryConfig.mlConfig.selectTypoMapping + inQuery);
                req[i].originText = req[i].text;

                if (result.rows.length > 0) {
                    for (var j in result.rows) {
                        var row = result.rows[j];
                        req[i].text = req[i].text.split(row.ORIGINTEXT).join(row.TEXT);
                    }
                }
            }

            return done(null, req);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
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
};

exports.selectEntryMappingCls = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.dbcolumnsConfig.selectEntryMappingCls);


            return done(null, result.rows);
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
};

exports.selectOcrData = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(`SELECT * FROM TBL_BATCH_OCR_DATA WHERE FILEPATH = :filepath `, [req]);
            //result = await conn.execute(`SELECT * FROM TBL_BATCH_OCR_DATA WHERE FILEPATH = :filepath `, ['C:/ICR/MIG/MIG/2014/img1/7a/25b7a/209391.tif']);

            if (result.rows.length == 0) {
                return done(null, result.rows);
            }

            var ocr = JSON.parse(result.rows[0].OCRDATA);
            //var retData = ocrJson(ocr.regions);

            return done(null, result.rows[0]);
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
};

exports.selectForm = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        let unknownRes;
        let retData;

        try {
            conn = await oracledb.getConnection(dbConfig);

            var formArr = [];
            var formText = "";
            console.log("==== classify form ====");
            for (var i in req) {
                console.log(req[i].text);
                var sidSplit = req[i].sid.split(",");
                for (var j = sidSplit.length - 5; j < sidSplit.length; j++) {
                    formArr.push(sidSplit[j]);
                }
                if (formArr.length == 25) {
                    break;
                }
            }

            for (var i in formArr) {
                formText += formArr[i] + ",";
            }
            
            formText = formText.slice(0, -1);
            console.log(formText);
            result = await conn.execute(`SELECT * FROM TBL_FORM_MAPPING WHERE DATA = :data `, [formText]);

            if (result.rows.length == 0) {
                formText = "";
                for (var i = 0; i < 15; i++) {
                    formText += formArr[i] + ",";
                }
                formText = formText.slice(0, -1);
                result = await conn.execute(`SELECT * FROM TBL_FORM_MAPPING WHERE DATA like :data` + ` || '%' `, [formText]);
            }

            if (result.rows.length == 0) {
                unknownRes = await conn.execute(`SELECT * FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = 0`);
                retData = unknownRes.rows[0];
            } else {
                let resForm = await conn.execute(`SELECT * FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = :doctype `, [result.rows[0].CLASS]);

                if (resForm.rows.length == 0) {
                    unknownRes = await conn.execute(`SELECT * FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = 0`);
                    retData = unknownRes.rows[0];
                } else {
                    retData = resForm.rows[0];
                }
            }

            return done(null, retData);
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
};

exports.insertNewDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);          

            result = await conn.execute(queryConfig.batchLearningConfig.selectMaxDocType);
            await conn.execute(queryConfig.batchLearningConfig.insertDocCategory, [req[0], result.rows[0].MAXDOCTYPE, req[1]]);
            //var imgId = getConvertDate();
            //await conn.execute(queryConfig.batchLearningConfig.insertBatchLearnList, [imgId, req[1], result.rows[0].MAXDOCTYPE]);

            return done(null, {code: '200'});
        } catch (err) { // catches errors in getConnection and the query
            return done(null, { code: '500', error: err });
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
};

exports.selectDocumentCategory = function (req, docTopType, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.batchLearningConfig.selectDocumentCategory, [req, docTopType]);          

            return done(null, result);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, { code: '500', error: err });
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
};

exports.insertBatchLearnList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i in req.filePathArray) {
                var docType = '';
                //20180910 hskim 일괄학습 리스트에서 add training 처리
                //일괄학습 리스트에서 Add training과 문서양식 팝업에서 저장 버튼 동일한 function 사용 function 분리 필요
                //TBL_BATCH_LEARN_LIST 에 status 'D'로 인서트 
                await conn.execute(queryConfig.batchLearningConfig.updateBatchLearnList, [req.docTypeArray[i], req.filePathArray[i]]);
            }

            return done(null, { code: '200' });
        } catch (err) {
            console.log(err);
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};
exports.selectEntryMappingUnit = function (done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute('SELECT COLNUM, CREDIT, DEBIT FROM TBL_ENTRY_MAPPING_UNIT');

            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }
        } catch (err) {
            console.log(err);
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertDoctypeMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            
            /*
            conn = await oracledb.getConnection(dbConfig);

            //req.imgid req.filepath req.docname req.radiotype
            //req.words
            //{"Empower Results@" : 0}
            //{"To:" : 1}
            //{"To:" : 1}
            //todo
            //20180910 hskim 문서양식 매핑
            //문장을 순서대로 for문

            //문장 index가 1인 경우 문장의 첫부분을 TBL_OCR_BANNED_WORD 에 insert
            //문장 index가 0인 경우 문장을 symspell에 등록 안된 단어 있는지 확인 후 없을 경우 insert
            //문장 index가 0인 경우가 5개가 되면 for문 종료

            //가져온 문장의 sid EXPORT_SENTENCE_SID함수를 통해 추출

            //신규문서일 경우
            //기존 문서양식중 max doctype값 가져오기
            //TBL_DOCUMENT_CATEGORY테이블에 가져온 신규문서 양식명을 insert
            //기존 이미지 파일을 c://sampleDocImage 폴더에 DocType(숫자).jpg로 저장
            result = await conn.execute(queryConfig.batchLearningConfig.selectMaxDocType);
            await conn.execute(queryConfig.batchLearningConfig.insertDocCategory, ['sample doc', result.rows[0].MAXDOCTYPE, 'sample image path']);

            //TBL_FORM_MAPPING 에 5개문장의 sid 와 doctype값 insert
            //TBL_BATCH_LEARN_LIST 에 insert

            let selectSqlText = `SELECT SEQNUM FROM TBL_FORM_MAPPING WHERE DATA = :DATA`;
            let insertSqlText = `INSERT INTO TBL_FORM_MAPPING (SEQNUM, DATA, CLASS, REGDATE) VALUES (SEQ_FORM_MAPPING.NEXTVAL,:DATA,:CLASS,SYSDATE)`;
            let updateSqlText = `UPDATE TBL_FORM_MAPPING SET DATA = :DATA , CLASS = :CLASS , REGDATE = SYSDATE WHERE SEQNUM = :SEQNUM`;

            insClass = 0;
            insCompanyData = '0,0,0,0,0,0,0';
            insContractData = '0,0,0,0,0,0,0';

            if (req.docCategory[0]) {
                insClass = req.docCategory[0].DOCTYPE;
            }

            for (var i in req.data) {
                if (req.data[i].colLbl && req.data[i].colLbl == 0) {
                    insCompanyData = req.data[i].sid;
                }
                if (req.data[i].colLbl && req.data[i].colLbl == 1) {
                    insContractData = req.data[i].sid;
                }
            }

            if (insCompanyData && insContractData) {
                var sid = insCompanyData + "," + insContractData;
                result = await conn.execute(selectSqlText, [sid]);
                if (result.rows[0]) {
                    await conn.execute(updateSqlText, [sid, insClass, result.rows[0].SEQNUM]);
                } else {
                    await conn.execute(insertSqlText, [sid, insClass]);
                }
            }

            return done(null, { code: '200' });
            */
        } catch (err) {
            console.log(err);
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.deleteAnswerFile = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);;
            result = await conn.execute(queryConfig.batchLearningConfig.deleteAnswerFile, [req[1], req[0]]);

            return done(null, { code: '200' });
        } catch (err) {
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.deleteBatchLearnList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);;
            result = await conn.execute(queryConfig.batchLearningConfig.deleteBatchLearnList, [req[0]]);

            return done(null, { code: '200' });
        } catch (err) {
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectDocCategoryFilePath = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(queryConfig.batchLearningConfig.selectDocCategoryFilePath, [req]);

            return done(null, result);
        } catch (err) {
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.selectClassificationSt = function (data, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(`SELECT OCRDATA FROM TBL_BATCH_OCR_DATA WHERE FILEPATH LIKE '%` + data[0] + `'`);

            return done(null, result);
        } catch (err) {
            return done(null, { code: '500', error: err });
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertBannedWord = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            let selectTypo = `SELECT SEQNUM FROM TBL_BANNED_WORD WHERE WORD = LOWER(:word) `;
            let insertTypo = `INSERT INTO TBL_BANNED_WORD(SEQNUM, WORD, REGDATE) VALUES (seq_banned_word.nextval, LOWER(:word), SYSDATE) `;
            conn = await oracledb.getConnection(dbConfig);
            var reqArr = req.text;
            var result;
            //var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;

            result = await conn.execute(selectTypo, [reqArr]);
            if (result.rows.length == 0 && reqArr) {
                await conn.execute(insertTypo, [reqArr]);
                conn.commit();
            }

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
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
};

exports.selectOriginSid = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let sqltext = `SELECT EXPORT_SENTENCE_SID(LOWER(:COND)) SID FROM DUAL`;
            //let sqltext = `SELECT EXPORT_SENTENCE_SID(LOWER(:COND)) SID FROM DUAL`;
            var sid = "";

            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            let result = await conn.execute(sqltext, [req.text.replace(regExp, '')]);
            if (result.rows[0] != null) {
                return done(null, result.rows[0].SID);
            } else {
                return done(null, null);
            }
        } catch (err) {
            reject(err);
        } finally {
            if (conn) {
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
};

exports.insertDocCategory = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute('SELECT DOCTYPE FROM tbl_document_category WHERE DOCNAME = :docName AND SAMPLEIMAGEPATH = :sampleImagePath', [req[0], req[1]]);
            if (result.rows.length == 0) {
                result = await conn.execute('SELECT MAX(docType) + 1 AS docType FROM tbl_document_category');
                await conn.execute(`INSERT INTO
                                    tbl_document_category(seqnum, docname, doctype, sampleimagepath, doctoptype)
                                 VALUES
                                    (seq_document_category.nextval, :docName, :docType, :sampleImagePath, :docTopType) `,
                    [req[0], result.rows[0].DOCTYPE, req[1], req[2]]);
                conn.commit();
            }

            return done(null, result.rows[0].DOCTYPE);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.insertFormMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(`SELECT SEQNUM FROM TBL_FORM_MAPPING WHERE DATA = :data AND CLASS = :class `, req);
            if (result.rows.length == 0) {
                await conn.execute(`INSERT INTO
                                    TBL_FORM_MAPPING
                                 VALUES
                                    (seq_form_mapping.nextval, :data, :class, sysdate) `, req);
            }

            return done(null, null);
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
};

exports.insertNotInvoce = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(`SELECT SEQNUM FROM TBL_NOTINVOICE_DATA WHERE DATA = LOWER(:data) AND DOCTYPE = :doctype `, req);
            if (result.rows.length == 0) {
                await conn.execute(`INSERT INTO
                                        TBL_NOTINVOICE_DATA
                                    VALUES
                                        (seq_notinvoice_data.nextval, LOWER(:data), :doctype, sysdate) `,
                                req);
            }

            return done(null, null);
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
};

exports.selectDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(`SELECT SEQNUM, DOCNUM, PAGECNT, STATUS, NOWNUM FROM TBL_APPROVAL_MASTER WHERE DOCNUM IN ( ` + req + `)`);
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }
            
        } catch (err) { // catches errors in getConnection and the query
            console.log('oracle.js error');
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
};

exports.selectMaxDocNum = function (done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute('SELECT NVL(MAX(DOCNUM),0) AS MAXDOCNUM FROM TBL_APPROVAL_MASTER');
            return done(null, result.rows[0].MAXDOCNUM);

        } catch (err) { // catches errors in getConnection and the query
            console.log('oracle.js error');
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
};

//내 결재 - 반려(중간결재자)
exports.cancelDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            await conn.execute("UPDATE TBL_APPROVAL_MASTER SET STATUS ='04', " + req[0] + " WHERE DOCNUM = '"+ req[1]+ "'");
            return done(null, null);
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
};


//문서 기본정보 / 인식결과 전달
exports.sendApprovalDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            await conn.execute("UPDATE TBL_APPROVAL_MASTER SET DRAFTERNUM = :draftNum, MIDDLENUM = :middleNum, NOWNUM = :nowNum, STATUS = '02', DRAFTDATE = sysdate WHERE DOCNUM = :docNum ", req);
            result = await conn.execute("SELECT DRAFTDATE FROM TBL_APPROVAL_MASTER WHERE DOCNUM = :docNum ", [req[3]]);
            return done(null, result.rows[0].DRAFTDATE);
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
};

//결재리스트(기본) C -> D 전달
exports.sendApprovalDocumentCtoD = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            await conn.execute("UPDATE TBL_APPROVAL_MASTER SET FINALNUM = :finalnum, NOWNUM = :nowNum, STATUS = '02' WHERE DOCNUM = :docNum ", req);
            return done(null, null);
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
};

//문서 기본정보 전달
exports.sendDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            await conn.execute("UPDATE TBL_APPROVAL_MASTER SET ICRNUM = :icrNum, NOWNUM = :nowNum WHERE DOCNUM = :docNum ", req);
            return done;
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
};

//결재리스트 (상세)
exports.searchApprovalDtlList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute(` SELECT * FROM TBL_DOCUMENT_DTL WHERE STATUS = 'Y' AND DOCNUM = :docNum`, req);
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }
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
};

//결재리스트 (상세 이미지)
exports.searchApprovalImageList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute( "SELECT * FROM TBL_OCR_FILE_DTL WHERE IMGID = "+"'"+ req[0]+"'");
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }
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
};

//문서 기본정보 삭제
exports.deleteDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            await conn.execute("UPDATE TBL_APPROVAL_MASTER SET STATUS ='06' WHERE DOCNUM = '" + req + "'");
            return done;
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
};

exports.insertDocument = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            await conn.execute(`INSERT INTO
                                    TBL_APPROVAL_MASTER(SEQNUM, DOCNUM, STATUS, PAGECNT, FILENAME, FILEPATH, UPLOADNUM, NOWNUM )
                                VALUES
                                    (SEQ_DOCUMENT.NEXTVAL, :docNum, 'ZZ', :pageCnt, :fileName, :filePath, :uploadNum, :nowNum) `, [req[0][0].imgId, req[1], req[0][0].oriFileName, req[0][0].filePath, req[0][0].regId, req[0][0].regId]);
            return done(null, null);
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
};

exports.insertDocumentSentence = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
		try {
			console.log(req);
            conn = await oracledb.getConnection(dbConfig);
			result = await conn.execute(`SELECT SEQNUM FROM TBL_DOCUMENT_SENTENCE WHERE DATA = LOWER(:data) AND DOCTYPE = :doctype AND SENTENCELENGTH = :length AND DOCTOPTYPE = :doctoptype`, req);
            if (result.rows.length == 0) {
                await conn.execute(`INSERT INTO
                                        TBL_DOCUMENT_SENTENCE
                                    VALUES
                                        (seq_document_sentence.nextval, LOWER(:data), :doctype, sysdate, :length, :doctoptype ) `,
                    req);
            }

            return done(null, null);
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
};

exports.selectDocCategoryFromDocName = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute(`SELECT DOCTYPE FROM TBL_DOCUMENT_CATEGORY WHERE DOCNAME = :docName `, req);
            if (result.rows.length > 0) {
                return done(null, result.rows[0].DOCTYPE);
            } else {
                return done(null, 0);
            }

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.updateBatchLearnList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            await conn.execute(`UPDATE TBL_BATCH_LEARN_LIST SET STATUS = 'D', DOCTYPE = :docType WHERE IMGID = :imgId AND FILEPATH = :filepath `, req);
            conn.commit();

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.updateBatchLearnListStatus = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            await conn.execute(`UPDATE TBL_BATCH_LEARN_LIST SET STATUS = 'D' WHERE IMGID = :imgId`, [req]);
            conn.commit();

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.updateDocCategoryToFilePath = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            await conn.execute(`UPDATE TBL_DOCUMENT_CATEGORY SET SAMPLEIMAGEPATH = :filepath WHERE DOCTYPE = :docType `, req);
            conn.commit();

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.selectBannedWord = function (done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute(`SELECT WORD FROM TBL_BANNED_WORD`);
            conn.commit();

            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.insertOcrFileDtl = function (data, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            var insertSql = queryConfig.commonConfig.insertFileDtlInfo;
            conn = await oracledb.getConnection(dbConfig);

            for (var i in data) {
                var param = [];
                param.push(data[i].imgId);
                param.push(data[i].filePath);
                param.push(data[i].oriFileName);
                param.push(data[i].svrFileName);
                param.push(data[i].fileExt);
                param.push(data[i].fileSize);
                param.push(data[i].contentType);
                param.push("");
                param.push("");

                result = await conn.execute(insertSql, param);
            }

            conn.commit();

            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

exports.selectOcrFileDtl = function (imgId, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute('SELECT * FROM TBL_OCR_FILE_DTL WHERE IMGID = :imgId', [imgId]);
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }

        } catch (err) { // catches errors in getConnection and the query
            console.log('oracle.js error');
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
};

exports.selectApprovalMasterFromDocNum = function (docNum, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute('SELECT * FROM TBL_APPROVAL_MASTER WHERE DOCNUM = :docNum', [docNum]);
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }

        } catch (err) { // catches errors in getConnection and the query
            console.log('oracle.js error');
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
};

exports.updateApprovalMaster = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var targetCol;
            if (req[0] == 'icrApproval') {
                targetCol = 'UPLOADNUM';
            } else if (req[0] == 'middleApproval') {
                targetCol = 'ICRNUM';
            } else if (req[0] == 'lastApproval') {
                targetCol = 'MIDDLENUM';
            } else {

            }
            for (var i in req[1]) {
                await conn.execute('UPDATE TBL_APPROVAL_MASTER SET NOWNUM = (SELECT ' + targetCol +' FROM TBL_APPROVAL_MASTER WHERE DOCNUM = :docNum ) WHERE DOCNUM = :docNum', [req[1][i]]);
            }          
            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            console.log('oracle.js error');
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
};

exports.selectApprovalDtl = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            result = await conn.execute('SELECT * FROM TBL_APPROVAL_DTL WHERE DOCNUM = :docNum', [req]);
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }
        } catch (err) {
            reject(err);
        } finally {

        }
    });
};

// req = [문서번호, 결재상태코드, 결제사원번호(현재유저), 결재일시, 결재의견, 다음결재사원번호(다음유저)];
// 파라미터 중 없는 것들은 null로 작성, 순서 지킬 것!
exports.approvalDtlProcess = function (req, token, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        let approvalSql;
        var approvalDtls;
        try {
            conn = await oracledb.getConnection(dbConfig);
            for (var i in req) {
                var docNum = req[i].docNum ? req[i].docNum : '';
                var status = req[i].status ? req[i].status : null;
                var approvalNum = req[i].approvalNum ? req[i].approvalNum : null;
                var approvalDate = req[i].approvalDate ? req[i].approvalDate : null;
                var approvalComment = req[i].approvalComment ? req[i].approvalComment : null;
                var nextApprovalNum = ((req[i].nextApprovalNum ? req[i].nextApprovalNum : null) == '03') ? '' : req[i].nextApprovalNum;

                // 해당 문서번호 순번 채번
                approvalSql = 'SELECT NVL(MAX(SEQNUM) + 1,1) AS SEQNUM FROM TBL_APPROVAL_DTL WHERE DOCNUM = :docNum';
                result = await conn.execute(approvalSql, [docNum]);
                var insertSeqNum = result.rows[0].SEQNUM;

                // 이전 순번 디테일 테이블 결재상태코드 03 변환
                if (insertSeqNum != 1) {
                    approvalSql = 'UPDATE TBL_APPROVAL_DTL SET STATUS = :status WHERE DOCNUM = :docNum AND SEQNUM = :seqNum';
                    await conn.execute(approvalSql, ['03', docNum, insertSeqNum - 1]);
                }
                
                var dateQuery;
                var params;
                if (approvalDate) {
                    dateQuery = ':approvalDate';
                    params = [docNum, insertSeqNum, status, approvalNum, approvalDate, approvalComment, nextApprovalNum];
                } else {
                    dateQuery = 'sysdate';
                    params = [docNum, insertSeqNum, status, approvalNum, approvalComment, nextApprovalNum];
                }
                approvalSql = 'INSERT INTO TBL_APPROVAL_DTL VALUES (:docNum, :seqNum, :status, :approvalNum, ' +
                    dateQuery + ', :approvalComment, :nextApprovalNum)';
                await conn.execute(approvalSql, params);

                /*
                //기간계 IF-2
                result = await conn.execute('SELECT * FROM TBL_APPROVAL_DTL WHERE DOCNUM = :docNum', [docNum]);
                if (result.rows.length > 0) {
                    approvalDtls = result.rows;
                } else {
                    approvalDtls = [];
                }

                var dtlXml = '';
                for (var i in approvalDtls) {
                    dtlXml +=
                        '<Row>' +
                    '<Col id="imgId">' + approvalDtls[i].DOCNUM + '</Col>' +
                    '<Col id="apvrSno">' + approvalDtls[i].SEQNUM + '</Col>' +
                    '<Col id="aprStatCd">' + approvalDtls[i].STATUS + '</Col>' +
                    '<Col id="apvrEmpNo">' + approvalDtls[i].APPROVALNUM + '</Col>' +
                        '<Col id="aprDt"></Col>';//'<Col id="aprDt">' + approvalDtls[i].APPROVALDATE + '</Col>';
                    if (approvalDtls[i].STATUS == '04') {
                        dtlXml +=
                            '<Col id="aprOpnn">' + data[i].APPROVALCOMMENT ? data[i].APPROVALCOMMENT.replace(/ /gi, '&#32;') : '' + '</Col>';
                    }
                    dtlXml +=
                        '<Col id="aftApvrEmpNo">' + approvalDtls[i].NEXTAPPROVALNUM + '</Col>' +
                        '</Row>';
                }

                var data =
                    '<?xml version="1.0" encoding="utf-8"?>' +
                    '<Root>' +
                    '<Parameters>' +
                    '<Parameter id="gv_encryptToken" type="STRING">' + token + '</Parameter>' +
                    '<Parameter id="WMONID" type="STRING">NXrGufbtBrq</Parameter>' +
                    '<Parameter id="lginIpAdr" type="STRING" />' +
                    '<Parameter id="userId" type="STRING">2011813</Parameter>' +
                    '<Parameter id="userEmpNo" type="STRING">2011813</Parameter>' +
                    '<Parameter id="userDeptCd" type="STRING">240050</Parameter>' +
                    '<Parameter id="frstRqseDttm" type="STRING">20181015210404674</Parameter>' +
                    '<Parameter id="rqseDttm" type="STRING">20181015210404674</Parameter>' +
                    '<Parameter id="lngeClsfCd" type="STRING">ko-kr</Parameter>' +
                    '<Parameter id="srnId" type="STRING">CTCTM107</Parameter>' +
                    '<Parameter id="rqseSrvcNm" type="STRING">koreanre.co.co.aprco.svc.CoAprSvc</Parameter>' +
                    '<Parameter id="rqseMthdNm" type="STRING">saveAprInfoForIcr</Parameter>' +
                    '<Parameter id="rqseVoNm" type="STRING">koreanre.co.co.aprco.vo.CoAprVo</Parameter>' +
                    '</Parameters>' +
                    '<Dataset id="coAprMngnIfDcDVoList">' +
                    '<ColumnInfo>' +
                    '<Column id="imgId" type="STRING" size="18" />' +
                    '<Column id="aprPrgStatCd" type="STRING" size="2" />' +
                    '<Column id="drftEmpNo" type="STRING" size="7" />' +
                    '<Column id="drfDt" type="DATE" size="0" />' +
                    '<Column id="prinEmpNo" type="STRING" size="7" />' +
                    '<Column id="fnlApvrEmpNo" type="STRING" size="7" />' +
                    '<Column id="fnlAprlDt" type="DATE" size="0" />' +
                    '</ColumnInfo>' +
                    '<Rows>' +
                    '<Row>' +
                    '<Col id="imgId">' + docNum + '</Col>' +
                    '<Col id="aprPrgStatCd">' + status + '</Col>' +
                    '<Col id="drftEmpNo">' + approvalNum + '</Col>' +
                    '<Col id="drfDt">' + ' ' + '</Col>' +
                    '<Col id="prinEmpNo">' + nextApprovalNum + '</Col>' +
                    '</Row>' +
                    '</Rows>' +
                    '</Dataset>' +
                    '<Dataset id="coApvrDcDVoList">' +
                    '<ColumnInfo>' +
                    '<Column id="imgId" type="STRING" size="18" />' +
                    '<Column id="apvrSno" type="INT" size="9" />' +
                    '<Column id="aprStatCd" type="STRING" size="2" />' +
                    '<Column id="apvrEmpNo" type="STRING" size="7" />' +
                    '<Column id="aprDt" type="DATE" size="0" />' +
                    '<Column id="aprOpnn" type="STRING" size="4000" />' +
                    '<Column id="aftApvrEmpNo" type="STRING" size="7" />' +
                    '</ColumnInfo>' +
                    '<Rows>' + dtlXml + '</Rows>' +
                    '</Dataset>' +
                    '</Root>';
                
                var res1 = request('POST', 'http://solomondev.koreanre.co.kr:8083/KoreanreWeb/xplatform.do', {
                    headers: {
                        'content-type': 'text/xml'
                    },
                    body: data
                });
                
                console.log('IF-2 기간계 status code : ' + res1.statusCode);
                */
            }
        } catch (err) {
            console.log(err);
            reject(err);
        } finally {
            return done(null, null);
            //return done(null, res1.statusCode);
        }
    });
};

exports.insertDocumentDtl = function (mlData, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        
        try {
            conn = await oracledb.getConnection(dbConfig);

            var insertDocumentDtlSql = queryConfig.invoiceRegistrationConfig.insertDocumentDtl;
            var deleteDocumentDtlSql = queryConfig.invoiceRegistrationConfig.deleteDocumentDtl;

            await conn.execute(deleteDocumentDtlSql, [mlData.mlDocNum]);

            for (var i = 0; i < mlData.mlExportData.length; i++) {
                mlData.mlExportData[i].push(mlData.mlDocNum);
                await conn.execute(insertDocumentDtlSql, mlData.mlExportData[i]);
            }

        } catch (err) {
            reject(err);
        } finally {
            return done(null, null);
        }
    });
};

/*
exports.convertMs = function (data, done) {
    return new Promise(async function (resolve, reject) {
        try {
            convertMsToPdf(data, function (ret) {
                return done(null, ret);
            });
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
        } finally {

        }
    });
};

function convertMsToPdf(data, callback) {

    msopdf(data, function (error, office) {
        var retPdf = '';

        if (error) {
            console.log("Init failed", error);
            return;
        }

        if (data[0] == "word") {
            office.word({ input: data[1], output: data[2] }, function (error, pdf) {
                if (error) {
                    console.log("Woops", error);
                } else {
                    console.log("Saved to", pdf);
                    retPdf = pdf;
                }
            });
        } else if (data[0] == "excel") {
            office.excel({ input: data[1], output: data[2] }, function (error, pdf) {
                if (error) {
                    console.log("Woops", error);
                } else {
                    console.log("Saved to", pdf);
                    retPdf = pdf;
                }
            });
        }

        office.close(null, function (error) {
            if (error) {
                console.log("Woops", error);
            } else {
                console.log("Finished & closed");
                callback(retPdf);
            }
        });
    });
}
*/

//결재리스트(기본) D 승인
exports.finalApproval = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);
            let arrDocInfo = req.body.param.arrDocInfo;

            for (let i = 0; i < arrDocInfo.length; i++) {
                await conn.execute(`UPDATE TBL_APPROVAL_MASTER SET FINALAPPROVAL = '${arrDocInfo[i].finalApproval}', NOWNUM = '', STATUS = '03', FINALDATE = sysdate WHERE DOCNUM = '${arrDocInfo[i].docNum}'`);
                result = await conn.execute('SELECT FINALDATE FROM TBL_APPROVAL_MASTER WHERE DOCNUM = :docNum', [arrDocInfo[i].docNum]);
                if (result.rows.length > 0) {
                    dateArr.push(result.rows[0].FINALDATE);
                } else {
                    dateArr.push(null);
                }
            }
            return done(null, dateArr);
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
};

// 파일업로드시 TBL_BATCH_LEARN_LIST 에 파일정보 INSERT
exports.insertBatchLearningFileInfo = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            var fileInfoList = req.fileInfoList;
            conn = await oracledb.getConnection(dbConfig);
            
            for(var i = 0; i < fileInfoList.length; i++) {
                var param = [fileInfoList[i].imgId, fileInfoList[i].filePath, req.docToptype, fileInfoList[i].imgCount];
                await conn.execute("INSERT INTO TBL_BATCH_LEARN_LIST VALUES (:imgId, 'T', :filePath, null, sysdate, :docToptype, :imgCount)", param);
            }

            return done(null, null);
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
};


// 파일업로드시 TBL_BATCH_LEARN_LIST 에 파일정보 INSERT
exports.insertBatchLearningFileInfoTest = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            await conn.execute("INSERT INTO TBL_BATCH_LEARN_LIST VALUES (:imgId, 'T', :filePath, null, sysdate, :docTopType)", req);

            return done(null, null);
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
};

// 개별학습 add training시 TBL_FTP_FILE_LIST에 파일정보 INSERT
exports.insertFtpFileListFromUi = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            var fileName = req[1];
            var apiSiteCD = fileName.split("_")[0];
            var apiSeq = "";
            if ( apiSiteCD.lastIndexOf(".") > 0 ) {
                apiSiteCD = apiSiteCD.split(".")[0];
            }

            var res = await conn.execute("SELECT MAX(API_SEQ) AS API_SEQ FROM TBL_FTP_FILE_LIST WHERE API_SITE_CD = :api_site_cd ORDER BY SEQ DESC", [apiSiteCD]);

            if (res.rows[0]["API_SEQ"] == null) {
                apiSeq = 1;
            } else {
                apiSeq = res.rows[0]["API_SEQ"];
                apiSeq = Number(apiSeq) + 1;
            }

            req.push(apiSeq);
            req.push(apiSiteCD);
            await conn.execute("INSERT INTO TBL_FTP_FILE_LIST(SEQ, FILEPATH, FILENAME, API_SEQ, API_SITE_CD) VALUES (SEQ_FTP_FILE_LIST.NEXTVAL, :filePath, :fileName, :apiSeq, :apiSiteCd)", req);

            return done(null, null);
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
};

// 개별학습 add training시 TBL_BATCH_PO_ML_EXPORT에 ML데이터 INSERT
exports.insertBatchPoMlExportFromUi = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT SEQNUM FROM TBL_BATCH_PO_ML_EXPORT WHERE FILENAME = :filename";
            result = await conn.execute(query, [req[1]]);
            if (result.rows.length > 0) {
                query = "UPDATE TBL_BATCH_PO_ML_EXPORT SET exportData = :exportData WHERE FILENAME = :filename";
                params = [req[2], req[1]];
            } else {
                query = "INSERT INTO TBL_BATCH_PO_ML_EXPORT VALUES (SEQ_BATCH_PO_ML_EXPORT.NEXTVAL, :docTopType, :filepath, :exportData)";
                params = req;
            }
            await conn.execute(query, params);

            return done(null, null);
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
};

exports.selectImgid = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute("select imgid from tbl_batch_learn_list where filepath = :filePath", [req]);

            return done(null, result);
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
};

exports.selectImgidUi = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute("select imgid from tbl_batch_learn_list where filepath = :filePath and status = 'D'", [req]);

            return done(null, result);
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
};

exports.selectIcrDocTopType = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute("select seqnum, engnm, kornm from tbl_icr_doc_toptype where useyn='Y'");

            return done(null, result);
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
};

exports.selectIcrLabelDef = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute("select engnm, kornm, seqnum, docid, amount, valid from tbl_icr_label_def where status = 1 and docid = :docid order by seqnum", [req]);

            return done(null, result);
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
};

exports.selectIcrLabelDefTest = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            result = await conn.execute("select engnm, kornm, seqnum, docid from tbl_icr_label_def");

            return done(null, result);
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
};

exports.updateBatchLearnListDocType = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        var dateArr = [];
        try {
            conn = await oracledb.getConnection(dbConfig);

            var updateSql = "UPDATE TBL_BATCH_LEARN_LIST SET DOCTYPE=:doctype WHERE IMGID=:imgid";

            result = await conn.execute(updateSql, [req.docCategory.DOCTYPE, req.fileinfo.imgId]);

            return done(null, result);
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
};

exports.updateNewBatchLearnListDocType = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            await conn.execute(`UPDATE TBL_BATCH_LEARN_LIST SET DOCTYPE = :docType WHERE IMGID = :imgId AND FILEPATH = :filepath `, [req.docType, req.imgId, req.filepath]);
            conn.commit();

            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            return done(null, err);
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
};

// 사용자 찾기
exports.searchUser = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            let dept = req.body.dept;
            let scan = req.body.scan;
            let icr = req.body.icr;
            let approval = req.body.approval;
            let finalApproval = req.body.finalApproval;
            let admin = req.body.admin;

            conn = await oracledb.getConnection(dbConfig);
            var userQuery = 
                "SELECT " +
                "    CO_EMP.EMP_NO, CO_EMP.EMP_NM, CO_EMP.EMP_PW, CO_EMP.DEPT_NM,CO_REG.AUTH_SCAN, CO_REG.AUTH_ICR, CO_REG.AUTH_APPROVAL, EXT_USER, " + 
                "    CO_REG.AUTH_FINAL_APPROVAL, CO_REG.AUTH_ADMIN, TO_CHAR(CO_REG.FINAL_LOGIN_DATE, 'YYYY/MM/DD HH24:MI:SS') AS FINAL_LOGIN_DATE " +
                "FROM (SELECT " + 
                "           CO_EMP.EMP_NO, NULL AS EMP_PW, EMP_NM, EMP_ENGL_NM, BLT_DEPT_CD, JBLV_CD, PSTN_CD, DEPT_NM, 'N' AS EXT_USER " +
                "        FROM " +
                "            TBL_CO_EMP_BS CO_EMP " +
                "        LEFT JOIN TBL_CO_DEPT_BS CO_DEPT " +
                "        ON " +
                "            CO_EMP.BLT_DEPT_CD = CO_DEPT.DEPT_CD " +
                "        UNION ALL " +
                "        SELECT " +
                "            EMP_NO, EMP_PW, EMP_NM, EMP_ENGL_NM, BLT_DEPT_CD, JBLV_CD, PSTN_CD, DEPT_NM, 'Y' AS EXT_USER " +
                "        FROM " +
                "            TBL_CO_EMP_BS_EXT CO_EXT " +
                "        LEFT JOIN " +
                "            TBL_CO_DEPT_BS_EXT CO_DEPT_EXT " +
                "        ON " +
                "            CO_EXT.BLT_DEPT_CD = CO_DEPT_EXT.DEPT_CD) " +
                "        CO_EMP " +
                "LEFT JOIN " +
                "    TBL_CO_EMP_REG CO_REG " +
                "ON " +
                "    CO_EMP.EMP_NO = CO_REG.EMP_NO " +
                "WHERE 1=1 "

            if (!req.body.type) {
                if (dept != '모든부서') {
                    userQuery += " AND CO_EMP.DEPT_NM = '" + dept + "'";
                }
                var auths = [scan, icr, approval, finalApproval, admin];
                var authColumns = ['CO_REG.AUTH_SCAN', 'CO_REG.AUTH_ICR', 'CO_REG.AUTH_APPROVAL', 'CO_REG.AUTH_FINAL_APPROVAL',
                    'CO_REG.AUTH_ADMIN'];
                var authCnt = 0;
                for (var i in auths) {
                    if (auths[i] == 'Y') {
                        authCnt++;
                        if (authCnt == 1) {
                            userQuery += " AND (" + authColumns[i] + " = '" + auths[i] + "'";
                        } else {
                            userQuery += " OR " + authColumns[i] + " = '" + auths[i] + "'";
                        }
                    }
                }
                if (authCnt > 0) userQuery += ' )';
            }

            userQuery += "ORDER BY EXT_USER, DEPT_NM, EMP_NM";
            result = await conn.execute(userQuery);
            if (result.rows.length > 0) {
                return done(null, result.rows);
            } else {
                return done(null, []);
            }
            
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
};

// docTopType 추가
exports.insertDocToptype = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        
        try {
            conn = await oracledb.getConnection(dbConfig);
            let insertQuery = "insert into tbl_icr_doc_toptype(seqnum, engnm, kornm, userid) values(seq_icr_doc_toptype.nextval, :engnm, :kornm, :userId)";
            await conn.execute(insertQuery, req);

            let selectQuery = "select max(seqnum) as doctoptype from tbl_icr_doc_toptype where userid = :userid";
            let result = await conn.execute(selectQuery, [req[2]]);
            
            return done(null, result.rows[0].DOCTOPTYPE);
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
};

// docTopType 검색
exports.selectDocTopType = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let query = "select seqnum, engnm, kornm from tbl_icr_doc_toptype where useyn='Y' and userid = :userid order by kornm";
            result = await conn.execute(query, req);

            return done(null, result.rows);
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
};

// tbl_icr_label_def 검색
exports.selectDocLabelDefList = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		let result;

		try {
			conn = await oracledb.getConnection(dbConfig);
			let query = "select seqnum, docid, kornm, engnm, labeltype, amount, valid, essentialval from tbl_icr_label_def where status = 1 and docid = :docid order by 1";
			result = await conn.execute(query, req);
			
			return done(null, result.rows);
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
};

// tbl_icr_label_def 추가
exports.isnertDocList = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		let result;

		try {
			let docToptype = req.docToptype;
			let insertList = req.insertList;
			conn = await oracledb.getConnection(dbConfig);
			for (var i = 0; i < insertList.length; i++) {
				let param = [docToptype, insertList[i].korNm, insertList[i].engNm, insertList[i].labelType, insertList[i].amount, insertList[i].valid, insertList[i].essentialVal];
				let query = "insert into tbl_icr_label_def(seqnum, docid, kornm, engnm, labeltype, amount, valid, essentialval) values(seq_icr_label_def.nextval, :docid, :kornm, :engnm, :labeltype, :amount, :valid, :essentialVal)";
				result = await conn.execute(query, param);
			}

			return done(null, null);
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
};

// tbl_icr_label_def 수정
exports.updateDocList = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		let result;

		try {
			let changeList = req.changeList;
			conn = await oracledb.getConnection(dbConfig);
			for (var i = 0; i < changeList.length; i++) {
				let param = [changeList[i].korNm, changeList[i].engNm, changeList[i].labelType, changeList[i].amount, changeList[i].valid, changeList[i].essentialVal, changeList[i].seqNum];
				let query = "update tbl_icr_label_def set kornm = :kornm, engnm = :engnm, labeltype = :labeltype, amount = :amount, valid = :valid, essentialval = :essentialVal where seqnum = :seqnum";
				result = await conn.execute(query, param);
			}

			return done(null, null);
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
};

// tbl_icr_label_def 삭제
exports.deleteDocList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            let deleteList = req.deleteList;
            conn = await oracledb.getConnection(dbConfig);
            
            let inQuery = "(";
            for(var i = 0; i < deleteList.length; i++) {
                inQuery += deleteList[i] + ",";
            }
            inQuery = inQuery.substring(0, inQuery.length -1);
            inQuery += ")";

            let query = "update tbl_icr_label_def set status = 0 where seqnum in " + inQuery;
            result = await conn.execute(query, []);

            return done(null, null);
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
};

// tbl_batch_po_answer_data 추가
exports.insertExcelAnswerData = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;

        try {
            let insertList = req.dataResult;
            let docId = req.docId;
            conn = await oracledb.getConnection(dbConfig);

            for(var i = 0; i < insertList.length; i++) {
                let filename = insertList[i].splice(0, 1)[0];
                insertList[i].splice(0, 1);
                let answerData = JSON.stringify(insertList[i]);
                let param = [docId, filename, answerData];
                let query = "insert into tbl_batch_po_answer_data(seq, docid, filename, answerdata) values(seq_batch_po_answer_data.nextval, :docId, :fileName, :answerData)";
                result = await conn.execute(query, param);
            }
 
            return done(null, null);
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
};

function getConvertDate() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = (today.getMonth() + 1 < 10) ? '0' + (today.getMonth() + 1) : today.getMonth() + 1;
    var dd = today.getDate();
    var hh = (today.getHours() < 10) ? '0' + today.getHours() : today.getHours();
    var minute = (today.getMinutes() < 10) ? '0' + today.getMinutes() : today.getMinutes();
    var ss = (today.getSeconds() < 10) ? '0' + today.getSeconds() : today.getSeconds();
    var mss = (today.getMilliseconds() < 100) ? ((today.getMilliseconds() < 10) ? '00' + today.getMilliseconds() : '0' + today.getMilliseconds()) : today.getMilliseconds();

    return '' + yyyy + mm + dd + hh + minute + ss + mss;
}

exports.selectProcessCountList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = `select to_char(REGDATE, 'YYYYMM') PROCESSDATE, count(REGDATE) DATECNT
                           from TBL_BATCH_LEARN_LIST
                          where to_char(REGDATE, 'YYYYMM')
                        between (select to_char(add_months(MAX(REGDATE), -6), 'YYYYMM') 
                                   from TBL_BATCH_LEARN_LIST) and 
                                (select to_char(MAX(REGDATE), 'YYYYMM') 
                                   from TBL_BATCH_LEARN_LIST)
                       group by to_char(REGDATE, 'YYYYMM')
                       order by to_char(REGDATE, 'YYYYMM')`;
            let resAnswerFile = await conn.execute(query);
            return done(null, resAnswerFile.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectProcessCount = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = `select status, count(status) statusCnt
                           from tbl_batch_learn_list
                       group by status`;
            let resAnswerFile = await conn.execute(query);
            return done(null, resAnswerFile.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectProcessDocCountList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = `SELECT * FROM ( 
                            SELECT TO_CHAR(REGDATE, 'MM') AS MONTH_VALUE, COUNT(*) AS COUNT_VALUE 
                              FROM TBL_BATCH_LEARN_LIST 
                             WHERE 1=1 
                             --AND TO_CHAR(REGDATE, 'YYYYMMDD') <= :endDate 
                            GROUP BY TO_CHAR(REGDATE, 'MM') 
                            ORDER BY TO_CHAR(REGDATE, 'MM') DESC) 
                          WHERE ROWNUM <=5`; 
            let resDocCount = await conn.execute(query);
            //let resAnswerFile = await conn.execute(query, [req.body.]);
            return done(null, resDocCount.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.rollbackTraining = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let param;
        let modifyYYMMDD = req.modifyYYMMDD;
        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = 'delete from TBL_BATCH_COLUMN_MAPPING_TRAIN where REGDATE < :modifyYYMMDD';
            param = [modifyYYMMDD];
            await conn.execute(query, param);
            return done(null, null);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectDocTopTypeList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = `SELECT SEQNUM, NVL(KORNM,'NONE') AS KORNM, USEYN, NVL(USERID,'NONE') AS USERID, NVL(ENGNM,'NONE') AS ENGNM 
                           FROM TBL_ICR_DOC_TOPTYPE`; 
            let resDocCount = await conn.execute(query);
            //let resAnswerFile = await conn.execute(query, [req.body.]);
            return done(null, resDocCount.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};
exports.selectDocStatus = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let param;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = 'select doctoptype ,count(*) as count, engnm from tbl_batch_learn_list a, TBL_ICR_DOC_TOPTYPE b where a.doctoptype = b.seqnum group by doctoptype, engnm';
            var result = await conn.execute(query);
            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

exports.selectDocName = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let param;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var query = 'select * from TBL_DOCUMENT_CATEGORY where doctype = :doctype';
            param = req;
            var result = await conn.execute(query, [param]);
            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};


exports.selectDocTypeList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let param;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = 'select * from TBL_DOCUMENT_CATEGORY where doctoptype = :doctoptype';
            param = req;
            var result = await conn.execute(query, param);
            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};


//PKS 

exports.selectRefindDocTopTypeList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);          
            var query = 'SELECT DATA, DOCTYPE, DOCTOPTYPE, SENTENCELENGTH FROM TBL_DOCUMENT_SENTENCE';
            let result = await conn.execute(query);
            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            console.log(err);
            return done(null, "error");
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
};

// tbl_icr_label_def 검색
exports.selectDocIdLabelDefList = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		
		try {
			conn = await oracledb.getConnection(dbConfig);
            let query = 'select SEQNUM, DOCID, KORNM, ENGNM, LABELTYPE, AMOUNT, VALID, STATUS, ESSENTIALVAL from tbl_icr_label_def where docid = :docid ';
            //console.log(req);
			let result = await conn.execute(query, req);
			
			return done(null, result.rows);
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
};

exports.selectLabelTrainDataList = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		
		try {
			conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT OCR_TEXT, LOCATION_X, LOCATION_Y, CLASS FROM TBL_NEW_BATCH_LABEL_MAPPING WHERE DOCTYPE =:DOCTYPE ";
            //console.log("DOCTYPE : "+req);
			let result = await conn.execute(query,req);
            //console.log("result.rows");
            //console.log(result.rows);
			return done(null, result.rows);
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
};

exports.selectTrainDataList = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		
		try {
			conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT CLASS, DOCTYPE, OCR_TEXT, OCR_TEXT_X, OCR_TEXT_Y, AMOUNT FROM TBL_NEW_BATCH_COLUMN_MAPPING A,"
                      +  "TBL_ICR_LABEL_DEF B WHERE A.CLASS = B.SEQNUM AND DOCTYPE = '" + req + "' ";
            //console.log("DOCTYPE : "+req);
			let result = await conn.execute(query);
            //console.log("selectTrainDataList.rows");
            //console.log(result.rows);
			return done(null, result.rows);
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
};

exports.selectIcrSymspell = function (req, done) {
	return new Promise(async function (resolve, reject) {
		let conn;
		
		try {
			conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT KEYWORD, FREQUENCY, ICRWORD FROM TBL_ICR_SYMSPELL WHERE DOCTOPTYPE = '"+req+"'  ";
			let result = await conn.execute(query);
			return done(null, result.rows);
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
};

exports.insertPredLabelMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            /* CASE
            1. unknown -> label : label mapping table insert
            2. entry -> label : entry mapping table status 1 update, label mapping table insert (보류)
            */
            conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT DOCTYPE, LOCATION, OCRTEXT FROM TBL_PRED_ENTRY_MAPPING WHERE STATUS = '0'";
            let result = await conn.execute(query);
            let entryQuery = "UPDATE TBL_PRED_ENTRY_MAPPING SET STATUS = '1' WHERE docType = :docType and location = :location and ocrText = :ocrText";
            let selectQuery = "SELECT SEQNUM FROM TBL_PRED_LABEL_MAPPING WHERE docType = :docType and location = :location and ocrText = :ocrText " +
                "and class = :cls and leftText = :leftText and downtext = :downText";

            query = "INSERT INTO TBL_PRED_LABEL_MAPPING(SEQNUM, DOCTYPE, LOCATION, OCRTEXT, CLASS, REGDATE, LEFTTEXT, DOWNTEXT, STATUS) VALUES " +
                "(SEQ_PRED_LABEL_MAPPING.NEXTVAL, :docType, :location, :ocrText, :class, sysdate, :leftText, :downText, '0')";
            for (var i in req) {
                /*
                for (var j in result.rows) {
                    if (req[i].docType == result.rows[j].DOCTYPE && req[i].location == result.rows[j].LOCATION && req[i].ocrText == result.rows[j].OCRTEXT) {
                        await conn.execute(entryQuery, [req[i].docType, req[i].location, req[i].ocrText]);
                        break;
                    }
                }
                */
                var selectResult = await conn.execute(selectQuery, [req[i].docType, req[i].location, req[i].ocrText, req[i].class, req[i].leftText, req[i].downText]);
                if (selectResult.rows.length == 0) {
                    await conn.execute(query, [req[i].docType, req[i].location, req[i].ocrText, req[i].class, req[i].leftText, req[i].downText]);
                }
            }
            return done(null, null);
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
};

exports.insertPredEntryMapping = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            /* CASE
            1. unknown -> entry : label mapping table insert
            2. label -> entry : label mapping table status 1 update, entry mapping table insert (보류)
            */
            conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT DOCTYPE, LOCATION, OCRTEXT FROM TBL_PRED_LABEL_MAPPING WHERE STATUS = '0'";
            let result = await conn.execute(query);
            let labelQuery = "UPDATE TBL_PRED_LABEL_MAPPING SET STATUS = '1' WHERE docType = :docType and location = :location and ocrText = :ocrText";
            let selectQuery = "SELECT SEQNUM FROM TBL_PRED_ENTRY_MAPPING WHERE docType = :docType and location = :location and ocrText = :ocrText " +
                "and class = :cls and leftLabel = :leftLabel and leftLocX = :leftLocX and leftLocY = :leftLocY " +
                "and upLabel = :upLabel and upLocX = :upLocX and upLocY = :upLocY " +
                "and diagonalLabel = :diagonalLabel and diagonalLocX = :diagonalLocX and diagonalLocY = :diagonalLocY";

            query = "INSERT INTO TBL_PRED_ENTRY_MAPPING(SEQNUM, DOCTYPE, LOCATION, OCRTEXT" +
                ", CLASS, REGDATE, LEFTLABEL, LEFTLOCX, LEFTLOCY, UPLABEL, UPLOCX, UPLOCY" +
                ", DIAGONALLABEL, DIAGONALLOCX, DIAGONALLOCY, STATUS) VALUES " +
                "(SEQ_PRED_ENTRY_MAPPING.NEXTVAL, :docType, :location, :ocrText, :class, sysdate, :leftLabel, :leftLocX, :leftLocY" +
                ", :upLabel, :upLocX, :upLocY, :diagonalLabel, :diagonalLocX, :diagonalLocY, '0')";
            for (var i in req) {
                /*
                for (var j in result.rows) {
                    if (req[i].docType == result.rows[j].DOCTYPE && req[i].location == result.rows[j].LOCATION && req[i].ocrText == result.rows[j].OCRTEXT) {
                        await conn.execute(labelQuery, [req[i].docType, req[i].location, req[i].ocrText]);
                        break;
                    }
                }
                */
                var selectResult = await conn.execute(selectQuery, [req[i].docType, req[i].location, req[i].ocrText, req[i].class,
                    req[i].leftLabel, req[i].leftLocX, req[i].leftLocY, req[i].upLabel, req[i].upLocX, req[i].upLocY,
                    req[i].diagonalLabel, req[i].diagonalLocX, req[i].diagonalLocY]);
                if (selectResult.rows.length == 0) {
                    await conn.execute(query, [req[i].docType, req[i].location, req[i].ocrText, req[i].class,
                    req[i].leftLabel, req[i].leftLocX, req[i].leftLocY, req[i].upLabel, req[i].upLocX, req[i].upLocY,
                    req[i].diagonalLabel, req[i].diagonalLocX, req[i].diagonalLocY]);
                }
            }
            return done(null, null);
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
};

exports.selectFtpFileList = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let query = "SELECT FILENAME FROM TBL_FTP_FILE_LIST WHERE (0,FILENAME) IN ( ";
            for (var i in req) {
                query += '(0,\'' + req[i] + '\'), ';
            }
            query = query.slice(0, -2);
            query += ' )';

            let result = await conn.execute(query);
            return done(null, result.rows);
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
};

exports.insertFtpFileList = function (path, req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            let query = "INSERT INTO TBL_FTP_FILE_LIST(SEQ, FILEPATH,FILENAME) VALUES (SEQ_FTP_FILE_LIST.NEXTVAL, :filePath, :fileName )";
            for (var i in req) await conn.execute(query, [path, req[i]]);

            return done(null, null);
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
};

exports.updateFtpFileList = function (fileNm, fileSeq, cdSite, bigo, ivgtrNoSral, ivgtrDate, ivgtrName, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);


             console.log(fileNm+" || "+fileSeq+" || "+bigo) ;

            // let query = "INSERT INTO TBL_FTP_FILE_LIST VALUES (SEQ_FTP_FILE_LIST.NEXTVAL, :filePath, :fileName, 'N')";
            //let query = "UPDATE TBL_FTP_FILE_LIST SET RETURNFLAG = 'Y', RETURNTIME = sysdate, ETC = '"+bigo+"' WHERE SEQ = '"+fileSeq+"' AND FILENAME = '"+fileNm+"' ";
            let query = "UPDATE TBL_FTP_FILE_LIST SET RETURNFLAG = 'Y', RETURNTIME = sysdate, ETC = '"+bigo+"', IVGTRNOSRAL = '"+ivgtrNoSral+"', IVGTRDATE = '"+ivgtrDate+"', "
            + "IVGTRNAME = '"+ivgtrName+"' WHERE API_SEQ = '"+fileSeq+"' AND API_SITE_CD = '"+cdSite+"' AND FILENAME = '"+fileNm+"' ";
            // for (var i in req) 
            let result = await conn.execute(query);
            console.log(result);
            console.log(result.rowsAffected);
            return done(null, result.rowsAffected);
        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                    return done(null, e);
                }
            }
        }
    });
};

exports.updateFtpFileListErrMsg = function (fileSeq, cdSite, errMsg, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            let query = "UPDATE TBL_FTP_FILE_LIST SET ERRMSG = '"+errMsg+"' WHERE API_SEQ = '"+fileSeq+"' AND API_SITE_CD = '"+cdSite+"' ";
            let result = await conn.execute(query);
            return done(null, result.rowsAffected);
        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                    return done(null, e);
                }
            }
        }
    });
};

exports.getFtpFileList = function (fileNm, fileSeq, cdSite, done) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);


            console.log(fileNm+" || "+fileSeq);

            // let query = "INSERT INTO TBL_FTP_FILE_LIST VALUES (SEQ_FTP_FILE_LIST.NEXTVAL, :filePath, :fileName, 'N')";
            //let query = "SELECT SEQ,FILENAME, FILEPATH FROM TBL_FTP_FILE_LIST  WHERE SEQ = '"+fileSeq+"' AND FILENAME = '"+fileNm+"' ";
            let query = "SELECT SEQ,FILENAME, FILEPATH FROM TBL_FTP_FILE_LIST  WHERE API_SEQ = '"+fileSeq+"' AND API_SITE_CD = '"+cdSite+"' AND FILENAME = '"+fileNm+"' ";
            // for (var i in req) 
            let result = await conn.execute(query);
            console.log(result);
            return done(null, result.rows);
        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                    return done(null, e);
                }
            }
        }
    });
};

exports.selectBatchPoMlExport = function (req, pagingCount, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            let basicQuery = "" +
            "SELECT " +
                "PME.FILENAME, TO_CHAR(FFL.AUTOSENDTIME,'YYYY-MM-DD HH24:MI:SS') AS AUTOSENDTIME, PME.EXPORTDATA, FFL.SEQ, NVL(FFL.ETC, ' ') AS ETC, FFL.API_SEQ API_SEQ, FFL.IVGTRNOSRAL IVGTRNOSRAL " +
            "FROM " +
                "TBL_BATCH_PO_ML_EXPORT PME, " +
                "(SELECT " +
                    "SEQ, FILEPATH || FILENAME AS FILENAME, AUTOSENDFLAG, AUTOSENDTIME, " +
                    "AUTOTRAINFLAG, AUTOTRAINTIME, MANUALSENDFLAG, MANUALSENDTIME, " +
                    "MANUALTRAINFLAG, MANUALTRAINTIME, RETURNFLAG, RETURNTIME, ETC, API_SEQ, API_SITE_CD, IVGTRNOSRAL " +
                "FROM " +
                    "TBL_FTP_FILE_LIST) FFL " +
                "WHERE PME.FILENAME = FFL.FILENAME " +
                "AND PME.DOCID = :docId " +
                "AND CAST(FFL.AUTOSENDTIME as Date) >= TO_DATE(:startDate, 'YYMMDDHH24MISS') " +
                "AND CAST(FFL.AUTOSENDTIME as Date) <= TO_DATE(:endDate, 'YYMMDDHH24MISS') " +
                "AND RETURNFLAG = :retrinFlag " +
                "ORDER BY FFL.SEQ DESC";

            let TotCntQuery = "" +
                "SELECT " +
                "COUNT(D.SEQ) AS CNT " +
                "FROM " +
                "( " + basicQuery + " ) D ";
            let query = "" +
            "SELECT " +
                "R.* " +
            "FROM " +
                "(SELECT " + 
                    "ROWNUM AS RNUM, D.* " +
                "FROM " +
                    "( " + basicQuery + " ) D " +
                ") R " +
            "WHERE R.RNUM BETWEEN " + (((pagingCount - 1) * 30) + 1) + " AND " + (pagingCount * 30);

            cntResult = await conn.execute(TotCntQuery, req);
            result = await conn.execute(query, req);
            if (cntResult.rows[0].CNT != 0 && result.rows.length != 0) {
                return done(null, [cntResult.rows[0].CNT, result.rows]);
            } else {
                return done(null, [0, []]);
            }
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
};

exports.selectSingleBatchPoMlExport = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var query = "" +
                "SELECT " +
                    "IDT.ENGNM, FFL.SEQ, PME.FILENAME, TO_CHAR(FFL.AUTOSENDTIME, 'YYYYMMDDHH24MISS') AS AUTOSENDTIME, PME.EXPORTDATA, FFL.API_SEQ, FFL.API_SITE_CD, FFL.IVGTRNOSRAL IVGTRNOSRAL " +
                "FROM " +
                    "TBL_ICR_DOC_TOPTYPE IDT, " +
                    "TBL_BATCH_PO_ML_EXPORT PME, " +
                    "(SELECT  " +
                        "SEQ, FILEPATH || FILENAME AS FILENAME, AUTOSENDFLAG, AUTOSENDTIME, " +
                        "AUTOTRAINFLAG, AUTOTRAINTIME, MANUALSENDFLAG, MANUALSENDTIME, " +
                        "MANUALTRAINFLAG, MANUALTRAINTIME, RETURNFLAG, RETURNTIME, ETC, API_SEQ, API_SITE_CD, IVGTRNOSRAL " +
                    "FROM " +
                    "TBL_FTP_FILE_LIST) FFL " +
                "WHERE PME.FILENAME = FFL.FILENAME " +
                "AND IDT.SEQNUM = PME.DOCID " +
                "AND FFL.FILENAME =:filePath ";

            result = await conn.execute(query, [req]);
            return done(null, result.rows[0]);
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
};

exports.selectSingleBatchPoMlExportFromFilePath = function (req, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var query = "SELECT EXPORTDATA FROM TBL_BATCH_PO_ML_EXPORT WHERE FILENAME =:filePath";

            result = await conn.execute(query, [req]);
            return done(null, result.rows[0].EXPORTDATA);
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
};
exports.updateBatchPoMlExport = function (filePath, saveData, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var query = "UPDATE TBL_BATCH_PO_ML_EXPORT SET EXPORTDATA = :exportData WHERE FILENAME =:filePath";

            await conn.execute(query, [saveData, filePath]);
            return done(null, null);
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
};

exports.insertIcrSymspell = function (typoData, docTopType, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var updSymspell = "UPDATE TBL_ICR_SYMSPELL SET KEYWORD = :updText where ICRWORD = :orgText";
            var insSymspell = "INSERT INTO TBL_ICR_SYMSPELL VALUES(SEQ_ICR_SYMSPELL.NEXTVAL, :updText, 1, :orgText, :docTopType)";
            var selSymspell = "SELECT ICRWORD FROM TBL_ICR_SYMSPELL WHERE DOCTOPTYPE = :docTopType";
            var resSelSymspell = await conn.execute(selSymspell, [docTopType]);

            for (var i = 0; i < typoData.length; i++) {
                var bool = true;

                for (var j = 0; j < resSelSymspell.rows.length; j++) {
                    if (typoData[i].updText == resSelSymspell.rows[j]["ICRWORD"]) {
                        await conn.execute(updSymspell, [typoData[i].updText, typoData[i].orgText]);
                        bool = false;
                        break;
                    }
                }

                if (bool) {
                    await conn.execute(insSymspell, [typoData[i].updText, typoData[i].orgText, docTopType]);
                }
            }            

            return done(null, null);
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
};

exports.insertNumTypo = function (numTypoData, docTopType, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);
            var insRemicon = "INSERT INTO TBL_REMICON_INVOICE_TYPO VALUES(SEQ_REMICON_INVOICE_TYPO.NEXTVAL, :SupplyCompany, :CompanyRegistrationNo,"
                + ":DeliveryLoc, :RemiconTruckNo, :DepartureTime, :DeliveryVol, :TotalDeliveryVol, :ConcreteType, :MaxCoarseAggregate, :NominalStrength,"
                + ":Slump, :CementType, :RemiconTruckOrderNo, :ReceiveCompany, :TargetLabel, :TargetValue)";
            var insGeneral = "INSERT INTO TBL_GENERAL_INVOICE_TYPO VALUES(SEQ_GENERAL_INVOICE_TYPO.NEXTVAL, :SupplyCompany, :ProductName, :Unit, :Quantity,"
                + ":ReceiveCompany, :FieldName, :Standard, :DeliveryDate, :TargetLabel, :TargetValue)";
            var insRebar = "INSERT INTO TBL_REBAR_INVOICE_TYPO VALUES(SEQ_REBAR_INVOICE_TYPO.NEXTVAL, :SupplyCompany, :ProcessName, :DeliveryDate, :ArrivalDate,"
                + ":InvoiceNumber, :TrukNumber, :ManufactureWeight, :ExtraCharge, :ExtraChargeWeight, :Coupler, :RebarGyung, :DeliveryOrderNo, :TargetLabel, :TargetValue)";            
            
            if (docTopType == "58") {
                for ( var i = 0; i < numTypoData.length; i++) {
                    var updNum = 1;
                    var condition = [];
                    for ( var j = 0; j < numTypoData[i].length; j++) {
                        var selRemicon = "SELECT * FROM TBL_REMICON_INVOICE_TYPO WHERE 1=1 ";

                        if (numTypoData[i][j]["updText"] != undefined) {
                            if(j == 5) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["updText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], numTypoData[i][12]["orgText"], numTypoData[i][13]["orgText"], "1", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];   
                            } else if (j == 6) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["updText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], numTypoData[i][12]["orgText"], numTypoData[i][13]["orgText"], "2", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];
                            } else if (j == 8) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["updText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], numTypoData[i][12]["orgText"], numTypoData[i][13]["orgText"], "3", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];
                            } else if (j == 9) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["updText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], numTypoData[i][12]["orgText"], numTypoData[i][13]["orgText"], "4", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];
                            } else if (j == 10) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["updText"], numTypoData[i][11]["orgText"], numTypoData[i][12]["orgText"], numTypoData[i][13]["orgText"], "5", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];
                            } else if (j == 12) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], numTypoData[i][12]["updText"], numTypoData[i][13]["orgText"], "6", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];
                            }

                            for (var k = 0; k < condition.length; k++) {
                                if(k == 0 && condition[k] != "") {
                                    selRemicon += " AND SUPPLYCOMPANY = '" + condition[k] + "'";
                                } else if(k == 1 && condition[k] != "") {
                                    selRemicon += " AND COMPANYREGISTRATIONNO = '" + condition[k] + "'";
                                } else if(k == 2 && condition[k] != "") {
                                    selRemicon += " AND DELIVERYLOC = '" + condition[k] + "'";
                                } else if(k == 3 && condition[k] != "") {
                                    selRemicon += " AND REMICONTRUCKNO = '" + condition[k] + "'";
                                } else if(k == 4 && condition[k] != "") {
                                    selRemicon += " AND DEPARTURETIME = '" + condition[k] + "'";
                                } else if(k == 5 && condition[k] != "") {
                                    selRemicon += " AND DELIVERYVOL = '" + condition[k] + "'";
                                } else if(k == 6 && condition[k] != "") {
                                    selRemicon += " AND TOTALDELIVERYVOL = '" + condition[k] + "'";
                                } else if(k == 7 && condition[k] != "") {
                                    selRemicon += " AND CONCRETETYPE = '" + condition[k] + "'";
                                } else if(k == 8 && condition[k] != "") {
                                    selRemicon += " AND MAXCOARSEAGGREGATE = '" + condition[k] + "'";
                                } else if(k == 9 && condition[k] != "") {
                                    selRemicon += " AND NOMINALSTRENGTH = '" + condition[k] + "'";
                                } else if(k == 10 && condition[k] != "") {
                                    selRemicon += " AND SLUMP = '" + condition[k] + "'";
                                } else if(k == 11 && condition[k] != "") {
                                    selRemicon += " AND CEMENTTYPE = '" + condition[k] + "'";
                                } else if(k == 12 && condition[k] != "") {
                                    selRemicon += " AND REMICONTRUCKORDERNO = '" + condition[k] + "'";
                                } else if(k == 13 && condition[k] != "") {
                                    selRemicon += " AND RECEIVECOMPANY = '" + condition[k] + "'";
                                } else if(k == 14 && condition[k] != "") {
                                    selRemicon += " AND TARGETLABEL = '" + condition[k] + "'";
                                } else if(k == 15 && condition[k] != "") {
                                    selRemicon += " AND TARGETVALUE = '" + condition[k] + "'";
                                }
                            }
        
                            var resSelRemicon = await conn.execute(selRemicon);
                            
                            if ( resSelRemicon.rows.length == 0) {
                                var resInsRemicon = await conn.execute(insRemicon, condition);
                            }
                        }

                    }

                }

            } else if (docTopType == "51" || docTopType == "59") {
                for ( var i = 0; i < numTypoData.length; i++) {
                    var updNum = 1;
                    var condition = [];
                    for ( var j = 0; j < numTypoData[i].length; j++) {
                        var selGeneral = "SELECT * FROM TBL_GENERAL_INVOICE_TYPO WHERE 1=1 ";
                        if (numTypoData[i][j]["updText"] != undefined) {
                            if(j == 3) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["updText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"],  "2", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"]];
                            } else if (j == 2) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["updText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"],  "1", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"]];
                            }
                            
                            for (var k = 0; k < condition.length; k++) {
                                if(k == 0 && condition[k] != "") {
                                    selGeneral += " AND SUPPLYCOMPANY = '" + condition[k] + "'";
                                } else if(k == 1 && condition[k] != "") {
                                    selGeneral += " AND PRODUCTNAME = '" + condition[k] + "'";
                                } else if(k == 2 && condition[k] != "") {
                                    selGeneral += " AND UNIT = '" + condition[k] + "'";
                                } else if(k == 3 && condition[k] != "") {
                                    selGeneral += " AND QUANTITY = '" + condition[k] + "'";
                                } else if(k == 4 && condition[k] != "") {
                                    selGeneral += " AND RECEIVECOMPANY = '" + condition[k] + "'";
                                } else if(k == 5 && condition[k] != "") {
                                    selGeneral += " AND FIELDNAME = '" + condition[k] + "'";
                                } else if(k == 6 && condition[k] != "") {
                                    selGeneral += " AND STANDARD = '" + condition[k] + "'";
                                } else if(k == 7 && condition[k] != "") {
                                    selGeneral += " AND DELIVERYDATE = '" + condition[k] + "'";
                                } else if(k == 8 && condition[k] != "") {
                                    selGeneral += " AND TARGETLABEL = '" + condition[k] + "'";
                                } else if(k == 9 && condition[k] != "") {
                                    selGeneral += " AND TARGETVALUE = '" + condition[k] + "'";
                                }
                            }
        
                            var resSelGeneral = await conn.execute(selGeneral);
                            
                            if ( resSelGeneral.rows.length == 0) {
                                var resInsGeneral = await conn.execute(insGeneral, condition);
                            }
                        }
                        
                    }

                    
                }
                
            } else if (docTopType == "61") {
                for ( var i = 0; i < numTypoData.length; i++) {
                    var updNum = 1;
                    var condition = [];
                    for ( var j = 0; j < numTypoData[i].length; j++) {
                        var selRebar = "SELECT * FROM TBL_REBAR_INVOICE_TYPO WHERE 1=1 ";
                        if (numTypoData[i][j]["updText"] != undefined) {
                            if(j == 6) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["updText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], "1", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"] ];
                            }else if(j == 7) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["updText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], "2", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"]];
                            }else if(j == 8) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["updText"], numTypoData[i][9]["orgText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], "3", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"]];
                            }else if(j == 9) {
                                condition = [numTypoData[i][0]["orgText"], numTypoData[i][1]["orgText"], numTypoData[i][2]["orgText"], numTypoData[i][3]["orgText"], numTypoData[i][4]["orgText"],
                                                numTypoData[i][5]["orgText"], numTypoData[i][6]["orgText"], numTypoData[i][7]["orgText"], numTypoData[i][8]["orgText"], numTypoData[i][9]["updText"],
                                                numTypoData[i][10]["orgText"], numTypoData[i][11]["orgText"], "4", numTypoData[i][j]["orgText"] == ""?"0":numTypoData[i][j]["orgText"]];
                            }
                            updNum += 1;

                            for (var k = 0; k < condition.length; k++) {
                                if(k == 0 && condition[k] != "") {
                                    selRebar += " AND SUPPLYCOMPANY = '" + condition[k] + "'";
                                } else if(k == 1 && condition[k] != "") {
                                    selRebar += " AND PROCESSNAME = '" + condition[k] + "'";
                                } else if(k == 2 && condition[k] != "") {
                                    selRebar += " AND DELIVERYDATE = '" + condition[k] + "'";
                                } else if(k == 3 && condition[k] != "") {
                                    selRebar += " AND ARRIVALDATE = '" + condition[k] + "'";
                                } else if(k == 4 && condition[k] != "") {
                                    selRebar += " AND INVOICENUMBER = '" + condition[k] + "'";
                                } else if(k == 5 && condition[k] != "") {
                                    selRebar += " AND TRUKNUMBER = '" + condition[k] + "'";
                                } else if(k == 6 && condition[k] != "") {
                                    selRebar += " AND MANUFACTUREWEIGHT = '" + condition[k] + "'";
                                } else if(k == 7 && condition[k] != "") {
                                    selRebar += " AND EXTRACHARGE = '" + condition[k] + "'";
                                } else if(k == 8 && condition[k] != "") {
                                    selRebar += " AND EXTRACHARGEWEIGHT = '" + condition[k] + "'";
                                } else if(k == 9 && condition[k] != "") {
                                    selRebar += " AND COUPLER = '" + condition[k] + "'";
                                } else if(k == 10 && condition[k] != "") {
                                    selRebar += " AND REBARGYUNG = '" + condition[k] + "'";
                                } else if(k == 11 && condition[k] != "") {
                                    selRebar += " AND DELIVERYORDERNO = '" + condition[k] + "'";
                                } else if(k == 12 && condition[k] != "") {
                                    selRebar += " AND TARGETLABEL = '" + condition[k] + "'";
                                } else if(k == 13 && condition[k] != "") {
                                    selRebar += " AND TARGETLABEL = '" + condition[k] + "'";
                                }
                            }
        
                            var resSelRebar = await conn.execute(selRebar);
                            
                            if ( resSelRebar.rows.length == 0) {
                                var resInsGeneral = await conn.execute(insRebar, condition);
                            }

                        }
                        
                    }

                }
            }
         
            return done(null, null);
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
};

exports.selectNumTypo = function (req, labelDef, done) {
    return new Promise(async function (resolve, reject) {
        let conn;
        let result;
        try {
            conn = await oracledb.getConnection(dbConfig);

            var selRemicon = "SELECT * FROM TBL_REMICON_INVOICE_TYPO WHERE 1=1 ";
            var selGeneral = "SELECT * FROM TBL_GENERAL_INVOICE_TYPO WHERE 1=1 ";
            var selRebar = "SELECT * FROM TBL_REBAR_INVOICE_TYPO WHERE 1=1 ";
            var docTopType = req.docCategory.DOCTOPTYPE;
            var updText = [];

            if (docTopType == "51") {
                var multiEntryInfo = getMultiLabelYLoc(req, labelDef);
                console.log("multiEntryInfo : " + multiEntryInfo);

                for (var i = 0; i < multiEntryInfo['maxNum']; i++) {
                    var generalObj = {"505":"N", "506":"N"};
                    var iLoc =  multiEntryInfo['maxLabel'][i]['location'].split(",");
                    var data = [];
                    for (var j = 0; j < req.data.length; j++) {
                        if (req.data[j]['entryLbl'] != undefined) {
                            for (var k = 0; k < labelDef.rows.length; k++) {
                                if (req.data[j]['entryLbl'] == labelDef.rows[k]['SEQNUM'] && labelDef.rows[k]['AMOUNT'] == 'single') {
                                    data.push(req.data[j]);
                                } else if (req.data[j]['entryLbl'] == labelDef.rows[k]['SEQNUM'] && labelDef.rows[k]['AMOUNT'] == 'multi'){
                                    var jLoc = req.data[j]['location'].split(",");
                                    if ( Math.abs(Number(iLoc[1]) - Number(jLoc[1])) < 20 ) {
                                        data.push(req.data[j]);
                                    }
                                }
                            }
                        }

                    }

                    var obj = {};
                    var location = "";
                    for (var k = 0; k < data.length; k++) {
                        var entryNum = data[k]['entryLbl'];

                        if(entryNum == "504" || entryNum == "505" || entryNum == "543") {
                            location = data[k]['location'].split(",");
                        }

                        if (obj[entryNum] == undefined) {
                            obj[entryNum] = data[k]['text'];
                        }else {
                            obj[entryNum] += data[k]['text'];
                        }
                    }
                    
                    for (var j = 0; j < data.length; j++) {
                        if (data[j]['entryLbl'] == "506") {
                            
                            for ( key in obj) {
                                if (key == "502") {
                                    selGeneral += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                } else if (key == "504") {
                                    selGeneral += " AND PRODUCTNAME = '" + obj[key] +"' ";
                                } else if (key == "505") {
                                    selGeneral += " AND UNIT = '" + obj[key] +"' ";
                                } else if (key == "540") {
                                    selGeneral += " AND RECEIVECOMPANY = '" + obj[key] +"' ";
                                } else if (key == "541") {
                                    selGeneral += " AND FIELDNAME = '" + obj[key] +"' ";
                                } else if (key == "543") {
                                    selGeneral += " AND STANDARD = '" + obj[key] +"' ";
                                } else if (key == "812") {
                                    selGeneral += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                }
                            }
                            selGeneral += " AND TARGETLABEL = '2' ";
                            selGeneral += " AND TARGETVALUE = '" + data[j]['text'] +"' ";

                            var resGeneral = await conn.execute(selGeneral);

                            if (resGeneral.rows.length > 0) {
                            
                                for ( var l = 0; l < req.data.length; l++) {
                                    if (req.data[l] == data[j]) {
                                        req.data[l]['text'] = resGeneral.rows[0]['QUANTITY'];
                                    }
                                }
                            }
                            generalObj["506"] = "Y";
                        } else if (data[j]['entryLbl'] == "505") {
                            for ( key in obj) {
                                if (key == "502") {
                                    selGeneral += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                } else if (key == "504") {
                                    selGeneral += " AND PRODUCTNAME = '" + obj[key] +"' ";
                                } else if (key == "506") {
                                    selGeneral += " AND QUANTITY = '" + obj[key] +"' ";
                                } else if (key == "540") {
                                    selGeneral += " AND RECEIVECOMPANY = '" + obj[key] +"' ";
                                } else if (key == "541") {
                                    selGeneral += " AND FIELDNAME = '" + obj[key] +"' ";
                                } else if (key == "543") {
                                    selGeneral += " AND STANDARD = '" + obj[key] +"' ";
                                } else if (key == "812") {
                                    selGeneral += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                }
                            }
                            selGeneral += " AND TARGETLABEL = '1' ";
                            selGeneral += " AND TARGETVALUE = '" + data[j]['text'] +"' ";

                            var resGeneral = await conn.execute(selGeneral);

                            if (resGeneral.rows.length > 0) {
                            
                                for ( var l = 0; l < req.data.length; l++) {
                                    if (req.data[l] == data[j]) {
                                        req.data[l]['text'] = resGeneral.rows[0]['UNIT'];
                                    }
                                }
                            }
                            generalObj["505"] = "Y";
                        }

                        selGeneral = "SELECT * FROM TBL_GENERAL_INVOICE_TYPO WHERE 1=1 ";
                    } 

                    for (generalKey in generalObj) {
                        if (generalObj[generalKey] == "N") {
                            if( generalKey == "505") {
                                for ( key in obj) {
                                    if (key == "502") {
                                        selGeneral += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "504") {
                                        selGeneral += " AND PRODUCTNAME = '" + obj[key] +"' ";
                                    } else if (key == "506") {
                                        selGeneral += " AND QUANTITY = '" + obj[key] +"' ";
                                    } else if (key == "540") {
                                        selGeneral += " AND RECEIVECOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "541") {
                                        selGeneral += " AND FIELDNAME = '" + obj[key] +"' ";
                                    } else if (key == "543") {
                                        selGeneral += " AND STANDARD = '" + obj[key] +"' ";
                                    } else if (key == "812") {
                                        selGeneral += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                    }
                                }
                                selGeneral += " AND TARGETLABEL = '1' ";
                                selGeneral += " AND TARGETVALUE = '0' ";
        
                                var resGeneral = await conn.execute(selGeneral);
        
                                if (resGeneral.rows.length > 0) {
                                    var insLoc = "10," + location[1] + "," + location[2] + "," + location[3];
                                    req.data.push({"location":insLoc, "text":resGeneral.rows[0]['UNIT'], "entryLbl":generalKey});
                                }
                            } else if( generalKey == "506" ) {
                                for ( key in obj) {
                                    if (key == "502") {
                                        selGeneral += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "504") {
                                        selGeneral += " AND PRODUCTNAME = '" + obj[key] +"' ";
                                    } else if (key == "505") {
                                        selGeneral += " AND UNIT = '" + obj[key] +"' ";
                                    } else if (key == "540") {
                                        selGeneral += " AND RECEIVECOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "541") {
                                        selGeneral += " AND FIELDNAME = '" + obj[key] +"' ";
                                    } else if (key == "543") {
                                        selGeneral += " AND STANDARD = '" + obj[key] +"' ";
                                    } else if (key == "812") {
                                        selGeneral += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                    }
                                }
                                selGeneral += " AND TARGETLABEL = '2' ";
                                selGeneral += " AND TARGETVALUE = '0' ";
        
                                var resGeneral = await conn.execute(selGeneral);
        
                                if (resGeneral.rows.length > 0) {
                                    var insLoc = "10," + location[1] + "," + location[2] + "," + location[3];
                                    req.data.push({"location":insLoc, "text":resGeneral.rows[0]['QUANTITY'], "entryLbl":generalKey});
                                }
                            }
                            selGeneral = "SELECT * FROM TBL_GENERAL_INVOICE_TYPO WHERE 1=1 ";
                        }
                    }
                }

            } else if (docTopType == "59") {
                for (var i = 0; i < req.data.length; i++) {
                    if (req.data[i]['entryLbl'] == '816') {
                        selGeneral += " AND SUPPLYCOMPANY = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '817') {
                        selGeneral += " AND PRODUCTNAME = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '818') {
                        selGeneral += " AND UNIT = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '820') {
                        selGeneral += " AND RECEIVECOMPANY = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '821') {
                        selGeneral += " AND FIELDNAME = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '822') {
                        selGeneral += " AND STANDARD = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '823') {
                        selGeneral += " AND DELIVERYDATE = '" + req.data[i]['text'] +"' ";
                    } else if (req.data[i]['entryLbl'] == '819') {
                        selGeneral += " AND TARGETLABEL = '1' ";
                        selGeneral += " AND TARGETVALUE = '" + req.data[i]['text'] +"' ";
                    }
                }

                var resGeneral = await conn.execute(selGeneral);

                if (resGeneral.rows.length > 0) {
                
                    for ( var l = 0; l < req.data.length; l++) {
                        if (req.data[l]['entryLbl'] == "819") {
                            req.data[l]['text'] = resGeneral.rows[0]['QUANTITY'];
                        }
                    }
                }


            } else if (docTopType == "58") {
                var remiconObj = {"767":"N","768":"N","770":"N","771":"N","772":"N","792":"N"};

                for (var i = 0; i < req.data.length; i++) {
                    if (req.data[i]['entryLbl'] == "760") {
                        selRemicon += " AND SUPPLYCOMPANY = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "761") {
                        selRemicon += " AND COMPANYREGISTRATIONNO = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "764") {
                        selRemicon += " AND DELIVERYLOC = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "765") {
                        selRemicon += " AND REMICONTRUCKNO = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "766") {
                        selRemicon += " AND DEPARTURETIME = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "769") {
                        selRemicon += " AND CONCRETETYPE = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "773") {
                        selRemicon += " AND CEMENTTYPE = '" + req.data[i]['text'] + "'";
                    } else if (req.data[i]['entryLbl'] == "852") {
                        selRemicon += " AND RECEIVECOMPANY = '" + req.data[i]['text'] + "'";
                    }
                }

                for (var i = 0; i < req.data.length; i++) {

                    //납풉용적
                    if ( req.data[i]['entryLbl'] == "767" ) {

                        for( var j = 0; j < req.data.length; j++) {
                            if(req.data[j]['entryLbl'] == "768") {
                                selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "770") {
                                selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "771") {
                                selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "772") {
                                selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "792") {
                                selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                            }
                        }

                        selRemicon += " AND TARGETLABEL = '1' ";
                        selRemicon += " AND TARGETVALUE = '" + req.data[i]['text'] + "'";

                        var resRemicon = await conn.execute(selRemicon);

                        if (resRemicon.rows.length > 0) {
                            var chgObj = {};
                            var location = req.data[i]['location'];
                            var chgText = resRemicon.rows[0]['DELIVERYVOL'];
                            chgObj[location] = chgText;
                            updText.push(chgObj);
                        }
                        
                        remiconObj["767"] = "Y";

                    //누계
                    } else if ( req.data[i]['entryLbl'] == "768" ) {

                        for( var j = 0; j < req.data.length; j++) {
                            if(req.data[j]['entryLbl'] == "767") {
                                selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "770") {
                                selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "771") {
                                selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "772") {
                                selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "792") {
                                selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                            }
                        }

                        selRemicon += " AND TARGETLABEL = '2' ";
                        selRemicon += " AND TARGETVALUE = '" + req.data[i]['text'] + "'";

                        var resRemicon = await conn.execute(selRemicon);

                        if (resRemicon.rows.length > 0) {
                            var chgObj = {};
                            var location = req.data[i]['location'];
                            var chgText = resRemicon.rows[0]['TOTALDELIVERYVOL'];
                            chgObj[location] = chgText;
                            updText.push(chgObj);
                        }

                        remiconObj["768"] = "Y";

                    //굵은골재 최대 치수
                    } else if ( req.data[i]['entryLbl'] == "770" ) {
                        for( var j = 0; j < req.data.length; j++) {
                            if(req.data[j]['entryLbl'] == "767") {
                                selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "768") {
                                selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "771") {
                                selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "772") {
                                selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "792") {
                                selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                            }
                        }

                        selRemicon += " AND TARGETLABEL = '3' ";
                        selRemicon += " AND TARGETVALUE = '" + req.data[i]['text'] + "'";

                        var resRemicon = await conn.execute(selRemicon);

                        if (resRemicon.rows.length > 0) {
                            var chgObj = {};
                            var location = req.data[i]['location'];
                            var chgText = resRemicon.rows[0]['MAXCOARSEAGGREGATE'];
                            chgObj[location] = chgText;
                            updText.push(chgObj);
                        }

                        remiconObj["770"] = "Y";
                    //호칭강도
                    } else if ( req.data[i]['entryLbl'] == "771" ) {
                        for( var j = 0; j < req.data.length; j++) {
                            if(req.data[j]['entryLbl'] == "767") {
                                selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "770") {
                                selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "768") {
                                selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "772") {
                                selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "792") {
                                selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                            }
                        }

                        selRemicon += " AND TARGETLABEL = '4' ";
                        selRemicon += " AND TARGETVALUE = '" + req.data[i]['text'] + "'";

                        var resRemicon = await conn.execute(selRemicon);

                        if (resRemicon.rows.length > 0) {
                            var chgObj = {};
                            var location = req.data[i]['location'];
                            var chgText = resRemicon.rows[0]['NOMINALSTRENGTH'];
                            chgObj[location] = chgText;
                            updText.push(chgObj);
                        }

                        remiconObj["771"] = "Y";
                    //슬럼프
                    } else if ( req.data[i]['entryLbl'] == "772" ) {
                        for( var j = 0; j < req.data.length; j++) {
                            if(req.data[j]['entryLbl'] == "767") {
                                selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "770") {
                                selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "771") {
                                selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "768") {
                                selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "792") {
                                selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                            }
                        }

                        selRemicon += " AND TARGETLABEL = '5' ";
                        selRemicon += " AND TARGETVALUE = '" + req.data[i]['text'] + "'";

                        var resRemicon = await conn.execute(selRemicon);

                        if (resRemicon.rows.length > 0) {
                            var chgObj = {};
                            var location = req.data[i]['location'];
                            var chgText = resRemicon.rows[0]['SLUMP'];
                            chgObj[location] = chgText;
                            updText.push(chgObj);
                        }
                        remiconObj["772"] = "Y";
                    //운반차순서
                    } else if ( req.data[i]['entryLbl'] == "792" ) {
                        for( var j = 0; j < req.data.length; j++) {
                            if(req.data[j]['entryLbl'] == "767") {
                                selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "770") {
                                selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "771") {
                                selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "772") {
                                selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                            } else if(req.data[j]['entryLbl'] == "768") {
                                selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                            }
                        }

                        selRemicon += " AND TARGETLABEL = '6' ";
                        selRemicon += " AND TARGETVALUE = '" + req.data[i]['text'] + "'";

                        var resRemicon = await conn.execute(selRemicon);

                        if (resRemicon.rows.length > 0) {
                            var chgObj = {};
                            var location = req.data[i]['location'];
                            var chgText = resRemicon.rows[0]['REMICONTRUCKORDERNO'];
                            chgObj[location] = chgText;
                            updText.push(chgObj);
                        }

                        remiconObj["792"] = "Y";
                    }

                    selRemicon = "SELECT * FROM TBL_REMICON_INVOICE_TYPO WHERE 1=1 ";
                }

                var insText = [];
                for (var key in remiconObj) {
                    if (remiconObj[key] == "N") {
                        if(key == "767") {
                            for( var j = 0; j < req.data.length; j++) {
                                if(req.data[j]['entryLbl'] == "768") {
                                    selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "770") {
                                    selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "771") {
                                    selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "772") {
                                    selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "792") {
                                    selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                                }
                            }
    
                            selRemicon += " AND TARGETLABEL = '1' ";
                            selRemicon += " AND TARGETVALUE = '0' ";
    
                            var resRemicon = await conn.execute(selRemicon);
    
                            if (resRemicon.rows.length > 0) {
                                insText.push({"location":"30,30,30,30", "text":resRemicon.rows[0]['DELIVERYVOL'], "entryLbl":key});
                            }
                        } else if(key == "768") {
                            for( var j = 0; j < req.data.length; j++) {
                                if(req.data[j]['entryLbl'] == "767") {
                                    selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "770") {
                                    selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "771") {
                                    selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "772") {
                                    selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "792") {
                                    selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                                }
                            }
    
                            selRemicon += " AND TARGETLABEL = '2' ";
                            selRemicon += " AND TARGETVALUE = '0' ";
    
                            var resRemicon = await conn.execute(selRemicon);
    
                            if (resRemicon.rows.length > 0) {
                                insText.push({"location":"30,30,30,30", "text":resRemicon.rows[0]['TOTALDELIVERYVOL'], "entryLbl":key});
                            }

                        } else if(key == "770") {
                            for( var j = 0; j < req.data.length; j++) {
                                if(req.data[j]['entryLbl'] == "767") {
                                    selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "768") {
                                    selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "771") {
                                    selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "772") {
                                    selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "792") {
                                    selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                                }
                            }
    
                            selRemicon += " AND TARGETLABEL = '3' ";
                            selRemicon += " AND TARGETVALUE = '0' ";
    
                            var resRemicon = await conn.execute(selRemicon);
    
                            if (resRemicon.rows.length > 0) {
                                insText.push({"location":"30,30,30,30", "text":resRemicon.rows[0]['MAXCOARSEAGGREGATE'], "entryLbl":key});
                            }

                        } else if(key == "771") {
                            for( var j = 0; j < req.data.length; j++) {
                                if(req.data[j]['entryLbl'] == "767") {
                                    selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "770") {
                                    selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "768") {
                                    selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "772") {
                                    selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "792") {
                                    selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                                }
                            }
    
                            selRemicon += " AND TARGETLABEL = '4' ";
                            selRemicon += " AND TARGETVALUE = '0'";
    
                            var resRemicon = await conn.execute(selRemicon);
    
                            if (resRemicon.rows.length > 0) {
                                insText.push({"location":"30,30,30,30", "text":resRemicon.rows[0]['NOMINALSTRENGTH'], "entryLbl":key});
                            }
                        } else if(key == "772") {
                            for( var j = 0; j < req.data.length; j++) {
                                if(req.data[j]['entryLbl'] == "767") {
                                    selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "770") {
                                    selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "771") {
                                    selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "768") {
                                    selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "792") {
                                    selRemicon += " AND REMICONTRUCKORDERNO = '" + req.data[j]['text'] + "'";
                                }
                            }
    
                            selRemicon += " AND TARGETLABEL = '5' ";
                            selRemicon += " AND TARGETVALUE = '0' ";
    
                            var resRemicon = await conn.execute(selRemicon);
    
                            if (resRemicon.rows.length > 0) {
                                insText.push({"location":"30,30,30,30", "text":resRemicon.rows[0]['SLUMP'], "entryLbl":key});
                            }
                        } else if(key == "792") {
                            for( var j = 0; j < req.data.length; j++) {
                                if(req.data[j]['entryLbl'] == "767") {
                                    selRemicon += " AND DELIVERYVOL = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "770") {
                                    selRemicon += " AND MAXCOARSEAGGREGATE = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "771") {
                                    selRemicon += " AND NOMINALSTRENGTH = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "772") {
                                    selRemicon += " AND SLUMP = '" + req.data[j]['text'] + "'";
                                } else if(req.data[j]['entryLbl'] == "768") {
                                    selRemicon += " AND TOTALDELIVERYVOL = '" + req.data[j]['text'] + "'";
                                }
                            }
    
                            selRemicon += " AND TARGETLABEL = '6' ";
                            selRemicon += " AND TARGETVALUE = '0' ";
    
                            var resRemicon = await conn.execute(selRemicon);
    
                            if (resRemicon.rows.length > 0) {
                                insText.push({"location":"30,30,30,30", "text":resRemicon.rows[0]['REMICONTRUCKORDERNO'], "entryLbl":key});
                            }
                        }

                        selRemicon = "SELECT * FROM TBL_REMICON_INVOICE_TYPO WHERE 1=1 ";

                    }
                }                

                for (var i = 0; i < req.data.length; i++) {
                    for ( var j = 0; j < updText.length; j++) {
                        if( req.data[i]['location'] == Object.keys(updText[j])[0]) {
                            req.data[i]['text'] = Object.values(updText[j])[0];
                        }
                    }
                }

                for (var i = 0; i < insText.length; i++) {
                    req.data.push(insText[i]);
                }


            } else if (docTopType == "61") {
                var multiEntryInfo = getMultiLabelYLoc(req, labelDef);
                console.log("multiEntryInfo : " + multiEntryInfo);

                for (var i = 0; i < multiEntryInfo['maxNum']; i++) {
                    var iLoc =  multiEntryInfo['maxLabel'][i]['location'].split(",");
                    var data = [];
                    for (var j = 0; j < req.data.length; j++) {
                        if (req.data[j]['entryLbl'] != undefined) {
                            for (var k = 0; k < labelDef.rows.length; k++) {
                                if (req.data[j]['entryLbl'] == labelDef.rows[k]['SEQNUM'] && labelDef.rows[k]['AMOUNT'] == 'single') {
                                    data.push(req.data[j]);
                                } else if (req.data[j]['entryLbl'] == labelDef.rows[k]['SEQNUM'] && labelDef.rows[k]['AMOUNT'] == 'multi'){
                                    var jLoc = req.data[j]['location'].split(",");
                                    if ( Math.abs(Number(iLoc[1]) - Number(jLoc[1])) < 20 ) {
                                        data.push(req.data[j]);
                                    }
                                }
                            }
                        }

                    }
                    
                    var obj = {};
                    var location = "";
                    for (var k = 0; k < data.length; k++) {
                        var entryNum = data[k]['entryLbl'];

                        if (entryNum == "877" || entryNum == "878" || entryNum == "879" || entryNum == "880"){
                            location = data[k]['location'];
                        }

                        if (obj[entryNum] == undefined) {
                            obj[entryNum] = data[k]['text'];
                        }else if (obj[entryNum].length == 0){
                            obj[entryNum] = data[k]['text'];
                        }
                        
                    }

                    var rebarObj = {"877":"N", "878":"N", "879":"N", "880":"N"};

                    for (var j = 0; j < data.length; j++) {

                        if (data[j]['entryLbl'] == "877") {

                            for ( key in obj) {
                                if (key == "853") {
                                    selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                } else if (key == "872") {
                                    selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                } else if (key == "873") {
                                    selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                } else if (key == "874") {
                                    selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                } else if (key == "875") {
                                    selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                } else if (key == "876") {
                                    selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                } else if (key == "878") {
                                    selRebar += " AND EXTRACHARGE = '" + obj[key] +"' ";
                                } else if (key == "879") {
                                    selRebar += " AND EXTRACHARGEWEIGHT = '" + obj[key] +"' ";
                                } else if (key == "880") {
                                    selRebar += " AND COUPLER = '" + obj[key] +"' ";
                                } else if (key == "883") {
                                    selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                } else if (key == "892") {
                                    selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                }
                            }
                            selRebar += " AND TARGETLABEL = '1' ";
                            selRebar += " AND TARGETVALUE = '" + data[j]['text'] +"' ";

                            var resRebar = await conn.execute(selRebar);

                            if (resRebar.rows.length > 0) {
                            
                                for ( var l = 0; l < req.data.length; l++) {
                                    if (req.data[l] == data[j]) {
                                        req.data[l]['text'] = resRebar.rows[0]['MANUFACTUREWEIGHT'];
                                    }
                                }
                            }

                            rebarObj["877"] = "Y";
                        } else if (data[j]['entryLbl'] == "878") {
                            for ( key in obj) {
                                if (key == "853") {
                                    selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                } else if (key == "872") {
                                    selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                } else if (key == "873") {
                                    selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                } else if (key == "874") {
                                    selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                } else if (key == "875") {
                                    selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                } else if (key == "876") {
                                    selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                } else if (key == "877") {
                                    selRebar += " AND MANUFACTUREWEIGHT = '" + obj[key] +"' ";
                                } else if (key == "879") {
                                    selRebar += " AND EXTRACHARGEWEIGHT = '" + obj[key] +"' ";
                                } else if (key == "880") {
                                    selRebar += " AND COUPLER = '" + obj[key] +"' ";
                                } else if (key == "883") {
                                    selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                } else if (key == "892") {
                                    selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                }
                            }
                            selRebar += " AND TARGETLABEL = '2' ";
                            selRebar += " AND TARGETVALUE = '" + data[j]['text'] +"' ";

                            var resRebar = await conn.execute(selRebar);

                            if (resRebar.rows.length > 0) {
                            
                                for ( var l = 0; l < req.data.length; l++) {
                                    if (req.data[l] == data[j]) {
                                        req.data[l]['text'] = resRebar.rows[0]['EXTRACHARGE'];
                                    }
                                }
                            }

                            rebarObj["878"] = "N";
                        } else if (data[j]['entryLbl'] == "879") {
                            for ( key in obj) {
                                if (key == "853") {
                                    selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                } else if (key == "872") {
                                    selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                } else if (key == "873") {
                                    selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                } else if (key == "874") {
                                    selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                } else if (key == "875") {
                                    selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                } else if (key == "876") {
                                    selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                } else if (key == "878") {
                                    selRebar += " AND EXTRACHARGE = '" + obj[key] +"' ";
                                } else if (key == "877") {
                                    selRebar += " AND MANUFACTUREWEIGHT = '" + obj[key] +"' ";
                                } else if (key == "880") {
                                    selRebar += " AND COUPLER = '" + obj[key] +"' ";
                                } else if (key == "883") {
                                    selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                } else if (key == "892") {
                                    selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                }
                            }
                            selRebar += " AND TARGETLABEL = '3' ";
                            selRebar += " AND TARGETVALUE = '" + data[j]['text'] +"' ";

                            var resRebar = await conn.execute(selRebar);

                            if (resRebar.rows.length > 0) {
                            
                                for ( var l = 0; l < req.data.length; l++) {
                                    if (req.data[l] == data[j]) {
                                        req.data[l]['text'] = resRebar.rows[0]['EXTRACHARGEWEIGHT'];
                                    }
                                }
                            }
                            rebarObj["879"] = "Y";
                        } else if (data[j]['entryLbl'] == "880") {
                            for ( key in obj) {
                                if (key == "853") {
                                    selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                } else if (key == "872") {
                                    selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                } else if (key == "873") {
                                    selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                } else if (key == "874") {
                                    selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                } else if (key == "875") {
                                    selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                } else if (key == "876") {
                                    selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                } else if (key == "878") {
                                    selRebar += " AND EXTRACHARGE = '" + obj[key] +"' ";
                                } else if (key == "879") {
                                    selRebar += " AND EXTRACHARGEWEIGHT = '" + obj[key] +"' ";
                                } else if (key == "877") {
                                    selRebar += " AND MANUFACTUREWEIGHT = '" + obj[key] +"' ";
                                } else if (key == "883") {
                                    selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                } else if (key == "892") {
                                    selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                }
                            }
                            selRebar += " AND TARGETLABEL = '4' ";
                            selRebar += " AND TARGETVALUE = '" + data[j]['text'] +"' ";

                            var resRebar = await conn.execute(selRebar);

                            if (resRebar.rows.length > 0) {
                            
                                for ( var l = 0; l < req.data.length; l++) {
                                    if (req.data[l] == data[j]) {
                                        req.data[l]['text'] = resRebar.rows[0]['COUPLER'];
                                    }
                                }
                            }
                            rebarObj["880"] = "Y";
                        }

                        selRebar = "SELECT * FROM TBL_REBAR_INVOICE_TYPO WHERE 1=1 ";
                    }

                    for ( rebarKey in rebarObj) {
                        if ( rebarObj[rebarKey] == "N" ) {
                            if( rebarKey == "877") {
                                for ( key in obj) {
                                    if (key == "853") {
                                        selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "872") {
                                        selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                    } else if (key == "873") {
                                        selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                    } else if (key == "874") {
                                        selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                    } else if (key == "875") {
                                        selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                    } else if (key == "876") {
                                        selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                    } else if (key == "878") {
                                        selRebar += " AND EXTRACHARGE = '" + obj[key] +"' ";
                                    } else if (key == "879") {
                                        selRebar += " AND EXTRACHARGEWEIGHT = '" + obj[key] +"' ";
                                    } else if (key == "880") {
                                        selRebar += " AND COUPLER = '" + obj[key] +"' ";
                                    } else if (key == "883") {
                                        selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                    } else if (key == "892") {
                                        selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                    }
                                }
                                selRebar += " AND TARGETLABEL = '1' ";
                                selRebar += " AND TARGETVALUE = '0' ";
    
                                var resRebar = await conn.execute(selRebar);
    
                                if (resRebar.rows.length > 0) {
                                    req.data.push({"text":resRebar.rows[0]['MANUFACTUREWEIGHT'], "location":location, "entryLbl":rebarKey});
                                }
                            } else if (rebarKey == "878") {
                                for ( key in obj) {
                                    if (key == "853") {
                                        selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "872") {
                                        selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                    } else if (key == "873") {
                                        selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                    } else if (key == "874") {
                                        selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                    } else if (key == "875") {
                                        selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                    } else if (key == "876") {
                                        selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                    } else if (key == "877") {
                                        selRebar += " AND MANUFACTUREWEIGHT = '" + obj[key] +"' ";
                                    } else if (key == "879") {
                                        selRebar += " AND EXTRACHARGEWEIGHT = '" + obj[key] +"' ";
                                    } else if (key == "880") {
                                        selRebar += " AND COUPLER = '" + obj[key] +"' ";
                                    } else if (key == "883") {
                                        selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                    } else if (key == "892") {
                                        selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                    }
                                }
                                selRebar += " AND TARGETLABEL = '2' ";
                                selRebar += " AND TARGETVALUE = '0' ";
    
                                var resRebar = await conn.execute(selRebar);
    
                                if (resRebar.rows.length > 0) {
                                    req.data.push({"text":resRebar.rows[0]['EXTRACHARGE'], "location":location, "entryLbl":rebarKey});
                                }
                            } else if (rebarKey == "879") {
                                for ( key in obj) {
                                    if (key == "853") {
                                        selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "872") {
                                        selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                    } else if (key == "873") {
                                        selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                    } else if (key == "874") {
                                        selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                    } else if (key == "875") {
                                        selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                    } else if (key == "876") {
                                        selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                    } else if (key == "878") {
                                        selRebar += " AND EXTRACHARGE = '" + obj[key] +"' ";
                                    } else if (key == "877") {
                                        selRebar += " AND MANUFACTUREWEIGHT = '" + obj[key] +"' ";
                                    } else if (key == "880") {
                                        selRebar += " AND COUPLER = '" + obj[key] +"' ";
                                    } else if (key == "883") {
                                        selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                    } else if (key == "892") {
                                        selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                    }
                                }
                                selRebar += " AND TARGETLABEL = '3' ";
                                selRebar += " AND TARGETVALUE = '0' ";
    
                                var resRebar = await conn.execute(selRebar);
    
                                if (resRebar.rows.length > 0) {
                                    req.data.push({"text":resRebar.rows[0]['EXTRACHARGEWEIGHT'], "location":location, "entryLbl":rebarKey});
                                }
                            } else if (rebarKey == "880") {
                                for ( key in obj) {
                                    if (key == "853") {
                                        selRebar += " AND SUPPLYCOMPANY = '" + obj[key] +"' ";
                                    } else if (key == "872") {
                                        selRebar += " AND PROCESSNAME = '" + obj[key] +"' ";
                                    } else if (key == "873") {
                                        selRebar += " AND DELIVERYDATE = '" + obj[key] +"' ";
                                    } else if (key == "874") {
                                        selRebar += " AND ARRIVALDATE = '" + obj[key] +"' ";
                                    } else if (key == "875") {
                                        selRebar += " AND INVOICENUMBER = '" + obj[key] +"' ";
                                    } else if (key == "876") {
                                        selRebar += " AND TRUKNUMBER = '" + obj[key] +"' ";
                                    } else if (key == "878") {
                                        selRebar += " AND EXTRACHARGE = '" + obj[key] +"' ";
                                    } else if (key == "879") {
                                        selRebar += " AND EXTRACHARGEWEIGHT = '" + obj[key] +"' ";
                                    } else if (key == "877") {
                                        selRebar += " AND MANUFACTUREWEIGHT = '" + obj[key] +"' ";
                                    } else if (key == "883") {
                                        selRebar += " AND REBARGYUNG = '" + obj[key] +"' ";
                                    } else if (key == "892") {
                                        selRebar += " AND DELIVERYORDERNO = '" + obj[key] +"' ";
                                    }
                                }
                                selRebar += " AND TARGETLABEL = '4' ";
                                selRebar += " AND TARGETVALUE = '0' ";
    
                                var resRebar = await conn.execute(selRebar);
    
                                if (resRebar.rows.length > 0) {
                                    req.data.push({"text":resRebar.rows[0]['COUPLER'], "location":location, "entryLbl":rebarKey});
                                }
                            }
                            selRebar = "SELECT * FROM TBL_REBAR_INVOICE_TYPO WHERE 1=1 ";
                        }
                    }

                }
            }

            return done(null, req);
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
};

function getMultiLabelYLoc(req, labelDef) {
    var ret = labelDef
    var obj = {};
    for (var i = 0; i < req.data.length; i++) {
        if (req.data[i]['entryLbl'] != undefined) {
            for (var j = 0; j < ret.rows.length; j++) {
                if (req.data[i]['entryLbl'] == ret.rows[j]['SEQNUM'] && ret.rows[j]['AMOUNT'] == "multi") {
                    var entryLbl = ret.rows[j]['SEQNUM'];
                    
                    if (obj[entryLbl] == undefined) {
                        obj[entryLbl] = 1;
                    }else {
                        obj[entryLbl] += 1;
                    }

                }
            }
        }
    }

    var maxNum = 0;
    var max = {};
    for (var key in obj) {
        var num = obj[key];

        if (num > maxNum) {
            max = {'entryLbl': key, 'maxNum': num};
            maxNum = num;
        }
    }

    var data = [];
    for (var i = 0; i < req.data.length; i++) {
        if (req.data[i]['entryLbl'] == max['entryLbl']) {
            data.push(req.data[i]);
        }
    }

    max['maxLabel'] = data;

    return max;

}

function pad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}