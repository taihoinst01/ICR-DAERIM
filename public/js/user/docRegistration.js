"use strict";

var progressId; // progress Id
var deleteList = []; // 문서등록 테이블 행 삭제시 seq번호 저장

$(function () {
	_init();

});


$(document).on('change', '#docToptype', function () {
	var docToptype = $(this).val();
	//console.log(docToptype);

	// 문서타입 신규 클릭시
	if (docToptype == 0) {
		$('.newDocEdit').show();
	} else {
		$('.newDocEdit').hide();
	}
	fn_selectDocLabelDefList(docToptype);
})

function fn_selectDocTopType(docToptype) {
	$.ajax({
		url: '/docRegistration/selectDocTopType',
		type: 'post',
		datatype: "json",
		contentType: 'application/json; charset=UTF-8',
		beforeSend: function () {
			$('#docToptype').empty();
			$('.newDocEdit').hide();
			$("#progressMsgTitle").html("Search DocList...");
			progressId = showProgressBar();
		},
		success: function (data) {
			//console.log(data);
			var appendOptionHtml = '';
			if (data) {
				var docToptypeList = data.docToptypeList;
				var docToptypeListLength = docToptypeList.length;

				appendOptionHtml += '<option value="0">신규</option>';

				if (docToptypeListLength > 0) {

					for (var i = 0; i < docToptypeListLength; i++) {
						if (docToptype) {
							appendOptionHtml += '<option value="' + docToptypeList[i].SEQNUM + '"' + (docToptype == docToptypeList[i].SEQNUM ? 'selected' : '') + '>' + docToptypeList[i].KORNM + '</option>';
						} else {
							appendOptionHtml += '<option value="' + docToptypeList[i].SEQNUM + '"' + (i == 0 ? 'selected' : '') + '>' + docToptypeList[i].KORNM + '</option>';
						}
					}
				}

				$('#docToptype').append(appendOptionHtml);
				fn_selectDocLabelDefList($('#docToptype').val());
			}
		}
	})
}

