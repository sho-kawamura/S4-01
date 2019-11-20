$(function() {
    // 図形操作用サービス
    let sps = new ShapeService();
    // キャンバスのID
    let canvasId = "appCanvas";

    // キャンバス情報
    let canvas = document.getElementById(canvasId);
    let ctx = canvas.getContext("2d");
    let canvasPosition = canvas.getBoundingClientRect();
    // キャンバスのサイズを再設定
    canvas.width  = canvasPosition.width;
    canvas.height = canvasPosition.height;

    // 背景グリッド線データ
    let gridTop = canvasPosition.height * sps.gridTopRate;
    let gridLeft = canvasPosition.width * sps.gridLeftRate;
    let cellSize = canvasPosition.height * sps.cellSizeRate;
    let cellsWidth = sps.cellsWidth;
    let cellsHeight = sps.cellsHeight;
    // グリッド線情報（x・y座標の範囲、グリッド各点の座標）
    let gridInfo = sps.setGridInfo(gridTop, gridLeft, cellsWidth, cellsHeight, cellSize);

    // 図形データ
    let shape = [];
    for(let i = 0; i < cellsHeight; i++){
        shape[i] = sps.createShape(gridTop, gridLeft, cellsWidth, cellSize, i);
    }

    //繋がっている図形のパス
    let root = [];
    let rootMatrix = [];
    let level = 0;

    // 各ボタンDOM
    let $btns = $('.btn');
    let $drawLineBtn = $('#drawLine');  // 「線を引く」ボタン
    let $restartBtn = $('#restart');    // 「やりなおし」ボタン

    // ボタン位置を調整
    let btnCssSet = function() {
        let btnWidth = canvasPosition.width * 0.15;
        let btnHeight = btnWidth / 221 * 68;
        $btns.height(btnHeight).width(btnWidth).css({'right': canvasPosition.width * 0.04});
        $restartBtn.css({'bottom': canvasPosition.height * 0.07});
        $drawLineBtn.css({'bottom': canvasPosition.height * 0.08 + btnHeight});
    };
    btnCssSet();    // 初期実行

    // 画面リサイズ時（Canvasのレスポンシブ対応）
    let resize = function() {
        // 元のキャンバスの高さを取得
        let originCanvasHeight = canvasPosition.height;
        // キャンバスの位置、サイズを再取得
        canvasPosition = canvas.getBoundingClientRect();

        // キャンバスのサイズを再設定
        canvas.width  = canvasPosition.width;
        canvas.height = canvasPosition.height;

        // ボタン位置を調整
        btnCssSet();

        // リサイズした図形の座標を再計算する
        let scale = canvasPosition.height / originCanvasHeight;

        // グリッド線の位置を再計算
        gridTop = canvasPosition.height * sps.gridTopRate;
        gridLeft = canvasPosition.width * sps.gridLeftRate;
        cellSize = canvasPosition.height * sps.cellSizeRate;
        // グリッド線情報を再計算
        gridInfo = sps.setGridInfo(gridTop, gridLeft, cellsWidth, cellsHeight, cellSize);

        // ボタン位置を調整
        btnCssSet();

        // リサイズした図形の座標を再計算する
        for(let i = 0; i < shape.length; i++){
            sps.recalculateMatrix(scale, gridInfo, shape[i]);
        }

        for(let i = 0; i < root.length; i++){
            sps.recalculateShapeLineMatrix(scale, gridInfo, root[i]);
        }
    };
    $(window).resize(resize);

    // マウスダウン（orタッチ）中かどうか
    let touched = false;
    // タッチ開始時の座標を記録
    let touchStartX = 0;
    let touchStartY = 0;
    // 移動時のタッチ座標
    let touchX = 0;
    let touchY = 0;

    /**
     * 図形の描画
     */
    let drawShapes = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 図形を描画
        for(let i = 0; i < shape.length; i++){
            for(let j = 0; j < Object.keys(shape[i]).length; j++){

              ctx.lineJoin = "round";
              ctx.beginPath();
              for (let k = 0; k< Object.keys(shape[i][j]['matrix']).length; k++) {
                  ctx.lineTo(shape[i][j]['matrix'][k][0], shape[i][j]['matrix'][k][1]);
              }
              ctx.closePath();
              ctx.lineWidth = sps.shapeLineWidth;
              ctx.strokeStyle = "rgba(0, 0, 0, 0)";
              ctx.setLineDash([]);
              ctx.stroke();
              if(!shape[i][j]['clickflag']){
                  ctx.fillStyle = "rgba(0, 0, 0, 0)";
              }else{
                  ctx.fillStyle = "rgb(168, 196, 247)";
              }
              ctx.fill();
            }
        }

        // グリッド線の描画
        ctx.lineJoin = "miter";
        ctx.lineWidth = sps.gridLineWidth;
        ctx.strokeStyle = sps.gridLineColor;
        ctx.setLineDash([]);
        // 横線を描画
        let gridLineStart = [gridLeft, gridTop];
        let gridLineEnd = [gridLeft + cellsWidth * cellSize, gridTop];

        for (let s = 0; s < cellsHeight+1; s++) {
            gridLineStart[1] = gridTop + s * cellSize;
            gridLineEnd[1] = gridTop + s * cellSize;

            ctx.beginPath();
            ctx.moveTo(gridLineStart[0], gridLineStart[1]);
            ctx.lineTo(gridLineEnd[0], gridLineEnd[1]);
            ctx.closePath();
            ctx.stroke();
        }

        // 縦線を描画
        gridLineStart = [gridLeft, gridTop];
        gridLineEnd = [gridLeft, gridTop + cellsHeight * cellSize];

        for (let t = 0; t < cellsWidth+1; t++) {
            gridLineStart[0] = gridLeft + t * cellSize;
            gridLineEnd[0] = gridLeft + t * cellSize;

            ctx.beginPath();
            ctx.moveTo(gridLineStart[0], gridLineStart[1]);
            ctx.lineTo(gridLineEnd[0], gridLineEnd[1]);
            ctx.closePath();
            ctx.stroke();
        }

        if(root.length > 0){
            for(let i = 0; i < root.length; i++){
                ctx.lineJoin = "round";
                ctx.beginPath();
                for(let j = 0; j < root[i].length; j++){
                    ctx.lineTo(root[i][j][0], root[i][j][1]);
                }
                ctx.closePath();
                ctx.lineWidth = sps.shapeLineWidth * 2;
                ctx.strokeStyle = "rgb(0, 0, 0)";
                ctx.setLineDash([]);
                ctx.stroke();
            }
        }
    };

    /**
     * レンダリング処理
     * （「切る」モードや「移動」モード時のみレンダリングを実行する）
     */
    let renderAnimation = null;
    let render = function() {
        drawShapes();
        renderAnimation = window.requestAnimationFrame(render);
    };
    render();

    /**
     * マウスダウン（orタッチ）開始時の処理
     * @param e 操作イベント
     */
    let onMouseDown = function (e) {
        e.preventDefault(); // デフォルトイベントをキャンセル
        touched = true; // マウスダウン（orタッチ）中

        let downPoint = sps.getTouchPoint(e, canvasPosition.top, canvasPosition.left);   // マウスダウン（orタッチ）座標
        touchX = downPoint[0];
        touchY = downPoint[1];

        // タッチ開始時の座標を記録
        touchStartX = Math.floor(downPoint[0]);
        touchStartY = Math.floor(downPoint[1]);

    };
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('touchstart', onMouseDown, false);

    /**
     * マウスダウン（タッチ移動）中の処理
     * @param e
     */
    let onMouseMove = function (e) {
        e.preventDefault(); // デフォルトイベントをキャンセル

        let downPoint = sps.getTouchPoint(e, canvasPosition.top, canvasPosition.left);   // マウスダウン（orタッチ）座標

        if (touched) {
            // 移動後の座標
            let currentX = downPoint[0];
            let currentY = downPoint[1];

            // マウスダウン（タッチ）開始座標を更新
            touchX = currentX;
            touchY = currentY;
        }
    };
    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('touchmove', onMouseMove, false);

    /**
     * マウスアップ（タッチ終了）時の処理
     * @param e 操作イベント
     */
    let onMouseUp = function (e) {
        e.preventDefault(); // デフォルトイベントをキャンセル
        touched = false; // マウスダウン（orタッチ）中を解除

        let downPoint = sps.getTouchPoint(e, canvasPosition.top, canvasPosition.left);   // マウスダウン（orタッチ）座標
        let touchEndX = Math.floor(downPoint[0]);
        let touchEndY = Math.floor(downPoint[1]);

        if (Math.abs(touchStartX - touchEndX) < 3 && Math.abs(touchStartY - touchEndY) < 3) {
            // クリック判定（タッチ開始時座標と終了座標が僅差であればクリックとみなす）
            let innerGridTouch = sps.getNearestGridPoint([touchX, touchY], gridInfo);
            if (null !== innerGridTouch) { //グリッド内部をタッチしているか判定
                let cellX = Math.floor((touchEndX - gridLeft) / cellSize);
                let cellY = Math.floor((touchEndY - gridTop) / cellSize);

                //探索処理を呼び出す前に全部のマス目のpassedflagを初期化しておく
                for(let i = 0; i < shape.length; i++){
                    for(let j = 0; j < shape[i].length; j++){
                        shape[i][j]['passedflag'] = false;
                    }
                }

                if(shape[cellY][cellX]['clickflag']){
                    shape[cellY][cellX]['clickflag'] = false;
                }else{
                    shape[cellY][cellX]['clickflag'] = true;
                }

                root = []; //探索処理呼び出す前に結果を格納する配列を初期化
                let lastSearchVector = "";

                for(let i = 0; i < shape.length; i++){
                    for(let j = 0; j < shape[i].length; j++){
                      if(!shape[i][j]['passedflag'] && shape[i][j]['clickflag']){
                          level = 0;
                          rootMatrix = [];
                          level = judgeAdjacentSquare(i, j, rootMatrix, level, lastSearchVector);
                          if(level == 5){
                              root.push(rootMatrix.concat());
                          }
                          console.log(root);
                          console.log("level:" + level);
                      }
                    }
                }
            }
        }
        lineStartP = [0, 0];
        lineEndP = [0, 0];
    };
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('touchend', onMouseUp, false);


    /**
     * マス目クリック後の繋がっている判定
     * @param root 繋がっている図形の座標（セルの枠基準->[y][x])
     * @param y セルの枠基準の座標->[y][x]
     * @param x セルの枠基準-の座標>[y][x]
     */
    function judgeAdjacentSquare(y, x, rootMatrix, level, lastSearchVector){
        //console.log(lastSearchVector);
        //通過したフラグを立てる
        shape[y][x]['passedflag'] = true;
        if(!shape[y][x]['clickflag']){
            return level;
        }
        level += 1;

        //clickflag : セルをクリックしたかどうか 初期値false -> 塗られてない
        //passedflag : 再帰中にそのセルを通過したかどうか
        if(lastSearchVector == "down"){
            //右の判定
            if(x == cellsWidth-1 || !shape[y][x+1]['clickflag']){
                //右上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][3][0],shape[y][x]['matrix'][3][1]]);
            }else{
                if(!shape[y][x+1]['passedflag']){
                    lastSearchVector = "right";
                    level = judgeAdjacentSquare(y, x+1, rootMatrix, level, lastSearchVector); //右をみる
                }
            }
            //下の判定
            if(y == cellsHeight-1 || !shape[y+1][x]['clickflag']){
                //右下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][2][0],shape[y][x]['matrix'][2][1]]);
            }else{
                if(!shape[y+1][x]['passedflag']){
                    lastSearchVector = "down"
                    level = judgeAdjacentSquare(y+1, x, rootMatrix, level, lastSearchVector); //下をみる
                }
            }
            //上の判定
            if(y == 0 || !shape[y-1][x]['clickflag']){
                //左上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][0][0],shape[y][x]['matrix'][0][1]]);
            }else{
                if(!shape[y-1][x]['passedflag']){
                    lastSearchVector = "up";
                    level = judgeAdjacentSquare(y-1, x, rootMatrix, level, lastSearchVector); //上をみる
                }
            }
            //左の判定
            if(x == 0 || !shape[y][x-1]['clickflag']){
                //左下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][1][0],shape[y][x]['matrix'][1][1]]);
            }else {
                if(!shape[y][x-1]['passedflag']){
                    lastSearchVector = "left";
                    level = judgeAdjacentSquare(y, x-1, rootMatrix, level, lastSearchVector); //左をみる
                }
            }
        }else if(lastSearchVector == "left"){
            //下の判定
            if(y == cellsHeight-1 || !shape[y+1][x]['clickflag']){
                //右下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][2][0],shape[y][x]['matrix'][2][1]]);
            }else{
                if(!shape[y+1][x]['passedflag']){
                    lastSearchVector = "down"
                    level = judgeAdjacentSquare(y+1, x, rootMatrix, level, lastSearchVector); //下をみる
                }
            }
            //左の判定
            if(x == 0 || !shape[y][x-1]['clickflag']){
                //左下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][1][0],shape[y][x]['matrix'][1][1]]);
            }else {
                if(!shape[y][x-1]['passedflag']){
                    lastSearchVector = "left";
                    level = judgeAdjacentSquare(y, x-1, rootMatrix, level, lastSearchVector); //左をみる
                }
            }
            //上の判定
            if(y == 0 || !shape[y-1][x]['clickflag']){
                //左上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][0][0],shape[y][x]['matrix'][0][1]]);
            }else{
                if(!shape[y-1][x]['passedflag']){
                    lastSearchVector = "up";
                    level = judgeAdjacentSquare(y-1, x, rootMatrix, level, lastSearchVector); //上をみる
                }
            }
            //右の判定
            if(x == cellsWidth-1 || !shape[y][x+1]['clickflag']){
                //右上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][3][0],shape[y][x]['matrix'][3][1]]);
            }else{
                if(!shape[y][x+1]['passedflag']){
                    lastSearchVector = "right";
                    level = judgeAdjacentSquare(y, x+1, rootMatrix, level, lastSearchVector); //右をみる
                }
            }
        }else if(lastSearchVector == "up"){
            //左の判定
            if(x == 0 || !shape[y][x-1]['clickflag']){
                //左下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][1][0],shape[y][x]['matrix'][1][1]]);
            }else {
                if(!shape[y][x-1]['passedflag']){
                    lastSearchVector = "left";
                    level = judgeAdjacentSquare(y, x-1, rootMatrix, level, lastSearchVector); //左をみる
                }
            }
            //下の判定
            if(y == cellsHeight-1 || !shape[y+1][x]['clickflag']){
                //右下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][2][0],shape[y][x]['matrix'][2][1]]);
            }else{
                if(!shape[y+1][x]['passedflag']){
                    lastSearchVector = "down"
                    level = judgeAdjacentSquare(y+1, x, rootMatrix, level, lastSearchVector); //下をみる
                }
            }
            //上の判定
            if(y == 0 || !shape[y-1][x]['clickflag']){
                //左上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][0][0],shape[y][x]['matrix'][0][1]]);
            }else{
                if(!shape[y-1][x]['passedflag']){
                    lastSearchVector = "up";
                    level = judgeAdjacentSquare(y-1, x, rootMatrix, level, lastSearchVector); //上をみる
                }
            }
            //右の判定
            if(x == cellsWidth-1 || !shape[y][x+1]['clickflag']){
                //右上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][3][0],shape[y][x]['matrix'][3][1]]);
            }else{
                if(!shape[y][x+1]['passedflag']){
                    lastSearchVector = "right";
                    level = judgeAdjacentSquare(y, x+1, rootMatrix, level, lastSearchVector); //右をみる
                }
            }
        }else{
            //左の判定
            if(x == 0 || !shape[y][x-1]['clickflag']){
                //左下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][1][0],shape[y][x]['matrix'][1][1]]);
            }else {
                if(!shape[y][x-1]['passedflag']){
                    lastSearchVector = "left";
                    level = judgeAdjacentSquare(y, x-1, rootMatrix, level, lastSearchVector); //左をみる
                }
            }
            //上の判定
            if(y == 0 || !shape[y-1][x]['clickflag']){
                //左上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][0][0],shape[y][x]['matrix'][0][1]]);
            }else{
                if(!shape[y-1][x]['passedflag']){
                    lastSearchVector = "up";
                    level = judgeAdjacentSquare(y-1, x, rootMatrix, level, lastSearchVector); //上をみる
                }
            }
            //右の判定
            if(x == cellsWidth-1 || !shape[y][x+1]['clickflag']){
                //右上に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][3][0],shape[y][x]['matrix'][3][1]]);
            }else{
                if(!shape[y][x+1]['passedflag']){
                    lastSearchVector = "right";
                    level = judgeAdjacentSquare(y, x+1, rootMatrix, level, lastSearchVector); //右をみる
                }
            }
            //下の判定
            if(y == cellsHeight-1 || !shape[y+1][x]['clickflag']){
                //右下に頂点を置く
                rootMatrix.push([shape[y][x]['matrix'][2][0],shape[y][x]['matrix'][2][1]]);
            }else{
                if(!shape[y+1][x]['passedflag']){
                    lastSearchVector = "down"
                    level = judgeAdjacentSquare(y+1, x, rootMatrix, level, lastSearchVector); //下をみる
                }
            }
        }
        return level;
    }

    /**
     * 「やりなおし」ボタンのクリック時処理
     */
    $restartBtn.click(function () {
        location.reload();
    });
});
