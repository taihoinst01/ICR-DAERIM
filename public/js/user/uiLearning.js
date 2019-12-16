var lineText = []; // line별로 가공된 ocr데이터 배열
var totCount = 0; // 전체 분석 문서 개수
var ocrCount = 0; // ocr 수행 횟수
var searchDBColumnsCount = 0; // DB컬럼 조회 수행 횟수
var thumbImgs = []; // 썸네일 이미지 경로 배열
var thumnImgPageCount = 1; // 썸네일 이미지 페이징 번호
var thumnbImgPerPage = 6; // 한 페이지당 썸네일 이미지 개수
var x, y, textWidth, textHeight; // 문서 글씨 좌표
var mouseX, mouseY, mouseMoveX, mouseMoveY; // 마우스 이동 시작 좌표, 마우스 이동 좌표
var docPopImages; // 문서조회팝업 이미지 리스트
var docPopImagesCurrentCount = 1; // 문서조회팝업 이미지 현재 카운트
var docType = '';
var currentImgCount = 0;
var modifyData = []; // UI 수정할 데이터 

$(function () {

    init();
    uploadFileEvent();
    thumbImgPagingEvent();
    uiTrainEvent();
    popUpEvent();
    docPopRadioEvent();
    editBannedword();
    changeDocPopupImage();
    processFromDocManage();
    /*
    //구글 ocr test
    data = { "data": [{ "docCategory": { "DOCTYPE": 200, "DOCTOPTYPE": 58, "DOCSCORE": 0.8619246861924686, "DOCNAME": "대림_레미콘_경동_01" }, "data": [{ "location": "10,0,269,62", "text": "(A밧차107호" }, { "location": "319,0,117,62", "text": "다음)" }, { "location": "433,-14,132,62", "text": "납품서" }, { "location": "578,-14,188,62", "text": "일련번호" }, { "location": "793,-14,70,62", "text": "245" }, { "location": "911,0,161,62", "text": "당일계=" }, { "location": "1081,0,42,62", "text": "1," }, { "location": "1114,-14,98,62", "text": "438" }, { "location": "1505,-11,60,65", "text": "5번" }, { "location": "1595,-11,18,65", "text": "문" }, { "location": "479,127,348,84", "text": "레디믹스트" }, { "location": "876,127,281,84", "text": "콘크리트" }, { "location": "1198,127,205,84", "text": "납품서" }, { "location": "1501,127,24,84", "text": "(" }, { "location": "1556,127,133,84", "text": "납품서" }, { "location": "1733,127,24,84", "text": ")" }, { "location": "465,246,165,58", "text": "표준번호" }, { "location": "641,246,16,58", "text": ":" }, { "location": "698,246,74,58", "text": "KS" }, { "location": "806,246,16,58", "text": "F" }, { "location": "862,246,111,58", "text": "4009" }, { "location": "1514,265,95,74", "text": "No2" }, { "location": "1681,265,21,74", "text": "-" }, { "location": "1769,279,79,74", "text": "42." }, { "location": "940,290,293,48", "text": "고강도콘크리트" }, { "location": "908,305,23,47", "text": ".." }, { "location": "912,291,13,47", "text": "." }, { "location": "817,292,68,47", "text": "포장" }, { "location": "705,293,78,47", "text": "보통" }, { "location": "589,308,82,48", "text": "등급:" }, { "location": "475,295,52,48", "text": "종류" }, { "location": "543,295,13,47", "text": "·" }, { "location": "983,298,269,60", "text": "강도콘크리트" }, { "location": "749,318,188,59", "text": "053" }, { "location": "715,321,16,58", "text": "제" }, { "location": "639,327,16,58", "text": ":" }, { "location": "471,341,155,58", "text": "인증번호" }, { "location": "1290,369,107,70", "text": "2019" }, { "location": "1470,369,20,70", "text": "년" }, { "location": "1525,369,51,70", "text": "04" }, { "location": "1647,369,20,70", "text": "월" }, { "location": "1709,369,53,70", "text": "08" }, { "location": "1825,369,20,70", "text": "일" }, { "location": "466,374,163,58", "text": "인증기관" }, { "location": "643,374,16,58", "text": ":" }, { "location": "708,374,279,58", "text": "한국표준협회" }, { "location": "1458,459,432,73", "text": "안양레미콘주식회사" }, { "location": "8,495,269,80", "text": "대림산업" }, { "location": "288,495,23,80", "text": "(" }, { "location": "345,495,23,80", "text": "주" }, { "location": "395,495,23,80", "text": ")" }, { "location": "682,511,89,54", "text": "귀하" }, { "location": "99,633,161,89", "text": "납품" }, { "location": "369,633,161,89", "text": "장소" }, { "location": "581,619,249,89", "text": "대림산업" }, { "location": "858,619,26,89", "text": "(" }, { "location": "903,619,26,89", "text": "주" }, { "location": "981,633,53,89", "text": ")-" }, { "location": "1020,619,645,89", "text": "e편한세상보라매2차" }, { "location": "894,717,38,70", "text": "14" }, { "location": "957,731,128,70", "text": "-7620" }, { "location": "1152,731,130,70", "text": "(0216" }, { "location": "1283,717,20,70", "text": ")" }, { "location": "103,739,117,65", "text": "운반" }, { "location": "308,739,117,65", "text": "차번" }, { "location": "491,725,18,65", "text": "호" }, { "location": "485,763,42,11", "text": "호" }, { "location": "796,823,479,65", "text": "16시" }, { "location": "1471,809,48,65", "text": "18" }, { "location": "1671,809,18,65", "text": "분" }, { "location": "437,832,101,59", "text": "출발" }, { "location": "485,840,42,11", "text": "발" }, { "location": "83,880,97,54", "text": "납품" }, { "location": "211,866,15,54", "text": "시" }, { "location": "288,866,15,54", "text": "각" }, { "location": "365,866,15,54", "text": "-" }, { "location": "1055,912,225,63", "text": "70시" }, { "location": "507,914,12,43", "text": "착" }, { "location": "423,916,12,43", "text": "도" }, { "location": "485,939,42,11", "text": "착" }, { "location": "1512,988,70,46", "text": "252" }, { "location": "108,1012,152,58", "text": "납품" }, { "location": "374,1012,151,58", "text": "용적" }, { "location": "1128,1017,152,50", "text": "누계" }, { "location": "1871,1011,8,31", "text": "m" }, { "location": "47,1070,43,12", "text": "-" }, { "location": "1331,1072,124,41", "text": "슬럼프" }, { "location": "672,1088,316,35", "text": "굵은골재의최대" }, { "location": "1484,1076,76,41", "text": "또는" }, { "location": "1076,1077,156,48", "text": "호칭강도" }, { "location": "1658,1093,244,44", "text": "시멘트종류에" }, { "location": "333,1081,185,46", "text": "콘크리트의" }, { "location": "1332,1103,124,48", "text": "즐럼프" }, { "location": "1481,1103,88,48", "text": "플로" }, { "location": "679,1122,209,42", "text": "치수에따른" }, { "location": "890,1108,77,42", "text": "구분" }, { "location": "83,1128,103,54", "text": "호칭" }, { "location": "281,1133,111,46", "text": "종류에" }, { "location": "423,1147,161,46", "text": "따른구분" }, { "location": "1113,1149,97,41", "text": "(MPa" }, { "location": "1194,1135,11,41", "text": ")" }, { "location": "1666,1149,217,44", "text": "따른구분" }, { "location": "779,1163,70,31", "text": "(mm" }, { "location": "854,1149,8,31", "text": ")" }, { "location": "1395,1151,8,29", "text": "(" }, { "location": "1436,1165,75,29", "text": "mm)" }, { "location": "1069,1198,69,62", "text": "21" }, { "location": "1577,1199,343,59", "text": "보통포틀랜드1종" }, { "location": "1399,1202,66,59", "text": "150" }, { "location": "68,1205,18,65", "text": "방" }, { "location": "154,1205,18,65", "text": "법" }, { "location": "252,1205,315,65", "text": "보통콘크리트" }, { "location": "751,1206,60,54", "text": "25" }, { "location": "800,1314,15,54", "text": "배" }, { "location": "866,1314,15,54", "text": "합" }, { "location": "932,1314,15,54", "text": "표" }, { "location": "982,1314,15,54", "text": "(" }, { "location": "1024,1314,40,54", "text": "kg" }, { "location": "1075,1314,15,54", "text": "/" }, { "location": "1122,1328,55,54", "text": "m²)" }, { "location": "61,1399,157,74", "text": "시멘트①|" }, { "location": "248,1399,165,74", "text": "시멘트②|" }, { "location": "418,1385,135,74", "text": "시멘트③" }, { "location": "565,1385,21,74", "text": "]" }, { "location": "670,1385,21,74", "text": "물" }, { "location": "823,1385,95,74", "text": "회수수" }, { "location": "998,1385,143,74", "text": "잔골재①" }, { "location": "1190,1385,146,74", "text": "잔골재②" }, { "location": "1388,1385,133,74", "text": "잔골재③" }, { "location": "1583,1399,135,74", "text": "굵은골재(" }, { "location": "1697,1385,21,74", "text": "②" }, { "location": "1756,1385,165,74", "text": "굵은골재②" }, { "location": "1907,1385,21,74", "text": ")" }, { "location": "32,1499,63,44", "text": "250" }, { "location": "614,1499,69,44", "text": "166" }, { "location": "1197,1500,60,42", "text": "904" }, { "location": "1583,1502,68,40", "text": "922" }, { "location": "42,1591,304,48", "text": "굵은골재이혼화재" }, { "location": "348,1577,13,48", "text": "①" }, { "location": "417,1577,142,48", "text": "혼화재②" }, { "location": "609,1577,141,48", "text": "혼화재③" }, { "location": "800,1577,150,48", "text": "혼화제①" }, { "location": "991,1577,102,48", "text": "혼화제" }, { "location": "1112,1577,13,48", "text": "②" }, { "location": "1187,1577,102,48", "text": "혼화제" }, { "location": "1308,1577,13,48", "text": "③" }, { "location": "1378,1577,109,48", "text": "혼화제" }, { "location": "1499,1577,13,48", "text": "④" }, { "location": "1569,1577,102,48", "text": "혼화제" }, { "location": "1691,1577,13,48", "text": "⑤" }, { "location": "1765,1577,102,48", "text": "혼화제" }, { "location": "1887,1577,13,48", "text": "⑥" }, { "location": "253,1676,47,64", "text": "31" }, { "location": "451,1676,35,64", "text": "31" }, { "location": "1003,1677,13,48", "text": "2" }, { "location": "1028,1677,13,48", "text": "." }, { "location": "1052,1677,13,48", "text": "5" }, { "location": "76,1751,13,46", "text": "물" }, { "location": "138,1753,174,46", "text": "결합재비" }, { "location": "742,1753,163,48", "text": "잔골재율" }, { "location": "1502,1753,129,43", "text": "고형분율" }, { "location": "1387,1756,92,43", "text": "슬러지" }, { "location": "1303,1758,64,43", "text": "단위" }, { "location": "1249,1760,12,43", "text": "%" }, { "location": "388,1763,42,46", "text": "53" }, { "location": "1126,1763,12,43", "text": "7" }, { "location": "1100,1764,12,43", "text": "." }, { "location": "442,1765,13,46", "text": "." }, { "location": "1048,1765,40,44", "text": "49" }, { "location": "475,1766,13,46", "text": "2" }, { "location": "49,1861,105,46", "text": "비고)" }, { "location": "170,1847,132,46", "text": "배합의" }, { "location": "330,1847,85,46", "text": "종별" }, { "location": "441,1847,93,46", "text": "VO" }, { "location": "546,1847,186,46", "text": "시방배합" }, { "location": "1400,1902,104,67", "text": "감15" }, { "location": "1531,1920,19,66", "text": "±" }, { "location": "21,1925,148,65", "text": "염화물" }, { "location": "202,1925,83,65", "text": "함량" }, { "location": "438,1939,44,65", "text": "0." }, { "location": "489,1939,125,65", "text": "30g/" }, { "location": "614,1925,18,65", "text": "m" }, { "location": "684,1925,84,65", "text": "이하" }, { "location": "1586,1927,19,66", "text": "1" }, { "location": "1606,1930,19,66", "text": "." }, { "location": "930,1931,193,48", "text": "공기량" }, { "location": "1633,1933,19,66", "text": "5" }, { "location": "1653,1936,19,66", "text": "%" }, { "location": "1677,1938,183,67", "text": "Galaw" }, { "location": "249,2047,32,46", "text": "1." }, { "location": "307,2047,304,46", "text": "고성능AE감수제" }, { "location": "1588,2037,92,47", "text": "혼화재" }, { "location": "57,2068,12,45", "text": "지" }, { "location": "118,2068,83,45", "text": "정사" }, { "location": "250,2068,12,45", "text": "항" }, { "location": "1319,2068,14,49", "text": "※" }, { "location": "1350,2070,112,49", "text": "치환율" }, { "location": "1754,2070,9,33", "text": "-" }, { "location": "1778,2070,9,33", "text": "×" }, { "location": "1804,2070,76,33", "text": "1000" }, { "location": "1469,2077,14,49", "text": "=" }, { "location": "1524,2080,220,50", "text": "시멘트혼화재" }, { "location": "331,2106,210,58", "text": "플라이애시" }, { "location": "591,2120,50,58", "text": "10%" }, { "location": "655,2120,419,58", "text": ",고로슬래그미분말10" }, { "location": "1080,2120,109,58", "text": "%치환" }, { "location": "1191,2154,173,76", "text": "관고시" }, { "location": "1530,2166,180,77", "text": "it" }, { "location": "1027,2278,117,26", "text": "출하계" }, { "location": "1183,2278,7,26", "text": "및" }, { "location": "1457,2278,16,26", "text": "1" }, { "location": "1611,2278,16,26", "text": "1" }, { "location": "40,2289,111,46", "text": "인수자" }, { "location": "190,2289,76,46", "text": "확인" }, { "location": "988,2307,153,42", "text": "표시사항" }, { "location": "1165,2307,77,42", "text": "확인" }, { "location": "1485,2314,41,11", "text": "김" }, { "location": "1537,2316,43,12", "text": "종" }, { "location": "515,2331,156,35", "text": "VAL" }, { "location": "5,2438,43,40", "text": "11." }, { "location": "50,2424,121,40", "text": "레미콘에" }, { "location": "186,2424,118,40", "text": "계약외의" }, { "location": "321,2424,147,40", "text": "혼화재료를" }, { "location": "485,2424,147,40", "text": "첨가하거나" }, { "location": "655,2424,119,40", "text": "현장에서" }, { "location": "791,2424,80,40", "text": "가수를" }, { "location": "893,2424,52,40", "text": "하는" }, { "location": "963,2424,52,40", "text": "경우" }, { "location": "1207,2440,11,42", "text": "※" }, { "location": "1253,2440,144,42", "text": "출하계의" }, { "location": "1417,2440,107,42", "text": "날인이" }, { "location": "1543,2440,62,42", "text": "없는" }, { "location": "1629,2440,62,42", "text": "것은" }, { "location": "1720,2440,114,42", "text": "무효임" }, { "location": "416,2466,9,35", "text": "." }, { "location": "299,2467,112,35", "text": "없습니다" }, { "location": "166,2468,113,36", "text": "보증할수" }, { "location": "57,2469,89,36", "text": "품질을" }, { "location": "-7,2470,9,35", "text": "1" }, { "location": "1252,2484,70,42", "text": "위의" }, { "location": "1338,2484,108,42", "text": "물품을" }, { "location": "1484,2498,184,42", "text": "납품합니다." }, { "location": "3,2523,47,34", "text": "12." }, { "location": "51,2509,130,34", "text": "레미콘은" }, { "location": "195,2509,221,34", "text": "강알칼리성이기" }, { "location": "439,2509,87,34", "text": "때문에" }, { "location": "544,2509,87,34", "text": "피부나" }, { "location": "656,2509,56,34", "text": "눈에" }, { "location": "731,2509,88,34", "text": "접촉할" }, { "location": "856,2523,64,34", "text": "경우," }, { "location": "929,2509,87,34", "text": "염증을" }, { "location": "1091,2544,69,95", "text": "NO" }, { "location": "1229,2558,563,95", "text": "안양레미콘주식회사" }, { "location": "60,2548,89,38", "text": "일으킬" }, { "location": "171,2548,10,38", "text": "수" }, { "location": "223,2562,122,38", "text": "있습니다." }, { "location": "348,2548,56,38", "text": "눈에" }, { "location": "422,2548,81,38", "text": "들어간" }, { "location": "523,2548,113,38", "text": "경우에는" }, { "location": "660,2548,56,38", "text": "즉시" }, { "location": "734,2548,81,38", "text": "깨끗한" }, { "location": "835,2548,56,38", "text": "물로" }, { "location": "913,2548,10,38", "text": "잘" }, { "location": "949,2548,50,38", "text": "닦고" }, { "location": "61,2586,119,42", "text": "전문의의" }, { "location": "199,2586,79,42", "text": "진찰을" }, { "location": "304,2586,47,42", "text": "받아" }, { "location": "385,2600,131,42", "text": "주십시오." }, { "location": "37,2659,12,44", "text": "A" }, { "location": "84,2659,119,44", "text": "반드시" }, { "location": "231,2659,114,44", "text": "뒷면의" }, { "location": "363,2659,196,44", "text": "주의사항과" }, { "location": "587,2659,233,44", "text": "사용설명서를" }, { "location": "846,2659,148,44", "text": "숙지하여" }, { "location": "1021,2659,120,44", "text": "주시기" }, { "location": "1180,2673,167,44", "text": "바랍니다." }, { "location": "878,2810,120,47", "text": "출하실" }, { "location": "1025,2810,13,47", "text": ":" }, { "location": "1061,2810,13,47", "text": "(" }, { "location": "1100,2824,94,47", "text": "031)" }, { "location": "1179,2810,87,47", "text": "474" }, { "location": "1282,2810,13,47", "text": "-" }, { "location": "1305,2810,125,47", "text": "7126" }, { "location": "98,2813,126,44", "text": "사무실" }, { "location": "249,2813,12,44", "text": ":" }, { "location": "300,2827,73,44", "text": "(02" }, { "location": "366,2813,12,44", "text": ")" }, { "location": "417,2827,102,44", "text": "568-" }, { "location": "534,2827,125,44", "text": "7121~" }, { "location": "677,2813,12,44", "text": "2" }, { "location": "297,2878,105,51", "text": "(031" }, { "location": "401,2878,102,51", "text": ")474" }, { "location": "500,2864,14,51", "text": "-" }, { "location": "528,2864,99,51", "text": "7122" }, { "location": "646,2864,14,51", "text": "~" }, { "location": "682,2864,14,51", "text": "5" }], "fileinfo": { "filepath": "http://127.0.0.1/img/test.pdf", "convertFilepath": "http://127.0.0.1/img/test.jpg" } }] };
    //data = { "data": [{ "docCategory": { "DOCTYPE": 200, "DOCTOPTYPE": 58, "DOCSCORE": 0.8619246861924686, "DOCNAME": "대림_레미콘_경동_01" }, "data": [{ "location": "416,93,263,65", "text": "레디믹스트" }, { "location": "709,93,208,65", "text": "콘크리트" }, { "location": "949,93,148,65", "text": "납품서" }, { "location": "662,174,16,58", "text": "(" }, { "location": "692,174,140,59", "text": "납품서" }, { "location": "839,177,16,58", "text": ")" }, { "location": "939,178,162,59", "text": "앞차량NO" }, { "location": "1104,180,16,58", "text": ":" }, { "location": "1146,181,104,58", "text": "8424" }, { "location": "714,263,23,81", "text": "(" }, { "location": "772,263,46,81", "text": "66" }, { "location": "894,263,23,81", "text": "4" }, { "location": "976,263,23,81", "text": "비" }, { "location": "160,295,8,31", "text": "표" }, { "location": "202,295,8,31", "text": "준" }, { "location": "243,295,8,31", "text": "명" }, { "location": "275,295,8,31", "text": ":" }, { "location": "296,295,131,31", "text": "레디믹스트" }, { "location": "448,295,112,31", "text": "콘크리트" }, { "location": "151,327,106,29", "text": "표준번호" }, { "location": "273,327,8,29", "text": ":" }, { "location": "298,327,27,29", "text": "KS" }, { "location": "345,327,8,29", "text": "F" }, { "location": "370,327,65,29", "text": "4009" }, { "location": "735,345,21,74", "text": "(" }, { "location": "780,345,21,74", "text": "주" }, { "location": "817,345,21,74", "text": ")" }, { "location": "877,345,21,74", "text": "강" }, { "location": "952,345,21,74", "text": "동" }, { "location": "1027,345,21,74", "text": "레" }, { "location": "1102,345,21,74", "text": "미" }, { "location": "1177,345,21,74", "text": "콘" }, { "location": "156,356,96,34", "text": "종류등급" }, { "location": "274,356,9,34", "text": ":" }, { "location": "297,356,313,34", "text": "보통콘크리트,포장콘크리트" }, { "location": "159,390,98,26", "text": "인증번호" }, { "location": "273,390,7,26", "text": ":" }, { "location": "303,390,7,26", "text": "제" }, { "location": "327,390,181,26", "text": "KCL-17-785" }, { "location": "530,390,7,26", "text": "호" }, { "location": "157,423,100,30", "text": "인증기관" }, { "location": "273,424,8,29", "text": ":" }, { "location": "301,424,312,30", "text": "한국건설생활환경시험연구원" }, { "location": "1171,428,175,37", "text": "32715" }, { "location": "1076,429,60,36", "text": "81" }, { "location": "1148,429,10,36", "text": "-" }, { "location": "942,430,98,37", "text": "416" }, { "location": "1052,430,10,36", "text": "-" }, { "location": "926,431,10,36", "text": ":" }, { "location": "751,432,160,37", "text": "사업자번호" }, { "location": "757,469,12,44", "text": "주" }, { "location": "824,469,12,44", "text": "소" }, { "location": "856,469,12,44", "text": ":" }, { "location": "889,469,40,44", "text": "전남" }, { "location": "961,469,82,44", "text": "순천시" }, { "location": "1063,469,75,44", "text": "해룡면" }, { "location": "1175,469,76,44", "text": "여순로" }, { "location": "1275,469,62,44", "text": "1377" }, { "location": "132,495,38,35", "text": "NO" }, { "location": "176,498,9,35", "text": "." }, { "location": "237,502,9,35", "text": "-" }, { "location": "265,505,58,34", "text": "037" }, { "location": "760,514,10,37", "text": "전" }, { "location": "824,514,10,37", "text": "화" }, { "location": "858,514,10,37", "text": ":" }, { "location": "885,514,78,37", "text": "(061)" }, { "location": "982,514,160,37", "text": "724-9300" }, { "location": "883,554,80,36", "text": "(061)" }, { "location": "980,554,161,36", "text": "724-9304" }, { "location": "1153,554,10,36", "text": "~" }, { "location": "1187,554,10,36", "text": "6" }, { "location": "214,557,83,50", "text": "2019" }, { "location": "348,557,14,50", "text": "년" }, { "location": "383,557,36,50", "text": "03" }, { "location": "478,557,64,50", "text": "월06" }, { "location": "634,557,14,50", "text": "일" }, { "location": "1060,594,97,36", "text": "9305" }, { "location": "980,595,78,36", "text": "724-" }, { "location": "894,596,71,35", "text": "061)" }, { "location": "751,597,91,36", "text": "출하실" }, { "location": "858,597,9,35", "text": ":" }, { "location": "884,597,9,35", "text": "(" }, { "location": "756,634,11,42", "text": "팩" }, { "location": "825,634,11,42", "text": "스" }, { "location": "859,634,11,42", "text": ":" }, { "location": "885,634,80,42", "text": "(061)" }, { "location": "981,634,175,42", "text": "724-9308" }, { "location": "581,638,56,38", "text": "귀하" }, { "location": "103,644,173,51", "text": "대림산업(주" }, { "location": "288,644,14,51", "text": ")" }, { "location": "159,708,13,47", "text": "납" }, { "location": "207,709,13,47", "text": "품" }, { "location": "250,710,61,47", "text": "장소" }, { "location": "365,711,320,48", "text": "e편한세상순천현장" }, { "location": "154,773,168,48", "text": "운반차번호" }, { "location": "782,776,11,40", "text": "운" }, { "location": "835,777,11,40", "text": "전" }, { "location": "892,778,11,40", "text": "자" }, { "location": "950,780,11,40", "text": "명" }, { "location": "391,781,84,48", "text": "5256" }, { "location": "994,781,103,40", "text": "요용묵" }, { "location": "958,841,13,46", "text": "적" }, { "location": "892,842,13,46", "text": "용" }, { "location": "835,843,13,46", "text": "품" }, { "location": "779,844,13,46", "text": "납" }, { "location": "276,845,54,42", "text": "출발" }, { "location": "699,845,13,46", "text": "분" }, { "location": "579,847,46,46", "text": "42" }, { "location": "535,848,13,46", "text": "지" }, { "location": "440,849,33,47", "text": "13" }, { "location": "1349,850,12,43", "text": "㎡" }, { "location": "131,854,81,40", "text": "납품" }, { "location": "1197,860,39,43", "text": "00" }, { "location": "1182,861,12,43", "text": "." }, { "location": "7,866,0,0", "text": "kr" }, { "location": "1123,866,56,43", "text": "16" }, { "location": "7,874,0,0", "text": "." }, { "location": "7,892,0,0", "text": "co" }, { "location": "134,896,75,51", "text": "시각" }, { "location": "7,901,0,0", "text": "." }, { "location": "946,904,14,49", "text": "계" }, { "location": "781,905,14,49", "text": "두" }, { "location": "611,907,129,49", "text": "20분" }, { "location": "438,909,133,49", "text": "17시" }, { "location": "316,910,14,49", "text": "착" }, { "location": "271,911,14,49", "text": "도" }, { "location": "1341,920,27,29", "text": "mi" }, { "location": "1105,927,125,39", "text": "222.00" }, { "location": "1265,927,11,39", "text": "-" }, { "location": "278,961,217,38", "text": "콘크리트의종류에" }, { "location": "554,961,188,38", "text": "굵은골재의최대" }, { "location": "798,961,108,38", "text": "호칭강도" }, { "location": "957,961,141,38", "text": "슬럼프또는" }, { "location": "7,965,0,0", "text": "OKIS21" }, { "location": "1179,966,173,37", "text": "시멘트종류에" }, { "location": "7,973,0,0", "text": "." }, { "location": "1303,986,9,34", "text": "관" }, { "location": "1047,992,42,34", "text": "플로" }, { "location": "481,996,9,34", "text": "\"" }, { "location": "549,996,202,34", "text": "치수에따른구분" }, { "location": "954,997,71,35", "text": "슬럼프" }, { "location": "329,998,107,32", "text": "따른구분" }, { "location": "1208,999,44,34", "text": "따른" }, { "location": "134,1006,77,38", "text": "호칭" }, { "location": "7,1017,0,0", "text": "www" }, { "location": "7,1035,0,0", "text": "," }, { "location": "621,1039,37,25", "text": "mm" }, { "location": "818,1039,58,21", "text": "MPa" }, { "location": "993,1043,41,23", "text": "mm" }, { "location": "136,1048,77,47", "text": "방법" }, { "location": "7,1075,0,0", "text": "6400" }, { "location": "201,1076,9,34", "text": "\"" }, { "location": "230,1076,63,34", "text": "보통" }, { "location": "309,1076,123,34", "text": "콘크리트" }, { "location": "561,1084,34,37", "text": "25" }, { "location": "719,1086,90,35", "text": "124" }, { "location": "7,1087,0,0", "text": "-" }, { "location": "923,1087,60,36", "text": "150" }, { "location": "1075,1088,125,36", "text": "포틀랜드" }, { "location": "1216,1089,145,36", "text": "시멘트고종" }, { "location": "1373,1090,9,35", "text": "." }, { "location": "7,1118,0,0", "text": "972" }, { "location": "7,1126,0,0", "text": ")" }, { "location": "1075,1126,159,34", "text": "교로슬래그" }, { "location": "1254,1126,148,34", "text": "시멘트2종" }, { "location": "647,1144,93,38", "text": "배합표" }, { "location": "750,1144,60,38", "text": "(kg/" }, { "location": "828,1144,29,38", "text": "㎡)" }, { "location": "7,1153,0,0", "text": "062" }, { "location": "7,1162,0,0", "text": "(" }, { "location": "103,1188,73,43", "text": "시멘트" }, { "location": "207,1188,62,43", "text": "시멘트" }, { "location": "331,1188,12,43", "text": "물" }, { "location": "399,1188,55,43", "text": "회수수" }, { "location": "491,1188,55,43", "text": "잔골재" }, { "location": "583,1188,55,43", "text": "잔골재" }, { "location": "676,1188,55,43", "text": "잔골재" }, { "location": "766,1188,158,43", "text": "굵은골재|굵은골재" }, { "location": "951,1188,66,43", "text": "굵은골재" }, { "location": "1045,1188,60,43", "text": "혼화재" }, { "location": "1142,1188,62,43", "text": "혼화재" }, { "location": "1239,1188,55,43", "text": "혼화제" }, { "location": "1331,1188,55,43", "text": "혼화제" }, { "location": "7,1269,0,0", "text": "UPS납품서" }, { "location": "101,1274,58,58", "text": "280" }, { "location": "181,1274,57,58", "text": "135" }, { "location": "289,1274,51,58", "text": "174" }, { "location": "368,1274,52,58", "text": "10" }, { "location": "472,1274,51,58", "text": "774" }, { "location": "567,1274,50,58", "text": "194" }, { "location": "644,1274,76,58", "text": "10_" }, { "location": "750,1274,58,58", "text": "809" }, { "location": "836,1274,43,58", "text": "10" }, { "location": "930,1274,43,58", "text": "lo" }, { "location": "1021,1274,49,58", "text": "135" }, { "location": "1113,1274,43,58", "text": "10" }, { "location": "1209,1274,69,58", "text": "2.80" }, { "location": "1312,1274,78,58", "text": ".00|" }, { "location": "7,1288,0,0", "text": "," }, { "location": "126,1340,147,47", "text": "물결합재비" }, { "location": "355,1340,67,47", "text": "49.7" }, { "location": "462,1340,13,47", "text": "%" }, { "location": "543,1340,105,47", "text": "잔골재율" }, { "location": "749,1340,34,47", "text": "54" }, { "location": "939,1340,67,47", "text": "슬러지" }, { "location": "1038,1340,104,47", "text": "고형분율" }, { "location": "1172,1340,13,47", "text": "1" }, { "location": "130,1406,50,34", "text": "비고" }, { "location": "192,1406,9,34", "text": ":" }, { "location": "221,1406,83,34", "text": "배합의" }, { "location": "323,1406,44,34", "text": "종별" }, { "location": "385,1406,9,34", "text": ":" }, { "location": "420,1406,9,34", "text": "■" }, { "location": "455,1406,121,34", "text": "시방배합" }, { "location": "7,1417,0,0", "text": "컴퓨터주변기기" }, { "location": "7,1441,0,0", "text": "," }, { "location": "333,1463,147,40", "text": "고로슬래그" }, { "location": "502,1465,11,40", "text": "총" }, { "location": "538,1465,85,40", "text": "함유량" }, { "location": "621,1466,11,40", "text": ":" }, { "location": "648,1466,89,41", "text": "35(±3" }, { "location": "740,1467,11,40", "text": ")" }, { "location": "772,1467,11,40", "text": "%" }, { "location": "139,1496,124,34", "text": "지정사항" }, { "location": "329,1507,193,40", "text": "플라이애시2종" }, { "location": "549,1507,21,40", "text": "10" }, { "location": "589,1507,11,40", "text": "%" }, { "location": "7,1570,0,0", "text": "전산화전문회사" }, { "location": "317,1597,173,40", "text": "염화물함유량" }, { "location": "612,1597,81,40", "text": "10.30" }, { "location": "760,1597,133,40", "text": "kg/㎡이하" }, { "location": "947,1597,92,40", "text": "공기량" }, { "location": "1377,1600,9,34", "text": "%" }, { "location": "1244,1602,9,34", "text": "5" }, { "location": "1132,1603,23,34", "text": ".5" }, { "location": "1094,1604,9,34", "text": "1" }, { "location": "1115,1604,9,34", "text": "4" }, { "location": "991,1668,10,38", "text": "/" }, { "location": "913,1669,10,38", "text": "감" }, { "location": "955,1669,10,38", "text": "독" }, { "location": "151,1672,10,36", "text": "비" }, { "location": "247,1672,10,36", "text": "고" }, { "location": "710,1673,157,38", "text": "타설완료시간" }, { "location": "331,1685,315,46", "text": "고성능AE감수제표준형" }, { "location": "7,1699,0,0", "text": "콘크리트업체" }, { "location": "7,1714,0,0", "text": "-" }, { "location": "334,1748,10,36", "text": "※" }, { "location": "364,1748,97,36", "text": "현장에서" }, { "location": "481,1748,72,36", "text": "가수및" }, { "location": "578,1748,40,36", "text": "기타" }, { "location": "644,1748,98,36", "text": "화학물질" }, { "location": "762,1748,67,36", "text": "점가서" }, { "location": "854,1748,73,36", "text": "품질에" }, { "location": "947,1748,72,36", "text": "대하여" }, { "location": "1037,1748,73,36", "text": "책임을" }, { "location": "1135,1748,47,36", "text": "지지" }, { "location": "1207,1748,106,36", "text": "않습니다." }, { "location": "328,1780,135,34", "text": "※노출면은" }, { "location": "479,1780,73,34", "text": "양생포" }, { "location": "580,1780,9,34", "text": "및" }, { "location": "617,1780,44,34", "text": "비닐" }, { "location": "680,1780,44,34", "text": "등을" }, { "location": "744,1780,73,34", "text": "덮어서" }, { "location": "841,1780,96,34", "text": "양생한후" }, { "location": "960,1780,44,34", "text": "습윤" }, { "location": "1025,1780,73,34", "text": "상태로" }, { "location": "1120,1780,111,34", "text": "유지해야" }, { "location": "1243,1780,85,34", "text": "합니다." }, { "location": "1383,1821,20,69", "text": ")" }, { "location": "1348,1822,20,69", "text": "0" }, { "location": "1306,1823,20,69", "text": "(" }, { "location": "1194,1826,20,69", "text": "M" }, { "location": "125,1829,69,69", "text": "인수자" }, { "location": "233,1829,38,69", "text": "확인" }, { "location": "316,1829,20,69", "text": "1" }, { "location": "973,1833,108,69", "text": "안미형" }, { "location": "875,1836,63,69", "text": "확인" }, { "location": "7,1846,0,0", "text": "오경정보시스템" }, { "location": "969,1859,112,31", "text": "안미형" }, { "location": "756,1866,183,30", "text": "및출하계확인이" }, { "location": "618,1910,98,38", "text": "주식회사" }, { "location": "734,1910,164,38", "text": "강동레미콘" }, { "location": "111,1914,112,22", "text": "B5(182mm" }, { "location": "237,1914,5,22", "text": "×" }, { "location": "254,1914,78,22", "text": "257mm)" }], "fileinfo": { "filepath": "http://127.0.0.1/img/test2.pdf", "convertFilepath": "http://127.0.0.1/img/test2.jpg" } }] };

    modifyData = $.extend([], data.data);
    uiLayerHtml(data);
    $('#ocrData').val(JSON.stringify(data));
    $('#uploadForm').hide();
    $('#uploadSucessForm').show()
    */
});

