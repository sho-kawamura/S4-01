/*
    file name:  main.js
    author:     FSI Yudai ISHII
*/

var appId = "template";

var CONTENT_W = 1280;
var CONTENT_H = 960;

var old_X, old_Y, new_X, new_Y;

//描画ツール情報
var toolInfo = {
    tool: 0,            // ツール番号 0:タッチ, 1:ペン, 2:マーカー, 3:消しゴム
    color: "#000000",   // ペン色
    size: 6,            // ペンサイズ
    opacity: 1.0        // ペン透明度
};

var TOOL_FINGER  = 0;
var TOOL_PEN     = 1;
var TOOL_MARKER  = 2;
var TOOL_ERASER  = 3;

var bDraw = false;      // 描画フラグ
var bMove = false;      // 移動フラグ
var bErase = false;     // 消しゴムフラグ
var locusLog = [];      // 描画ログ（二重配列）
var locusCnt = 0;       // 描画回数

// 描画対象のcanvas、及びコンテキスト
var cEle, cCtx;
cEle = document.getElementById("Mycanvas");
cCtx = cEle.getContext('2d');
cCtx.lineJoin = 'round';
cCtx.lineCap = 'round';

var nColor = 0;         // 背景色(0:白, 1:黒, 2:水色, 3:緑)
var arrBColor = [
    "#ffffff",
    "#000000",
    "#99ffff",
    "#005000"
];

