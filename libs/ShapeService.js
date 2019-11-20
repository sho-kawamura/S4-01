const ShapeService = function() {
    // グリット設定情報
    this.gridLineColor = 'rgba(65, 177, 234, 1)'; // グリッド線の色
    this.gridLineWidth = 0.5;   // グリッド線の太さ
    this.gridTopRate = 0.235;    // canvas高さ何割分をグリッド上の高さにするか
    this.gridLeftRate = 0.08;   // canvas高さ何割分をグリッド横の幅にするか
    this.cellSizeRate = 0.0775;   // canvas高さ何割分をセル1個分の大きさにするか
    this.cellsWidth = 13;       // セルの個数（横）
    this.cellsHeight = 7;      // セルの個数（縦）

    // 背景破線図形データ
    this.backShape = {
        'a': {
            'vertex': [5, 2],               // 頂点Eの座標
            'alphabetPoint': [-0.9, -0.9],  // アルファベットE画像の位置（頂点Aからセル何個分の位置にずらして表示するのか）
        },
        'b': {
            'vertex': [1, 3],
            'alphabetPoint': [-0.8, -0.4],
        },
        'c': {
            'vertex': [2, 8],
            'alphabetPoint': [-0.8, 0],
        },
        'd': {
            'vertex': [5, 11],
            'alphabetPoint': [-0.9, 0],
        },
        'e': {
            'vertex': [8, 8],
            'alphabetPoint': [0, 0],
        },
        'f': {
            'vertex': [9, 3],
            'alphabetPoint': [0, -0.4],
        },
    };
    // アルファベット画像サイズ（セル何個分）
    this.alphabetSize = [0.8, 0.8];

    // 図形初期座標（セルの個数指定）
    this.shapeMatrix = [];

    // 図形の線の太さ
    this.shapeLineWidth = 1;

    // 描画線の太さ
    this.linesWidth = 2;

    // 対称線を削除する際の補正範囲
    this.deleteArea = 5;
};
(function(){
    /**
     * 図形の初期座標をグリット情報を元に算出
     * @param gridLeft  グリッド横の長さ
     * @param gridTop   グリッド上の高さ
     * @param cellSize  セル1個分の大きさ
     * @return {[]}     図形の初期座標
     */
    ShapeService.prototype.getInitShapeMatrix = function(gridLeft, gridTop, cellSize) {
        let initShapeMatrix = [];
        for (let s = 0; s < this.shapeMatrix.length; s++) {
            let matrix = [gridLeft + cellSize * this.shapeMatrix[s][0], gridTop + cellSize * this.shapeMatrix[s][1]];
            initShapeMatrix.push(matrix);
        }
        return initShapeMatrix;
    };

    ShapeService.prototype.createShape = function (gridTop, gridLeft, cellsWidth, cellSize, idx) {
        let baseShape = [];
        for(let i = 0; i < cellsWidth; i++){
            let minX = i % cellsWidth;
            let maxX = minX + 1;
            baseShape[i] = {
                'matrix': [
                    [gridLeft + minX * cellSize, gridTop + idx * cellSize],
                    [gridLeft + minX * cellSize, gridTop + (idx + 1) * cellSize],
                    [gridLeft + maxX * cellSize, gridTop + (idx + 1) * cellSize],
                    [gridLeft + maxX * cellSize, gridTop + idx * cellSize],
                ],     // 各頂点の座標
                'clickflag':false,
                'passedflag':false,
            };
        }
        return baseShape;
    };

    /**
     * 背景破線図形とアルファベット画像の座標データをグリット情報を元に算出
     * @param gridLeft  グリッド横の長さ
     * @param gridTop   グリッド上の高さ
     * @param cellSize  セル1個分の大きさ
     * @return {[]}     背景破線図形とアルファベット画像の座標データ
     */
    ShapeService.prototype.calcBackShape = function(gridLeft, gridTop, cellSize) {
        let backShapeInfo = {};
        for (let alphabet in this.backShape) {
            backShapeInfo[alphabet] = {};
            backShapeInfo[alphabet]['vertex'] = [gridLeft + cellSize * this.backShape[alphabet]['vertex'][0], gridTop + cellSize * this.backShape[alphabet]['vertex'][1]];
            backShapeInfo[alphabet]['alphabetPoint'] = [backShapeInfo[alphabet]['vertex'][0] + cellSize * this.backShape[alphabet]['alphabetPoint'][0], backShapeInfo[alphabet]['vertex'][1] + cellSize * this.backShape[alphabet]['alphabetPoint'][1]];
        }
        return backShapeInfo;
    };

    /**
     * グリッド線の各点の座標と範囲を取得
     * @param gridTop       グリッド線の設置位置（y座標）
     * @param gridLeft      グリッド線の設置位置（x座標）
     * @param cellsWidth    グリッドの横の個数
     * @param cellsHeight   グリッドの縦の個数
     * @param cellSize      セル1個分の大きさ
     * @return {{gridMatrix: [], yArea: {min: *, max: *}, xArea: {min: *, max: *}}}         グリッド線の情報
     */
    ShapeService.prototype.setGridInfo = function(gridTop, gridLeft, cellsWidth, cellsHeight, cellSize) {
        let gridInfo = {
            'xArea': {'min': gridLeft, 'max': gridLeft + cellSize * cellsWidth},
            'yArea': {'min': gridTop, 'max': gridTop + cellSize * cellsHeight},
            'vertex': [],
            'gridMatrix': [],
        };
        // グリッドの各頂点座標を計算
        gridInfo['vertex'].push([gridInfo['xArea']['min'], gridInfo['yArea']['min']]);
        gridInfo['vertex'].push([gridInfo['xArea']['max'], gridInfo['yArea']['min']]);
        gridInfo['vertex'].push([gridInfo['xArea']['max'], gridInfo['yArea']['max']]);
        gridInfo['vertex'].push([gridInfo['xArea']['min'], gridInfo['yArea']['max']]);

        // グリッド線の各点の座標を計算
        for (let s = 0; s < cellsHeight+1; s++) {
            gridInfo['gridMatrix'][s] = [];
            let gridY = gridTop + s * cellSize;
            for (let t = 0; t < cellsWidth+1; t++) {
                let gridX = gridLeft + t * cellSize;
                gridInfo['gridMatrix'][s].push([gridX, gridY]);
            }
        }
        return gridInfo;
    };

    /**
     * 指定地点から一番近いグリッド点の座標を取得する
     * @param targetPoint       指定地点
     * @param gridInfo          グリッド情報
     * @return {null|number[]}  指定地点から一番近いグリッド点の座標（範囲外選択の場合、nullを返す）
     */
    ShapeService.prototype.getNearestGridPoint = function(targetPoint, gridInfo) {
        if (gridInfo['xArea']['min'] > targetPoint[0] || targetPoint[0] > gridInfo['xArea']['max']
            || gridInfo['yArea']['min'] > targetPoint[1] || targetPoint[1] > gridInfo['yArea']['max']) {
            // グリッド範囲外の場合はnull
            return null;
        } else {
            // 指定ポイントがグリッド範囲内の場合
            let resultPoint = [0, 0];   // 指定ポイントに最も近い点の座標

            let beforeDistance = 0; // 指定ポイントとグリッド点の距離
            for (let s = 0; s < gridInfo['gridMatrix'].length; s++) {
                for (let t = 0; t < gridInfo['gridMatrix'][s].length; t++) {
                    let distance = Math.pow(Math.abs(gridInfo['gridMatrix'][s][t][0] - targetPoint[0]), 2) + Math.pow(Math.abs(gridInfo['gridMatrix'][s][t][1] - targetPoint[1]), 2);
                    if (beforeDistance === 0 || distance < beforeDistance) {
                        // 比較スタート時、または前回のグリッドとの距離より短い距離のグリッド点が見つかった場合
                        beforeDistance = distance;
                        resultPoint[0] = gridInfo['gridMatrix'][s][t][0];
                        resultPoint[1] = gridInfo['gridMatrix'][s][t][1];
                    }
                }
            }
            return resultPoint;
        }
    };

    /**
     * 指定地点に最も近いグリッド内座標を取得
     * （グリッド外の場合はスタート地点と指定地点を結ぶ直線とグリッド外線の交点座標、グリッド内の場合は指定地点の座標をそのまま返す）
     * @param startPoint    スタート地点
     * @param targetPoint   指定地点
     * @param gridInfo      グリッド情報
     * @return {number[]}   グリッド内座標
     */
    ShapeService.prototype.getGridPointOnLine = function(startPoint, targetPoint, gridInfo) {
        if (gridInfo['xArea']['min'] > targetPoint[0] || targetPoint[0] > gridInfo['xArea']['max']
            || gridInfo['yArea']['min'] > targetPoint[1] || targetPoint[1] > gridInfo['yArea']['max']) {
            // グリッド範囲外の場合、スタート地点と指定地点を結ぶ点とグリット外線の交点を返す
            for (let i = 0; i < gridInfo['vertex'].length; i++) {
                let nextIdx = i + 1;
                if (i === gridInfo['vertex'].length - 1) {
                    // 最終頂点は始点と結ぶ線分にする
                    nextIdx = 0;
                }
                let crossP = this.getIntersectPoint(startPoint, targetPoint, gridInfo['vertex'][i], gridInfo['vertex'][nextIdx]);
                if (null !== crossP) {
                    return crossP;
                }
            }
        }
        // グリッド範囲内の場合は指定地点をそのまま返す
        return targetPoint;
    };

    /**
     * 指定倍率でリサイズした図形の座標を再計算する
     * @param scale
     * @param gridInfo
     * @param shape
     */
    ShapeService.prototype.recalculateMatrix = function(scale, gridInfo, shape) {
        for(let j = 0; j < shape.length; j++){
          for (let i = 0; i < shape[j]['matrix'].length; i++) {
              shape[j]['matrix'][i][0] = shape[j]['matrix'][i][0] * scale;
              shape[j]['matrix'][i][1] = shape[j]['matrix'][i][1] * scale;

              // グリッド点に僅差の場合はグリッド点に合わせる
              for (let s = 0; s < gridInfo['gridMatrix'].length; s++) {
                  for (let t = 0; t < gridInfo['gridMatrix'][s].length; t++) {
                      if (Math.abs(gridInfo['gridMatrix'][s][t][0] - shape[j]['matrix'][i][0]) < 1
                          && Math.abs(gridInfo['gridMatrix'][s][t][1] - shape[j]['matrix'][i][1]) < 1) {
                          shape[j]['matrix'][i][0] = gridInfo['gridMatrix'][s][t][0];
                          shape[j]['matrix'][i][1] = gridInfo['gridMatrix'][s][t][1];
                      }
                  }
              }
          }
        }
    };

    /**
     * 指定倍率でリサイズした枠線の座標を再計算する
     * @param scale
     * @param gridInfo
     * @param shape
     */
    ShapeService.prototype.recalculateShapeLineMatrix = function(scale, gridInfo, root) {
        for(let i = 0; i < root.length; i++){
            //console.log("計算前root[j][i][0]:" + root[j][i][0]);
            root[i][0] = root[i][0] * scale;
            root[i][1] = root[i][1] * scale;
            //console.log("計算後root[j][i][0]:" + root[j][i][0]);
            // グリッド点に僅差の場合はグリッド点に合わせる
            for (let s = 0; s < gridInfo['gridMatrix'].length; s++) {
                for (let t = 0; t < gridInfo['gridMatrix'][s].length; t++) {
                    if (Math.abs(gridInfo['gridMatrix'][s][t][0] - root[i][0]) < 1
                          && Math.abs(gridInfo['gridMatrix'][s][t][1] - root[i][1]) < 1) {
                          root[i][0] = gridInfo['gridMatrix'][s][t][0];
                          root[i][1] = gridInfo['gridMatrix'][s][t][1];
                    }
                }
            }
        }
    };

    /**
     * 指定倍率でリサイズした描画線の座標を再計算する
     * @param scale
     * @param gridInfo
     * @param lines
     */
    ShapeService.prototype.recalculateLineMatrix = function(scale, gridInfo, lines) {
        for (let i = 0; i < lines.length; i++) {
            lines[i]['start'][0] = lines[i]['start'][0] * scale;
            lines[i]['start'][1] = lines[i]['start'][1] * scale;
            lines[i]['end'][0] = lines[i]['end'][0] * scale;
            lines[i]['end'][1] = lines[i]['end'][1] * scale;

            // グリッド点に僅差の場合はグリッド点に合わせる
            for (let s = 0; s < gridInfo['gridMatrix'].length; s++) {
                for (let t = 0; t < gridInfo['gridMatrix'][s].length; t++) {
                    if (Math.abs(gridInfo['gridMatrix'][s][t][0] - lines[i]['start'][0]) < 1
                        && Math.abs(gridInfo['gridMatrix'][s][t][1] - lines[i]['start'][1]) < 1) {
                        lines[i]['start'][0] = gridInfo['gridMatrix'][s][t][0];
                        lines[i]['start'][1] = gridInfo['gridMatrix'][s][t][1];
                    }
                    if (Math.abs(gridInfo['gridMatrix'][s][t][0] - lines[i]['end'][0]) < 1
                        && Math.abs(gridInfo['gridMatrix'][s][t][1] - lines[i]['end'][1]) < 1) {
                        lines[i]['end'][0] = gridInfo['gridMatrix'][s][t][0];
                        lines[i]['end'][1] = gridInfo['gridMatrix'][s][t][1];
                    }
                }
            }
        }
    };

    /**
     * マウスダウン（orタッチ）座標を取得する
     * @param evt
     * @param canvasTop
     * @param canvasLeft
     * @return array    マウスダウン（orタッチ）座標 x, yの配列
     */
    ShapeService.prototype.getTouchPoint = function (evt, canvasTop, canvasLeft) {
        let touchX = 0;
        let touchY = 0;
        if (evt.type === 'touchstart' || evt.type === 'touchmove' || evt.type === 'touchend') {
            // タッチデバイスの場合
            let touchObject = evt.changedTouches[0] ;
            touchX = touchObject.pageX - canvasLeft;
            touchY = touchObject.pageY - canvasTop;
        } else {
            // マウス操作の場合
            touchX = evt.clientX - canvasLeft;
            touchY = evt.clientY - canvasTop;
        }
        return [touchX, touchY];   // マウスダウン（orタッチ）座標
    };

    /**
     * 2つの線分（線分ABと線分CD）の交点を求める（交点がない場合はnullが返る）
     * @param pointA
     * @param pointB
     * @param pointC
     * @param pointD
     * @return {null|number[]}
     */
    ShapeService.prototype.getIntersectPoint = function(pointA, pointB, pointC, pointD) {
        let crossP = [0, 0];

        let ksi = (pointD[1] - pointC[1]) * (pointD[0] - pointA[0]) - (pointD[0] - pointC[0]) * (pointD[1] - pointA[1]);
        let eta = (pointB[0] - pointA[0]) * (pointD[1] - pointA[1]) - (pointB[1] - pointA[1]) * (pointD[0] - pointA[0]);
        let delta = (pointB[0] - pointA[0]) * (pointD[1] - pointC[1]) - (pointB[1] - pointA[1]) * (pointD[0] - pointC[0]);

        let ramda = ksi / delta;
        let mu    = eta / delta;

        if ((ramda >= 0 && ramda <= 1) && (mu >= 0 && mu <= 1)) {
            crossP[0] = pointA[0] + ramda * (pointB[0] - pointA[0]);
            crossP[1] = pointA[1] + ramda*(pointB[1] - pointA[1]);

            return crossP;
        } else {
            return null;
        }
    };

    /**
     * 対象の2点を結ぶ線分が対称線どうかを判定
     * @param pointA
     * @param pointB
     * @param shape
     * @return {boolean}
     */
    ShapeService.prototype.judgeSymmetryLine = function(pointA, pointB, shape) {
        let pointAIdx = null;
        let pointAIdxNext = null;
        let pointAIdxBefore = null;
        let pointBIdx = null;
        for (let i = 0; i < shape['matrix'].length; i++) {
            if (shape['matrix'][i][0] === pointA[0] && shape['matrix'][i][1] === pointA[1]) {
                pointAIdx = i;
                pointAIdxNext = i + 1;
                if (i === shape['matrix'][i].length - 1) {
                    pointAIdxNext = 0;
                }
                pointAIdxBefore = i - 1;
                if (i === 0) {
                    pointAIdxBefore = shape['matrix'][i].length - 1;
                }
            }
            if (shape['matrix'][i][0] === pointB[0] && shape['matrix'][i][1] === pointB[1]) {
                pointBIdx = i;
            }
        }

        // PointAとPointBが図形の頂点の場合
        if (pointAIdx !== null && pointBIdx !== null) {
            // カット線と辺が重なり合わないか確認
            if (pointAIdxNext !== pointBIdx && pointAIdxBefore !== pointBIdx) {
                return true;
            }
        }
        return false;
    };

    /**
     * タッチ点から距離が一定以内で一番近くにある対称線のインデックスを取得する
     * @param touchPoint
     * @param lines
     * @returns {null}
     */
    ShapeService.prototype.getDeleteLineIndex = function(touchPoint, lines) {
        let deleteLineIndex = null;
        let minDistance = null;
        for (let i = 0; i < lines.length; i++) {
            let lineDistanceData = this.getP2LineDistance(touchPoint, lines[i]['start'], lines[i]['end']);
            if (lineDistanceData['onLine']) {
                // タッチ点から対称線までの垂線の足が対称線上にある場合
                // タッチ点と対称線の距離が短ければ線をタッチしたとみなす
                if (lineDistanceData['distance'] < this.deleteArea) {
                    if (minDistance === null || minDistance > lineDistanceData['distance']) {
                        minDistance = lineDistanceData['distance'];
                        deleteLineIndex = i;
                    }
                }
            }
        }
        return deleteLineIndex;
    };


    //同じ形の線が引かれていないかチェック
    ShapeService.prototype.judgeSameLine = function(startPoint, endPoint, lines) {
        let sameLineFlag = false;
        for(let i = 0; i < lines.length; i++){
          /*
          if(startPoint[0] == lines[i]['start'][0] && startPoint[1] == lines[i]['start'][1]
              && endPoint[0] == lines[i]['end'][0] && endPoint[1] == lines[i]['end'][1]){
            sameLineFlag =  true;
          }else if(startPoint[0] == lines[i]['end'][0] && startPoint[1] == lines[i]['end'][1]
                    && endPoint[0] == lines[i]['start'][0] && endPoint[1] == lines[i]['start'][1]){
            sameLineFlag = true;
          }
          */
          //startPointが'start'と一致、endPointが['end']と一致する、またはstartPointと['end']が一致、endPointと['start']が一致したら同じ形の線であると判定
          if((startPoint[0] == lines[i]['start'][0] && startPoint[1] == lines[i]['start'][1] && endPoint[0] == lines[i]['end'][0] && endPoint[1] == lines[i]['end'][1])
              || (startPoint[0] == lines[i]['end'][0] && startPoint[1] == lines[i]['end'][1] && endPoint[0] == lines[i]['start'][0] && endPoint[1] == lines[i]['start'][1])){
            sameLineFlag =  true;
          }
        }
        return sameLineFlag;
    };

    //同じ形の線が引かれていないかチェック
    /*
    ShapeService.prototype.findClosePath = function(lines,baseX,baseY,root, prevIndex) {

        for(let i = 0; i<lines.length; i++){
          // 始祖の視点との重なりチェック、重なっていた場合シェープを生みだす

          if((baseX == lines[i]['start'][0] && baseY == lines[i]['start'][1]){

            // root.push を行う

            // 前世代の線を配列から取り除く（前世が始祖だったら消さない）

            findClosePath(lines,lines[i]['start'][0],lines[i]['start'][1],root);

          }else if(baseX == lines[i]['end'][0] && baseY == lines[i]['end'][1]){
            findClosePath(lines,lines[i]['end'][0],lines[i]['end'][1],root);
          }
        }
    };
    */

    /**
     * 点Pから線分ABまでの垂線の足点と足点が線分AB上にあるかの判定、線分ABまでの距離を取得
     * @param pointP
     * @param pointA
     * @param pointB
     * @return {{distance: *, food: *, onLine: *}}
     */
    ShapeService.prototype.getP2LineDistance = function(pointP, pointA, pointB) {
        // 点Pから線分ABまでの垂線の足点をIとする
        // |AI| = |AP|cosα
        // AP・AB = |AP||AB|cosα
        // 以上より、|AI| = (AP・AB) / |AB|
        // よって 点I = A + ( |AI|/|AB| ) AB = A + ( (AP・AB) / |AB||AB| ) AB
        // ※ 垂線の足点Iが線分AB上にあるかどうかを、( (AP・AB) / |AB||AB| ) の値が、0～1かどうかで判定することができる

        let vectorAP = [pointP[0] - pointA[0], pointP[1] - pointA[1]];
        let vectorAB = [pointB[0] - pointA[0], pointB[1] - pointA[1]];
        // 2次元ベクトルA(ax, ay)とB(bx, by)の内積A・B : A・B = ax*bx + ay*by
        let dotProductAP2AB = vectorAP[0] * vectorAB[0] + vectorAP[1] * vectorAB[1];    // AP,ABの内積
        let tmp = dotProductAP2AB / (Math.pow(vectorAB[0], 2) + Math.pow(vectorAB[1], 2));
        let pointI = [0, 0];
        pointI[0] = pointA[0] + tmp * vectorAB[0];
        pointI[1] = pointA[1] + tmp * vectorAB[1];

        let vectorIP = [pointP[0] - pointI[0], pointP[1] - pointI[1]];
        let lengthIP = Math.sqrt(Math.pow(vectorIP[0], 2) + Math.pow(vectorIP[1], 2));

        let onLine = false;
        if (0 <= tmp && tmp <= 1) {
            onLine = true;
        }

        let result = {
            'food': pointI,
            'distance': lengthIP,
            'onLine': onLine,
        };

        return result;
    };
}());