function fn_selectDocLabelDefList(docToptype) {
	if (docToptype != 0) {
		var param = { 'docToptype': docToptype };

		$.ajax({
			url: '/docRegistration/selectDocLabelDefList',
			type: 'post',
			datatype: "json",
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify(param),
			beforeSend: function () {
				$('#tbody_docList').empty();
			},
			success: function (data) {
				endProgressBar(progressId);
				console.log(data);

				if (data) {
					
					var docToptypeList = data.docToptypeList;
					
					var docToptypeListLength = docToptypeList.length;
					var appendDocListHtml = '';

					if (docToptypeListLength > 0) {

						var labeltypeList = ['T', 'P'];
						var amountList = ['single', 'multi', 'submulti'];

						for (var i = 0; i < docToptypeListLength; i++) {
							console.log("checkbox val : " + docToptypeList[i].ESSENTIALVAL);
							//checked="checked"
							if (docToptypeList[i].ESSENTIALVAL == "1") {
								appendDocListHtml += '<tr class="originalTr" data-seq="' + docToptypeList[i].SEQNUM + '">' +
									'<td><input type="text" value="' + docToptypeList[i].ENGNM + '" class="inputst_box03" ' +
									'       data-originalValue="' + docToptypeList[i].ENGNM + '"></td>' +
									'<td><input type="text" value="' + nvl(docToptypeList[i].KORNM) + '" class="inputst_box03" ' +
									'       data-originalValue="' + nvl(docToptypeList[i].KORNM) + '"></td>' +
									'<td><select class="inputst_box03" data-originalValue="' + docToptypeList[i].LABELTYPE + '">' +
									fn_makeOptionHtml(labeltypeList, docToptypeList[i].LABELTYPE) + '</td>' +
									'<td><select class="inputst_box03" data-originalValue="' + docToptypeList[i].AMOUNT + '">' +
									fn_makeOptionHtml(amountList, docToptypeList[i].AMOUNT) + '</td>' +
									'<td><input type="text" value="' + docToptypeList[i].VALID + '" class="inputst_box03" ' +
									'       data-originalValue="' + docToptypeList[i].VALID + '"></td>' +
									'<td><input type="checkbox" value="' + docToptypeList[i].ESSENTIALVAL + '" id = "essentialChk" ' +
									'       data-originalValue="' + docToptypeList[i].ESSENTIALVAL + '" checked ></td>' +
									'<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>' +
									'</tr>';
							}
							else {
								console.log("checkbox val : " + docToptypeList[i].ESSENTIALVAL);
								appendDocListHtml += '<tr class="originalTr" data-seq="' + docToptypeList[i].SEQNUM + '">' +
									'<td><input type="text" value="' + docToptypeList[i].ENGNM + '" class="inputst_box03" ' +
									'       data-originalValue="' + docToptypeList[i].ENGNM + '"></td>' +
									'<td><input type="text" value="' + nvl(docToptypeList[i].KORNM) + '" class="inputst_box03" ' +
									'       data-originalValue="' + nvl(docToptypeList[i].KORNM) + '"></td>' +
									'<td><select class="inputst_box03" data-originalValue="' + docToptypeList[i].LABELTYPE + '">' +
									fn_makeOptionHtml(labeltypeList, docToptypeList[i].LABELTYPE) + '</td>' +
									'<td><select class="inputst_box03" data-originalValue="' + docToptypeList[i].AMOUNT + '">' +
									fn_makeOptionHtml(amountList, docToptypeList[i].AMOUNT) + '</td>' +
									'<td><input type="text" value="' + docToptypeList[i].VALID + '" class="inputst_box03" ' +
									'       data-originalValue="' + docToptypeList[i].VALID + '"></td>' +
									'<td><input type="checkbox" value="' + docToptypeList[i].ESSENTIALVAL + '" id = "essentialChk"' +
									'       data-originalValue="' + docToptypeList[i].ESSENTIALVAL + '"  ></td>' +
									'<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>' +
									'</tr>';
							}
						}
					} else {
						appendDocListHtml += '<tr class="newTr">' +
							'<td>' +
							'<input type="text" class="inputst_box04" placeholder="컬럼명(영문)을 입렵해주세요" >' +
							'</td>' +
							'<td>' +
							'<input type="text" class="inputst_box04" placeholder="컬럼명(한글)을 입렵해주세요" >' +
							'</td>' +
							'<td>' +
							'<select class="inputst_box04">' +
							'<option value="T">값 + 위치</option>' +
							'<option value="P">위치</option>' +
							'</select>' +
							'</td>' +
							'<td>' +
							'<select class="inputst_box04">' +
							'<option>single</option>' +
							'<option>multi</option>' +
							'<option>submulti</option>' +
							'</select>' +
							'</td>' +
							'<td>' +
							'<input type="text" class="inputst_box04" placeholder="정규식을 입력해주세요" >' +
							'</td>' +
							'<td>' +
							'<input type="checkbox" >' +
							'</td>' +
							'<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>'
						'</tr>';
					}
				}

                //$(".docTable2").css({ 'height': (docToptypeListLength * 51) + 40 + 'px' });
				$('#tbody_docList').html(appendDocListHtml);
				$(".docTable2").mCustomScrollbar("destroy");
			}
		})

		function fn_makeOptionHtml(labeltypeList, labeltype) {
			var makeOptionHtml = '';
			var labeltypeListLength = labeltypeList.length;
			for (var i = 0; i < labeltypeListLength; i++) {

				if (labeltypeList[i] == labeltype) {
					makeOptionHtml += '<option value="' + labeltypeList[i] + '" selected>';
				} else {
					makeOptionHtml += '<option value="' + labeltypeList[i] + '">';
				}

				// tbl_icr_label_def 테이블 조회시 LABELTYPE 컬럼 값이 'T' 또는 'P' 일때 값을 치환하고 아닌 경우에는 DB 조회 결과 그대로 출력
				if (labeltypeList[i] == 'T') {
					makeOptionHtml += '값 + 위치';
				} else if (labeltypeList[i] == 'P') {
					makeOptionHtml += '위치';
				} else {
					makeOptionHtml += labeltypeList[i];
				}

				makeOptionHtml += '</option>';
			}

			return makeOptionHtml;
		}
	} else {
		endProgressBar(progressId);
		var appendDocListHtml = '<tr class="newTr">' +
			'<td>' +
			'<input type="text" class="inputst_box04" placeholder="컬럼명(영문)을 입렵해주세요" >' +
			'</td>' +
			'<td>' +
			'<input type="text" class="inputst_box04" placeholder="컬럼명(한글)을 입렵해주세요" >' +
			'</td>' +
			'<td>' +
			'<select class="inputst_box04">' +
			'<option value="T">값 + 위치</option>' +
			'<option value="P">위치</option>' +
			'</select>' +
			'</td>' +
			'<td>' +
			'<select class="inputst_box04">' +
			'<option>single</option>' +
			'<option>multi</option>' +
			'<option>submulti</option>' +
			'</select>' +
			'</td>' +
			'<td>' +
			'<input type="text" class="inputst_box04" placeholder="정규식을 입력해주세요" >' +
			'</td>' +
			'<td>' +
			'<input type="checkbox" >' +
			'</td>' +
			'<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>' +
			'</tr>';
			$('#tbody_docList').html(appendDocListHtml);
			$('.docTable2').mCustomScrollbar('destroy');
			$('.newDocEdit').show();
	}
}