(function(global, $) {
	"use strict";

	var init = {
        ctrls: function() {
            // 自動リサイズライブラリ呼び出し
            fsi_adjustStageSize(CONTENT_W, CONTENT_H);
            
            //canvasの論理サイズ調整
			$("#Mycanvas").attr("width", CONTENT_W);
			$("#Mycanvas").attr("height", CONTENT_H);
        },
		handler: function() {
            $("#txtTestText").val("※共通基盤から受け取ったpostMessageを出力します。");
            $(window).resize(function() {
                // 自動リサイズライブラリ呼び出し
	            fsi_adjustStageSize(CONTENT_W, CONTENT_H);
                
            });

            // iPad対応（ピンチインピンチアウトによる拡大縮小を禁止）
            document.documentElement.addEventListener('touchstart', function (e) {
                if (e.touches.length >= 2) {e.preventDefault();}
            }, {passive: false});

            // iPad対応（ダブルタップによる拡大を禁止）
            var t = 0;
            document.documentElement.addEventListener('touchend', function (e) {
                var now = new Date().getTime();
                if ((now - t) < 350){
                    e.preventDefault();
                }
                t = now;
            }, false); 
            
            //iPad対応（ページスクロールを無効にする）
            $(window).on('touchmove.noScroll', function(e) {
                e.preventDefault();
            });
            
            //背景色変更ボタン押下時
            $("#changeBackColor").click(function(){
                var color = "#ffffff";
                
                if(nColor>2){
                    nColor = 0;
                }else{
                    nColor++;
                }
                color = arrBColor[nColor];
                
                $("#contbase").css("background-color", color);
            });
            
            // 親フレームからのツールバー選択状態情報の受信
            $(window).on('message', function(_evt) {          
                var arParam = _evt.originalEvent.data.split("[,]");
                var msg = "";
                
                //受信したmessageごとの処理
                if (arParam[0] === "FFLCOM_CHANGE_TOOL"){
                    //ツール変更（ペン・マーカー, 消しゴム, 図形・スタンプ, ポインター, 付箋の各ボタン押下時）
                    msg += "ツール変更ボタンが押されました。"  + "\r\n";
                    msg += arParam[1] + "\r\n";
                    var prop = {};
                    if(typeof arParam[2] !== "undefined"){
                        msg += arParam[2] + "\r\n";
                        prop = JSON.parse(arParam[2]);
                    }
                    $("#txtTestText").val(msg);
                    setCurrentToolInfo(arParam[1], prop);
                
                }else if (arParam[0] === "FFLCOM_CLEAR"){
                    //全消去ボタン押下時
                    $("#txtTestText").val("全消去ボタンが押されました。");
                    canvasClear();
                }else if (arParam[0] === "FFLCOM_SET_MODE_FINGER"){
                    //タッチボタン押下時
                    $("#txtTestText").val("タッチボタンが押されました。");
                    setModeFinger();
                }else if (arParam[0] === "FFLCOM_ORIGINAL"){
                    //オリジナルツールボタン押下時
                    msg += "オリジナルツールボタンが押されました。"  + "\r\n";
                    for(var p=1;p<arParam.length;p++){
                        if(typeof arParam[p] !== "undefined"){
                            msg += arParam[p] + "\r\n";
                        }
                    }
                    $("#txtTestText").val(msg);
                }else if (arParam[0] === "FFLCOM_UNDO"){
                    //アンドゥボタン押下時
                    $("#txtTestText").val("アンドゥボタンが押されました。");
                }else if (arParam[0] === "FFLCOM_REDO"){
                    //リドゥボタン押下時
                    $("#txtTestText").val("リドゥボタンが押されました。");
                }else if (arParam[0] === "FFLCOM_MEKURI"){
                    //めくりボタン押下時
                    $("#txtTestText").val("めくりボタンが押されました。" + "\r\n" + arParam[1]);
                }else if (arParam[0] === "FFLCOM_READING"){
                    //朗読ボタン押下時
                    $("#txtTestText").val("朗読ボタンが押されました。" + "\r\n" + arParam[1]);
                }else if (arParam[0] === "FFLCOM_CLICKABLE"){
                    //クリックポイント表示ボタン押下時
                    $("#txtTestText").val("クリックポイント表示ボタンが押されました。" + "\r\n" + arParam[1]);
                }else if (arParam[0] === "FFLCOM_SPREAD"){
                    //見開き表示ボタン押下時
                    $("#txtTestText").val("見開き表示ボタンが押されました。" + "\r\n" + arParam[1]);
                }else if (arParam[0] === "FFLCOM_SCROLL"){
                    //巻物表示ボタン押下時
                    $("#txtTestText").val("巻物表示ボタンが押されました。" + "\r\n" + arParam[1]);
                }else if (arParam[0] === "FFLCOM_HIDDEN"){
                    //全非表示ボタン押下時
                    $("#txtTestText").val("全非表示ボタンが押されました。" + "\r\n" + arParam[1]);
                }else if (arParam[0] === "FFLCOM_SAVEIMAGE"){
                    //画像で保存ボタン押下時
                    $("#txtTestText").val("画像で保存ボタンが押されました。");
                }else if (arParam[0] === "FFLCOM_GET_LEARNINGREC"){
                    //学習記録取得時
                    $("#txtTestText").val("学習記録を取得しました。");
                    loadLocusLog(JSON.parse(arParam[1]));
                }
            });
            
            //ツールID callボタン押下時
            $("#callButton").click(function(){
                var id = $("#callText").val();
                window.parent.postMessage("FFLCOM_CALL_SBUTTON" + "[,]" + id,"*");
            });
            
            //ツール・色選択時
            $(".callChange").change(function(){
                
                //ツール選択値取得
                var tool = $("#callSelectTool").val();
                
                //色選択値取得
                var color = $("#callSelectColor").val();
                
                var id = "";
                var param = {};
                if(tool == TOOL_FINGER){
                    tool = "FFLCOM_TOOL_FINGER";
                    param = {
                        color: color,
                        size: 6,
                        opacity: 1.0
                    };
                }
                else if(tool == TOOL_PEN){
                    tool = "FFLCOM_TOOL_PEN";
                    param = {
                        color: color,
                        size: 6,
                        opacity: 1.0
                    };
                }
                else if(tool == TOOL_MARKER){
                    tool = "FFLCOM_TOOL_MARKER";
                    param = {
                        color: color,
                        size: 20,
                        opacity: 0.5
                    };
                }
                else if(tool == TOOL_ERASER){
                    tool = "FFLCOM_TOOL_ERASER";
                    param = {
                        color: color,
                        size: 6,
                        opacity: 1.0
                    };
                }
                
                param = JSON.stringify(param);
                
                //共通基盤にFFLCOM_CALL_CHANGE_TOOLのpostMessageを送信する
                window.parent.postMessage("FFLCOM_CALL_CHANGE_TOOL" + "[,]" + tool + "[,]" + param,"*");
            });
            
            //canvasのイベント
            $("#Mycanvas").on({
            'mousedown touchstart pointerdown':function(e) {
                e.preventDefault();
                
                //既に描画中ではない場合
                if(!bDraw){
                    if (toolInfo.tool) {
                        bDraw = true;
                    }
                    
                    //消しゴムの場合
                    if (toolInfo.tool == TOOL_ERASER) {
                        bDraw = false;
                        bErase = true;
                        return;
                    }
                    
                    //マウス座標を取得
                    var posP = {x:0, y:0};
                    if(e.touches && e.touches[0]){
                        posP = {
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY
                        };
                    }
                    else if(e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches[0]){
                        posP = {
                            x: e.originalEvent.changedTouches[0].clientX,
                            y: e.originalEvent.changedTouches[0].clientY
                        };
                    }
                    else if(e.clientX && e.clientY){
                        posP = {
                            x: e.clientX,
                            y: e.clientY
                        };
                    }
                    
                    //マウス座標をcanvasの論理座標に変換
                    var pos = cnvPosLog2Phys(posP.x, posP.y);
                    old_X = pos.x;
                    old_Y = pos.y;
                }
				
            },'mouseup mouseout mouseleave touchend touchcancel pointerup':function(e) {
                e.preventDefault();
                
                if(bDraw){
                    
	                //ペンの場合、かつmoveがない（クリック）場合
	                //及び、マーカーの場合、このタイミングで記録する
	                if((toolInfo.tool == TOOL_PEN && !bMove) || (toolInfo.tool == TOOL_MARKER)){
	                    if(!locusLog[locusCnt]){
                            locusLog[locusCnt] = [];
                        }
                        
                        if(toolInfo.tool == TOOL_PEN){
                            new_X = old_X;
                            new_Y = old_Y;
                        }else if(toolInfo.tool == TOOL_MARKER){
                            if(old_X == new_X && old_Y == new_Y){
                               old_X = old_X - 1;
                               new_X = new_X + 1;
                            }
                        }
                        
	                    locusLog[locusCnt].push({
	                        tool:toolInfo.tool,
	                        sx:old_X,
	                        sy:old_Y,
	                        ex:new_X,
	                        ey:new_Y,
	                        color:toolInfo.color,
	                        opacity:toolInfo.opacity,
	                        size:toolInfo.size
	                    });
	                    old_X = new_X;
	                    old_Y = new_Y;
                        
                        //まずcanvasの描画をすべて消す
                        cCtx.clearRect(0, 0, cEle.width, cEle.height);

                        //描画ログをはじめから順に描き直す
                        locusLog.forEach(function(locus){
                            cCtx.beginPath();
                            locus.forEach(function(l){
                                //描画ログの描画情報に合わせてcanvasに描画する
                                cCtx.moveTo(l.sx, l.sy);
                                cCtx.lineTo(l.ex, l.ey);
                                cCtx.strokeStyle = l.color;
                                cCtx.globalAlpha = l.opacity;
                                cCtx.lineWidth = l.size;
                                if(l.tool == TOOL_PEN){
                                    cCtx.lineJoin = "round";
                                    cCtx.lineCap = "round";
                                }else if(l.tool == TOOL_MARKER){
                                    cCtx.lineJoin = "bevel";
                                    cCtx.lineCap = "square";
                                }
                            });

                            cCtx.closePath();
                            cCtx.stroke();
                        });
                        
	                }
	                
	                //描画終わりのフラグ
                    bDraw = false;
                    bMove = false;
                    locusCnt++;
                    
                    //描画ログがある場合
                    if(locusCnt>0){
                        //ツールバー上の「全消去」ボタンアイコンを変更する
                        window.parent.postMessage("FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]" + 1,"*");
                        
                        //描画情報を保存するためのpostMessageを共通基盤側に送信する
                        window.parent.postMessage("FFLCOM_SET_LEARNING_REC" + "[,]" + JSON.stringify(locusLog),"*");
                    }
	                
	            }
                else{
	                //消しゴムの場合（全消去ボタンと同じ動作、共通基盤側の消しゴムと動作が異なる）
	                if (toolInfo.tool == TOOL_ERASER && bErase == true) {
	                    canvasClear();
	                    bErase = false;
	                }
	            }

            },'mousemove touchmove pointermove':function(e) {
                e.preventDefault();
                if (toolInfo.tool && bDraw == true) {
                    bMove =true;
                    //マウス座標を取得
                    var posP = {x:0, y:0};
                    if(e.touches && e.touches[0]){
                        posP = {
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY
                        };
                    }
                    else if(e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches[0]){
                        posP = {
                            x: e.originalEvent.changedTouches[0].clientX,
                            y: e.originalEvent.changedTouches[0].clientY
                        };
                    }
                    else if(e.clientX && e.clientY){
                        posP = {
                            x: e.clientX,
                            y: e.clientY
                        };
                    }
                    
                    //マウス座標をcanvasの論理座標に変換
					var pos = cnvPosLog2Phys(posP.x, posP.y);
					new_X = pos.x;
					new_Y = pos.y;
                    
                    //マーカーの場合（垂直方向か水平方向か）
                    if(toolInfo.tool == TOOL_MARKER){
                        if(Math.abs(pos.x - old_X) >= Math.abs(pos.y - old_Y)){
                            new_X = pos.x;
                            new_Y = old_Y;
                        }else{
                            new_X = old_X;
                            new_Y = pos.y;
                        }
                    }
                    
                    //描画ログ配列データが存在しない場合の初期化
                    if(!locusLog[locusCnt]){
                        locusLog[locusCnt] = [];
                    }

                    //描画ログの配列に描画情報を追加
                    locusLog[locusCnt].push({
                        tool:toolInfo.tool,
                        sx:old_X,
                        sy:old_Y,
                        ex:new_X,
                        ey:new_Y,
                        color:toolInfo.color,
                        opacity:toolInfo.opacity,
                        size:toolInfo.size
                    });

                    //まずcanvasの描画をすべて消す
	                cCtx.clearRect(0, 0, cEle.width, cEle.height);

                    //描画ログをはじめから順に描き直す
                    locusLog.forEach(function(locus){
                        cCtx.beginPath();
                        locus.forEach(function(l){
                            //描画ログの描画情報に合わせてcanvasに描画する
                            cCtx.moveTo(l.sx, l.sy);
                            cCtx.lineTo(l.ex, l.ey);
                            cCtx.strokeStyle = l.color;
                            cCtx.globalAlpha = l.opacity;
                            cCtx.lineWidth = l.size;
                            if(l.tool == TOOL_PEN){
                                cCtx.lineJoin = "round";
                                cCtx.lineCap = "round";
                            }else if(l.tool == TOOL_MARKER){
                                cCtx.lineJoin = "bevel";
                                cCtx.lineCap = "square";
                            }
                        });

                        cCtx.closePath();
                        cCtx.stroke();
                    });
                    
                    //マーカーの場合、手を離すまで記録はしない
                    if(toolInfo.tool == TOOL_MARKER){
                        locusLog[locusCnt].pop();
                    }
                    
                    if(toolInfo.tool != TOOL_MARKER){
                        old_X = new_X;
                        old_Y = new_Y;
                    }
                }
            }
            });
        }
	};

	$(function() {
        init.ctrls();
		init.handler();
        getParameter();
	});
}(this, jQuery));

