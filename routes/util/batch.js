var fs = require('fs');
var PythonShell = require('python-shell')
var sync = require('./sync.js')
var appRoot = require('app-root-path').path;
var dbConfig = require(appRoot + '/config/dbConfig');
var oracle = require('./oracle.js');
const oracledb = require('oracledb');
var async = require('async');
var execSync = require('child_process').execSync;
var pythonConfig = require(appRoot + '/config/pythonConfig');
var propertiesConfig = require(appRoot + '/config/propertiesConfig');
var ftp = require('ftp');

var ftpConfig = propertiesConfig.ftp;

exports.insertDoctypeMapping = function (req, done) {
    try {
        sync.fiber(function () {
            var data = sync.await(insertDoctypeMapping(req, sync.defer()));
            return done(null, data);
        });
    } catch (e) {
        console.log(e);
        return done(null, null);
    }
};

function insertDoctypeMapping(req, done) {
    sync.fiber(function () {
        try {
            var retData = {};
            var data = req
            let topSentenses = []; // 문서판별을 위한 문장
            var similarSentences = [];
			var docType;
			var docTopType;
            var convertedFilepath;
            var bannedWord;

			//console.log(data.docSentenceList);
			//console.log(data.docSentenceList[1]);

			if (data.docSentenceList.length > 0) {

				for (var i in data.docSentenceList) {
					similarSentences.push(data.docSentenceList[i]);
				}
			}
			/*
			for (var i in data.textList) {
                if (data.textList[i].check == 1) {
					similarSentences.push(data.docSentence[i]);
                }

                if (topSentenses.length < 5) {
                    data.textList[i] = insertSymspell(data.textList[i]);
                    topSentenses.push(data.textList[i]);
                }
			}
			*/

            //20180911 가져온 문장의 sid EXPORT_SENTENCE_SID함수를 통해 추출
			//20190119 sentence 부분 없어져서 필요없슴
			//data = getSentenceSid(data);
            //docSid = getDocSid(topSentenses);

            //20180911 신규문서일 경우
            if (data.radioType == '2') {
                //20180911 기존 문서양식중 max doctype값 가져오기
                //20180911 TBL_DOCUMENT_CATEGORY테이블에 가져온 신규문서 양식명을 insert
                docType = insertDocCategory(data);

                //20180911 기존 이미지 파일을 C://ICR/sampleDocImage 폴더에 DocType(숫자).jpg로 저장
                convertedFilepath = copyFile(data.filepath, docType);

                //20180911 TBL_FORM_MAPPING 에 5개문장의 sid 와 doctype값 insert
				//insertFormMapping(topSentenses, docType);
				//console.log(data.docTopType);
				docTopType = data.docTopType;
				insertDocumentSentence(similarSentences, docType, similarSentences.length, docTopType);
            } else if (data.radioType == '3') {
                docType = selectDocCategoryFromDocName(data);
                //insertNotInvoce(topSentenses, docType);
                insertDocumentSentence(similarSentences, docType, similarSentences.length);
            } else {
				docType = selectDocCategoryFromDocName(data);
				docTopType = data.docTopType;
				//insertFormMapping(topSentenses, docType);
				insertDocumentSentence(similarSentences, docType, similarSentences.length, docTopType);
                //updateDocumentType();
            }
            data.docType = docType;
            updateNewBatchLearnListDocType(data);
            //20180911 TBL_BATCH_LEARN_LIST 에 update (statue = 'D')
            //updateBatchLearnList(data, docType);

            return done(null, data);
        } catch (e) {
            console.log(e);
            return done(null, e);
        }
    });
}

function insertSymspell(item) {    
    var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
    item.text = item.text.replace(regExp, '');

    try {
        sync.await(oracle.insertOcrSymsDoc(item, sync.defer()));

        return item
    } catch(e){
        throw e;
    }   
}

function selectBannedWord() {
    try {
        let item = sync.await(oracle.selectBannedWord(sync.defer()));

        return item
    } catch (e) {
        throw e;
    }
}

function insertBannedWord(item) {
    //var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
    try {
        //item.text = item.text.replace(regExp, '');

        if (item.text.length > 0) {
            sync.await(oracle.insertBannedWord(item, sync.defer()));
        }

        return item;
    } catch (e) {
        throw e;
    }
}

