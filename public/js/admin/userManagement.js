﻿'use strict';
var curPage = 1;

$(function () {
    $('.um_select select').stbDropdown();
    insUserBtnEvent(); // 사용자 추가 이벤트

    // 사용자 조회
    $("#btn_search").on("click", function () {
        fn_searchUser();
    });
    // 사용자 등록
    $("#btn_insert").on("click", function () {
        fn_insertUser();
    });
    // 사용자 수정
    $("#btn_update").on("click", function () {
        fn_updateUser();
    });
    // 초기화 (테스트)
    $("#btn_init").on("click", function () {
        fn_initUser();
    });

    fn_searchUser();
    //fn_searchHighApproval(0, "");


    // 사용자 비밀번호 수정
    //$("#updatePwBtn").on("click", function () {
    //    updatePw();
    //});

    // 페이징 초기화
    // $("#pagination").html(pagination(curPage, $("#totalCount").val()));



    var a = $('#content').width();
    var b = $(document).width();
    var c = $(this).width();
    $(window).resize(function () {
        console.log(a);
        console.log(b);
        console.log(c);
    });
    //$(window).scroll(function (){
    //    console.log('aa');
    //});
});

/**
 * 페이지 이동
 */
function goPage(page) {
    searchUser(page);
}
/**
 * 선택 사용자 초기화
 */
function fn_initUser() {
    $("#seqNum").val("");
    $("#userId").val("");
    $("#userPw").val("");
    $("#email").val("");
    $("#note").val("");
    $("input:checkbox[name='approval']").prop("checked", false);
    $("input:checkbox[name='approval']").parent().removeClass('ez-checked');
    $("#highApprovalId").val("");
    $(".myValue").html("전 체");
    fn_searchHighApproval(0, "");
}
/**
 * 사용자 조회
 */
function fn_searchUser() {
    //curPage = isNull(curPage) ? 1 : curPage;
    var appendHtml = "";
    var param = {
        //'userId': $("#searchUserId").val(),
        //'startNum': ((curPage - 1) * MAX_ENTITY_IN_PAGE),
        //'endNum': MAX_ENTITY_IN_PAGE
    };
    $.ajax({
        url: '/userManagement/searchUser',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $("#progressMsgTitle").html("사용자를 조회 중 입니다.");
            $("#progressMsgDetail").html("..........");
            startProgressBar(); // 프로그레스바 시작
            addProgressBar(1, 1); // 프로그레스바 진행
        },
        success: function (data) {
            addProgressBar(2, 99); // 프로그레스바 진행
            console.log("data.. : " + JSON.stringify(data));
            if (data.length > 0) {
                $.each(data, function (index, entry) {//SEQNUM
                    appendHtml += 
                    '<tr class="tr_userInfo empNo_' + nvl(entry.USERID) + '">' + 
                        '<td>' + nvl(entry.USERID) + '<input type="hidden" name="hiddenPw" value="' + entry.USERPW + '"><input type="hidden" name="hiddenSeq" value="' + entry.SEQNUM + '"></td>' + 
                        '<td>' + nvl(entry.NOTE) + '</td>' + 
                        '<td>' + nvl(entry.SCANAPPROVAL) + '</td>' + 
                        '<td>' + nvl(entry.ICRAPPROVAL) + '</td>' + 
                        '<td>' + nvl(entry.MIDDLEAPPROVAL) + '</td>' + 
                        '<td>' + nvl(entry.LASTAPPROVAL) + '</td>' + 
                        '<td>' + nvl(entry.ADMIN) + '</td>' + 
                        '<td>' + nvl(entry.LASTLOGINDATE) + '</td>' + 
                        '<td>' + nvl(entry.OCRUSECOUNT) + '</td>' + 
                        '<td><button class="btn btn_delete" style="display: none;" onclick="javascript:openDeleteUser(' + entry.SEQNUM + ')">Delete</button></td>;' + 
                    '</tr>';
                });
                //<td><button class="btn btn-default" data-toggle="modal" data-target="#userUpdate" id="updatePwBtn" onclick="javascript:openUpdatePw(${entry.seqNum}, ${entry.userId})">수정</button></td>
            }
            $("#tbody_user").empty().append(appendHtml);
            //$("#pagination").html(pagination(curPage, data[0].totalCount));

            $(".tableSize1").css({ 'height': data.length * 37.5 + 'px' });

            endProgressBar();
        },
        error: function (err) {
            endProgressBar();
            console.log(err);
        }
    });
}

