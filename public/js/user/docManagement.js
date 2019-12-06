"use strict";
var progressId; // 프로그레스바 변수
var labels;
var datas;
var numClicks = 0;
var timeOut;

$(function () {
    _init();
});

// 초기화
function _init() {
    $('.um_select select').stbDropdown(); // 검색 메뉴 드랍 초기화
    $('.batch_tbl_right_divBodyScroll').scrollTop(0).scrollLeft(0); // 스크롤 초기화
    datePickerEvent(); // datePicker 적용
    clickEventHandlers();
    selectDocTopType(); // 대메뉴 조회(docTopType)
}

// 버튼 이벤트 핸들러 함수 모음
function clickEventHandlers() {
    selectBtnClick(); // 조회 버튼
    btnRetrainClick(); // 재학습 버튼
    btnInsertClick(); // 추가 버튼
    btnSaveClick(); // 저장 버튼
    btnSendClick(); // 전송 버튼
    btnReportClick(); // 보고서 생성 버튼
    hideBtnClick(); // 미리보기 이미지 숨김버튼
}

// 문서양식 조회 및 select box 렌더링
function selectDocTopType() {
    $.ajax({
        url: '/docManagement/selectDocTopType',
        type: 'post',
        datatype: 'json',
        data: null,
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $('#progressMsgTitle').html("초기화 중..");
            progressId = showProgressBar();
        },
        success: function (data) {
            if (!data.error) {
                var optionHTML = '';
                for (var i in data.docToptypeList) {
                    optionHTML += '<option value="' + data.docToptypeList[i].SEQNUM + '" alt="' + data.docToptypeList[i].ENGNM + '">' + data.docToptypeList[i].KORNM + '</option>';
                }
                $('#docTopTypeSelect').append(optionHTML);
                if (data.docToptypeList.length > 0) { // 문서 topType이 있으면 첫번째 인덱스 topType 문서 조회
                    $('#docTopTypeSelect').prev().text(data.docToptypeList[0].KORNM);
                    var params = {
                        'docTopType': data.docToptypeList[0].SEQNUM,
                        'startDate': $('#searchStartDate').val(),
                        'endDate': $('#searchEndDate').val(),
                        'cdSite': $('#searchSiteCd').val(),
                        'processState': $('#processStateSelect').val(),
                        'fileName': $('#searchFileNm').val(),
                        'sequence': $('#searchSequence').val()
                    };

                    selectBatchPoMlExport(params, true);
                }
            } else {
                fn_alert('alert', 'ERROR');
                endProgressBar(progressId);
            }
        },
        error: function (err) {
            console.log(err);
            fn_alert('alert', 'ERROR');
            endProgressBar(progressId);
        }
    });
}

// 시작 및 종료날짜 datepicker 이벤트
function datePickerEvent() {
    //datepicker 한국어로 사용하기 위한 언어설정
    $.datepicker.setDefaults($.datepicker.regional['ko']);

    // Datepicker
    $(".datepicker").datepicker({
        showButtonPanel: true,
        dateFormat: "yy-mm-dd",
        onClose: function (selectedDate) {

            var eleId = $(this).attr("id");
            var optionName = "";

            if (eleId.indexOf("StartDate") > 0) {
                eleId = eleId.replace("StartDate", "EndDate");
                optionName = "minDate";
            } else {
                eleId = eleId.replace("EndDate", "StartDate");
                optionName = "maxDate";
            }

            $("#" + eleId).datepicker("option", optionName, selectedDate);
            $(".searchDate").find(".chkbox2").removeClass("on");
        }
    });
    $(".searchDate").schDate();

    // 30일전 날짜 구하기 (searchStartDate)
    var today = new Date();
    var oldday = new Date(today - (3600000 * 24 * 14));
    var oldMonth = ((oldday.getMonth() + 1) < 10 ? '0' : '') + (oldday.getMonth() + 1);
    var oldDate = ((oldday.getDate()) < 10 ? '0' : '') + oldday.getDate();
    $("#searchStartDate").val(oldday.getFullYear() + '-' + oldMonth + '-' + oldDate);

    // 오늘날짜 구하기 (searchEndDate)
    var endDate = getNowDate("-");
    $("#searchEndDate").val(endDate);
};

// 문서 조회 버튼 click 이벤트
function selectBtnClick() {
    $('#btn_search').click(function () {
        var cdSite = $('#searchSiteCd').val();
        var docTopType = $('#docTopTypeSelect').val();
        var startDate = $('#searchStartDate').val();
        var endDate = $('#searchEndDate').val();
        var processState = $('#processStateSelect').val();
        var fileName = $('#searchFileNm').val();
        var sequence = $('#searchSequence').val();

        var params = {
            
            'docTopType': docTopType,
            'startDate': startDate,
            'endDate': endDate,
            'cdSite': cdSite,
            'processState': processState,
            'fileName': fileName,
            'sequence': sequence,
        };
        hidePreviewImage();
        selectBatchPoMlExport(params, false);
    });
}