// 초기 작업
function init() {
    $('.button_control').attr('disabled', true);
    //layer_open('layer1');

    $('#searchDocCategoryKeyword').keydown(function (key) {
        if (key.keyCode == 13) {
            $('#searchDocCategoryBtn').click();
        }
    });
}

function docPopRadioEvent() {
    $('input:radio[name=radio_batch]').on('click', function () {
        var chkValue = $(this).val();

        if (chkValue == '1') {
            $('#orgDocName').show();
            $('#newDocName').hide();
            $('#notInvoice').hide();
        } else if (chkValue == '2') {
            $('#newDocName').val('').show();
            $('#orgDocName').hide();
            $('#notInvoice').hide();
        } else if (chkValue == '3') {
            $('#notInvoice').show();
            $('#orgDocName').hide();
            $('#newDocName').hide();
        }
    });
}

// 팝업 이벤트 모음
function popUpEvent() {
    popUpRunEvent();
    popUpSearchDocCategory();
    popUpInsertDocCategory();
}

// 팝업 확인 이벤트
function popUpRunEvent() {

	$('#btn_pop_doc_run').click(function (e) {

		var data = layer4Data;
		var docSentenceList = [];
		var docSentence = "";
		//data = $('#mlData').val();

        // chkValue 1: 기존문서 양식조회, 2: 신규문서 양식등록, 3: 계산서 아님
        var chkValue = $('input:radio[name=radio_batch]:checked').val();
		//console.log(data);
        if ((chkValue == '1' && $('#orgDocName').val() == '') || (chkValue == '2' && $('#newDocName').val() == '')) {
            fn_alert('alert', 'The document name is missing');
            return false;
        }

        // text & check
        //var textList = [];
        //$('.batch_layer4_result_tr').each(function () {
        //    var chk = $(this).children().find('input[type="checkbox"]').is(':checked') == true ? 1 : 0;
        //    var text = $(this).children()[1].innerHTML;

        //    textList.push({"text": text, "check": chk})
        //})

        // docName
        var docName = '';
        if (chkValue == '1') {
            docName = $('#orgDocName').val();
        } else if (chkValue == '2') {
            docName = $('#newDocName').val();
        } else if(chkValue == '3') {
            docName = 'NotInvoice';
		}

        console.log(layer4Data);
        console.log(layer4Data.data.length);
		// if (layer4Data.data.length > 20) {

		// 	for (var i = 0; i < 20; i++) {

		// 		// console.log(layer4Data.data[i].originText);
		// 		docSentenceList.push({ "text": layer4Data.data[i].originText })
		// 		docSentence = docSentence + layer4Data.data[i].originText;
		// 	}
		// }
		// else {
		// 	for (var i = 0; i < layer4Data.data.length; i++) {

		// 		//console.log(layer4Data.data[i].originText);
		// 		docSentenceList.push({ "text": layer4Data.data[i].originText })
		// 		docSentence = docSentence + layer4Data.data[i].originText;
		// 	}
        // }
        
        if (layer4Data.data.length > 100) {

			for (var i = 0; i < 100; i++) {

                // console.log(layer4Data.data[i].originText);
				docSentenceList.push({ "text": layer4Data.data[i].text })
				docSentence = docSentence + layer4Data.data[i].text;
			}
		}
		else {
			for (var i = 0; i < layer4Data.data.length; i++) {

				//console.log(layer4Data.data[i].originText);
				docSentenceList.push({ "text": layer4Data.data[i].text })
				docSentence = docSentence + layer4Data.data[i].text;
			}
		}

		//console.log(docSentenceList);
		//console.log(docSentence);



        var param = {
            imgId: $('#docPopImgId').val(),
            filepath: $('#docPopImgPath').val(),
            docName: docName,
            radioType: chkValue,
            //textList: textList,
			docTopType: $('#uiDocTopType').val(),
			docSentenceList: docSentenceList 
		}
		//console.log("param : " + param.imgId + " @@ " + param.filepath + " @@ " + param.docName + " @@ " + param.radioType + " @@ " + param.docTopType);
		//console.log(layer4Data);

		

        $.ajax({
            url: '/uiLearning/insertDoctypeMapping',
            type: 'post',
            datatype: 'json',
            data: JSON.stringify(param),
            contentType: 'application/json; charset=UTF-8',
            beforeSend: function () {
                $('#progressMsgTitle').html('문서양식 저장중...');
                progressId = showProgressBar();
            },
            success: function (data) {
                //location.href = location.href;
                // 해당 로우 화면상 테이블에서 삭제
                endProgressBar(progressId);
                var rowNum = $('#batchListRowNum').val();
                $('#docType').val(data.docType);
                $('#docTopType').val(data.docTopType);
                //$('#leftRowNum_' + rowNum).find('td:eq(2) a').html(data.docName);
                //$('#leftRowNum_' + rowNum).find('td:eq(2) input[name=docType]').val(data.docType);
                $('#docName').html(data.docName);
                $('#docPredictionScore').html('');
                fn_alert('alert', '문서 양식 저장이 완료 되었습니다.');
                $('#layer4 .cbtn').click();
            },
            error: function (err) {
                console.log(err);
                endProgressBar(progressId);
            }
        });           
        
        /*
        $.ajax({
            url: '/batchLearningTest/insertDoctypeMapping',
            type: 'post',
            datatype: 'json',
            data: JSON.stringify(param),
            contentType: 'application/json; charset=UTF-8',
            beforeSend: function () {
                $('#progressMsgTitle').html('문서양식 저장중...');
                progressId = showProgressBar();
            },
            success: function (data) {
                //location.href = location.href;
                // 해당 로우 화면상 테이블에서 삭제               
                setTimeout(function () {
                    endProgressBar(progressId);
                    fn_alert('alert', '문서 등록이 완료 되었습니다.');
                    $('#btn_pop_doc_cancel.ui_doc_pop_btn2.cbtn').click();
                    var rowNum = $('#batchListRowNum').val();
                    $('#leftRowNum_' + rowNum).remove();
                    $('.rowNum' + rowNum).remove();
                    $('.mlRowNum' + rowNum).remove();
                }, 5000);
                
                endProgressBar(progressId);
                $('#btn_pop_doc_cancel').click();
                var rowNum = $('#batchListRowNum').val();
                $('#leftRowNum_' + rowNum).remove();
                $('.rowNum' + rowNum).remove();
                $('.mlRowNum' + rowNum).remove();
                
            },
            error: function (err) {
                console.log(err);
                endProgressBar(progressId);
            }
        });  
        */
    })

    // 20180910 hskim 문장 선택 결과 같이 전송
    /*
    $('#btn_pop_doc_run').click(function (e) {
        var docData = JSON.parse($('#docData').val());
        for (var i in docData) {
            if ($('#searchResultDocName').val() == docData[i].DOCNAME) {
                $('#docName').text(docData[i].DOCNAME);
                $('#docData').val(JSON.stringify(docData[i]));
                break;
            }
        }
        $(this).parents('.poplayer').fadeOut();
        e.stopPropagation();
        e.preventDefault();
    });
    $('#btn_pop_doc_cancel').click(function (e) {
        $('#docData').val('');

        e.stopPropagation();
        e.preventDefault();
    });
    */
}


