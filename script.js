var gCanvas;
var gVideo;

// --- prefix -----
navigator.getUserMedia = navigator.getUserMedia    || navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia || navigator.msGetUserMedia;

let gIsDgagFlg = false;
/* onloadイベント */
onload = function() {
	/* canvasエレメント初期化 */
	gCanvas = document.getElementById('canvas');
	gCanvas.width = 1280;
	gCanvas.height= 720;
	gCanvas.addEventListener('mousemove', mouseMove1st, true);
	gCanvas.addEventListener('mousemove', mouseMove, true);
	gCanvas.addEventListener('mousedown', function(e) { gIsDgagFlg=true;});
	gCanvas.addEventListener('mouseup'  , function(e) { gIsDgagFlg=false;});
	gCanvas.addEventListener(
			"mousewheel",
			function(e) { console.log("mousewheel:" + e.wheelDelta);},
			{passive: true}
		);

	/* カメラ初期化 */
	if(!navigator.getUserMedia) {
		/* ブラウザ未サポート */
		alert('Err!! getUserMedia is not supported.');
	}
	else {
		navigator.getUserMedia(
				{video: true, audio: false},
				/* 成功応答 */
				function(localMediaStream){
					/* カメラ画像表示 */
					gVideo = document.createElement('video');
					gVideo.addEventListener('canplay', function(){
							/* 複数回呼ばれないようにイベント削除 */
							gVideo.removeEventListener('canplay', arguments.callee, true);
							gVideo.play();
							drwWebGL();
						}, true);
					gVideo.srcObject = localMediaStream;
				},
				/* 失敗応答 */
				function(err) {
					// 取得に失敗した原因を調査
					if(err.name === 'PermissionDeniedError'){
						alert('ユーザーにより拒否されました。');
					}else{
						alert('USBカメラが接続されていません。');
					}
				}
			);
	}
	return;
};

var q = new qtnIV();
var qt = q.identity(q.create());
let gPrevMoveX = 0;
let gPrevMoveY = 0;
let gMoveX = 0;
let gMoveY = 0;

// マウスムーブイベントに登録する処理
function mouseMove1st(e){
	var cw = gCanvas.width;
	var ch = gCanvas.height;
	var wh = 1 / Math.sqrt(cw * cw + ch * ch);
	var x = e.clientX - gCanvas.offsetLeft- cw * 0.5;
	var y = e.clientY - gCanvas.offsetTop - ch * 0.5;
	var sq = Math.sqrt(x * x + y * y);
	var r = sq * 2.0 * Math.PI * wh;
	if(sq != 1){
		sq = 1 / sq;
		x *= sq;
		y *= sq;
	}
	q.rotate(r, [y, x, 0.0], qt);
}

function mouseMove(e){
	if(!gIsDgagFlg) return;

	if(gPrevMoveX == 0 &&gPrevMoveY == 0) {
		gPrevMoveX = e.clientX;
		gPrevMoveY = e.clientY;
		return;
	}

	let deltax = gPrevMoveX - e.clientX;
	let deltay = gPrevMoveY - e.clientY;
	gPrevMoveX = e.clientX;
	gPrevMoveY = e.clientY;
	gMoveX+=deltax;
	if(gMoveX>1280) gMoveX = 1280;
	else if(gMoveX<0) gMoveX = 0;
	gMoveY+=deltay;
	if(gMoveY>720) gMoveY = 720;
	else if(gMoveY<0) gMoveY = 0;
	console.log('gMoveX=', gMoveX, ' gMoveY=', gMoveY, ' deltax=', deltax, ' deltay=', deltay, ' gIsDgagFlg=', gIsDgagFlg);
}