$(document).on('click', '#addTbody', function () {
	var appendDocListHtml = '<tr class="newTr">' +
		'<td>' +
		'<input type="text" class="inputst_box04" placeholder="컬럼명(영문)을 입렵해주세요" >' +
		'</td>' +
		'<td>' +
		'<input type="text" class="inputst_box04" placeholder="컬럼명(한글)을 입렵해주세요" >' +
		'</td>' +
		'<td>' +
		'<select class="inputst_box04">' +
		'<option value="T">값 + 위치</option>' +
		'<option value="P">위치</option>' +
		'</select>' +
		'</td>' +
		'<td>' +
		'<select class="inputst_box04">' +
		'<option>single</option>' +
		'<option>multi</option>' +
		'<option>submulti</option>' +
		'</select>' +
		'</td>' +
		'<td>' +
		'<input type="text" class="inputst_box04" placeholder="정규식을 입력해주세요" >' +
		'</td>' +
		'<td>' +
		'<input type="checkbox" >' +
		'</td>' +
		'<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>'
	'</tr>';
	$('#tbody_docList').append(appendDocListHtml);

	$(".docTable2").mCustomScrollbar("destroy");
	$('#tbody_div').animate({scrollTop:$("#tbody_div")[0].scrollHeight}, 'slow');
})

$(document).on('click', '.btn_delete', function () {
	var seq = $(this).closest('tr').attr('data-seq');
	//console.log(seq);
	if (seq) {
		deleteList.push(seq);
	}
	$(this).closest('tr').remove();
})

// 문서등록 테이블 selectbox 수정시 tr 색깔 변경
$(document).on('change', '#tbody_docList .originalTr select', function () {
	var originalValue = $(this).attr('data-originalValue');
	var changeValue = $(this).val();
	//console.log(originalValue);
	//console.log(changeValue);

	if (originalValue == changeValue) {
		$(this).closest('td').removeClass('on');
		if ($(this).closest('tr').find('td.on').length == 0) {
			$(this).closest('tr').removeClass('on');
		}
	} else {
		$(this).closest('td').addClass('on');
		$(this).closest('tr').addClass('on');
	}

})

// 문서등록 테이블 input[text] 수정시 tr 색깔 변경
$(document).on('focusout', '#tbody_docList .originalTr input[type=text]', function () {
	var originalValue = $(this).attr('data-originalValue');
	var changeValue = $(this).val();
	//console.log(originalValue);
	//console.log(changeValue);

	if (originalValue == changeValue) {
		$(this).closest('td').removeClass('on');
		if ($(this).closest('tr').find('td.on').length == 0) {
			$(this).closest('tr').removeClass('on');
		}
	} else {
		$(this).closest('td').addClass('on');
		$(this).closest('tr').addClass('on');
	}

})

// 문서등록 테이블 checkbox 수정시 tr 색깔 변경
$(document).on('change', '#tbody_docList .originalTr input[type=checkbox]', function () {
	var originalValue = $(this).attr('data-originalValue');
	//console.log("originalValue : " + originalValue + "current value : " + $(this).is(":checked"));

	var changeValue = "";
	if ($(this).is(":checked")) { changeValue = "1"; }
	else { changeValue = "0"; }
	//console.log(originalValue);
	//console.log(changeValue);

	if (originalValue == changeValue) {
		$(this).closest('td').removeClass('on');
		if ($(this).closest('tr').find('td.on').length == 0) {
			$(this).closest('tr').removeClass('on');
		}
	} else {
		$(this).closest('td').addClass('on');
		$(this).closest('tr').addClass('on');
	}

})

/**
 * 문서등록 저장
 * 추가, 수정, 삭제 행위에 따른 tbl_icr_label_def 테이블 동기화
 */
