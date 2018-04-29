window.addEventListener('load', main, false);

// 顶点着色器
var VSHADER_SOURCE =
  	'attribute vec4 a_Position;\n' + //修改位置
  	'attribute vec4 a_Color;\n' +  // 修改颜色
  	'varying vec4 v_Color;\n' +    // 传递颜色给片元着色器
  	'uniform mat4 u_ModelMatrix;\n' + //旋转、绽放矩阵
  	'void main() {\n' +
  	'  gl_Position = u_ModelMatrix * a_Position;\n' +
  	'  v_Color = a_Color;\n' +
  	'}\n';

// 片元着色器
var FSHADER_SOURCE = 
	'precision mediump float;\n' +
	'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

// 每秒旋转的角度
var ANGLE_STEP = 45.0;
// 绽放程度，从1.0到（1.0 - SCALE_STEP）为一个周期
var SCALE_STEP = 0.8;
// 是否要展示网格，用这个布尔值来确定是否要在shader中多加入顶点，见getPoints函数
var display_line = true;
// 如果要展示网格，这个值表示有多少个顶点组成网格
var num_of_line_point = 0;
// 因为在旋转时不会更新节点信息，所以要加一个判断，如果按下了B键，就需要刷新一下
var needRefrash = false;

function main() {
	// 哪一个顶点被拖拽了
	var dragIndex;
	// 用户是否正在拖拽顶点
	var dragging;
	// 鼠标点击的位置
    var mouseX, mouseY;
    // 记录上一次旋转的时间
    var last_time = Date.now();
    // 是否正在执行旋转
    var rotation = false;
    // 当前旋转角度， 当前缩放程度
    var currentAngle = 0.0;
	var currentScale = 1.0;
	// 用于备份，在编辑后可以恢复成之前的旋转角度、缩放程度
	var backupAngle = 0.0;
	var backupScale = 1.0;
	// 在编辑后，要用备份恢复进度
	var edited = true;
	// 变换矩阵
	var modelMatrix = new Matrix4();
	// 用于优化，记录节点数目，这样就可以在旋转操作时避开重复计算
	var optimum = 0;

	var canvas = document.getElementById('webgl');
	// 添加鼠标点击事件和键盘点击事件
	canvas.addEventListener('mousedown', mouseDownListener, false);
	window.addEventListener('keydown', keyDownListener, false);
	// 设置画布大小
	document.getElementById('webgl').height = canvasSize.maxY;
    document.getElementById('webgl').width = canvasSize.maxX;
    // 获取webgl上下文
	var gl = getWebGLContext(canvas);
	if (!gl) {
		console.log('loading gl failed');
		return;
	}

	// 初始化
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('loading initShader failed');
		return;
	}

	// 获取变换矩阵的地址
	var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!u_ModelMatrix) {
		console.log('loading u_ModelMatrix failed');
		return;
	}

	// 画出图案
	draw(gl);

	// 用于旋转操作
	var tick = function() {
		if (rotation) {
			updateStatus();
			draw(gl);
			requestAnimationFrame(tick);
		}
	}

	// 响应键盘点击事件
	function keyDownListener(evt) {
		switch(evt.keyCode) {
			case 84: // 表示字母T被按下
				// 按一次T旋转，再按暂停
				if (rotation) {
					rotation = false;
				}
				else {
					// 被编辑过了，要找回编辑前的备份
					if (edited) {
						edited = false;
						currentAngle = backupAngle;
						currentScale = backupScale;
					}
					rotation = true;
					last_time = Date.now();
					tick();
					// 注销鼠标点击事件
			    	canvas.removeEventListener("mousedown", mouseDownListener, false);
				}
			    break; // T
			case 66: // 字母B被按下
				// 点击一次添加风格，再点一次撤销网格
				if (display_line) {
					display_line = false;
				}
				else {
					display_line = true;
				}
				// 对图形进行改变了，需要刷新
				needRefrash = true;
				draw(gl);
				// canvas.addEventListener('mousedown', mouseDownListener, false);
			    break; // B
			case 69: // 字母E
				// 这是为了避免重复按E键导致备份被多次写入
				if (!edited) {
					// pressed = 1;
					backupAngle = currentAngle;
					backupScale = currentScale;
					edited = true;
				}
				rotation = false;
				// console.log('currentAngle is ' + currentAngle);
				// console.log('backupAngle is ' + backupAngle);
				currentAngle = 0.0;
				currentScale = 1.0;
				draw(gl);
				// 添加鼠标点击事件
				canvas.addEventListener("mousedown", mouseDownListener, false);
				break; // E
			default: break;
		}
	}

    function mouseDownListener(evt) {
    	var bRect = evt.target.getBoundingClientRect();
    	// 鼠标位置换算
		mouseX = (evt.clientX - bRect.left) * (canvas.width / bRect.width);
        mouseY = (evt.clientY - bRect.top) * (canvas.height / bRect.height);
        var i;
        var highestIndex = -1;
        // 如果有重叠的点，找index最大的。
        for (i = 0; i < vertex_pos.length; i++) {
        	// 鼠标点下时与顶点距离足够小
        	if (hit(vertex_pos[i], mouseX, mouseY)) {
        		dragging = true;
        		highestIndex = i;
        		dragIndex = i;
        	}
        }

        if (dragging) {
        	window.addEventListener("mousemove", mouseMoveListener, false);
        }
        canvas.removeEventListener("mousedown", mouseDownListener, false);
        window.addEventListener("mouseup", mouseUpListener, false);
		if (evt.preventDefault) {
            evt.preventDefault();
        } 
        else if (evt.returnValue) {
            evt.returnValue = false;
        }
        return false;
	}

	function mouseUpListener() {
		canvas.addEventListener("mousedown", mouseDownListener, false);
        window.removeEventListener("mouseup", mouseUpListener, false);
        if (dragging) {
            dragging = false;
            window.removeEventListener("mousemove", mouseMoveListener, false);
        }
	}

	function mouseMoveListener(evt) {
		//获取鼠标位置，进行坐标转换
        var bRect = canvas.getBoundingClientRect();
        mouseX = (evt.clientX - bRect.left) * (canvas.width / bRect.width);
        mouseY = (evt.clientY - bRect.top) * (canvas.height / bRect.height);
        var minX = 1, maxX = canvas.width - minX;
        var minY = 1, maxY = canvas.height - maxY;
        // 避免越界
        vertex_pos[dragIndex][0] = (mouseX < minX) ? minX : ((mouseX > maxX) ? maxX : mouseX);
        vertex_pos[dragIndex][1] = (mouseY < minY) ? minY : ((mouseY > maxY) ? maxY : mouseY);
        draw(gl);
	}

	function draw(gl) {
		// 
		var n;
		// 显示/隐藏网格或者修改节点，都要重新载入vertexBuffer
		if (!rotation || needRefrash) {
			n = initVertexBuffers(gl);
			optimum = n;
			needRefrash = false;
		}
		else {
			n = optimum;			
		}
		

		if (n < 0) {
			console.log('loading \'n\' failed because of ' + n);
			return;
		}
		// console.log(n);
		// Specify the color for clearing <canvas>
		gl.clearColor(0, 0, 0, 1);
		// 矩阵变换
		modelMatrix.setRotate(currentAngle, 0, 0, 1);
		modelMatrix.scale(currentScale, currentScale, currentScale);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		// modelMatrix.scale()
  		// Clear <canvas>
  		gl.clear(gl.COLOR_BUFFER_BIT);

  		// Draw the rectangle
  		for (var i = 0, part = n / polygon.length; i < polygon.length; i++) {
  			gl.drawArrays(gl.TRIANGLE_STRIP, i * part, part);
  			// gl.drawArrays(gl.LINE_LOOP, i * part, part);
  		}
  		// alert("display_line is " + display_line);
  		// 当要展示网格的时候都会运行这段代码
  		if (display_line) {
  			for (var i = 0, part = num_of_line_point / polygon.length; i < polygon.length; i++) {
  				gl.drawArrays(gl.LINE_STRIP, n + i * part, part);
  			}
  		}
   		 // gl.drawArrays(gl.TRIANGLES, );
   		
	}

	// 更新角度与缩放程度
	function updateStatus() {
		var now = Date.now();
		var elapsed = now - last_time;
		last_time = now;
		
		currentAngle = (currentAngle + (ANGLE_STEP * elapsed) / 1000.0) % 360;
		if (currentAngle <= 180) {
			currentScale = 1.0 - (currentAngle / 180) * SCALE_STEP;
			// console.log('hello');
		}
		else {
			currentScale = 1.0 + (currentAngle / 180 - 2) * SCALE_STEP;
		}
	}
}