function drwWebGL(){
	let gl = gCanvas.getContext('webgl') || gCanvas.getContext('experimental-webgl');

	// 頂点シェーダとフラグメントシェーダ、プログラムオブジェクトの生成
	var v_shader = create_shader(gl, 'vs');
	var f_shader = create_shader(gl, 'fs');
	var prg = create_program(v_shader, f_shader);
	
	// attributeLocationを配列に取得
	var attLocation = new Array();
	attLocation[0] = gl.getAttribLocation(prg, 'a_Vertex3');
	attLocation[1] = gl.getAttribLocation(prg, 'a_Color');
	attLocation[2] = gl.getAttribLocation(prg, 'a_TexCoord');
	
	// attributeの要素数を配列に格納
	var attStride = new Array();
	attStride[0] = 3;
	attStride[1] = 3;
	attStride[2] = 2;
	
	// キューブモデル
	var cubeData  = cube(2.0, [1.0, 1.0, 1.0, 1.0]);
	var cPosition = create_vbo(cubeData.p);
	var cColor    = create_vbo(cubeData.c);
	var cTexCoord = create_vbo(cubeData.t);
	var cVBOList  = [cPosition, cColor, cTexCoord];
	var cIndex    = create_ibo(cubeData.i);
	
	// 球体モデル
	var sphereData = sphere(64, 64, 1.0, [1.0, 1.0, 1.0, 1.0]);
	var sPosition  = create_vbo(sphereData.p);
	var sColor     = create_vbo(sphereData.c);
	var sTexCoord  = create_vbo(sphereData.t);
	var sVBOList   = [sPosition, sColor, sTexCoord];
	var sIndex     = create_ibo(sphereData.i);
	

	/* 平面 */
	let planeModel = plane(4);
	var pPosition  = create_vbo(planeModel.p);
	var pColor     = create_vbo(planeModel.c);
	var pTexCoord  = create_vbo(planeModel.t);
	var pVBOList   = [pPosition, pColor, pTexCoord];
	var pIndex     = create_ibo(planeModel.i);

	// uniformLocationを配列に取得
	var uniLocation = new Array();
	uniLocation[0] = gl.getUniformLocation(prg, 'u_MvpMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'u_TexSampler');
	
	// 各種行列の生成と初期化
	var m = new Matrix4f();
	var mMatrix   = m.loadidentity(m.create());
	var vMatrix   = m.loadidentity(m.create());
	var pMatrix   = m.loadidentity(m.create());
	var tmpMatrix = m.loadidentity(m.create());
	var mvpMatrix = m.loadidentity(m.create());
	var invMatrix = m.loadidentity(m.create());

	// 深度テストとカリングを有効にする
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	
	// カウンタ初期化
	var count = 0;
	
	// テクスチャ関連
	var videoTexture = gl.createTexture(gl.TEXTURE_2D);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, videoTexture);
//	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, gVideo);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	// 恒常ループ
	(function(){
		// カウンタをインクリメントする
		count++;
		
		// カウンタを元にラジアンを算出
		var rad  = (count % 360) * Math.PI / 180;
		
		// canvasを初期化
		gl.clearColor(0.0, 0.7, 0.7, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// テクスチャを更新する
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, gVideo);
		
		// ビュー×プロジェクション座標変換行列
		var eyePosition = new Array();
		var camUpDirection = new Array();
		q.toVecIII([0.0, 0.0, 7.0], qt, eyePosition);
		q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
		m.lookAt(eyePosition, [0.0, 0.0, 0.0], camUpDirection, vMatrix);
		m.perspective(45, gCanvas.width / gCanvas.height, 0.1, 10.0, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
		
		// 球体をレンダリング
		set_attribute(sVBOList, attLocation, attStride);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
		m.loadidentity(mMatrix);
		m.translate(mMatrix, [1.5, 0.0, 0.0], mMatrix);
		m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
		gl.uniform1i(uniLocation[1], 0);
		gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);
		
		// キューブをレンダリング
		set_attribute(cVBOList, attLocation, attStride);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
		m.loadidentity(mMatrix);
		m.translate(mMatrix, [-1.5, 0.0, 0.0], mMatrix);
		m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
		m.rotate(mMatrix, Math.PI, [0.0, 0.0, 1.0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
		gl.uniform1i(uniLocation[1], 0);
		gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);
		
		// 平面描画
		set_attribute(pVBOList, attLocation, attStride);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pIndex);
		m.loadidentity(mMatrix);
		m.translate(mMatrix, [0.0, 0.0, 0.0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
		gl.uniform1i(uniLocation[1], 0);
		gl.drawElements(gl.TRIANGLES, planeModel.i.length, gl.UNSIGNED_SHORT, 0);

		// コンテキストの再描画
		gl.flush();
		
		// ループのために再帰呼び出し
		requestAnimationFrame(arguments.callee);
	})();
	
	// シェーダを生成する関数
	function create_shader(gl, id){
		// シェーダを格納する変数
		var shader;
		
		// HTMLからscriptタグへの参照を取得
		var scriptElement = document.getElementById(id);
		
		// scriptタグが存在しない場合は抜ける
		if(!scriptElement){return;}
		
		// scriptタグのtype属性をチェック
		switch(scriptElement.type){
			
			// 頂点シェーダの場合
			case 'x-shader/x-vertex':
				shader = gl.createShader(gl.VERTEX_SHADER);
				break;
				
			// フラグメントシェーダの場合
			case 'x-shader/x-fragment':
				shader = gl.createShader(gl.FRAGMENT_SHADER);
				break;
			default :
				return;
		}
		
		// 生成されたシェーダにソースを割り当てる
		gl.shaderSource(shader, scriptElement.text);
		
		// シェーダをコンパイルする
		gl.compileShader(shader);
		
		// シェーダが正しくコンパイルされたかチェック
		if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			// 成功していたらシェーダを返して終了
			return shader;
		}else{
			
			// 失敗していたらエラーログをアラートする
			alert(gl.getShaderInfoLog(shader));
		}
	}
	
	// プログラムオブジェクトを生成しシェーダをリンクする関数
	function create_program(vs, fs){
		// プログラムオブジェクトの生成
		var program = gl.createProgram();
		
		// プログラムオブジェクトにシェーダを割り当てる
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		
		// シェーダをリンク
		gl.linkProgram(program);
		
		// シェーダのリンクが正しく行なわれたかチェック
		if(gl.getProgramParameter(program, gl.LINK_STATUS)){
		
			// 成功していたらプログラムオブジェクトを有効にする
			gl.useProgram(program);
			
			// プログラムオブジェクトを返して終了
			return program;
		}else{
			
			// 失敗していたらエラーログをアラートする
			alert(gl.getProgramInfoLog(program));
		}
	}
	
	// VBOを生成する関数
	function create_vbo(data){
		// バッファオブジェクトの生成
		var vbo = gl.createBuffer();
		
		// バッファをバインドする
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		
		// バッファにデータをセット
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		// 生成した VBO を返して終了
		return vbo;
	}
	
	// VBOをバインドし登録する関数
	function set_attribute(vbo, attL, attS){
		// 引数として受け取った配列を処理する
		for(var i in vbo){
			// バッファをバインドする
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
			
			// attributeLocationを有効にする
			gl.enableVertexAttribArray(attL[i]);
			
			// attributeLocationを通知し登録する
			gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
		}
	}
	
	// IBOを生成する関数
	function create_ibo(data){
		// バッファオブジェクトの生成
		var ibo = gl.createBuffer();
		
		// バッファをバインドする
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		
		// バッファにデータをセット
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
		
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		
		// 生成したIBOを返して終了
		return ibo;
	}
	
}