//팝업 문서 양식 LIKE 조회
function popUpSearchDocCategory() {
    $('#searchDocCategoryBtn').click(function () {
        var keyword = $('#searchDocCategoryKeyword').val().replace(/ /gi, '');
        var docTopType = $('#uiDocTopType').val();

        if (keyword) {
            $('#docSearchResultImg_thumbCount').hide();
            $('#docSearchResultMask').hide();
            $('#searchResultDocName').html('');
            $('#orgDocName').val('');
            $('#searchResultDocName').val('');
            $('#countCurrent').html('1');
            $.ajax({
                url: '/uiLearning/selectLikeDocCategory',
                type: 'post',
                datatype: 'json',
                data: JSON.stringify({ 'keyword': keyword, 'docTopType': docTopType }),
                contentType: 'application/json; charset=UTF-8',
                success: function (data) {
                    data = data.data;
                    //$('#docData').val(JSON.stringify(data));
                    $('#docSearchResult').html('');
                    //$('#countCurrent').html('1');
                    $('.button_control10').attr('disabled', true);
                    docPopImagesCurrentCount = 1;
                    if (data.length == 0) {
                        $('#searchResultDocName').val('검색 결과가 없습니다.');
                        return false;
                    } else {
                        /**
                         결과에 따른 이미지폼 만들기
                         */
                        docPopImages = data;
                        //console.log(docPopImages);
                        var searchResultImg = '<img id="searchResultImg" src="/sample/' + docPopImages[docPopImagesCurrentCount - 1].SAMPLEIMAGEPATH + '">';

                        $('#docSearchResult').empty().append(searchResultImg);

                        $('#searchResultDocName').val(data[0].DOCNAME);
                        if (data.length != 1) {
                            $('.button_control12').attr('disabled', false);
                        }
                        $('#orgDocName').val(data[0].DOCNAME);
                        $('#docSearchResultMask').show();
                        $('#countLast').html(data.length);
                        $('#docSearchResultImg_thumbCount').show();
                    }
                },
                error: function (err) {
                    console.log(err);
                }
            });
        } else {
            fn_alert('alert', 'Please enter your search keyword');
        }
    });
}

//팝업 문서 양식 등록
function popUpInsertDocCategory() {
    $('#insertDocCategoryBtn').click(function () {
        if ($('.ez-selected').children('input').val() == 'choice-2') {
            var docName = $('#newDocName').val();
            var sampleImagePath = $('#originImg').attr('src').split('/')[2] + '/' + $('#originImg').attr('src').split('/')[3];
            $.ajax({
                url: '/uiLearning/insertDocCategory',
                type: 'post',
                datatype: 'json',
                data: JSON.stringify({ 'docName': docName, 'sampleImagePath': sampleImagePath }),
                contentType: 'application/json; charset=UTF-8',
                success: function (data) {
                    if (data.code == 200) {
                        //console.log(data);
                        $('#docData').val(JSON.stringify(data.docCategory[0]));
                        $('#docName').text(data.docCategory[0].DOCNAME);
                        $('#layer1').fadeOut();
                    } else {
                        fn_alert('alert', data.message);
                    }
                },
                error: function (err) {
                    console.log(err);
                }
            });
        } else {
        }
    });
}