var urlParam = location.search.substring(1);

// パラメータを取得
var getParameter = function(){
    
	var param = urlParam.split('&');
	var paramArray = [];
	
	for(var i=0; i< param.length; i++){
		var paramItem = param[i].split('=');
        //パラメータをキーにして連想配列に追加する
		paramArray[paramItem[0]] = paramItem[1];
	}
    if(param.length > 0 && param[0] != ""){
        var keys = Object.keys(paramArray);
        var txtParam = "パラメータ：" + "\r\n";
        for( var i=0, l=keys.length; i<l; i+=1) {
            txtParam += keys[i] + "=" + paramArray[keys[i]] + "\r\n";
        }
        $("#txtParameter").val(txtParam);
        
    }else{
        $("#txtParameter").val("パラメータ：なし");
    }
	
};

// 描画情報をすべて消す処理
var canvasClear = function(){
	var canvas = $('#Mycanvas').get(0);
	var cc_l = canvas.getContext('2d');
	cc_l.beginPath();
    cc_l.clearRect(0, 0, canvas.width, canvas.height);
    cc_l.closePath();
    locusLog = [];
    locusCnt = 0;
    //ツールバー上の「全消去」ボタンアイコンを変更する
    window.parent.postMessage("FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]" + 0,"*");
    //描画情報を保存するためのpostMessageを共通基盤側に送信する
    window.parent.postMessage("FFLCOM_SET_LEARNING_REC" + "[,]" + JSON.stringify(locusLog),"*");
    
};