// 사용자 클릭
$(document).on('click', '.tr_userInfo', function () {
    var empNo = "";
    var empPw = "";
    var empSeq = "";

    // 체크박스 초기화
    $('.chk_reset').prop('checked', false);
    $('.chk_reset').parent().removeClass('ez-checked');

    // 삭제버튼 초기화
    $('#tbody_user tr').find('td:last button').hide();

    $(this).find('td:last button').show();
    if ($(this).hasClass('on')) {
        $(this).removeClass('on');

        $(this).find('td:last button').hide();
        $('#btn_update').hide();
        $('#btn_insert').show();
    } else {
        $('#tbody_user tr').removeClass('on');
        $(this).addClass('on');
        if ($(this).find('td:eq(2)').text() == 'Y') { // 스캔
            $('#mApproval1').click();
        }
        if ($(this).find('td:eq(3)').text() == 'Y') { // icr
            $('#mApproval2').click();
        }
        if ($(this).find('td:eq(4)').text() == 'Y') { // 중간
            $('#mApproval3').click();
        }
        if ($(this).find('td:eq(5)').text() == 'Y') { // 최종
            $('#mApproval4').click();
        }
        if ($(this).find('td:eq(6)').text() == 'Y') { // 관리자
            $('#mAdmin').click();
        }
        if ($(this).find('td:eq(7)').text() == 'Y') { // 외부사용자
            $('#mExternalUsers').click();
        }
        
        empNo = $(this).find('td:eq(0)').text();
        empPw = $(this).find('input[name=hiddenPw]').val();
        empSeq = $(this).find('input[name=hiddenSeq]').val();
        //empPw = $(this).find('input[type=hidden]').val();

        $(this).find('td:last button').show();
        $('#btn_update').show();
        $('#btn_insert').hide();
    }



    // 사번, PASSWORD 입력
    $('#empNo').val(empNo);
    $('#empPw').val(nvl(empPw));
    $('#seqNum').val(nvl(empSeq));

})


// 사용자 개별 조회
function fn_chooseUser(seqNum) {
    var param = {
        seqNum : seqNum
    };
    $.ajax({
        url: '/userManagement/chooseUser',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $("#progressMsgTitle").html("사용자를 조회 중 입니다.");
            $("#progressMsgDetail").html("..........");
            startProgressBar(); // 프로그레스바 시작
            addProgressBar(1, 1); // 프로그레스바 진행
        },
        success: function (data) {
            addProgressBar(2, 99); // 프로그레스바 진행
            if (data.length == 1) {
                fn_initUser(); // 초기화
                $("#btn_insert").hide();
                $("#btn_update").fadeIn(); // 수정모드
                $.each(data, function (index, entry) {
                    if (index == 0) {
                        $("#seqNum").val(entry["SEQNUM"])
                        $("#userId").val(entry["USERID"]);
                        $("#email").val(nvl(entry["EMAIL"]));
                        $("#note").val(nvl(entry["NOTE"]));
                        if (nvl(entry["SCANAPPROVAL"]) == "Y") {
                            $("#approval1").prop("checked", true);
                            $("#approval1").parent().addClass('ez-checked');
                        }
                        if (nvl(entry["MIDDLEAPPROVAL"]) == "Y") {
                            $("#approval3").prop("checked", true);
                            $("#approval3").parent().addClass('ez-checked');
                        }
                        if (nvl(entry["LASTAPPROVAL"]) == "Y") {
                            $("#approval4").prop("checked", true);
                            $("#approval4").parent().addClass('ez-checked');
                        }
                        //fn_searchHighApproval(entry["SEQNUM"], entry["HIGHAPPROVALID"]); // 상위결재자 목록 조회
                    }
                });
            } else {
                fn_alert('alert', "장애가 발생하였습니다.");
                return;
            }
            endProgressBar();
        },
        error: function (err) {
            endProgressBar();
            console.log(err);
        }
    });
};
// 상위결재자 조회
var fn_searchHighApproval = function (seqNum, id) {
    var param = {
        seqNum: seqNum
    };
    $.ajax({
        url: '/userManagement/searchHighApproval',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
        },
        success: function (data) {
            var appendHtml = "";
            if (data.length > 0) {
                $.each(data, function (index, entry) {
                    appendHtml += `<li><a class="a_userIdList" onclick="javascript:fn_selectHighApproval('${entry.SEQNUM}', '${entry.USERID}')">${entry.USERID}</a></li>`;
                    if (entry.USERID == id) {
                        $("#highApprovalId").val(entry.SEQNUM);
                        //$(".myValue").html(entry.USERID);
                    }
                });
            }
            $("#ul_highApproval").empty().append(appendHtml);
        },
        error: function (err) {
            console.log(err);
        }
    });
};
var fn_selectHighApproval = function (seqNum, userId) {
    $("#highApprovalId").val(seqNum);
    $(".myValue").html(userId);
};

/**
 * 등록/수정 validate and return parameters 
 */