function getSentenceSid(data) {
    try {
        for (var i in data.textList) {
            data.textList[i].sid = sync.await(oracle.selectOriginSid(data.textList[i], sync.defer()));
        }

        return data;
    } catch (e) {
        throw e;
    }
}

function insertDocCategory(data) {
    try {
        var docType = sync.await(oracle.insertDocCategory([data.docName, data.filepath, data.docTopType], sync.defer()));

        return docType;
    } catch (e) {
        throw e;
    }
}

function selectDocCategoryFromDocName(data) {
    try {
        var docType = sync.await(oracle.selectDocCategoryFromDocName([data.docName], sync.defer()));

        return docType;
    } catch (e) {
        throw e;
    }
}

function copyFile(src, docType) {
    var convertedFilepath = propertiesConfig.filepath.docFilePath;
    var sampleImagePath = convertedFilepath + '/' + docType + '.jpg';
    try {
        /*
        if (!fs.existsSync(src)) {
            throw new Error('file not exist');
        }
        var data = fs.readFileSync(src, 'utf-8');
        */
        try {
            fs.mkdirSync(convertedFilepath);
        } catch (e) {
            if (e.code != 'EEXIST') throw e;
        }
        //execSync('module\\imageMagick\\convert.exe -density 800x800 ' + src + ' ' + (convertedFilepath + '/' + docType + '.jpg'));
        sync.await(downloadFtpFileToSampleImg(src, sampleImagePath, sync.defer()));
        sync.await(oracle.updateDocCategoryToFilePath(['/' + (convertedFilepath.split('/')[2] + '/' + docType + '.jpg'), docType], sync.defer()));

        return (convertedFilepath + '/' + docType + '.jpg');
    } catch (e) {
        throw e;
    }
}

function downloadFtpFileToSampleImg(src, sampleImagePath, done) {
    sync.fiber(function () {
        var ftpFilePath = propertiesConfig.auto.destFtpFilePath + src.substring(src.lastIndexOf('/') + 1);
        try {
            var c = new ftp();
            c.on('ready', function () {
                c.get(ftpFilePath, function (err, stream) {
                    if (err) console.log(err);
                    stream.pipe(fs.createWriteStream(sampleImagePath));
                    stream.once('close', function () {
                        c.end();
                        done(null, null);
                    });
                });

            });
            c.connect(ftpConfig);
        } catch (e) {
            throw e;
        }
    });
}

function getDocSid(topSentenses) {
    try {
        var formsid = '';
        for (var i = 0; i < 5; i++) {
            if (i < topSentenses.length) {
                formsid += topSentenses[i].sid + ',';
            } else {
                formsid += '0,0,0,0,0,';
            }
        }

        return formsid.slice(0, -1);

    } catch (e) {
        throw e;
    }

}

function insertFormMapping(topSentenses, docType) {
    try {
        var formsid = '';
        for (var i = 0; i < 5; i++) {
            if (i < topSentenses.length) {
                formsid += topSentenses[i].sid + ',';
            } else {
                formsid +=  '0,0,0,0,0,';
            }
        }

        sync.await(oracle.insertFormMapping([formsid.slice(0, -1), docType], sync.defer()));

    } catch (e) {
        throw e;
    }
}

function insertNotInvoce(topSentenses, docType) {
    try {
        var text = "";
        for (var i in topSentenses) {
            text += topSentenses[i].text + ",";
        }
        sync.await(oracle.insertNotInvoce([text.slice(0, -1), docType], sync.defer()));
    } catch (e) {
        throw e;
    }
}

function insertDocumentSentence(topSentenses, docType, length, docTopType) {
    try {
        var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
        var text = "";
        for (var i in topSentenses) {
            if(topSentenses[i].text!= null)
            {
                text += topSentenses[i].text.replace(regExp, '') + ",";
            }
		}
		//console.log(docTopType);
		sync.await(oracle.insertDocumentSentence([text.slice(0, -1), docType, length, docTopType], sync.defer()));
    } catch (e) {
        throw e;
    }
}

function updateBatchLearnList(data, docType) {
    try {
        sync.await(oracle.updateBatchLearnList([docType, data.imgId, data.filepath], sync.defer()));

    } catch (e) {
        throw e;
    }
}

function updateNewBatchLearnListDocType(data) {
    try {
        sync.await(oracle.updateNewBatchLearnListDocType(data, sync.defer()));
    } catch (e) {
        throw e;
    }
}