function hit(vertex, x, y) {
	var dx;
	var dy;
	dx = x - vertex[0];
	dy = y - vertex[1];
	return ((dx * dx + dy * dy) < 100);
}

// 获取点及颜色信息
function getPoints() {
	var points = [];
	var order = [1,2,0,3];
	for (var i = 0; i < polygon.length; i++) {
        for (var j = 0; j < order.length; j++) {
        	var index = polygon[i][order[j]];
        	var x = (2 * vertex_pos[index][0]) / canvasSize.maxX - 1.0;
        	var y = 1.0 - (2 * vertex_pos[index][1]) / canvasSize.maxY;
        	points.push(x);
        	points.push(y);
        	for (var ii = 0; ii < vertex_color[index].length; ii++) {
        		points.push(vertex_color[index][ii] / 255.0);
        	}
        }
	}
	if (display_line) {
		order = [0,1,2,3, 0,2];
		for (var i = 0; i < polygon.length; i++) {
			for (var j = 0; j < order.length; j++) {
				var index = polygon[i][order[j]];
				var x = (2 * vertex_pos[index][0]) / canvasSize.maxX - 1.0;
        		var y = 1.0 - (2 * vertex_pos[index][1]) / canvasSize.maxY;
        		points.push(x);
        		points.push(y);
        		points.push(1.0);
        		points.push(0.0);
        		points.push(0.0);
			}
		}
		num_of_line_point = polygon.length * order.length;
	}
	else {
		num_of_line_point = 0;
	}

	return points;
}