// 문서양식 데이터 조회 이벤트
function selectBatchPoMlExport(params, isInit) {
    $.ajax({
        url: '/docManagement/selectBatchPoMlExport',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify(params),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $('#progressMsgTitle').html("문서데이터 조회중...");
            if (!isInit) progressId = showProgressBar();
        },
        success: function (data) {
            console.log(data);
            if (!data.error) {
                labels = data.docLabelList;
                datas = data.docDataList;
                appendDocTableHeader(data.docLabelList, data.docDataList); // 문서조회 table html 렌더링
                checkAllBoxClick(); // all 체크박스 background css 적용
                appendMLData(data.docLabelList, data.docDataList);
                $('#paging').html(appendPaging((params.pagingCount) ? params.pagingCount : 1, data.totCount)); // 페이징 html 렌더링
                btnPagingClick(); // 페이징 버튼 이벤트 적용
                checkBoxClick(); // 체크박스 background css 적용
            } else {
                fn_alert('alert', 'ERROR');
            }
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
            fn_alert('alert', 'ERROR');
            endProgressBar(progressId);
        }
    });
}



// 보고서 생성 이벤트
function selectReportExport(params, isInit) {
    $.ajax({
        url: '/docManagement/selectReportExport',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify(params),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $('#progressMsgTitle').html("엑셀 보고서 생성중...");
            if (!isInit) progressId = showProgressBar();
        },
        success: function (data) {
            
            if (!data.error) {
                labels = data.docLabelList;
                datas = data.docDataList;
                console.log(datas);
                

                for (var i in datas)
                {

                    var items = datas[i].EXPORTDATA;
                    items = items.replace(/\"/gi, '').slice(1, -1);
                    items = items.split(',');
                    //console.log(items.length);

                    var fileName = datas[i].FILENAME.substring(datas[i].FILENAME.lastIndexOf('/') + 1);
                    for (var j in items)
                    {
                        var textVal = (items[j].split('::')[1]) ? items[j].split('::')[1] : items[j];
                        console.log(textVal);
                    }
                }
                
                

                


            //     appendDocTableHeader(data.docLabelList, data.docDataList); // 문서조회 table html 렌더링
            //     checkAllBoxClick(); // all 체크박스 background css 적용
            //     appendMLData(data.docLabelList, data.docDataList);
            //     $('#paging').html(appendPaging((params.pagingCount) ? params.pagingCount : 1, data.totCount)); // 페이징 html 렌더링
            //     btnPagingClick(); // 페이징 버튼 이벤트 적용
            //     checkBoxClick(); // 체크박스 background css 적용
            // } else {
            //     fn_alert('alert', 'ERROR');
            }
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
            fn_alert('alert', 'ERROR');
            endProgressBar(progressId);
        }
    });
}



// 문서양식에 따른 table 헤더 렌더링
function appendDocTableHeader(docLabelList, docDataList) {
    $('#docTableColumn').empty();
    $('#docMlDataColGroup').empty();

    var headerColGroupHTML = '<colgroup>' +
	    '<col style="width:50px;">' +
        '<col style="width:330px;">' +
        '<col style="width:150px;">' +
        '<col style="width:150px;">' +
        '<col style="width:150px;">' +
        '<col style="width:150px;">' +
        '<col style="width:200px;">' +
        '<col style="width:200px;">';
    var headerTheadHTML = '<thead>';
    headerTheadHTML += '<tr>';
    headerTheadHTML += '<th scope="row"><div class="checkbox-options mauto"><input type="checkbox" class="sta00_all" value="" id="listCheckAll" name="listCheckAll_before" /></div></th>';
    headerTheadHTML += '<th scope="row">파일명</th>';
    headerTheadHTML += '<th scope="row">현장코드</th>';
    headerTheadHTML += '<th scope="row">시퀀스</th>';
    headerTheadHTML += '<th scope="row">송장구분</th>';
    headerTheadHTML += '<th scope="row">날짜</th>';
    headerTheadHTML += '<th scope="row">검토비고</th>';
    headerTheadHTML += '<th scope="row">검토피드백비고</th>';

    if (docLabelList.length > 0) {
        for (var i in docLabelList) {
            headerColGroupHTML += '<col style="width:180px;">';
            headerTheadHTML += '<th scope="row">' + docLabelList[i].KORNM + '</th>';
        }
    } else {
        // for (var i in docDataList[0].EXPORTDATA.split(',')) {
        //     headerColGroupHTML += '<col style="width:180px;">';
        //     headerTheadHTML += '<th scope="row"></th>';
        // }
    }
    headerColGroupHTML += '</colgroup>';
    headerTheadHTML += '</tr>';
    headerTheadHTML += '</thead>';

    $('#docTableColumn').append(headerColGroupHTML + headerTheadHTML); // 문서관리 조회 table header html
    $('#docMlDataColGroup').append(headerColGroupHTML.replace('<colgroup>', '').replace('</colgroup>', '')); // 문서관리 조회 table body html

    // 헤더 체크박스 클릭 이벤트
    $('#listCheckAll').click(function () {
        if ($(this).is(":checked")) {
            $('input[name="listCheck"]').prop('checked', true);
        } else {
            $('input[name="listCheck"]').prop('checked', false);
        }
    });
}