// 개별 학습 파일 업로드 이벤트
function uploadFileEvent() {
    $('#uploadFile').change(function () {
        if ($(this).val() !== '') {
            lineText = [];
            $('#imageBox').html('');
            totCount = 0;
            ocrCount = 0;
            searchDBColumnsCount = 0;
            $("#uploadFileForm").attr("action", "/common/imageUpload");
            $('#uploadFileForm').submit();
        }
    });
    $('#uploadFile').click(function(e){
        e.stopPropagation();
    });

    $('#uploadForm').click(function () {
        $('#uploadFile').click();
    });


    $('#uploadFileForm').ajaxForm({
        beforeSubmit: function (data, frm, opt) {
            $('#progressMsgTitle').html('파일 업로드 중..');
            progressId = showProgressBar();
            //startProgressBar(); // start progressbar
            //addProgressBar(1, 10); // proceed progressbar
            return true;
        },
        success: function (responseText, statusText) {
            //console.log(responseText);
            $('#progressMsgTitle').html('파일 업로드 완료..');
            $('.button_control').attr('disabled', false);
            $('#textResultTbl').html('');
            //addProgressBar(11, 20);
            if (responseText.message.length > 0) {
                //console.log(responseText);
                totCount = responseText.message.length;
                for (var i = 0; i < responseText.fileInfo.length; i++) {
                    processImage(responseText.fileInfo[i], false);
                }
                /*
                for (var i = 0; i < responseText.message.length; i++) {
                    processImage(responseText.message[i]);
                }
                */
            }
            //endProgressBar();
        },
        error: function (e) {
            endProgressBar(progressId); // 에러 발생 시 프로그레스바 종료
            //console.log(e);
        }
    });

    // 파일 드롭 다운
    var dropZone = $("#uploadForm");
    //Drag기능
    dropZone.on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', '#E3F2FC');
    });
    dropZone.on('dragleave', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', 'transparent');
    });
    dropZone.on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', '#E3F2FC');
    });
    dropZone.on('drop', function (e) {
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', 'transparent');

        var files = e.originalEvent.dataTransfer.files;
        if (files != null) {
            if (files.length > 1) {
                fn_alert('alert', "2개 이상 업로드 불가합니다");
                return;
            }

            F_FileMultiUpload(files, dropZone);

        } else {
            fn_alert('alert', "ERROR");
        }
    });

    // 파일 멀티 업로드
    function F_FileMultiUpload(files, obj) {
        fn_alert('confirm', files[0].name + " 파일을 업로드 하시겠습니까?", function () {
            var data = new FormData();
            for (var i = 0; i < files.length; i++) {
                data.append('file', files[i]);
            }

            lineText = [];
            $('#imageBox').html('');
            totCount = 0;
            ocrCount = 0;
            searchDBColumnsCount = 0;

            $.ajax({
                url: "/common/imageUpload",
                method: 'post',
                data: data,
                dataType: 'json',
                processData: false,
                contentType: false,
                beforeSend: function () {
                    $("#progressMsgTitle").html("파일 업로드 중..");
                    progressId = showProgressBar();
                },
                success: function (responseText, statusText) {
                    //console.log(responseText);
                    $('#progressMsgTitle').html('파일 업로드 완료..');
                    $('.button_control').attr('disabled', false);
                    $('#textResultTbl').html('');
                    //addProgressBar(11, 20);
                    if (responseText.message.length > 0) {
                        //console.log(responseText);
                        totCount = responseText.message.length;
                        for (var i = 0; i < responseText.fileInfo.length; i++) {
                            processImage(responseText.fileInfo[i], false);
                        }
                        /*
                        for (var i = 0; i < responseText.message.length; i++) {
                            processImage(responseText.message[i]);
                        }
                        */
                    }
                    //endProgressBar();
                },
                error: function (e) {
                    console.log("업로드 에러");
                    endProgressBar(progressId);
                }
            });
        });
    }
}

// OCR API
function processImage(fileInfo, isAuto) {
    $('#progressMsgTitle').html('OCR 처리 중..');
    $.ajax({
        url: '/uiLearning/uiLearnTraining',
        beforeSend: function (jqXHR) {
            jqXHR.setRequestHeader('Content-Type', 'application/json');
        },
        //async: false,
        type: 'POST',
        data: JSON.stringify({ 'fileInfo': fileInfo, isAuto: isAuto })
    }).success(function (data) {
        console.log("============================ ocr data ============================ ");
        console.log(data);
        console.log("============================ ocr data ============================ ");
        ocrCount++;
        
        if (data.data != null) { // 에러가 아니면
            //console.log(data);
            //thumbImgs.push(fileInfo.convertFileName);
            $('#progressMsgTitle').html('OCR 처리 완료');
            modifyData = $.extend([], data.data);
            uiLayerHtml(data);
            //addProgressBar(31, 40);
            if (ocrCount == 1) {
                $('#ocrData').val(JSON.stringify(data));
            }
            //appendOcrData(fileInfo, data);
            $('#uploadForm').hide();
            $('#uploadSucessForm').show()
            endProgressBar(progressId);
        } else if (data.error) { //ocr 이외 에러이면
            //endProgressBar();
            //fn_alert('alert', data.error);
            //location.href = '/uiLearning';
        } else { // ocr 에러 이면
            // insertCommError(data.code, 'ocr');
            endProgressBar(progressId);
            //endProgressBar();
            // fn_alert('alert', data.message);
            fn_alert('alert', "JSON error");
        }
    }).fail(function (jqXHR, textStatus, errorThrown) {
    });


    /*
    $('#progressMsgTitle').html('OCR 처리 중..');
    //addProgressBar(21, 30);
    $.ajax({
        url: '/common/ocr',
        beforeSend: function (jqXHR) {
            jqXHR.setRequestHeader('Content-Type', 'application/json');
        },
        async: false,
        type: 'POST',
        data: JSON.stringify({ 'fileInfo': fileInfo })
    }).success(function (data) {
        console.log("============================ ocr data ============================ ");
        console.log(data);
        console.log("============================ ocr data ============================ ");
        ocrCount++;
        if (!data.code) { // 에러가 아니면
            //console.log(data);
            //thumbImgs.push(fileInfo.convertFileName);
            $('#progressMsgTitle').html('OCR 처리 완료');
            //addProgressBar(31, 40);
            if (ocrCount == 1) {
                $('#ocrData').val(JSON.stringify(data));
            }
            appendOcrData(fileInfo, data);
        } else if (data.error) { //ocr 이외 에러이면
            //endProgressBar();
            //fn_alert('alert', data.error);
            //location.href = '/uiLearning';
        } else { // ocr 에러 이면
            insertCommError(data.code, 'ocr');
            endProgressBar(progressId);
            //endProgressBar();
            fn_alert('alert', data.message);
        }
    }).fail(function (jqXHR, textStatus, errorThrown) {
    });
    */
};

function insertCommError(eCode, type) {
    $.ajax({
        url: '/common/insertCommError',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify({ 'eCode': eCode, type: type }),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
        },
        success: function (data) {
        },
        error: function (err) {
            //console.log(err);
        }
    });
}

// 썸네일 이미지 페이지 이동 버튼 클릭 이벤트
function thumbImgPagingEvent() {
    $('#thumb-prev').click(function () {
        thumnImgPageCount--;
        thumbImgPaging(thumnImgPageCount);
    });
    $('#thumb-next').click(function () {
        thumnImgPageCount++;
        thumbImgPaging(thumnImgPageCount);
    });
}

function changeOcrImg(data) {
    $('#imageBox > li').removeClass('on');
    $(data).parent().parent().parent().addClass('on');
    var fileName = data.src.substring(data.src.lastIndexOf("/") + 1, data.src.length);
    $('#imageZoom').hide();
    $('#mainImage').css('background-image', 'url("/img/' + fileName + '")');
}

// 초기 썸네일 이미지 렌더링
function thumnImg() {
    for (var i in thumbImgs) {
        if ($('#imageBox > li').length < thumnbImgPerPage) {
            var imageTag = '';
            
            if (i == 0) {
                imageTag = '<li class="on"><div class="box_img"><i><img src="/img/' + thumbImgs[i] + '" onclick="changeOcrImg(this)" style="background-color: white;"></i>'
                    + ' </div ><span>' + thumbImgs[i] + '</span></li >';
            } else {
                imageTag = '<li><div class="box_img"><i><img src="/img/' + thumbImgs[i] + '" onclick="changeOcrImg(this)" style="background-color: white;"></i>'
                    + ' </div ><span>' + thumbImgs[i] + '</span></li >';
            }
            $('#imageBox').append(imageTag);
        } else {
            break;
        }
    }
    //$('#thumb-tot').attr('disabled', false);
    $('#thumb-tot').removeAttr('disabled');
    if (thumbImgs.length > thumnbImgPerPage) {
        $('#thumb-prev').attr('disabled', true);
        //$('#thumb-next').attr('disabled', false);
        $('#thumb-next').removeAttr('disabled');
    } else {
        $('#thumb-prev').attr('disabled', true);
        $('#thumb-next').attr('disabled', true);
    }
    //console.log(thumbImgs);
}

// 썸네일 이미지 페이징
function thumbImgPaging(pageCount) {
    $('#imageBox').html('');
    var startImgCnt = thumnbImgPerPage * pageCount - thumnbImgPerPage;
    var endImgCnt = thumnbImgPerPage * pageCount;

    if (startImgCnt == 0) {
        $('#thumb-prev').attr('disabled', true);
    } else {
        //$('#thumb-prev').attr('disabled', false);
        $('#thumb-prev').removeAttr('disabled');
    }

    if (endImgCnt >= thumbImgs.length) {
        endImgCnt = thumbImgs.length;
        $('#thumb-next').attr('disabled', true);
    } else {
        //$('#thumb-next').attr('disabled', false);
        $('#thumb-next').removeAttr('disabled');
    }

    var imageTag = '';
    for (var i = startImgCnt; i < endImgCnt; i++) {
        //imageTag += '<li>';
        //imageTag += '<a href="javascript:void(0);" class="imgtmb thumb-img" style="background-image:url(../../uploads/' + thumbImgs[i] + '); width: 48px;"></a>';
        //imageTag += '</li>';
        imageTag += '<li><div class="box_img"><i><img src="/img/' + thumbImgs[i] + '" onclick="changeOcrImg(this)" style="background-color: white;"></i>'
            + ' </div ><span>' + thumbImgs[i] + '</span></li >';
    }
    $('#imageBox').append(imageTag);
    thumbImgEvent();
}

// 썸네일 이미지 클릭 이벤트
function thumbImgEvent() {
    $(document).on('click','.thumb-img', function () {
        $('#imageBox > li').removeClass('on');
        $(this).parent().addClass('on');

        
        $('#mainImage').css('background-image', 'url("http://104.41.171.244/img/' + $(this).attr('title') + '")');

        $(this).parents('imageBox').find('li').removeClass('on');
        $(this).parents('li').addClass('on');
        $('#touchSlider').scrollTop($(this)[0].offsetTop - 12);
        //viewOriginImg();
        //$('#mainImage').css('background-image', $(this).attr('title'));
        //detailTable($(this).attr('title'));


        //$('#mainImage').css('background-image', $(this).css('background-image'));
        //detailTable($(this).css('background-image').split('/')[4].split('")')[0]);
    });
}


// 상세 테이블 렌더링 & DB컬럼 조회
function appendOcrData(fileInfo, data) {
    $('#docPopImgPath').val(fileInfo.filePath);
    var param = {
        'ocrData': data,
        'filePath': fileInfo.filePath,
        'fileName': fileInfo.convertFileName
    }

    executeML(param);

}

function executeML(totData) {
    $('#progressMsgTitle').html('머신러닝 처리 중..');
    $.ajax({
        url: '/uiLearning/uiLearnTraining',
        type: 'post',
        datatype: 'json',
        async: false,
        data: JSON.stringify(totData),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            console.log(data);
            if (data.column) searchDBColumnsCount++;
            if (data.message) {
                fn_alert('alert', message);
            } else {
                //console.log(data);
                lineText.push(data);
                thumbImgs.push(data.fileName);
                selectTypoText(lineText.length-1, data.fileName);
                $('#docSid').val(data.data.docSid);
                $('#docType').val(data.data.docCategory.DOCTYPE);
                if (searchDBColumnsCount == 1) {
                    /*
                    var docName = '';
                    var docScore = '';
                   
                    if (data.docCategory != null) {
                        docName = data.docCategory[0].DOCNAME;
                        $('#docData').val(JSON.stringify(data.docCategory[0]));
                    }

                    if (data.score) {
                        docScore = data.score;
                    }
                    */
                    $('#docName').text(data.data.docCategory.DOCNAME);
                    $('#docPredictionScore').text('100 %');

                    var mainImgHtml = '';
                    mainImgHtml += '<div id="mainImage" class="ui_mainImage">';
                    //mainImgHtml += '<div id="redNemo">';
                    //mainImgHtml += '</div>';
                    mainImgHtml += '</div>';
                    mainImgHtml += '<div id="imageZoom" ondblclick="viewOriginImg()">';
                    mainImgHtml += '<div id="redZoomNemo">';
                    mainImgHtml += '</div>';
                    mainImgHtml += '</div>';
                    $('#img_content').html(mainImgHtml);
                    $('#mainImage').css('background-image', 'url("/img/' + data.fileName + '")');
                    
                    $('#imageBox > li').eq(0).addClass('on');
                    /*
                    $('#mlPredictionDocName').val(docName);
                    $('#mlPredictionPercent').val(docScore + '%');
                    $('#docName').html(docName);
                    $('#docPredictionScore').html(docScore + '%');
                    if (docScore >= 90) {
                        $('#docName').css('color', 'dodgerblue');
                        $('#docPredictionScore').css('color', 'dodgerblue');
                    } else {
                        $('#docName').css('color', 'darkred');
                        $('#docPredictionScore').css('color', 'darkred');
                    }
                    */
                    //selectTypoText(0, data.fileName);
                    //detailTable(fileName);
                    //docComparePopup(0);
                }

                if (totCount == searchDBColumnsCount) {
                    thumnImg();
                    thumbImgEvent();
                    //addProgressBar(91, 99);
                    $('#uploadForm').hide();
                    $('#uploadSucessForm').show();
                    $('.content_sub_document_title').show();
                }
            }
        },
        error: function (err) {
            console.log(err);
            endProgressBar(progressId);
            //endProgressBar();
        }
    });
}

// html 렌더링 전처리 (출재사명, 계약명, 화폐코드 처리)
function selectTypoText(index, fileName) {
    //var item = lineText[index].data;
    var item = lineText[index];

    var param = [];
    detailTable(fileName);
    docComparePopup(0);
    /*
    $.ajax({
        url: 'common/selectTypoData2',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify({ 'data': item }),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            lineText[index].data.data = data.data;
            detailTable(fileName);
            docComparePopup(0);

            endProgressBar(progressId);
            //endProgressBar();
        },
        error: function (err) {
            endProgressBar(progressId);
            //endProgressBar();
            console.log(err);
        }
    });
    */
    endProgressBar(progressId);
}

function docPopInit() {
    $('#originImgDiv').empty();
    $('#mlPredictionDocName').val('');
    $('#mlPredictionPercent').val('');
    $('#docSearchResultImg_thumbCount').hide();
    $('#docSearchResultMask').hide();
    $('#countCurrent').empty();
    $('#countLast').empty();
    $('#mlPredictionPercent').val('');
    $('#orgDocSearchRadio').click();
    $('.ui_doc_pop_ipt').val('');
    $('#docSearchResult').empty();
    $('#searchResultDocName').val('');
    $('#searchDocCategoryKeyword').val('');
    $('#ui_layer1_result').empty();
}

//문서 비교 popup 버튼 클릭 이벤트
function docComparePopup(imgIndex) {
    $('#docCompareBtn').unbind('click');
    $('#docCompareBtn').click(function (e) {
        docPopInit();
        changeOcrDocPopupImage();
        selectClassificationSt($('#docPopImgPath').val());
        $('#mlPredictionDocName').val($('#docName').text());
        $('#mlPredictionPercent').val($('#docPredictionScore').text());
        var appendImg = '<img id="originImg" src="/img/' + lineText[imgIndex].fileName + '" style="width: 100%;height: 480px;">'
        $('#originImgDiv').html(appendImg);
        //$('#originImg').attr('src', '../../uploads/' + lineText[imgIndex].fileName);
        //$('#searchImg').attr('src', '../../' + lineText[imgIndex].docCategory.SAMPLEIMAGEPATH);
        layer_open('layer1');
        e.preventDefault();
        e.stopPropagation();
    });
}

// 분류제외문장 조회
function selectClassificationSt(filepath) {

    var param = {
        filepath: filepath
    };

    $.ajax({
        url: '/uiLearning/selectClassificationSt',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            //addProgressBar(1, 99);
        },
        success: function (data) {
            //console.log("SUCCESS selectClassificationSt : " + JSON.stringify(data));
            if (data.code != 500 && data.data.length == 1) {

                var ocrdata = JSON.parse(data.data[0].OCRDATA);

                //순서 정렬 로직
                let tempArr = new Array();
                for (let item in ocrdata) {
                    tempArr[item] = new Array(makeindex(ocrdata[item].location),   ocrdata[item]);
                }

                tempArr.sort(function (a1, a2) {
                    a1[0] = parseInt(a1[0]);
                    a2[0] = parseInt(a2[0]);
                    return (a1[0]<a2[0]) ? -1 : ((a1[0]>a2[0]) ? 1 : 0);
                });

                for (let i = 0; i < tempArr.length; i++) {

                    var resultOcrData = '<tr class="batch_layer4_result_tr">'
                                    + '<td><input type="checkbox" class="batch_layer4_result_chk"></td>'
                                    + '<td class="td_sentence"></td></tr>';
                    $('#batch_layer4_result').append(resultOcrData);
                    
                    $('.td_sentence:eq('+ i +')').text(tempArr[i][1].text);
                }
                $('#batch_layer4_result input[type=checkbox]').ezMark();

                for (var i = 0; i < $("input[type='checkbox'].batch_layer4_result_chk").length; i++) {
                    $("input[type='checkbox'].batch_layer4_result_chk").eq(i).parent().removeClass("ez-hide");
                    $("input[type='checkbox'].batch_layer4_result_chk").eq(i).prop("checked", true);
                    $("input[type='checkbox'].batch_layer4_result_chk").eq(i).parent().addClass("ez-checked")
    
                    if (i == 20) {
                        break;
                    }
                }
                
            }

        },
        error: function (err) {
            console.log(err);
        }
    })
}