// タッチモードにする
var setModeFinger = function(){
    toolInfo.tool = TOOL_FINGER;
    $("#Mycanvas").css("pointer-events","none");
};

// ツール情報を設定する
var setCurrentToolInfo = function(_tool, _prop) {
    $("#Mycanvas").css("pointer-events","auto");
    if (_tool === "FFLCOM_TOOL_PEN") {
        toolInfo.tool = TOOL_PEN;
        toolInfo.color = _prop.color;
        toolInfo.size = _prop.size;
        toolInfo.opacity = _prop.opacity;
    }else if ( _tool === "FFLCOM_TOOL_MARKER"){
        toolInfo.tool = TOOL_MARKER;
        toolInfo.color = _prop.color;
        toolInfo.size = _prop.size;
        toolInfo.opacity = _prop.opacity;
    }else if ( _tool === "FFLCOM_TOOL_ERASER"){
        toolInfo.tool = TOOL_ERASER;
    }else{
        setModeFinger();
    }
};

// マウス座標をcanvasの論理サイズに変換する
var cnvPosLog2Phys = function(_x, _y) {
    var rc = document.getElementById("Mycanvas").getBoundingClientRect();

    return {
	   x: Math.round(($('#Mycanvas').attr("width") * (_x - rc.left)) / (rc.right - rc.left)),
	   y: Math.round(($('#Mycanvas').attr("height") * (_y - rc.top)) / (rc.bottom - rc.top))
    };
};