// 初始化
function initVertexBuffers(gl) {
	var points = getPoints();
	if (!points) {
		console.log('loading points failed');
		return -1;
	}
	var divisor = 5;
	// for (var i = 0; i < points.length; i++) {
	// 	console.log(i + ' ' + points[i]);
	// }
	var vertices = new Float32Array(points);

	// console.log(vertices[0]);
	var vertexBuffer = gl.createBuffer();
	if (!vertexBuffer) {
		console.log('loading vertexBuffer failed');
		return -2;
	}

	// Bind the buffer object to target
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	// Write date into the buffer object
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	var FSIZE = vertices.BYTES_PER_ELEMENT;

    // 这是位置
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('loading \'a_Position\' failed');
		return -3;
	}
	// Assign the buffer object to a_Position variable
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * divisor, 0);
	// Enable the assignment to a_Position variable
	gl.enableVertexAttribArray(a_Position);

	// 这是颜色
	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	if (a_Color < 0) {
		console.log('loading \'a_Color\' failed');
		return -4;
	}
	gl.vertexAttribPointer(a_Color, divisor - 2, gl.FLOAT, false, FSIZE * divisor, FSIZE * 2);
	gl.enableVertexAttribArray(a_Color);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	// console.log('return is ' +(points.length / divisor - num_of_line_point));
	return points.length / divisor - num_of_line_point;
}