// ML 데이터 table 렌더링
function appendMLData(docLabelList, docDataList) {
    $('#tbody_docList').empty();
    var docTopType = $('#docTopTypeSelect').val();

    var totalHTML = '';
    if (docTopType == 51 || docTopType == 61) { // 일반송장 || 철근송장
        appendMultiHTML(docLabelList, docDataList, docTopType);
    } else {
        totalHTML = appendSingleHTML(docDataList, docTopType);
        $('#tbody_docList').append(totalHTML);
    }
}

// 싱글 entry HTML 렌더링
function appendSingleHTML(docDataList, docTopType) {
    var returnHTML = '';
    for (var i in docDataList) {
        var mlDataListHTML = '' +
            '<tr class="originalTr">' +
            '<td><div class="checkbox-options mauto"><input type="hidden" value="' + docDataList[i].API_SEQ + '" name="seq" /><input type="hidden" value="' + docDataList[i].IVGTRNOSRAL + '" name="ivgtrNoSral" /><input type="hidden" value="' + docDataList[i].SEQ + '" name="seqOri" /><input type="checkbox" class="sta00_all" value="" name="listCheck" /></div></td>' +
            '<td>' +
            '<a href="#" title="양식" onclick="startClick(\'' + docDataList[i].FILENAME + '\')" ondblclick="openImagePop(\'' + docDataList[i].FILENAME + '\', ' + docDataList[i].SEQ + ',' +docTopType +')">' +
            '<input type="text" value="' + docDataList[i].FILENAME.substring(docDataList[i].FILENAME.lastIndexOf('/') + 1) + '" class="inputst_box03_15radius fileNameInput" data-originalvalue="' + docDataList[i].FILENAME + '" disabled>' +
            '</a>' +
            '</td>' +
            '<td><input type="text" value="' + docDataList[i].APISITECD + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].APISITECD + '" disabled></td>' +
            '<td><input type="text" value="' + docDataList[i].APISEQ + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].APISEQ + '" disabled></td>' +
            '<td><input type="text" value="' + docDataList[i].KORNM + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].KORNM + '" disabled></td>' +
            '<td><input type="text" value="' + docDataList[i].AUTOSENDTIME + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].AUTOSENDTIME + '" disabled></td>' +
            '<td><input type="text" value="' + docDataList[i].ETC.trim() + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].ETC.trim() + '"></td>' +
            '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';
        var items = docDataList[i].EXPORTDATA;
        items = items.replace(/\"/gi, '').slice(1, -1);
        items = items.split(',');
        for (var j in items) {
            if (items[j] == 'null') {
                mlDataListHTML += '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';
            } else {
                var textVal = (items[j].split('::')[1]) ? items[j].split('::')[1] : items[j];
                mlDataListHTML += '<td><input type="text" value="' + textVal + '" class="inputst_box03_15radius" data-originalvalue="' + items[j] + '"></td>';
            }
        }
        mlDataListHTML += '</tr>';
        returnHTML += mlDataListHTML;
    }

    return returnHTML;
}