// 保存した描画ログを再読込する
var loadLocusLog = function(_locusLog){
    var canvas = $('#Mycanvas').get(0);
    cCtx.clearRect(0, 0, canvas.width, canvas.height);
    locusCnt = 0;
    locusLog = [];
    
    if(_locusLog.length > 0){
        _locusLog.forEach(function(locus){
            cCtx.beginPath();
            locus.forEach(function(l){
                cCtx.moveTo(l.sx, l.sy);
                cCtx.lineTo(l.ex, l.ey);
                cCtx.strokeStyle = l.color;
                cCtx.globalAlpha = l.opacity;
                cCtx.lineWidth = l.size;
                if(l.tool == TOOL_PEN){
                    cCtx.lineJoin = "round";
                    cCtx.lineCap = "round";
                }else if(l.tool == TOOL_MARKER){
                    cCtx.lineJoin = "bevel";
                    cCtx.lineCap = "square";
                }
            });

            cCtx.closePath();
            cCtx.stroke();
        });
        
        locusLog = _locusLog.concat();
        locusCnt = locusLog.length;
    }
    //描画ログがある場合に、ツールバー上の「全消去」ボタンアイコンを変更する
    if(locusCnt>0){
        window.parent.postMessage("FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]" + 1,"*");
    }
    
};