function makeindex(location) {
    let temparr = location.split(",");
    for (let i = 0; i < 5; i++) {
        if (temparr[0].length < 5) {
            temparr[0] = '0' + temparr[0];
        }
    }
    return Number(temparr[1] + temparr[0]);
}

// 상세 테이블 렌더링
function detailTable(fileName) {

    //$('#textResultTbl').html('');
    var tblSortTag = '';
    var tblTag = '';
    //console.log(lineText);
    for (var i = 0; i < lineText.length; i++) {

        if (lineText[i].fileName == fileName) {

            var item = lineText[i];
            var data;

            if (item.data.data) {
                data = item.data.data;
            } else {
                data = item.data;
            }

            // UNKNOWN selectbox 제일 위로 올리기
            var columnArr = item.column;
            columnArr.unshift(columnArr.pop());
            var entryColArr = item.entryMappingList;
            entryColArr.unshift(entryColArr.pop());

            //$('#docName').text(item.data.docCategory.DOCNAME);
            //$('#docPredictionScore').text((item.data.docCategory.DOCSCORE * 100) + ' %');

            for (var i in data) {
                // colLbl이 37이면 entryLbl 값에 해당하는 entryColoumn 값을 뿌려준다
                if (data[i].colLbl == 37) {
                    tblTag += '<dl>';
                    tblTag += '<dt onclick="zoomImg(this,' + "'" + fileName + "'" + ')">';
                    if (data[i].originText) {
                        tblTag += '<label style="width:100%;">';
                    } else {
                        tblTag += '<label style="width:100%;">';
                    }
                    tblTag += '<input type="text" value="' + data[i].text + '" style="width:100% !important; border:0;" />';
                    tblTag += '<input type="hidden" value="' + data[i].location + '" />';
                    tblTag += '<input type="hidden" value="' + fileName + '" />';
                    tblTag += '</label>';
                    tblTag += '</dt>';
                    tblTag += '<dd>';
                    tblTag += '<input type="checkbox" class="entryChk" checked>';
                    tblTag += '</dd>';
                    tblTag += '<dd class="columnSelect" style="display:none">';
                    tblTag += appendOptionHtml((data[i].colLbl + '') ? data[i].colLbl : 999, columnArr);
                    tblTag += '</dd>';
                    tblTag += '<dd class="entrySelect">';
                    tblTag += appendEntryOptionHtml((data[i].entryLbl + '') ? data[i].entryLbl : 999, entryColArr);
                    tblTag += '</dd>';
                    tblTag += '</dl>';
                } else if (data[i].colLbl == 38) {
                    tblSortTag += '<dl>';
                    tblSortTag += '<dt onclick="zoomImg(this,' + "'" + fileName + "'" + ')">';
                    if (data[i].originText) {
                        tblSortTag += '<label style="width:100%;">';
                    } else {
                        tblSortTag += '<label style="width:100%;">';
                    }
                    tblSortTag += '<input type="text" value="' + data[i].text + '" style="100% !important; border:0;" />';
                    tblSortTag += '<input type="hidden" value="' + data[i].location + '" />';
                    tblSortTag += '<input type="hidden" value="' + fileName + '" />';
                    tblSortTag += '</label>';
                    tblSortTag += '</dt>';
                    tblSortTag += '<dd>';
                    tblSortTag += '<input type="checkbox" class="entryChk">';
                    tblSortTag += '</dd>';
                    tblSortTag += '<dd class="columnSelect">';
                    tblSortTag += appendOptionHtml((data[i].colLbl + '') ? data[i].colLbl : 999, columnArr);
                    tblSortTag += '</dd>';
                    tblSortTag += '<dd class="entrySelect" style="display:none">';
                    tblSortTag += appendEntryOptionHtml((data[i].entryLbl + '') ? data[i].entryLbl : 999, entryColArr);
                    tblSortTag += '</dd>';
                    tblSortTag += '</dl>';
                } else {
                    tblTag += '<dl>';
                    tblTag += '<dt onclick="zoomImg(this,' + "'" + fileName + "'" + ')">';
                    if (data[i].originText) {
                        tblTag += '<label style="width:100%;">';
                    } else {
                        tblTag += '<label style="width:100%;">';
                    }
                    tblTag += '<input type="text" value="' + data[i].text + '" style="100% !important; border:0;" />';
                    tblTag += '<input type="hidden" value="' + data[i].location + '" />';
                    tblTag += '<input type="hidden" value="' + fileName + '" />';
                    tblTag += '</label>';
                    tblTag += '</dt>';
                    tblTag += '<dd>';
                    tblTag += '<input type="checkbox" class="entryChk">';
                    tblTag += '</dd>';
                    tblTag += '<dd class="columnSelect">';
                    tblTag += appendOptionHtml((data[i].colLbl + '') ? data[i].colLbl : 999, columnArr);
                    tblTag += '</dd>';
                    tblTag += '<dd class="entrySelect" style="display:none">';
                    tblTag += appendEntryOptionHtml((data[i].entryLbl + '') ? data[i].entryLbl : 999, entryColArr);
                    tblTag += '</dd>';
                    tblTag += '</dl>';
                }
            }

            /*
            var item = lineText[i];
            var sort = item.column;
            var sortBool = true;
            for (var sortN in sort) {
                for (var dataN in item.data) {
                    if (sort[sortN].ENKEYWORD == item.data[dataN].column) {
                        tblSortTag += '<dl>';
                        tblSortTag += '<dt onmouseover="zoomImg(this)" onmouseout="moutSquare(this)">';
                        tblSortTag += '<label for="langDiv' + i + '" class="tip" title="Accuracy : 95%" style="width:100%;">';
                        if (item.data[dataN].text.length > 34) {
                            tblSortTag += '<label class="iclick">'
                            tblSortTag += '<input type="text" value="' + item.data[dataN].text + '" class="inputst_box01"/>';
                            tblSortTag += '</label>'
                        } else {
                            tblSortTag += '<input type="text" value="' + item.data[dataN].text + '" class="inputst_box01"/>';
                        }
                        tblSortTag += '<input type="hidden" value="' + item.data[dataN].location + '" />';
                        tblSortTag += '</label>';
                        tblSortTag += '</dt>';
                        tblSortTag += '<dd>';
                        tblSortTag += '<div class="selects">';
                        tblSortTag += '<ul class="selectBox">';
                        tblSortTag += dbColumnsOption(item.data[dataN], item.column);
                        tblSortTag += '</div>';
                        tblSortTag += '</dd>';
                        tblSortTag += '</dl>';
                    }
                }
            }

            for (var j = 0; j < item.data.length; j++) {

                for (var sortN in sort) {
                    if (item.data[j].column == sort[sortN].ENKEYWORD) {
                        sortBool = false;
                        break;
                    }
                }

                if (sortBool == true) {
                    tblTag += '<dl>';
                    tblTag += '<dt onmouseover="zoomImg(this)" onmouseout="moutSquare(this)">';
                    tblTag += '<label for="langDiv' + i + '" class="tip" title="Accuracy : 95%" style="width:100%;">';
                    tblTag += '<input type="text" value="' + item.data[j].text + '" style="width:100%; border:0;" />';
                    tblTag += '<input type="hidden" value="' + item.data[j].location + '" />';
                    tblTag += '</label>';
                    tblTag += '</dt>';
                    tblTag += '<dd>';
                    tblTag += '<div class="selects">';
                    tblTag += '<ul class="selectBox">';
                    tblTag += dbColumnsOption(item.data[j], item.column);
                    tblTag += '</div>';
                    tblTag += '</dd>';
                    tblTag += '</dl>';
                }
            }
            break;
            */

        }

        /* 몇 페이지 어디인지 표시
        var item = lineText[i];
        for (var j = 0; j < item.data.length; j++) {
            tblTag += '<tr onmouseover="zoomImg(this)" onmouseout="moutSquare(this)">';
            //tblTag += '<tr>';
            tblTag += '<td>';
            tblTag += '<input type="text" value="' + item.data[j].text + '" style="width:100%; border:0;" />';
            tblTag += '<input type="hidden" value="' + item.data[j].location + '" alt="' + item.fileName + '" />';
            tblTag += '</td>';
            tblTag += '<td>';
            tblTag += '<select style="width:100%; height:100%;  border:0;">';
            tblTag += dbColumnsOption(item.dbColumns);
            tblTag += '</select>';
            tblTag += '</td>';
            tblTag += '</tr>';
        }
        */
    }
    $('#textResultTbl').append(tblTag).append(tblSortTag);
    // input 태그 마우스오버 말풍선 Tooltip 적용
    $('#textResultTbl input[type=checkbox]').ezMark();
    new $.Zebra_Tooltips($('.tip'));
    dbSelectClickEvent();
    $('select').stbDropdown();
    checkBoxMLCssEvent();

    $(".entryChk").change(function () {

        if ($(this).is(":checked")) {
            $(this).closest('dl').find('.columnSelect').hide();
            $(this).closest('dl').find('.entrySelect').show();
        } else {
            $(this).closest('dl').find('.columnSelect').show();
            $(this).closest('dl').find('.entrySelect').hide();
        }

    })
}

function checkBoxMLCssEvent() {
    $('#textResultTbl .ez-checkbox').each(function (i, e) {
        if ($(e).hasClass('ez-checked')) {
            $(e).closest('dl').children().css('background', '#EA7169')
                .find('input[type="text"]').css('color', '#FFF').css('background', '#EA7169');
        }
    });

    
    $('#textResultTbl .ez-checkbox').unbind('click');
    $('#textResultTbl .ez-checkbox').click(function () {
        if (!$(this).hasClass('ez-checked')) {
            $(this).closest('dl').children().css('background', '#EA7169')
                .find('input[type="text"]').css('color', '#FFF').css('background', '#EA7169');
        } else {
            $(this).closest('dl').children().css('background', '#FFF')
                .find('input[type="text"]').css('color', '#8C8C8C').css('background', '#FFF');
        }
    });
    
}

// 컬럼 select html 가공 함수
function appendOptionHtml(targetColumn, columns) {

    var selectHTML = '<select class="docLabel">';
    for (var i in columns) {
        var optionHTML = '';
        if (targetColumn == columns[i].COLNUM) {
            optionHTML = '<option value="' + columns[i].COLNUM + '" selected>' + columns[i].COLNAME + '</option>';
        } else {
            optionHTML = '<option value="' + columns[i].COLNUM + '">' + columns[i].COLNAME + '</option>';
        }
        selectHTML += optionHTML
    }
    selectHTML += '</select>'

    return selectHTML;
}

// Entry컬럼 select html 가공 함수
function appendEntryOptionHtml(targetColumn, columns) {

    var selectHTML = '<select class="docLabel">';
    for (var i in columns) {
        var optionHTML = '';
        if (targetColumn == columns[i].COLNUM) {
            optionHTML = '<option value="' + targetColumn + '" selected>' + columns[i].COLNAME + '</option>';
        } else {
            optionHTML = '<option value="' + targetColumn + '">' + columns[i].COLNAME + '</option>';
        }
        selectHTML += optionHTML
    }
    selectHTML += '</select>'

    return selectHTML;
}

// DB 컬럼 option 렌더링
function dbColumnsOption(data, column) {
    var optionTag = '';
    var selected = '';

    optionTag += '<li>';
    var isMatch = false;

    if (data.column != null) {
        for (var cNum in column) {
            if (data.column == column[cNum].ENKEYWORD) {

                var gubun = '';

                if (column[cNum].LABEL == "fixlabel" || column[cNum].LABEL == "entryrowlabel") {
                    gubun = "::LABEL";
                } else if (column[cNum].LABEL == "fixvalue" || column[cNum].LABEL == "entryvalue") {
                    gubun = "::VALUE";
                }

                optionTag += '<a class="dbColumnText" href="javascript:void(0);">' + column[cNum].KOKEYWORD + gubun + '</a>';
            }
        }
    } else {
        optionTag += '<a class="dbColumnText" href="javascript:void(0);">none</a>';
    }
    optionTag += '<ul>';
    for (var row of column) {

        var gubun = '';

        if (row.LABEL == "fixlabel" || row.LABEL == "entryrowlabel") {
            gubun = "::LABEL";
        } else if (row.LABEL == "fixvalue" || row.LABEL == "entryvalue") {
            gubun = "::VALUE";
        }

        optionTag += '<li class="secondLi">';
        optionTag += '<a href="javascript:void(0);"><span>' + row.KOKEYWORD + gubun + '</span></a>';
        optionTag += '<ul>';
        optionTag += '<li class="thirdLi"><a href="javascript:void(0);">키워드</a></li>';
        optionTag += '<li class="thirdLi"><a href="javascript:void(0);">가변값</a></li>';
        optionTag += '</ul>';
        optionTag += '</li>';
    }
    optionTag += '<li class="secondLi">';
    optionTag += '<a href="javascript:void(0);"><span>none</span></a>';
    optionTag += '<ul>';
    optionTag += '<li class="thirdLi"><a href="javascript:void(0);">키워드</a></li>';
    optionTag += '<li class="thirdLi"><a href="javascript:void(0);">가변값</a></li>';
    optionTag += '</ul>';
    optionTag += '</li>';

    optionTag += '</ul>';
    optionTag += '</li>';


    return optionTag;
}