var fn_validate = function (flag) {
    //예외 처리
    if (isNull($("#empNo").val())) {
        fn_alert('alert', "사용자 ID는 필수입니다.");
        $("#empNo").focus();
        return false;
    }
    if (flag == "INSERT" && isNull($("#empPw").val())) {
        fn_alert('alert', "사용자 비밀번호는 필수입니다.");
        $("#empPw").focus();
        return false;
    }
    var chkDupl = false;
    $(".a_userIdList").each(function (index) {
        if ($("#empNo").val() == $(this).html()) {
            chkDupl = true;
        }
    });
    if (chkDupl) {
        fn_alert('alert', `이미 ${$("#empNo").val()} 사번이 존재합니다.`);
        $("#empNo").focus();
        return false;
    }
    return true;
};
var fn_getParam = function () {
    var param = {
        seqNum: $("#seqNum").val(),
        userId: nvl($("#empNo").val()),
        userPw: nvl($("#empPw").val()),
        email: nvl($("#email").val()),
        note: nvl($("#note").val()),
        scanApproval: $("#mApproval1").is(":checked") ? "Y" : "N",
        icrApproval: $("#mApproval2").is(":checked") ? "Y" : "N",
        middleApproval: $("#mApproval3").is(":checked") ? "Y" : "N",
        lastApproval: $("#mApproval4").is(":checked") ? "Y" : "N",
        admin: $("#mAdmin").is(":checked") ? "Y" : "N",
        external: $("#mExternalUsers").is(":checked") ? "Y" : "N",
        highApprovalId: nvl($("#highApprovalId").val())
    };
    return param;
};

// 사용자 등록
function fn_insertUser() {
    var param = {};
    if (!fn_validate("INSERT")) return;
    else param = fn_getParam();

    console.log(`insert param : ${JSON.stringify(param)}`);
    $.ajax({
        url: '/userManagement/insertUser',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            if (data.CODE == "200") {
                fn_alert('alert', data.RESULT);
                fn_initUser(); // 초기화
                fn_searchUser();
            } else if(data.CODE == "300") {
                fn_alert('alert', data.RESULT);
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
}
// 사용자 수정
function fn_updateUser() {
    var param = {};
    if (!fn_validate("UPDATE")) return;
    else param = fn_getParam();
    console.log(`update param : ${JSON.stringify(param)}`);
    $.ajax({
        url: '/userManagement/updateUser',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            if (data.CODE == "200") {
                fn_alert('alert', data.RESULT);
                fn_initUser(); // 초기화
                $("#btn_update").hide();
                $("#btn_insert").fadeIn(); // 등록모드
                fn_searchUser();
            } else if (data.CODE == "300") {
                fn_alert('alert', data.RESULT);
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
}

// 사용자 추가
function insUserBtnEvent() {
    $('#insUserBtn').click(function () {
        //예외 처리
        if(isNull($("#userId").val())) {
            fn_alert('alert', "사용자 ID를 입력해주세요.");
            $("#userId").focus();
            return;
        }
        if (isNull($("#userPw").val())) {
            fn_alert('alert', "비밀번호를 입력해주세요.");
            $("#userPw").focus();
            return;
        }
        if (isNull($("#userPwConfirm").val())) {
            fn_alert('alert', "비밀번호를 확인해주세요.");
            $("#userPwConfirm").focus();
            return;
        }
        if ($("#userPw").val() != $("#userPwConfirm").val()) {
            fn_alert('alert', "비밀번호 확인이 일치하지 않습니다.");
            $("#userPwConfirm").focus();
            return;
        }
        $("#insUserForm").submit();
    });
}

// 비밀번호 변경 팝업 호출
function openUpdatePw(seqNum, userId) {
    $("#seqNumUpdate").val(seqNum);
}

// 비밀번호 변경
function updatePw() {
    //예외 처리
    if (isNull($("#userPwUpdate").val())) {
        fn_alert('alert', "비밀번호를 입력해주세요.");
        $("#userPwUpdate").focus();
        return;
    }
    if (isNull($("#userPwUpdateConfirm").val())) {
        fn_alert('alert', "비밀번호를 확인해주세요.");
        $("#userPwUpdateConfirm").focus();
        return;
    }
    if ($("#userPwUpdate").val() != $("#userPwUpdateConfirm").val()) {
        fn_alert('alert', "비밀번호 확인이 일치하지 않습니다.");
        $("#userPwUpdateConfirm").focus();
        return;
    }
    $("#updatePwForm").submit();
    fn_alert('alert', "수정되었습니다.");
}

/**
 * 사용자 삭제
 */
function openDeleteUser(seqNum) {
    fn_alert('confirm', "삭제하시겠습니까?", function () {
        deleteUser(seqNum);
    });
}
function deleteUser(seqNum) {
    console.log(seqNum);

    $.ajax({
        url: '/userManagement/deleteUser',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'seqNum': seqNum }),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            fn_alert('alert', "삭제되었습니다.");
            location.href = "/userManagement";
        },
        error: function (err) {
            console.log(err);
        }
    });
}