$(document).on('click', '#btn_save', function () {

	
	var changeList = [];
	var insertList = [];
	var docToptype = $('#docToptype').val();
	var docNameEng = $('#docNameEng').val().trim();
	var docNameKor = $('#docNameKor').val().trim();

	if (docToptype == 0 && docNameEng == "") {
		fn_alert('alert', '신규문서명을 입력해주세요.');
		$('#docNameEng').focus();
		return;
	}

	// 추가
	var $newTr = $('#tbody_docList .newTr');
	var newTrLength = $newTr.length;
	for (var i = 0; i < newTrLength; i++) {
		var engNm = $newTr[i].children[0].getElementsByTagName('input')[0].value.trim();
		var korNm = $newTr[i].children[1].getElementsByTagName('input')[0].value.trim();
		var labelType = $newTr[i].children[2].getElementsByTagName('select')[0].value;
		var amount = $newTr[i].children[3].getElementsByTagName('select')[0].value;
		var valid = $newTr[i].children[4].getElementsByTagName('input')[0].value.trim();
		var essentialVal = $newTr[i].children[5].getElementsByTagName('input');
		var essential = "";
		console.log(essentialVal.length + "essentialVal.type : " + essentialVal[0].type);

		/*정규식 SQL INJECTUION 방어*/
		var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;

		var engNm = engNm.replace(regExp, "");
		var korNm = korNm.replace(regExp, "");

		if (essentialVal[0].type == "checkbox") {

			console.log("essentialVal.checked : " + essentialVal[0].checked);
			if (essentialVal[0].checked) {
				essential = "1";
			}
			else {
				essential = "0";
			}
		}

		if (engNm == "" || valid == "") {
			fn_alert('alert', '값을 입력해주시거나 행을 삭제해주세요');
			$newTr[i].children[0].getElementsByTagName('input')[0].focus();
			return;
		}
		console.log("추가 essential : " + essential);
		var trValue = {
			'engNm': engNm,
			'korNm': korNm,
			'labelType': labelType,
			'amount': amount,
			'valid': valid,
			'essentialVal': essential,
		}
		insertList.push(trValue);
		console.log(insertList.length + "insertList : " + insertList[0].essentialVal);
	}

	// 수정
	var $changeTr = $('#tbody_docList .originalTr.on');
	var changeTrLength = $changeTr.length;
	for (var i = 0; i < changeTrLength; i++) {

		var engNm = $changeTr[i].children[0].getElementsByTagName('input')[0].value.trim();
		var korNm = $changeTr[i].children[1].getElementsByTagName('input')[0].value.trim();
		var labelType = $changeTr[i].children[2].getElementsByTagName('select')[0].value;
		var amount = $changeTr[i].children[3].getElementsByTagName('select')[0].value;
		var valid = $changeTr[i].children[4].getElementsByTagName('input')[0].value.trim();
		

		var essentialVal = $changeTr[i].children[5].getElementsByTagName('input');
		

		/*정규식 SQL INJECTUION 방어*/
		var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
		
		var engNm = engNm.replace(regExp, "");
		var korNm = korNm.replace(regExp, "");
		
		var essential = "";
		console.log(essentialVal.length + "essentialVal.type : " + essentialVal[0].type);
		if (essentialVal[0].type == "checkbox") {

			console.log("essentialVal.checked : " + essentialVal[0].checked);
			if (essentialVal[0].checked) {
				essential = "1";
			}
			else {
				essential = "0";
			}
			console.log("essential : " + essential);
		}

		if (engNm == "" || valid == "") {
			fn_alert('alert', '값을 입력해주시거나 행을 삭제해주세요');
			$changeTr[i].children[0].getElementsByTagName('input')[0].focus();
			return;
		}

		
		var trValue = {
			'seqNum': $changeTr[i].getAttribute('data-seq'),
			'engNm': $changeTr[i].children[0].getElementsByTagName('input')[0].value,
			'korNm': $changeTr[i].children[1].getElementsByTagName('input')[0].value,
			'labelType': $changeTr[i].children[2].getElementsByTagName('select')[0].value,
			'amount': $changeTr[i].children[3].getElementsByTagName('select')[0].value,
			'valid': $changeTr[i].children[4].getElementsByTagName('input')[0].value,
			'essentialVal': essential,
		}
		/*정규식 SQL INJECTUION 방어*/
		trValue.engNm = trValue.engNm.replace(regExp, "");
		trValue.korNm = trValue.korNm.replace(regExp, "");

		changeList.push(trValue);
		console.log(changeList.length + "insertList : " + changeList[0].essentialVal);
	}

	// 삭제는 상단 전역변수로 저장돼있음

	if (docToptype != 0 && insertList.length == 0 && changeList.length == 0 && deleteList.length == 0) {
		fn_alert('alert', '변경사항이 없습니다');
		return;
	}

	var param = {
		'docToptype': docToptype,
		'insertList': insertList,
		'changeList': changeList,
		'deleteList': deleteList,
		'docNameEng': docNameEng,
		'docNameKor': docNameKor
	};

	$.ajax({
		url: '/docRegistration/updateDocList',
		type: 'post',
		datatype: "json",
		contentType: 'application/json; charset=UTF-8',
		data: JSON.stringify(param),
		beforeSend: function () {
			$('#tbody_docList').empty();
			$("#progressMsgTitle").html("Update DocList...");
			progressId = showProgressBar();
		},
		success: function (data) {
			endProgressBar(progressId);
			if (data.docToptype) {
				docToptype = data.docToptype;
			}
			fn_selectDocTopType(docToptype);
		}
	})

})


// 초기화
function _init() {
	fn_selectDocTopType(); //doctoptype 검색
}



function checkboxChecked(essentialval) {

	if (essentialval == "1") {

	}
	else {
		document.getElementById(i).checked = true;
	}

}