// 멀티 entry HTML 렌더링
function appendMultiHTML(docLabelList, docDataList, docTopType) {   
    var multiLabelNumArr = [];
    var multiLabelYLocArr = [];

    // Multi Label 순서 구하기
    for (var i in docLabelList) {
        if (docLabelList[i].AMOUNT == "multi") multiLabelNumArr.push(i);
    }

    for (var i in docDataList) {
        // 가장 많은 multi entry의 y축 좌표값 구하기
        var multiEntryInfo = getMultiLabelYLoc(docDataList[i].EXPORTDATA, multiLabelNumArr);
        multiLabelYLocArr = multiEntryInfo.dataArr;

        for (var k = 0; k < multiEntryInfo.dataCount; k++) {
            var mlDataListHTML;

            // 첫 row만 파일명, 날짜 표시
            if (k == 0) {
                mlDataListHTML = '' +
                    '<tr class="originalTr">' +
                    '<td><div class="checkbox-options mauto"><input type="hidden" value="' + docDataList[i].API_SEQ + '" name="seq" /><input type="hidden" value="' + docDataList[i].IVGTRNOSRAL + '" name="ivgtrNoSral" /><input type="hidden" value="' + docDataList[i].SEQ + '" name="seqOri" /><input type="checkbox" class="sta00_all" value="" name="listCheck" /></div></td>' +
                    '<td>' +
                    '<a href="#" title="양식" onclick="startClick(\'' + docDataList[i].FILENAME + '\')" ondblclick="openImagePop(\'' + docDataList[i].FILENAME + '\', ' + docDataList[i].SEQ + ',' +docTopType +')">' +
                    '<input type="text" value="' + docDataList[i].FILENAME.substring(docDataList[i].FILENAME.lastIndexOf('/') + 1) + '" class="inputst_box03_15radius fileNameInput" data-originalvalue="' + docDataList[i].FILENAME + '" disabled>' +
                    '</a>' +
                    '</td>' +
                    '<td><input type="text" value="' + docDataList[i].APISITECD + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].APISITECD + '" disabled></td>' +
                    '<td><input type="text" value="' + docDataList[i].APISEQ + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].APISEQ + '" disabled></td>' +
                    '<td><input type="text" value="' + docDataList[i].KORNM + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].KORNM + '" disabled></td>' +
                    '<td><input type="text" value="' + docDataList[i].AUTOSENDTIME + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].AUTOSENDTIME + '" disabled></td>' +
                    '<td><input type="text" value="' + docDataList[i].ETC.trim() + '" class="inputst_box03_15radius" data-originalvalue="' + docDataList[i].ETC.trim() + '"></td>' + 
                    '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';
            } else {
                mlDataListHTML = '' +
                    '<tr class="multiTr_' + docDataList[i].SEQ + '">' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>' +
                    '<td></td>';
            }
            var items = docDataList[i].EXPORTDATA;
            items = items.replace(/\"/gi, '').slice(1, -1);
            items = items.split(',');

            for (var j in items) {               
                if (items[j] == 'null') { // entry 값 없음
                    mlDataListHTML += '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';

                } else if (multiLabelNumArr.indexOf(j) != -1 && items[j].split('::')[1]) { // 멀티엔트리
                    var yLoc = Number(multiLabelYLocArr[k].yLoc);

                    if (items[j].split(' | ').length > 0) {
                        var isEmpty = true;
                        for (var m in items[j].split(' | ')) {
                            if (Math.abs(Number(items[j].split(' | ')[m].split('::')[0]) - yLoc) < 20) {
                                var textVal = items[j].split(' | ')[m].split('::')[1];                                
                                mlDataListHTML += '<td><input type="text" value="' + textVal + '" class="inputst_box03_15radius" data-originalvalue="' + textVal + '"></td>';
                                isEmpty = false;
                                break;
                            }
                        }
                        if (isEmpty) mlDataListHTML += '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';

                    } else {
                        mlDataListHTML += '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';
                    }
                } else { // 싱글엔트리

                    var textVal = '';
                    var itemArr = items[j].split(' | ');
                    for (var m in itemArr) {
                        textVal += (itemArr[m].split('::')[1]) ? itemArr[m].split('::')[1] : itemArr[m] + ((m == 0) ? '' : ' | ');
                    }
                    mlDataListHTML += '<td><input type="text" value="' + textVal + '" class="inputst_box03_15radius" data-originalvalue="' + items[j] + '"></td>';       
                }
            }
            mlDataListHTML += '</tr>';
            $('#tbody_docList').append(mlDataListHTML);
        }
    }    

    return null;
}

