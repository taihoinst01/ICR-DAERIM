var propertiesConfig = {
    common: {

    },
    proxy: {
        serverUrl: 'http://210.109.27.111:8888'
    },
    uiLearning: {

    },
    // icrRest: {
    //     serverUrl: 'http://192.168.1.182:5000'
    // },//로컬
    icrRest: {
        serverUrl: 'http://13.78.61.168:5000'
    },//운영
    batchLearning: {

    },
    ocr: {
        uri: 'https://japaneast.api.cognitive.microsoft.com/vision/v1.0/ocr',
        subscriptionKey: '8dbe688c24a04c3992825e1a68644b82',
    },
    filepath: {
        uploadsPath: 'C:\\ICR\\uploads\\',
        scanPath: 'C:\\ICR\\ScanFiles\\',
        //develop
        logfilepath: 'c:/logs',
        //realExcelPath: 'C:\\Users\\Taiho\\Desktop\\labeled_data',
        //product
        //logfilepath: 'c:/logs'

        //excelBatchFilePath: '/ICR/labeled_data/filepath_mapping_20180720.xlsx',
        //excelBatchFileData: '/ICR/labeled_data/labeled_data_20180723.xlsx',
        //realExcelPath: '/image/labeled_data',
        //imagePath: '/ICR/image'

        excelBatchFilePath: 'C:\\ICR\\labeled_data\\filepath_mapping_20180720.xlsx',
        excelBatchFileData: 'C:\\ICR\\labeled_data\\labeled_data_20180723.xlsx',
        realExcelPath: 'C:\\ICR\\labeled_data',
        imagePath: 'C:\\ICR\\image',
        convertedImagePath: 'C:\\ICR\\convertedImage',
        createImgDirPath: '/ICR/image',
        createImgconvertedDirPath: '/ICR/convertedImage',
        answerFileFrontPath: 'C:/ICR/image/MIG/MIG',
        docFilePath: 'C:/ICR/sampleDocImage',
        doc_sampleImagePath: 'C:/ICR',
        excelUploadPath: 'C:\\ICR\\uploads\\excel\\'
    },
    auto: {
        ftpScanDir: '/ScanFiles',
        ftpFilePath: 'ScanFiles/',
        localFilePath: 'C:/ICR/uploadFiles/',
        destFtpFilePath: 'uploads/',
        ftpFileUrl: 'http://104.41.171.244/uploads/'

    },
    ftp: {
        host: '104.41.171.244',
        port: 21,
        user: 'daerimicr',
        password: 'daerimicr123!@#',
        //keepalive: 10000
    },
    api: {
        // invoiceApi: 'http://13.209.21.134:8080/dcostb/api/invoiceverif/insertInvoiceverif'
        invoiceApi: 'http://13.125.234.156:8080/dcostb/api/invoiceverif/insertInvoiceverif'
        // invoiceApi: 'http://203.226.59.111:8100/dcostb/api/invoiceverif/insertInvoiceverif'  //수요일 저녁에 반영해야 함.
    }
};

module.exports = propertiesConfig;