// 마우스 오버 이벤트
function zoomImg(e, fileName) {   
    // 해당 페이지로 이동
    // 몇 페이지 어디인지 표시
    //var fileName = $(e).find('input[type=hidden]').attr('alt');
    $('.thumb-img').each(function (i, el) {
        if ($(this).attr('src').split('/')[2] == fileName) {
            $(this).click();
        }
    });
    

    var mainImage = $("#mainImage").css('background-image');
    mainImage = mainImage.replace('url(', '').replace(')', '').replace(/\"/gi, "");
    mainImage = mainImage.substring(mainImage.lastIndexOf("/") + 1, mainImage.length);

    if (mainImage != fileName) {
        $('#mainImage').css('background-image', 'url("' + fileName + '")');
    }

    //var fileNm = fileName.substring(fileName.lastIndexOf('/') + 1);
    //실제 이미지 사이즈와 메인이미지div 축소율 판단
    var reImg = new Image();
    reImg.onload = function () {
        //var axis = $('#imageBox').find('li.on').find('.axis').val().split(',');

        var width;
        var height;
        width = reImg.width;
        height = reImg.height;
        //imageZoom 고정크기
        var fixWidth = 744;
        var fixHeight = 1052;
    
        var widthPercent = fixWidth / width;
        var heightPercent = fixHeight / height;
        //var chgHeightPercent = fixHeight / parseInt(axis[3]);

        $('#mainImage').hide();
        $('#imageZoom').css('height', '570px').css('background-image', 'url("' + fileName + '")').css('background-size', fixWidth + 'px ' + fixHeight + 'px').show();
    
        // 사각형 좌표값
        var location = $(e).find('input[type=hidden]').val().split(',');
        x = parseInt(location[0]);
        y = parseInt(location[1])
        //y = parseInt(location[1]) + parseInt(axis[1]);
        textWidth = parseInt(location[2]);
        textHeight = parseInt(location[3]);

        var xPosition = '100';
        var yPosition = ((- (y * heightPercent)) + 171);
        //var yPosition = ((- (y * heightPercent)) + (parseInt(axis[1]) * chgHeightPercent) + ((height - parseInt(axis[3])) * chgHeightPercent) + 191) + 'px';

        $('#imageZoom').css('background-position', xPosition + 'px ' + yPosition + 'px');
        
        // left, width 추가
        var positionLeft = (x * widthPercent) + 80;
        var postionWidth = (textWidth * widthPercent) + 10;
        
        $('#redZoomNemo').css('left',  positionLeft + 'px');
        $('#redZoomNemo').css('width', postionWidth + 'px');

        $('#redZoomNemo').css('height', ((textHeight * heightPercent) + 10) + 'px');
        $('#redZoomNemo').css('top', '158px')
        $('#redZoomNemo').show();

        //$('#targetZoom').css('width', ((textWidth * widthPercent)) + 'px').css('height', ((textHeight * heightPercent)) + 'px')
        //    .css('margin-left', ((x * widthPercent) + Number(xPosition) - 7) + 'px').css('padding','3px 4px').show();
    }
    reImg.src = fileName;
}

// 마우스 아웃 이벤트
function moutSquare(e) {
    //$('#redNemo').hide();
    $('#redZoomNemo').hide();
    $('#imageZoom').hide();
    $('#mainImage').show();
}

function viewOriginImg() {
    $('#imageZoom').hide();
    $('#mainImage').show();
}

function dbSelectClickEvent() {
    $('.selectBox > li').click(function (e) {
        if ($(this).children('ul').css('display') == 'none') {
            $('.selectBox > li').removeClass('on');
            $('.selectBox > li > ul').hide();
            $('.selectBox > li > ul').css('visibility', 'hidden').css('z-index', '0');
            $(this).addClass('on');
            $(this).children('ul').show();
            $(this).children('ul').css('visibility', 'visible').css('z-index', '1');
            $('.box_table_st').css('height', Number($('.box_table_st').height() + $(this).children('ul').height()) + 'px');
        } else {
            $(this).children('ul').hide();
            $(this).children('ul').css('visibility', 'hidden').css('z-index', '0');
            $('.box_table_st').css('height', Number($('.box_table_st').height() - $(this).children('ul').height()) + 'px');
        }
        e.preventDefault();
        e.stopPropagation();
    });
    $('.selectBox > li > ul > li').click(function (e) {
        if ($(this).children('ul').css('display') == 'none') {
            $('.selectBox > li > ul > li > ul').hide();
            $('.selectBox > li > ul > li > ul').css('visibility', 'hidden');
            $(this).children('ul').show();
            $(this).children('ul').css('visibility', 'visible').css('z-index', '2');
        } else {
            $(this).children('ul').hide();
            $(this).children('ul').css('visibility', 'hidden');
        }
        e.preventDefault();
        e.stopPropagation();
    });
    $('.selectBox > li > ul > li > ul > li').click(function (e) {
        var firstCategory = $(this).parent().prev().children('span').text();
        var lastCategory = ($(this).children('a').text() == '키워드') ? '' : ' 값';
        $(this).parent().parent().parent().prev().text(firstCategory);
        $(this).parent().parent().children('ul').hide();
        $(this).parent().parent().children('ul').css('visibility', 'hidden');
        $(this).parent().parent().parent().parent().children('ul').hide();
        $(this).parent().parent().parent().parent().children('ul').css('visibility', 'hidden').css('z-index', '0');
        $('.box_table_st').css('height', Number($('.box_table_st').height() - $(this).parent().parent().parent().parent().children('ul').height()) + 'px')
        e.preventDefault();
        e.stopPropagation();
    });
}

/*
function ocrBoxFocus() {
    $('#formImageZoom').mousedown(function (e) {
        console.log("마우스 누름: " + e.pageX + ', ' + e.pageY);
        mouseX = e.pageX;
        mouseY = e.pageY;
    }).mouseup(function (e) {
        var xDistance, yDistance;

        console.log("마우스 땜: " + e.pageX + ', ' + e.pageY);
        mouseMoveX = e.pageX;
        mouseMoveY = e.pageY;

        xDistance = mouseX - mouseMoveX;
        yDistance = mouseMoveY - mouseY;
        console.log("xDistance: " + xDistance + ", yDistance: " + yDistance);

        imageMove(xDistance, yDistance);
    });
}
*/

/*
// 마우스로 이미지 눌러 드래그시 이미지 이동
function imageMove(xDistance, yDistance) {

    var zoomDiv = document.getElementById("mainImage");
    var xResult, yResult;

    $('#redNemo').hide();

    xResult = x + xDistance;
    x = xResult;
    yResult = y - yDistance;
    y = yResult;
    zoomDiv.style.backgroundPosition = "-" + x + "px -" + y + "px";
}
*/

function uiTrainEvent() {
    $("#uiTrainBtn").click(function (e) {
        modifyTextData();
    });
}

function modifyTextData() {
    var beforeData = [modifyData];
    var afterData = {};
    var predLabelData = [];
    var predEntryData = [];
    afterData.data = [];
    beforeData = beforeData.slice(0);

    for (var i = 0; i < modifyData.length; i++) {
        if (i > 0) {
            for (var j = 0; j < modifyData[i].data.length; j++) {
                modifyData[0].data.push(modifyData[i].data[j]);
            }
        }
    }
    beforeData = modifyData[0];

    // afterData Processing
    $('#textResultTbl > dl').each(function (index, el) {
        var location = $(el).find('label').children().eq(1).val();
        var text = $(el).find('label').children().eq(0).val();
        var colType = $(el).find('select').eq(0).find('option:selected').val();
        var colLbl = $(el).find('select').eq(1).find('option:selected').val();
        afterData.data.push({ 'location': location, 'text': text, 'colLbl': colLbl, 'colType': colType });
    });

    beforeData.docCategory.DOCTYPE = ($('#docType').val() != '') ? Number($('#docType').val()) : beforeData.docCategory.DOCTYPE;
    beforeData.docCategory.DOCTOPTYPE = ($('#docTopType').val() != '') ? Number($('#docTopType').val()) : beforeData.docCategory.DOCTOPTYPE;
    var predLabelData = predLabel(beforeData, afterData);
    var predEntryData = predEntry(beforeData, afterData);

    // find an array of data with the same filename
    $.ajax({
        url: '/common/modifyBatchUiTextData',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({
            'beforeData': beforeData, 'afterData': afterData,
            'predLabelData': predLabelData, 'predEntryData': predEntryData
        }),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $("#progressMsgTitle").html("retrieving learn data...");
            progressId = showProgressBar();
        },
        success: function (data) {
            fn_alert('alert', "success training");
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function predLabel(beforeData, afterData) {
    var ocrData = afterData.data;
    var dbInsertData = []; // DB insert json array

    for (var i in ocrData) {
        if (ocrData[i].colType == 'L' && ocrData[i].colLbl && ocrData[i].colLbl != -1) { // label
            var insertItem = {};
            insertItem.docType = beforeData.docCategory.DOCTYPE;
            insertItem.location = ocrData[i].location;
            insertItem.ocrText = ocrData[i].text;
            insertItem.class = ocrData[i].colLbl;
            insertItem.leftText = scanTextFromLabel(ocrData, ocrData[i], "LEFT");
            insertItem.downText = scanTextFromLabel(ocrData, ocrData[i], "DOWN");
            dbInsertData.push(insertItem);
        }
    }

    return dbInsertData;
}

function scanTextFromLabel(ocrData, target, type) {
    var returnObj = ''
    var minDist = 3000;
    if (type == 'LEFT') {
        var yPadding = 0;
        var targetLoc = target.location.split(",");
        var targetLeftTopLoc = Number(targetLoc[1]) - yPadding; // 좌상단 y좌표
        var targetLeftBottomLoc = Number(targetLoc[1]) + Number(targetLoc[3]) + yPadding; // 좌하단 y좌표
        var targetXPoint = Number(targetLoc[0]); // x좌표 기준점
        var targetYPoint = Number(targetLoc[1]) + (Number(targetLoc[3]) / 2); // y좌표 기준점

        for (var i in ocrData) {
            var itemLoc = ocrData[i].location.split(",");
            var itemXPoint = Number(itemLoc[0]) + Number(itemLoc[2]);
            var itemYPoint = Number(itemLoc[1]) + (Number(itemLoc[3]) / 2);
            if (target != ocrData[i] && itemYPoint >= targetLeftTopLoc && itemYPoint <= targetLeftBottomLoc && itemXPoint < targetXPoint) {
                var dx = targetXPoint - itemXPoint;
                var dy = targetYPoint - itemYPoint;
                var currentDist = Math.sqrt((dx * dx) + (dy * dy));
                if (currentDist < minDist) {
                    minDist = currentDist;
                    returnObj = ocrData[i].text;
                }
            }
        }
    } else if (type == 'DOWN') {
        var xPadding = 0;
        var targetLoc = target.location.split(",");
        var targetLeftTopLoc = Number(targetLoc[0]) - xPadding; // 좌상단 x좌표
        var targetRightTopLoc = Number(targetLoc[0]) + Number(targetLoc[2]) + xPadding; // 우상단 x좌표
        var targetXPoint = Number(targetLoc[0]) + (Number(targetLoc[2]) / 2); // x좌표 기준점
        var targetYPoint = Number(targetLoc[1]) + Number(targetLoc[3]); // y좌표 기준점

        for (var i in ocrData) {
            var itemLoc = ocrData[i].location.split(",");
            var itemXPoint = Number(itemLoc[0]) + (Number(itemLoc[2]) / 2);
            var itemYPoint = Number(itemLoc[1]);
            if (target != ocrData[i] && itemXPoint >= targetLeftTopLoc && itemXPoint <= targetRightTopLoc && itemYPoint > targetYPoint) {
                var dx = targetXPoint - itemXPoint;
                var dy = targetYPoint - itemYPoint;
                var currentDist = Math.sqrt((dx * dx) + (dy * dy));
                if (currentDist < minDist) {
                    minDist = currentDist;
                    returnObj = ocrData[i].text;
                }
            }
        }
    }

    if (returnObj == '') returnObj = null;
    else returnObj = returnObj.replace(/ /g, "");

    return returnObj;
}

function predEntry(beforeData, afterData) {
    var ocrData = afterData.data;
    var dbInsertData = []; // DB insert json array

    for (var i in ocrData) {
        if (ocrData[i].colType == 'E') { // entry            
            var insertItem = {};
            insertItem.docType = beforeData.docCategory.DOCTYPE;
            insertItem.location = ocrData[i].location;
            insertItem.ocrText = ocrData[i].text;
            insertItem.class = ocrData[i].colLbl;
            insertItem = scanTextFromEntry(ocrData, ocrData[i], insertItem, "LEFT");
            insertItem = scanTextFromEntry(ocrData, ocrData[i], insertItem, "UP");
            insertItem = scanTextFromEntry(ocrData, ocrData[i], insertItem, "DIAGONAL");
            dbInsertData.push(insertItem);
        }
    }
    return dbInsertData;
}

function scanTextFromEntry(ocrData, target, insertItem, type) {
    var resultObj = {};
    var minDist = 3000;
    if (type == 'LEFT') {
        var yPadding = 0;
        var targetLoc = target.location.split(",");
        var targetLeftTopLoc = Number(targetLoc[1]) - yPadding; // 좌상단 y좌표
        var targetLeftBottomLoc = Number(targetLoc[1]) + Number(targetLoc[3]) + yPadding; // 좌하단 y좌표
        var targetXPoint = Number(targetLoc[0]); // x좌표 기준점
        var targetYPoint = Number(targetLoc[1]) + (Number(targetLoc[3]) / 2); // y좌표 기준점

        for (var i in ocrData) {
            var itemLoc = ocrData[i].location.split(",");
            var itemXPoint = Number(itemLoc[0]) + Number(itemLoc[2]);
            var itemYPoint = Number(itemLoc[1]) + (Number(itemLoc[3]) / 2);
            if (target != ocrData[i] && itemYPoint >= targetLeftTopLoc && itemYPoint <= targetLeftBottomLoc && itemXPoint < targetXPoint) {
                var dx = targetXPoint - itemXPoint;
                var dy = targetYPoint - itemYPoint;
                var currentDist = Math.sqrt((dx * dx) + (dy * dy));
                if (currentDist < minDist && (ocrData[i].colType == 'L' && ocrData[i].colLbl && ocrData[i].colLbl != -1 && ocrData[i].colLbl != 380)) {
                    minDist = currentDist;
                    resultObj.text = ocrData[i].text;
                    resultObj.xLoc = itemXPoint - targetXPoint;
                    resultObj.yLoc = itemYPoint - targetYPoint;
                }
            }
        }

        insertItem.leftLabel = (resultObj.text != undefined) ? resultObj.text.replace(/ /g, "") : null;
        insertItem.leftLocX = (resultObj.xLoc != undefined) ? resultObj.xLoc : null;
        insertItem.leftLocY = (resultObj.yLoc != undefined) ? resultObj.yLoc : null;
    } else if (type == 'UP') {
        var xPadding = 0;
        var targetLoc = target.location.split(",");
        var targetLeftTopLoc = Number(targetLoc[0]) - xPadding; // 좌상단 x좌표
        var targetRightTopLoc = Number(targetLoc[0]) + Number(targetLoc[2]) + xPadding; // 우상단 x좌표
        var targetXPoint = Number(targetLoc[0]) + (Number(targetLoc[2]) / 2); // x좌표 기준점
        var targetYPoint = Number(targetLoc[1]); // y좌표 기준점

        for (var i in ocrData) {
            var itemLoc = ocrData[i].location.split(",");
            var itemXPoint = Number(itemLoc[0]) + (Number(itemLoc[2]) / 2);
            var itemYPoint = Number(itemLoc[1]) + Number(itemLoc[3]);
            if (target != ocrData[i] && itemXPoint >= targetLeftTopLoc && itemXPoint <= targetRightTopLoc && itemYPoint < targetYPoint) {
                var dx = targetXPoint - itemXPoint;
                var dy = targetYPoint - itemYPoint;
                var currentDist = Math.sqrt((dx * dx) + (dy * dy));
                if (currentDist < minDist && (ocrData[i].colType == 'L' && ocrData[i].colLbl && ocrData[i].colLbl != -1 && ocrData[i].colLbl != 380)) {
                    minDist = currentDist;
                    resultObj.text = ocrData[i].text;
                    resultObj.xLoc = itemXPoint - targetXPoint;
                    resultObj.yLoc = itemYPoint - targetYPoint;
                }
            }
        }

        insertItem.upLabel = (resultObj.text != undefined) ? resultObj.text.replace(/ /g, "") : null;
        insertItem.upLocX = (resultObj.xLoc != undefined) ? resultObj.xLoc : null;
        insertItem.upLocY = (resultObj.yLoc != undefined) ? resultObj.yLoc : null;
    } else if (type == 'DIAGONAL') {
        var xPadding = 0;
        var yPadding = 0;
        var targetLoc = target.location.split(",");
        var targetLeftTopXLoc = Number(targetLoc[0]) + xPadding; // 좌상단 x좌표
        var targetLeftTopYLoc = Number(targetLoc[1]) + yPadding; // 좌상단 y좌표
        var targetXPoint = Number(targetLoc[0]); // x좌표 기준점
        var targetYPoint = Number(targetLoc[1]); // y좌표 기준점

        for (var i in ocrData) {
            var itemLoc = ocrData[i].location.split(",");
            var itemXPoint = Number(itemLoc[0]) + Number(itemLoc[2]);
            var itemYPoint = Number(itemLoc[1]) + Number(itemLoc[3]);
            if (target != ocrData[i] && itemXPoint < targetLeftTopXLoc && itemYPoint < targetLeftTopYLoc) {
                var dx = targetXPoint - itemXPoint;
                var dy = targetYPoint - itemYPoint;
                var currentDist = Math.sqrt((dx * dx) + (dy * dy));
                if (currentDist < minDist && (ocrData[i].colType == 'L' && ocrData[i].colLbl && ocrData[i].colLbl != -1 && ocrData[i].colLbl != 380)) {
                    minDist = currentDist;
                    resultObj.text = ocrData[i].text;
                    resultObj.xLoc = itemXPoint - targetXPoint;
                    resultObj.yLoc = itemYPoint - targetYPoint;
                }
            }
        }

        insertItem.diagonalLabel = (resultObj.text != undefined) ? resultObj.text.replace(/ /g, "") : null;
        insertItem.diagonalLocX = (resultObj.xLoc != undefined) ? resultObj.xLoc : null;
        insertItem.diagonalLocY = (resultObj.yLoc != undefined) ? resultObj.yLoc : null;
    }

    return insertItem;
}

function makeTrainingData() {
    var trainData = {};
    trainData.data = [];

    if (lineText[0] == null) {
        fn_alert('alert', "학습할 데이터가 없습니다.");
        return;
    }

    var dataArray = [];

    var tr = $("#textResultTbl dl");

    //console.log(td.eq(0).text());

    for (var i = 0; i < tr.length; i++) {
        var text = tr.eq(i).find('input[type="text"]').val();
        var location = tr.eq(i).find('input[type="hidden"]').val();
        var column = tr.eq(i).find('select option:selected').val();

        var obj = {}
        obj.text = text;
        obj.location = location;
        obj.colLbl = column;

        dataArray.push(obj);
    }

    var mlData = lineText[0].data.data;

    for (var i = 0; i < mlData.length; i++) {
        for (var j = 0; j < dataArray.length; j++) {
            if (mlData[i].location == dataArray[j].location) {

                if (dataArray[j].colLbl == 0 || dataArray[j].colLbl == 1 || dataArray[j].colLbl == 3) { // Only ogCompanyName, contractName, curCode
                    if (mlData[i].text != dataArray[j].text || mlData[i].colLbl != dataArray[j].colLbl) {
                        dataArray[j].sid = mlData[i].sid;
                        trainData.data.push(dataArray[j]);
                    }
                } else { // etc
                    if (mlData[i].colLbl != dataArray[j].colLbl) {
                        dataArray[j].text = mlData[i].text // origin text (Does not reflect changes made by users) 
                        dataArray[j].sid = mlData[i].sid;
                        trainData.data.push(dataArray[j]);
                    }
                }

                if (mlData[i].originText != null) {
                    dataArray[j].originText = mlData[i].originText;
                }

            }
        }
    }

    var data = {}
    data.data = dataArray;

    /*
    data.docCategory = JSON.parse($('#docData').val());
    
    trainData.docCategory = [];
    if (lineText[0].docCategory[0].DOCTYPE != data.docCategory.DOCTYPE) {
        trainData.docCategory.push(JSON.parse($('#docData').val()));
    } else {
        trainData.docCategory.push(lineText[0].docCategory[0]);
    }
    */
    //startProgressBar();
    //addProgressBar(1, 40);
    progressId = showProgressBar();
    callbackAddDocMappingTrain(trainData, progressId);
}

function insertTrainingData(data) {
    $('#progressMsgTitle').html('라벨 분류 학습 중..');
    //addProgressBar(21, 40);
    addLabelMappingTrain(data, callbackAddLabelMapping);
}

function callbackAddLabelMapping(data) {
    $('#progressMsgTitle').html('양식 분류 학습 중..');
    //addProgressBar(41, 60);
    addDocMappingTrain(data, callbackAddDocMappingTrain);
}

function callbackAddDocMappingTrain(data, progressId) {
    $('#progressMsgTitle').html('컬럼 맵핑 학습 중..');
    //addProgressBar(41, 80);
    function blackCallback() { }
    addColumnMappingTrain(data, blackCallback, progressId);
}


function uiTrainAjax() {
    $.ajax({
        url: '/batchLearning/uitraining',
        type: 'post',
        datatype: "json",
        data: null,
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            if (data.code == 200) {
                addProgressBar(81, 100);
                fn_alert('alert', data.message);
                //popupEvent.batchClosePopup('retrain');
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function insertTypoTrain(data, callback) {
    $.ajax({
        url: '/uiLearning/insertTypoTrain',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'data': data }),
        contentType: 'application/json; charset=UTF-8',
        success: function (res) {
            callback(res);
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function addLabelMappingTrain(data, callback) {
    $.ajax({
        url: '/batchLearning/insertDocLabelMapping',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'data': data }),
        contentType: 'application/json; charset=UTF-8',
        success: function (res) {
            callback(res.data);
        },
        error: function (err) {
            console.log(err);
        }
    });
}

// 양식 레이블 매핑 ml 데이터 insert
function addDocMappingTrain(data, callback) {
    $.ajax({
        url: '/batchLearning/insertDocMapping',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'data': data }),
        contentType: 'application/json; charset=UTF-8',
        success: function (res) {
            console.log(res);
            callback(res.data);
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function addColumnMappingTrain(data, callback, progressId) {

    $.ajax({
        url: '/batchLearning/insertColMapping',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'data': data }),
        contentType: 'application/json; charset=UTF-8',
        success: function (res) {
            console.log(res);
            fn_alert('alert', "success training");
            //addProgressBar(81, 100);
            //callback(data);
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
            endProgressBar(progressId);

        }
    });
}

// layer1(문서양식조회 및 등록) 분류제외문장 선택시 수정
function editBannedword() {

    // 수정 중 포커스 잃었을 때
    $(document).on('focusout', '.editForm_bannedword', function () {
        var editVal = $(this).val();
        $(this).closest('td').html(editVal);
    });

    // td영역 클릭시 edit
    $(document).on('click', '.td_bannedword', function () {
        var bannedCheck = $(this).prev().find('.ui_layer1_result_chk').is(':checked');
        var isInputFocus = $(this).children('input').is(":focus");
        if (bannedCheck && isInputFocus == false) {
            var originVal = $(this).html();
            var editInputHtml = '<input type="text" class="editForm_bannedword" value="' + originVal + '">';
            $(this).empty().append(editInputHtml).children('input').focus();
        }
    })

    // 개별체크
    $(document).on('click', '.ui_layer1_result_chk', function () {
        if ($(this).is(':checked')) {
            var $editTd = $(this).closest('td').next();
            var originVal = $editTd.html();
            var editInputHtml = '<input type="text" class="editForm_bannedword" value="' + originVal + '">';
            $editTd.empty().append(editInputHtml).children('input').focus();

        }
    });

    // 모두체크
    $('#allCheckClassifySentenses').click(function () {
        var isCheck = $(this).is(':checked');

        if (isCheck) {
            $('.ui_layer1_result_chk').prop('checked', true);
            $('.ui_layer1_result_chk').closest('.ez-checkbox').addClass('ez-checked');

        } else {
            $('.ui_layer1_result_chk').prop('checked', false);
            $('.ui_layer1_result_chk').closest('.ez-checkbox').removeClass('ez-checked');
        }

    });
}

// 문서 양식 조회 이미지 좌우 버튼 이벤트
function changeDocPopupImage() {
    $('#docSearchResultImg_thumbPrev').click(function () {
        $('#docSearchResultImg_thumbNext').attr('disabled', false);
        if (docPopImagesCurrentCount == 1) {
            return false;
        } else {
            docPopImagesCurrentCount--;
            $('#countCurrent').html(docPopImagesCurrentCount);
            $('#orgDocName').val(docPopImages[docPopImagesCurrentCount - 1].DOCNAME);
            $('#searchResultDocName').val(docPopImages[docPopImagesCurrentCount - 1].DOCNAME);
            $('#searchResultImg').attr('src', '/sample/' + docPopImages[docPopImagesCurrentCount - 1].SAMPLEIMAGEPATH);
            if (docPopImagesCurrentCount == 1) {
                $('#docSearchResultImg_thumbPrev').attr('disabled', true);
            } else {
                $('#docSearchResultImg_thumbPrev').attr('disabled', false);
            }
        }
    });

    $('#docSearchResultImg_thumbNext').click(function () {
        var totalCount = $('#countLast').html();
        $('#docSearchResultImg_thumbPrev').attr('disabled', false);
        if (docPopImagesCurrentCount == totalCount) {
            return false;
        } else {            
            docPopImagesCurrentCount++;
            $('#countCurrent').html(docPopImagesCurrentCount);
            $('#orgDocName').val(docPopImages[docPopImagesCurrentCount - 1].DOCNAME);
            $('#searchResultDocName').val(docPopImages[docPopImagesCurrentCount - 1].DOCNAME);
            $('#searchResultImg').attr('src', '/sample' + docPopImages[docPopImagesCurrentCount - 1].SAMPLEIMAGEPATH);
            if (docPopImagesCurrentCount == totalCount) {
                $('#docSearchResultImg_thumbNext').attr('disabled', true);
            } else {
                $('#docSearchResultImg_thumbNext').attr('disabled', false);
            }
        }
    });
}

// 문서 양식 조회 이미지 좌우 버튼 이벤트
function changeOcrDocPopupImage() {
    var totalImgCount = lineText.length - 1;
    currentImgCount = 0;

    $('#ocrResultImg_thumbPrev').click(function () {
        $('#docSearchResultImg_thumbNext').attr('disabled', false);
        if (currentImgCount == 0) {
            return false;
        } else {
            currentImgCount--;
            var appendImg = '<img id="originImg" src="/img/' + lineText[currentImgCount].fileName + '">'
            $('#originImgDiv').html(appendImg);
            selectClassificationStOcr('', currentImgCount);
            if (currentImgCount == 0) {
                $('#docSearchResultImg_thumbPrev').attr('disabled', true);
            } else {
                $('#docSearchResultImg_thumbPrev').attr('disabled', false);
            }
        }
    });

    $('#ocrResultImg_thumbNext').click(function () {
        $('#docSearchResultImg_thumbPrev').attr('disabled', false);
        if (currentImgCount == totalImgCount) {
            return false;
        } else {
            currentImgCount++;
            var appendImg = '<img id="originImg" src="/img/' + lineText[currentImgCount].fileName + '">'
            $('#originImgDiv').html(appendImg);
            selectClassificationStOcr('', currentImgCount);
            if (currentImgCount == totalImgCount) {
                $('#docSearchResultImg_thumbNext').attr('disabled', true);
            } else {
                $('#docSearchResultImg_thumbNext').attr('disabled', false);
            }
        }
    });
}

// 분류제외문장 조회
function selectClassificationStOcr(filepath, currentImgCount) {

    var param = {
        filepath: filepath
    };
    var resultOcrData = '';
    $.ajax({
        //todo
        url: '/batchLearning/selectClassificationSt',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            //addProgressBar(1, 99);
        },
        success: function (data) {
            //console.log("SUCCESS selectClassificationSt : " + JSON.stringify(data));
            if (data.code != 500 || data.data != null) {

                var ocrdata = lineText[currentImgCount].data.data;

                //순서 정렬 로직
                let tempArr = new Array();
                for (let item in ocrdata) {
                    tempArr[item] = new Array(makeindex(ocrdata[item].location), ocrdata[item]);
                }

                tempArr.sort(function (a1, a2) {
                    a1[0] = parseInt(a1[0]);
                    a2[0] = parseInt(a2[0]);
                    return (a1[0] < a2[0]) ? -1 : ((a1[0] > a2[0]) ? 1 : 0);
                });

                for (let i = 0; i < tempArr.length; i++) {

                    var bannedCheck = true;
                    for (let j = 0; j < data.bannedData.length; j++) {
                        if (tempArr[i][1].text.toLowerCase().indexOf(data.bannedData[j].WORD) == 0) {
                            bannedCheck = false;
                            break;
                        }
                    }

                    if (bannedCheck) {
                        resultOcrData += '<tr class="ui_layer1_result_tr">';
                        resultOcrData += '<td><input type="checkbox" class="ui_layer1_result_chk"></td>';
                        resultOcrData += '<td class="td_bannedword">' + tempArr[i][1].text + '</td></tr>';
                    } else {
                        resultOcrData += '<tr class="ui_layer1_result_tr">';
                        resultOcrData += '<td><input type="checkbox" checked="checked" class="ui_layer1_result_chk"></td>';
                        resultOcrData += '<td class="td_bannedword">' + tempArr[i][1].text + '</td></tr>';
                    }

                }
                $('#ui_layer1_result').empty().append(resultOcrData);
                $('input[type=checkbox]').ezMark();

            }

        },
        error: function (err) {
            console.log(err);
        }
    })
}

function fn_viewDoctypePop(obj) {
    //20180910 filepath로 ocr 데이터 조회 후 text값만 가져올 것
	//console.log(modifyData);

	var data = obj.data[0];
	layer4Data = obj.data[0];
	var filepath = data.fileinfo.filepath;
	var imgId = data.fileinfo.imgId;
    //var rowIdx = $(obj).closest('tr').attr('id').split('_')[1];
	//var fileName = nvl(filepath.substring(filepath.lastIndexOf('/') + 1));
    var fileName = data.fileinfo.convertFilepath.replace(/\/uploads/,'/img');
	var mlDocName = data.docCategory.DOCNAME;
	var mlPercent = data.docCategory.DOCSCORE;

	//console.log("filepath : " + filepath);
	//console.log("imgId : " + imgId);
	//console.log("fileName : " + fileName);
	//console.log("mlDocName : " + mlDocName);
	//console.log("mlPercent : " + mlPercent);

    //$('#batchListRowNum').val(rowIdx);
    $('#docPopImgId').val(imgId);
    $('#docPopImgPath').val(data.fileinfo.convertFilepath);
	
    initLayer4();
    selectClassificationSt(filepath); // 분류제외문장 렌더링
    //$('#mlPredictionDocName').val($('#docName').text());
	//var filename = filename.split('.')[0];
    var appendPngHtml = '';
    //if(imgCount == 1) {
		//var pngName = fileName + '.png';
		appendPngHtml += '<img src="' + fileName +'" id="originImg">';
    //} else {

    //    for(var i = 0; i < imgCount; i++) {
    //        var pngName = filename + '-' + i + '.png';
    //        appendPngHtml += '<img src="/img/' + pngName +'" style="width: 100%; height: auto; margin-bottom: 20px;">';
    //    }
	//}
	//$('#div_view_image').empty().append(appendPngHtml);
	$('#originImgDiv').empty().append(appendPngHtml);
	$('#mlPredictionDocName').val(mlDocName);
    $('#mlPredictionPercent').val($('#docPredictionScore').text()); 
	//$('#mlData').val(data);
	$('#imgNumIpt').val(1);
	$('#imgTotalCnt').html(1);
	
	layer_open('layer4');
	$('#div_view_image').scrollTop(0);

}

function initLayer4() {
    docPopImages = null;
    $('#docSearchResultImg_thumbPrev').attr('disabled', true);
    $('#docSearchResultImg_thumbNext').attr('disabled', true);
    $('#originImgDiv').empty();
    $('#mlPredictionDocName').val('');
    $('#docSearchResultImg_thumbCount').hide();
    $('#docSearchResultMask').hide();
    $('#countCurrent').empty();
    $('#countLast').empty();
    $('#mlPredictionPercent').val('');
    $('#orgDocSearchRadio').click();
    $('.ui_doc_pop_ipt').val('');
    $('#docSearchResult').empty();
    $('#searchResultDocName').val('');
    $('#searchDocCategoryKeyword').val('');
    $('#batch_layer4_result').empty();
    $('#allCheckClassifySentenses').prop('checked', false);
    $('#allCheckClassifySentenses').closest('.ez-checkbox').removeClass('ez-checked');
}


// UI학습 팝업 초기화
var fn_initUiTraining = function () {
    $('#imgNameTag').text('');
    $("#uiImg").html('');
    $("#textResultTbl").html('');
};

function fn_uiDocTopType(docCategory) {
    var docTopType = docCategory.DOCTOPTYPE;

    $.ajax({
        url: '/batchLearningTest/uiDocTopType',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify({ 'docTopType': docTopType }),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            var selHtmlText = "";
            if (data.docTopData) {
                $('#uiDocTopTypeDiv').empty();
                selHtmlText += "<select id='uiDocTopType'>"  
                                
                for (var i = 0; i < data.docTopData.length; i++) {
                    if (docTopType && docTopType == data.docTopData[i].SEQNUM) {
                        selHtmlText += "<option value='" + data.docTopData[i].SEQNUM + "' selected>" + data.docTopData[i].KORNM + "</option>";
                    } else {
                        selHtmlText += "<option value='" + data.docTopData[i].SEQNUM + "'>" + data.docTopData[i].KORNM + "</option>";
                    }

                }

                selHtmlText += "</select>"

            }

            $("#uiDocTopTypeDiv").html(selHtmlText);    
            $("#uiDocTopType").stbDropdown();
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function appendSelOptionHtml(targetColumn, columns, docTopType) {

    var selectHTML = '<select class="docLabel">';
    var optionHTML = '';
    optionHTML = '<option value="-1">Unknown</option>';
    selectHTML += optionHTML;
    for (var i in columns) {
        if(docTopType == columns[i].DOCID){
            if (targetColumn == columns[i].SEQNUM) {
                optionHTML = '<option value="' + columns[i].SEQNUM + '" selected>' + columns[i].KORNM + '</option>';
            } else {
                optionHTML = '<option value="' + columns[i].SEQNUM + '">' + columns[i].KORNM + '</option>';
            }
            selectHTML += optionHTML;
        }
    }
    selectHTML += '</select>';

    return selectHTML;
}

function appendSelOptionHtmlFromLabel(type) {

    var selectHTML = '<select class="docLabel">';
    selectHTML += '<option value="U">Unknown</option>';
    if (type == 'L') selectHTML += '<option value="L" selected>Label</option>';
    else selectHTML += '<option value="L">Label</option>';
    if (type == 'E') selectHTML += '<option value="E" selected>Entry</option>';
    else selectHTML += '<option value="E">Entry</option>';
    selectHTML += '</select>';

    return selectHTML;
}
// UI 레이어 화면 구성 함수
function uiLayerHtml(data) {
    var mlData = data.data[0].data;
    mlDataList = mlData;
    var labelData = data.data[0].labelData;
    labelDataList = labelData;
	var docToptype = data.data[0].docCategory.DOCTOPTYPE;
	//console.log(modifyData);
    //var fileName = filePath.substring(filePath.lastIndexOf('/') + 1, filePath.length);
    fn_initUiTraining(); // 레이어 초기화
    fn_uiDocTopType(data.data[0].docCategory); // Top Type select box 생성
	$('#docName').html(data.data[0].docCategory.DOCNAME);
	$('#docPredictionScore').html(Math.floor(data.data[0].docCategory.DOCSCORE * 100));
	$('#docPredictionScore').append('%');

	if ($('#docPredictionScore').val() >= 90) {
		$('#docName').css('color', 'dodgerblue');
		$('#docPredictionScore').css('color', 'dodgerblue');
	} else {
		$('#docName').css('color', 'darkred');
		$('#docPredictionScore').css('color', 'darkred');
	}

	$('#docName').click(function () { fn_viewDoctypePop(data) });
	$('#docPredictionScore').click(function () { fn_viewDoctypePop(data) });
	$('#docCompareBtn').click(function () { fn_viewDoctypePop(data) });
    //layer_open('layer2');


    $('#imgNameTag').text(data.data[0].fileinfo.filepath);

    var mainImgHtml = '';
    mainImgHtml += '<div id="mainImage" class="ui_mainImage">';
    mainImgHtml += '<div id="redNemo">';
    mainImgHtml += '</div>';
    mainImgHtml += '</div>';
    mainImgHtml += '<div id="imageZoom" ondblclick="viewOriginImg()">';
    mainImgHtml += '<div id="redZoomNemo">';
    mainImgHtml += '</div>';
    mainImgHtml += '</div>';
    $('#img_content').html(mainImgHtml);

    /*
    var fileName = nvl(data.data[0].fileinfo.filepath.substring(data.data[0].fileinfo.filepath.lastIndexOf('/') + 1));
    fileName = fileName.substring(0, fileName.indexOf('.')) + '.png';
    $('#mainImage').css('background-image', 'url("/tif/' + fileName + '")');
    */

    var tblTag = '';
    var tblSortTag = '';

    var mlDataArray = data.data;
    
    // UI 레이어 화면 좌측 이미지 html 생성 (다중 이미지이면 아래로 붙어서 나옴)
    var imgNameHtml = "";
    for (var l in mlDataArray) {
        var imgName = nvl(data.data[l].fileinfo.filepath.substring(data.data[l].fileinfo.filepath.lastIndexOf('/') + 1));
        var fileExt = data.data[l].fileinfo.filepath.substring(data.data[l].fileinfo.filepath.lastIndexOf(".") + 1, data.data[l].fileinfo.filepath.length);

        if (fileExt.toLowerCase() == "png" || fileExt.toLowerCase() == "pdf") {
            imgName = imgName.substring(0, imgName.lastIndexOf('.')) + '.png';
        } else if (fileExt.toLowerCase() == "jpg") {
            imgName = imgName.substring(0, imgName.lastIndexOf('.')) + '.jpg';
        }

        imgNameHtml += '<img src="/img/' + imgName + '" style="width: 100%; height: auto; margin-bottom: 20px;">';
    }
    
    //$('#mainImage').append(imgNameHtml);

    var firstImgName = "";
    var appendThumbnailHtml = "";
    // imgThumbnail
    for(var i = 0; i < mlDataArray.length; i++) {
        if(i == 0) {
            //firstImgName = nvl(data.data[i].fileinfo.convertFilepath.substring(data.data[i].fileinfo.convertFilepath.lastIndexOf('/') + 1));
            firstImgName = nvl(data.data[i].fileinfo.convertFilepath.replace(/\/uploads/,'/img'));
            appendThumbnailHtml += '<li class="on">';
        } else {
            appendThumbnailHtml += '<li>';
        }
        var imgFullPath = nvl(data.data[i].fileinfo.convertFilepath.replace(/\/uploads/, '/img'));
        var imgName = nvl(data.data[i].fileinfo.convertFilepath.substring(data.data[i].fileinfo.convertFilepath.lastIndexOf('/') + 1));
        /*
        var imgName = nvl(data.data[i].fileinfo.convertFilepath.substring(data.data[i].fileinfo.convertFilepath.lastIndexOf('/') + 1));        
        var fileExt = data.data[i].fileinfo.convertFilepath.substring(data.data[i].fileinfo.convertFilepath.lastIndexOf(".") + 1, data.data[i].fileinfo.convertFilepath.length);
        
        if (fileExt.toLowerCase() == "png" || fileExt.toLowerCase() == "pdf") {
            imgName = imgName.substring(0, imgName.lastIndexOf('.')) + '.png';
        } else if (fileExt.toLowerCase() == "jpg") {
            imgName = imgName.substring(0, imgName.lastIndexOf('.')) + '.jpg';
        }
        */
        appendThumbnailHtml += '<div class="box_img"><i><img src="' + nvl(imgFullPath) + '" ' +
            'class="thumb-img" title="' + nvl(imgName) + '"></i>' +
            '</div>' +
            '<span>' + nvl(imgName) + '</span>' +
            '</li> ';
        /*
        appendThumbnailHtml += '<div class="box_img"><i><input type="hidden" class="axis" value="' + data.data[i].xAxis + ',' + data.data[i].yAxis + ',' + data.data[i].width + ',' + data.data[i].height +'"/><img src="' + nvl(imgFullPath) + '" ' +
                'class="thumb-img" title="' + nvl(imgName) + '"></i>' +
                '</div>' +
                '<span>' + nvl(imgName) + '</span>' +
                '</li> ';
        */
    }

    var mainImgHtml = '';
    mainImgHtml += '<div id="mainImage" class="docUpload_mainImage" style="height:1600px !important;">';
    mainImgHtml += '</div>';
    mainImgHtml += '<div id="imageZoom" ondblclick="viewOriginImg()">';
    mainImgHtml += '<div id="redZoomNemo"><div id="targetZoom"></div>';
    mainImgHtml += '</div>';
    mainImgHtml += '</div>';
    $('#div_invoice_view_image_2').html(mainImgHtml);

    //var height = 1600 + "px !important";
    //$("#mainImage").css("height", height);
    $('#mainImage').css('background-image', 'url("' + firstImgName + '")');
    $("#imageBox").empty().append(appendThumbnailHtml);
    //checkDocLabelDef(docLabelDefList);
    //checkDocMlData(docAnswerDataList);
    //changeTabindex();
    thumbImgEvent();

    // UI 레이어 화면 우측 추출 텍스트 및 컬럼 html 생성
    for (var l in mlDataArray) {

        mlData = mlDataArray[l].data;
        var filePath = mlDataArray[l].fileinfo.convertFilepath.replace(/\/uploads/,'/img');
        //filePath = filePath.substring(filePath.lastIndexOf("/") + 1, filePath.length);

        //tblSortTag = '';
        for (var i in mlData) {
            if (mlData[i].entryLbl > 0) {
                tblTag += '<dl>';
                tblTag += '<dt onclick="zoomImg(this,' + "'" + filePath + "'" + ')">';
                tblTag += '<label style="width:100%;">';
                tblTag += '<input type="text" value="' + mlData[i].text + '" style="width:100%; border:0;" />';
                tblTag += '<input type="hidden" value="' + mlData[i].location + '" />';
                tblTag += '<input type="hidden" value="' + filePath + '" />';
                tblTag += '</label>';
                tblTag += '</dt>';
                tblTag += '<dd class="columnSelect" style="width:20.9% !important;">';
                tblTag += appendSelOptionHtmlFromLabel('E');
                tblTag += '</dd>';
                tblTag += '<dd style="width:0.1% !important;">';
                tblTag += '<input type="checkbox" style="display:none" class="entryChk" checked>';
                tblTag += '</dd>';
                tblTag += '<dd class="columnSelect" style="display:none">';
                tblTag += '</dd>';
                tblTag += '<dd class="entrySelect" style="width:27% !important;">';
                tblTag += appendSelOptionHtml((mlData[i].entryLbl + '') ? mlData[i].entryLbl : 999, labelData, docToptype);
                tblTag += '</dd>';
                tblTag += '</dl>';
            } else if (mlData[i].colLbl > 0) {
                tblSortTag += '<dl>';
                tblSortTag += '<dt onclick="zoomImg(this,' + "'" + filePath + "'" + ')">';
                tblSortTag += '<label style="width:100%;">';
                tblSortTag += '<input type="text" value="' + mlData[i].text + '" style="width:100%; border:0;" />';
                tblSortTag += '<input type="hidden" value="' + mlData[i].location + '" />';
                tblSortTag += '<input type="hidden" value="' + filePath + '" />';
                tblSortTag += '</label>';
                tblSortTag += '</dt>';
                tblSortTag += '<dd class="columnSelect" style="width:20.9% !important;">';
                tblSortTag += appendSelOptionHtmlFromLabel('L');
                tblSortTag += '</dd>';
                tblSortTag += '<dd style="width:0.1% !important;">';
                tblSortTag += '';
                tblSortTag += '</dd>';
                tblSortTag += '<dd class="columnSelect" style="width:27% !important;">';
                tblSortTag += appendSelOptionHtml((mlData[i].colLbl + '') ? mlData[i].colLbl : 999, labelData, docToptype);
                tblSortTag += '</dd>';
                tblSortTag += '<dd class="entrySelect" style="display:none">';
                tblSortTag += '</dd>';
                tblSortTag += '</dl>';
            } else {
                tblSortTag += '<dl>';
                tblSortTag += '<dt onclick="zoomImg(this,' + "'" + filePath + "'" + ')">';
                tblSortTag += '<label style="width:100%;">';
                tblSortTag += '<input type="text" value="' + mlData[i].text + '" style="width:100%; border:0;" />';
                tblSortTag += '<input type="hidden" value="' + mlData[i].location + '" />';
                tblSortTag += '<input type="hidden" value="' + filePath + '" />';
                tblSortTag += '</label>';
                tblSortTag += '</dt>';
                tblSortTag += '<dd class="columnSelect" style="width:20.9% !important;">';
                tblSortTag += appendSelOptionHtmlFromLabel();
                tblSortTag += '</dd>';
                tblSortTag += '<dd style="width:0.1% !important;">';
                tblSortTag += '';
                tblSortTag += '</dd>';
                tblSortTag += '<dd class="columnSelect" style="width:27% !important;">';
                tblSortTag += appendSelOptionHtml((mlData[i].colLbl + '') ? mlData[i].colLbl : 999, labelData, docToptype);
                tblSortTag += '</dd>';
                tblSortTag += '<dd class="entrySelect" style="display:none">';
                tblSortTag += '</dd>';
                tblSortTag += '</dl>';
            }
        }
        //$('#textResultTbl').append('<div id="' + imgNameText + '" name="textColDiv">');
        //$('#textResultTbl').append(tblTag + tblSortTag);//.append(tblSortTag);
        //$('#textResultTbl').append('</div>');
    }

    $('#textResultTbl').append(tblTag).append(tblSortTag);
    //$('#textResultTbl select').stbDropdown();
    
    // input 태그 마우스오버 말풍선 Tooltip 적용
    $('#textResultTbl input[type=checkbox]').ezMark();
    new $.Zebra_Tooltips($('.tip'));
    dbSelectClickEvent();
    checkBoxMLCssEvent();

    $(".entryChk").change(function () {

        if ($(this).is(":checked")) {
            $(this).closest('dl').find('.columnSelect').hide();
            $(this).closest('dl').find('.entrySelect').show();
        } else {
            $(this).closest('dl').find('.columnSelect').show();
            $(this).closest('dl').find('.entrySelect').hide();
        }

    })
}

$(document).on('change', '#uiDocTopType', function(){
    var docToptype = $(this).val();
    
    var param = {
        "docToptype": docToptype
    }
    
    $.ajax({
        url: '/uiLearning/selectIcrLabelDef',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        success: function (data) {
            if (data.code == 200) {
                console.log(data);
                var labelList = data.labelList;
                var appendSelectOptionHtml = '<option value="-1">Unknown</option>';
                for(var i = 0; i < labelList.length; i++) {
                    appendSelectOptionHtml += '<option value="' + labelList[i].SEQNUM + '">' + labelList[i].KORNM + '</option>';
                }
                var appendSelectLEOptionHtml = '<option value="U">Unknown</option>';
                appendSelectLEOptionHtml += '<option value="L">Label</option>';
                appendSelectLEOptionHtml += '<option value="E">Entry</option>';

                $('.docLabel:even').empty().append(appendSelectLEOptionHtml);
                $('.docLabel:odd').empty().append(appendSelectOptionHtml);
                $('#docTopType').val($('#uiDocTopType').val());
            } else {
                fn_alert('alert', data.message);
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
})

var uiLearnTraining = function (imgIdArray) {

    $.ajax({
        url: '/uiLearning/uiLearnTraining',
        type: 'post',
        datatype: 'json',
        data: JSON.stringify({ imgIdArray: imgIdArray }),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $('#btn_pop_batch_close').click();
            $('#progressMsgTitle').html("processing UI learn data...");
            progressId = showProgressBar();
        },
        success: function (data) {
            console.log(data);
            //modifyData = data.data;
            $('#progressMsgTitle').html("success UI learn data...");
            //selectTypoData(data);
            modifyData = $.extend([], data.data);
            uiLayerHtml(data);
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
        }
    });

};

// 문서관리에서 재학습으로 넘어온 프로세스 실행
function processFromDocManage() {
    if ($('#fileNameParam').val() != '') {
        var filepath = $('#fileNameParam').val();
        //filepath = filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length);
        var fileInfo = {
            'filePath': filepath
        };
        processImage(fileInfo, false);
        progressId = showProgressBar();
    }
}
