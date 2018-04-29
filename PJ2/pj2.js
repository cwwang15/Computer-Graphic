window.addEventListener('load', main, false);

var VSHADER_SOURCE =
  	'attribute vec4 a_Position;\n' +
  	'void main() {\n' +
  	'  gl_Position = a_Position;\n' +
  	'  gl_PointSize = 10.0;\n' +
  	'}\n';

var FSHADER_SOURCE = 
    'void main() {\n' +
    '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
    '}\n';

function main() {
	var dragIndex;
	var dragging;
    var mouseX, mouseY;
    var dragHoldX, dragHoldY;

	var canvas = document.getElementById('webgl');
	canvas.addEventListener('mousedown', mouseDownListener, false);
	document.getElementById('webgl').height = canvasSize.maxY;
    document.getElementById('webgl').width = canvasSize.maxX;
	var gl = getWebGLContext(canvas);
	if (!gl) {
		console.log('loading gl failed');
		return;
	}

	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('loading initShader failed');
		return;
	}
	draw(gl);



    function mouseDownListener(evt) {
    	var bRect = evt.target.getBoundingClientRect();
		mouseX = (evt.clientX - bRect.left) * (canvas.width / bRect.width);
        mouseY = (evt.clientY - bRect.top) * (canvas.height / bRect.height);
        var i;
        var highestIndex = -1;
        for (i = 0; i < vertex_pos.length; i++) {
        	if (hit(vertex_pos[i], mouseX, mouseY)) {
        		dragging = true;
        		dragHoldX = mouseX - vertex_pos[i][0];
        		dragHoldY = mouseY - vertex_pos[i][1];
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
        vertex_pos[dragIndex][0] = mouseX;
        vertex_pos[dragIndex][1] = mouseY;
        draw(gl);
	}
}

function draw(gl) {
	var n = initVertexBuffers(gl);

	if (n < 0) {
		console.log('loading \'n\' failed');
		return;
	}
	console.log(n);
	// Specify the color for clearing <canvas>
    gl.clearColor(0, 0, 0, 1);

  	// Clear <canvas>
  	gl.clear(gl.COLOR_BUFFER_BIT);

  	// Draw the rectangle
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
   	
}

function hit(vertex, x, y) {
	var dx;
	var dy;
	dx = x - vertex[0];
	dy = y - vertex[1];
	return ((dx * dx + dy * dy) < 100);
}


function getPoints() {
	points = [];
	order = [0, 1, 2, 0, 2, 3];
	for (var i = 0; i < polygon.length; i++) {
        for (var j = 0; j < order.length; j++) {
        	var x = (2 * vertex_pos[polygon[i][order[j]]][0]) / canvasSize.maxX - 1.0;
        	var y = 1.0 - (2 * vertex_pos[polygon[i][order[j]]][1]) / canvasSize.maxY;
        	points.push(x);
        	points.push(y);
        }
	}
	return points;
}

function initVertexBuffers(gl) {
	var points = getPoints();
	if (!points) {
		console.log('loading points failed');
		return -1;
	}
	// for (var i = 0; i < points.length; i++) {
	// 	console.log(i + ' ' + points[i]);
	// }
	var vertices = new Float32Array(points);

	// for (var i = 0; i < vertices.length; i++) {
	// 	console.log(vertices[i]);
	// }

	// console.log(vertices[0]);
	var vertexBuffer = gl.createBuffer();
	if (!vertexBuffer) {
		console.log('loading vertexBuffer failed');
		return -1;
	}

	// Bind the buffer object to target
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	// Write date into the buffer object
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('loading \'a_Position\' failed');
		return -1;
	}
	// Assign the buffer object to a_Position variable
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

	// Enable the assignment to a_Position variable
	gl.enableVertexAttribArray(a_Position);
	return points.length / 2;
}