// 가장 많은 multi entry의 y축 좌표값 구하기
function getMultiLabelYLoc(exportData, multiLabelNumArr) {
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

// 파일명 onClick 이벤트
function startClick(fileName, seq) {
    numClicks++;
    
    switch(numClicks) {
        case 1:
            timeOut = setTimeout("previewImage('" + fileName + "')", 1000);
            break;
    }
}

//이미지 팝업 이벤트
function openImagePop(fileName, seq, docTopType) {
    clearTimeout(timeOut);
    console.log(docTopType);
    var convertFilePath = fileName.split('.pdf')[0] + '-0.jpg';
    $('#PopupImg').attr('src', convertFilePath.replace(/\/uploads/, '/img'));
    appendPopTable(fileName, seq, docTopType);
    layer_open('docPop');
    numClicks = 0;

    return false;
}

// 테이블 축소 이미지 미리보기
function previewImage(fileName) {
    numClicks = 0;
    var convertFilePath = fileName.split('.pdf')[0] + '-0.jpg';
    //$('#imgPreview').attr('data-currentImg', convertFilePath.replace(/\/uploads/,'/img'));
    
    if(convertFilePath.replace(/\/uploads/,'/img') == $('#imgPreview').attr('src') && $('#imgPreviewWrap').css('display') == 'block') {
        hidePreviewImage();
    } else {
        $('#imgPreview').attr('src', convertFilePath.replace(/\/uploads/,'/img'));
        $('#imgPreview').load(function(){
            showPreviewImage();
    
        });
    }
    return false;
}

// 이미지 미리보기 show
function showPreviewImage(){
    $('#tableWrap').animate({width:"1140px"}, "fast");
    $('#hideBtn').show();
    $('#imgPreviewWrap').show();
}

// 이미지 미리보기 hide
function hidePreviewImage(){
    $('#imgPreviewWrap').hide();
    $('#hideBtn').hide();
    $('#tableWrap').animate({width:"1760px"}, "fast");
}

// 이미지 미리보기 닫기 버튼 click 이벤트
function hideBtnClick(){
    $('#hideBtn').click(function() {
        hidePreviewImage();
    })
}

// 이미지 파업 하단 테이블 렌더링
function appendPopTable(fileName, seq, docTopType) {
    var popTableHeaderColHTML = '<colgroup>';
    var popTableHeaderTheadHTML = '<thead><tr>';
    var popTableContentHTML = '<tbody>';
    if (labels.length > 0) {
        for (var i in labels) {
            popTableHeaderColHTML += '<col style="width:180px">';
            popTableHeaderTheadHTML += '<th scope="row">' + labels[i].KORNM + '</th>';
        }
    } else {
        for (var i in datas[0].EXPORTDATA.split(',')) {
            popTableHeaderColHTML += '<col style="width:180px">';
            popTableHeaderTheadHTML += '<th scope="row"></th>';
        }
    }
    popTableHeaderColHTML += '</colgroup>';
    popTableHeaderTheadHTML += '</tr></thead>';

    var targetNum = 0;
    $('.fileNameInput').each(function (i, e) {
        if ($(e).attr('data-originalvalue') == fileName) {
            targetNum = i;
        }
    });

    popTableContentHTML += '<tr>';
    if (labels.length > 0) {
        for (var i = 8; i < 8 + labels.length; i++) {
            var valueText = $('#tbody_docList > .originalTr').eq(targetNum).find('td').eq(i).find('input').eq(0).val();

            /*
            if(docTopType == "58" && (i == "10" || i == "12" || i == "13" || i == "14" || i == "16" ))
            {
                console.log("111");
                console.log("["+ i +"]" + valueText);
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '" readonly="readonly"></td>';
            }
            else if(docTopType == "61" && (i == "11" || i == "12" || i == "13" || i == "15" ))
            {
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '" readonly="readonly"></td>';  
            }
            else
            {
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';
            }
            */
            popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';
        }
    } else {
        for (var i = 8; i < 8 + datas[0].EXPORTDATA.split(',').length; i++) {
            var valueText = $('#tbody_docList > .originalTr').eq(targetNum).find('td').eq(i).find('input').eq(0).val();
            popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';
            /*
            if(docTopType == "58" && (i == "10" || i == "12" || i == "13" || i == "14" || i == "16" ))
            {
                console.log("222");
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '" readonly="readonly"></td>';
            }
            else if(docTopType == "61" && (i == "11" || i == "12" || i == "13" || i == "15" ))
            {
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '" readonly="readonly"></td>';  
            }
            else
            {
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';
            }
            */
        }
    }
    popTableContentHTML += '</tr>';

    if ($('.multiTr_' + seq).length > 0) {       
        for (var i = 0; i < $('.multiTr_' + seq).length; i++) {
            popTableContentHTML += '<tr>'
            for (var j = 8; j < 8 + labels.length; j++) {
                var valueText = $('.multiTr_' + seq).eq(i).find('td').eq(j).find('input').eq(0).val();

                /*
                if(docTopType == "61" && (j == "11" || j == "12" || j == "13" || j == "15" ))
                {
                    popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '" readonly="readonly"></td>';  
                }
                else
                {
                    popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';    
                }
                */
                popTableContentHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';
            }
            popTableContentHTML += '</tr>';
        }
    }

    popTableContentHTML += '</tbody>';

    $('#popTableHeaer').html('').append(popTableHeaderColHTML + popTableHeaderTheadHTML);
    $('#popTableContent').html('').append(popTableHeaderColHTML + popTableContentHTML);
}


// 재학습 버튼 click 이벤트
function btnRetrainClick() {
    $('#btn_retrain').click(function () {
        if ($('input[name="listCheck"]:checked').length == 1) {
            var fileName = $('input[name="listCheck"]:checked').closest('td').next().find('input[type="text"]').val();
            location.href = '/uiLearning?fileName=' + fileName;
            //layer_open('retrainPop');
        } else {
            fn_alert('alert', '하나의 파일을 선택하세요.');
        }
    });
}

// All체크박스 선택시 row 배경색처리
function checkAllBoxClick() {
    $('#listCheckAll').click(function () {
        if ($(this).is(":checked")) {
            $('#tbody_docList > tr').css('background-color', '#EA7169');
        } else {
            $('#tbody_docList > tr').css('background-color', '');
        }
    });
}

// 체크박스 선택시 row 배경색처리
function checkBoxClick() {
    $('input[name="listCheck"]').click(function () {
        if ($(this).is(":checked")) {
            $(this).closest('tr').css('background-color', '#EA7169');
            $('.multiTr_' + $(this).prev().val()).css('background-color', '#EA7169');
        } else {
            $(this).closest('tr').css('background-color', '');
            $('.multiTr_' + $(this).prev().val()).css('background-color', '');
        }
    });
}

// 추가 버튼 click 이벤트
function btnInsertClick() {
    $('#btn_header_userPop_insert').click(function () {
        if ($('#docTopTypeSelect').val() != 0) {
            var insertHTML = '<tr style="background-color: #EA7169;">';
            for (var i in labels) {
                if (labels[i].AMOUNT == 'single') {
                    var valueText = $('#popTableContent tr').eq(0).children().eq(i).find('input').val();
                    insertHTML += '<td><input type="text" value="' + valueText + '" class="inputst_box03_15radius" data-originalvalue="' + valueText + '"></td>';
                } else {
                    insertHTML += '<td><input type="text" value="" class="inputst_box03_15radius" data-originalvalue=""></td>';
                }
            }
            insertHTML += '</tr>';
            $('#popTableContent').append(insertHTML);
            $("#popTableContentDiv").scrollTop($("#popTableContentDiv")[0].scrollHeight);
        } else {
            fn_alert('alert', '미분류 문서는 추가할 수 없습니다.');
        }
    });
}

// 저장 버튼 click 이벤트
function btnSaveClick() {
    $('#btn_header_userPop_save').click(function () {
        if ($('#docTopTypeSelect').val() != 0) {
            var saveDataArr = [];
            var typoDataArr = [];
            var numTypoDataArr = [];
            var filePath = $('#PopupImg').attr('src').replace('-0.jpg', '.pdf').replace('img','uploads');
            var TrNum;
            $('.originalTr').each(function (i, e) {
                if ($(e).children().eq(1).find('input').attr('data-originalvalue') == filePath) {
                    TrNum = i;
                }
            });
            for (var i = 0; i < $('#popTableHeaer thead th').length; i++) {
                //$('.originalTr').eq(TrNum).children().eq(i + 4).find('input').eq(0).val($('#popTableContent tr').eq(0).find('input').eq(i).val());
                if (labels[i].AMOUNT == 'single') {
                    saveDataArr.push({ 'type': labels[i].AMOUNT, 'value': $('#popTableContent tr').eq(0).find('input').eq(i).val() });
                } else {
                    saveDataArr.push({ 'type': labels[i].AMOUNT, 'value': [$('#popTableContent tr').eq(0).find('input').eq(i).val()] });
                }
            }

            for (var i = 0; i < $('#popTableContent tr').length-1; i++) {
                for (var j in labels) {
                    if (labels[j].AMOUNT == 'multi') saveDataArr[j].value.push($('#popTableContent tr').eq(i + 1).find('input').eq(j).val());
                }
            }

            var numPattern = /^[0-9| |.|,|+|-]*$/;
            
            for (var i = 0; i < $('#popTableContent tr').length; i++) {
                var numTypoData = [];
                var numTypoBool = false;
                for ( var j = 0; j < $('#popTableContent tr:eq(' + i + ') td').length; j++) {
                    var orgText = $('#popTableContent tr').eq(i).find('input').eq(j).attr('data-originalvalue');
                    var updText = $('#popTableContent tr').eq(i).find('input').eq(j).val();

                    if (orgText != updText) {

                        if ( ($('#docTopTypeSelect').val() == "51" || $('#docTopTypeSelect').val() == "59") && (j == 2 || j == 3)) {
                            numTypoData.push({ 'orgText': orgText, 'updText': updText });
                            numTypoBool = true;
                        } else if( $('#docTopTypeSelect').val() == "58" && (j == 5 || j == 6 || j == 8 || j == 9 || j == 10 || j == 12)) {
                            numTypoData.push({ 'orgText': orgText, 'updText': updText });
                            numTypoBool = true;
                        } else if ( $('#docTopTypeSelect').val() == "61" && (j == 6 || j == 7 || j == 8 || j == 9 )) {
                            numTypoData.push({ 'orgText': orgText, 'updText': updText });
                            numTypoBool = true;
                        } else {
                            typoDataArr.push({ 'orgText': orgText, 'updText': updText });
                            numTypoData.push({ 'orgText': updText });
                        }

                    }else {
                        numTypoData.push({'orgText': orgText});
                    }
                }

                if (numTypoBool) {
                    numTypoDataArr.push(numTypoData);
                }
            }
            /*
            var seq = $('.originalTr').eq(TrNum).find('input[name="seq"]').val();
            if ($('.multiTr_' + seq).length > 0) {
                for (var i = 0; i < $('.multiTr_' + seq).length; i++) {
                    for (var j = 0; j < $('#popTableHeaer thead th').length; j++) {
                        $('.multiTr_' + seq).eq(i).children().eq(j + 4).find('input').eq(0).val($('#popTableContent tr').eq(i + 1).find('input').eq(j).val());
                        if (labels[j].AMOUNT == 'multi') saveDataArr[j].value.push($('#popTableContent tr').eq(i + 1).find('input').eq(j).val());
                    }
                }

            }
            */

            var saveJson = {
                'filePath': filePath,
                'data': saveDataArr,
                'typoData': typoDataArr,
                'numTypoData': numTypoDataArr,
                'docTopType': $('#docTopTypeSelect').val()
            };

            $.ajax({
                url: '/docManagement/updateBatchPoMlExport',
                type: 'post',
                datatype: 'json',
                data: JSON.stringify(saveJson),
                contentType: 'application/json; charset=UTF-8',
                beforeSend: function () {
                    $('#progressMsgTitle').html("저장 중..");
                    progressId = showProgressBar();
                },
                success: function (data) {
                    console.log(data)
                    if (!data.error) {
                        fn_alert('alert', '저장 성공');
                        $('.li_paging.active > a').click();
                    } else {
                        fn_alert('alert', 'ERROR');
                    }
                    endProgressBar(progressId);
                },
                error: function (err) {
                    console.log(err);
                    fn_alert('alert', 'ERROR');
                    endProgressBar(progressId);
                }
            });
        } else {
            fn_alert('alert', '미분류 문서는 저장할 수 없습니다.');
        }
    });
}

//보고서 생성 버튼 클릭
function btnReportClick() {
    $('#btn_report').click(function () {
        var cdSite = $('#searchSiteCd').val();
        var docTopType = $('#docTopTypeSelect').val();
        var startDate = $('#searchStartDate').val();
        var endDate = $('#searchEndDate').val();
        var processState = $('#processStateSelect').val();
        var fileName = $('#searchFileNm').val();
        var sequence = $('#searchSequence').val();
        

        var params = {
            
            'docTopType': docTopType,
            'startDate': startDate,
            'endDate': endDate,
            'cdSite': cdSite,
            'processState': processState,
            'fileName': fileName,
            'sequence': sequence,
        };
        hidePreviewImage();
        // selectBatchPoMlExport(params, false);
        selectReportExport(params, false);
    });
}


// 전송 버튼 click 이벤트
function btnSendClick() {
    $('#btn_send').click(function () {
        var sendJson = [];
        var sendDocCount = 0;
        // 체크한 row json 데이터 가공하기
        $('input[name="listCheck"]').each(function (i, e) {
            if ($(e).is(":checked")) {
                sendDocCount++;
                var invoiceType;
                $('#docTopTypeSelect > option').each(function (i, e) {
                    if ($(e).text() == $('.selected.area').eq(0).text()) invoiceType = $(e).attr('alt');
                });
                var itemJson = {
                    'sequence': $(e).prev().prev().prev().val(),
                    'inviceType': invoiceType,
                    //'cdSite': 'DAE100083',
                    'cdSite': $(e).closest('tr').children().eq(2).find('input').val().split('_')[0],
                    'editFileName': '',
                    'scanDate': $(e).closest('tr').children().eq(5).find('input').val().replace(/[^(0-9)]/gi, '').replace(/(\s*)/,''),
                    'returnBigo': $(e).closest('tr').children().eq(7).find('input').val(),
                    'ivgtrRes': $(e).prev().prev().val() == "null" ? 'N':'Y',
                    'ivgtrNoSral': $(e).prev().prev().val() == "null" ? 0:$(e).prev().prev().val(),
                    'sendDate': getTimeStamp(),
                    'fileName': (($(e).closest('tr').children().eq(1).find('input').attr('data-originalvalue').substring(0,$(e).closest('tr').children().eq(1).find('input').attr('data-originalvalue').lastIndexOf('/')+1)+'org_'+$(e).closest('tr').children().eq(1).find('input').attr('data-originalvalue').substring($(e).closest('tr').children().eq(1).find('input').attr('data-originalvalue').lastIndexOf('/')+1)).split('.pdf')[0] + '-0.jpg').replace(/\/uploads/, '/img')
                    // 'fileName': ($(e).closest('tr').children().eq(1).find('input').attr('data-originalvalue').split('.pdf')[0] + '-0.jpg').replace(/\/uploads/, '/img')
                };
                var ocrDataArr = [];
                var ocrDataItem = {};
                for (var j in labels) {
                    if (labels[j].AMOUNT == 'multi') { // multi entry
                        var tempArr = [{ 'value': $(e).closest('tr').children().eq(Number(j) + 8).find('input').val() }];
                        for (var k = 0; k < $('.multiTr_' + $(e).prev().val()).length; k++) {
                            tempArr.push({ 'value': $('.multiTr_' + $(e).prev().val()).eq(k).children().eq(Number(j) + 8).find('input').val() });
                        }
                        ocrDataItem = {
                            'engKey': labels[j].ENGNM,
                            'korKey': labels[j].KORNM,
                            'cnt': String($('.multiTr_' + $(e).prev().val()).length + 1),
                            'keyValue': tempArr
                        };

                    } else { //single entry
                        ocrDataItem = {
                            'engKey': labels[j].ENGNM,
                            'korKey': labels[j].KORNM,
                            'cnt': '1',
                            'keyValue': [{ 'value': $(e).closest('tr').children().eq(Number(j) + 8).find('input').val() }]
                        };
                    }
                    ocrDataArr.push(ocrDataItem);
                }
                console.log(itemJson);
                itemJson.ocrData = ocrDataArr;
                sendJson.push(itemJson);
            }
        });

        // 데이터 전송하기
        $.ajax({
            url: '/docManagement/sendOcrData',
            type: 'post',
            datatype: 'json',
            data: JSON.stringify({ 'sendData': sendJson, 'dataCnt': String(sendDocCount) }),
            contentType: 'application/json; charset=UTF-8',
            beforeSend: function () {
                $('#progressMsgTitle').html("전송 중..");
                progressId = showProgressBar();
            },
            success: function (data) {
                console.log(data);
                if (!data.error) {

                } else {

                }
                endProgressBar(progressId);
            },
            error: function (err) {
                console.log(err);
                fn_alert('alert', 'ERROR');
                endProgressBar(progressId);
            }
        });
    });
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

// 페이징 번호 click 이벤트
function btnPagingClick() {
    $('.li_paging > a').click(function () {
        var cdSite = $('#searchSiteCd').val();
        var docTopType = $('#docTopTypeSelect').val();
        var startDate = $('#searchStartDate').val();
        var endDate = $('#searchEndDate').val();
        var processState = $('#processStateSelect').val();
        var fileName = $('#searchFileNm').val();
        var sequence = $('#searchSequence').val();
        var pagingCount = $(this).closest('.li_paging').val();

        var params = {
            'cdSite':cdSite,
            'docTopType': docTopType,
            'startDate': startDate,
            'endDate': endDate,
            'processState': processState,
            'fileName': fileName,
            'sequence': sequence,
            'pagingCount': pagingCount
        };
        selectBatchPoMlExport(params, false);
        hidePreviewImage();
    });
}

// 페이징처리 html 렌더링
function appendPaging(curPage, totalCount) {
    var paging_result = '';
    var maxPageInSet = 10, // 페이지 카운트 갯수
        maxEntityInPage = 30, // 한 페이지당 컨텐츠 수
        totalPage = Math.ceil(totalCount / maxEntityInPage), // 전체 페이지수
        totalSet = Math.ceil(totalPage / maxPageInSet), // 전체 세트수
        curSet = Math.ceil(curPage / maxPageInSet), // 현재 세트번호
        startPage = ((curSet - 1) * maxPageInSet) + 1, // 현재 세트내 출력될 시작 페이지
        endPage = (startPage + maxPageInSet) - 1; // 현재 세트내 출력될 마지막 페이지

    paging_result += '<ul class="pagination pagination-sm no-margin ">';
    //paging_result += '<li><a href="#"><i class="fa fa-angle-double-left"></i></a></li>';
    //paging_result += '<li><a href="#"><i class="fa fa-angle-left"></i></a></li>';
    /** 1개 세트내 Previous 페이지 출력여부 설정(PreviousPage=StartPage-1) **/
    if (curSet > 1) {
        paging_result += '<li class="li_paging" value="' + (startPage - 1) + '"><a href="#" onclick="return false;"><i class="fa fa-angle-left"></i></a></li>';
    }
    /** 1개 세트내 페이지 출력여부 설정(페이지 순환하면서 요청페이지와 같을 경우 해당 페이지 비활성화 처리) **/
    for (var i = startPage; i <= endPage; i++) {
        if (i > totalPage) break;
        paging_result += '<li class=' + (i == curPage ? '"li_paging active"' : '"li_paging"') + ' value="' + i + '"><a href="#" onclick="return false;">' + i + '</a></li>';
    }
    /** 1개 세트내 Next 페이지 출력여부 설정(NextPage=EndPage+1) **/
    if (curSet < totalSet) {
        paging_result += '<li class="li_paging" value="' + (endPage + 1) + '"><a href="#" onclick="return false;"><i class="fa fa-angle-right"></i></a></li>';
    }
    //paging_result += '<li><a href="#"><i class="fa  fa-angle-right"></i></a></li>';
    //paging_result += '<li><a href="#"><i class="fa  fa-angle-double-right"></i></a></li>';
    paging_result += '</ul>';
    
    return paging_result;
}