window.addEventListener("load", main, false);
// ProgramObject.js (c) 2012 matsuda and kanda
// Vertex shader for single color drawing

// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec2 a_TexCoord;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'varying vec2 v_TexCoord;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  v_TexCoord = a_TexCoord;\n' +
    '}\n';

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform sampler2D u_Sampler;\n' +
    'varying vec2 v_TexCoord;\n' +
    // 'varying float v_NdotL;\n' +
    'void main() {\n' +
    '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
    '}\n';

var OBJECT_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec4 a_Normal;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    // Ambient light color 环境光还要加上，点光源也要加上，还有颜色
    'uniform vec3 u_AmbientLight;\n' +

    'uniform vec3 u_DirectionLight;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
    '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
    '  vec3 diffuse = a_Color.rgb * nDotL;\n' +

    '  v_Color = vec4(ambient+diffuse , a_Color.a);\n' +
    '}\n';


var OBJECT_FSHADER_SOURCE =

    'precision mediump float;\n' +
    //'#endif\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';


var fov;
var near;
var far;
var aspect;
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);


var viewProjMatrix = new Matrix4();

var objProgram;
var texProgram;

var SceneObject = function () {
    this.model;  	 //a model contains some vertex buffer
    this.filePath;   //obj file path
    this.objDoc;
    this.drawingInfo;
    this.transform;
    this.valid = 0;
};
var sceneObjList = [];
var dLight = sceneDirectionLight;
var aLight = sceneAmbientLight;
// pLight点光源与眼睛相同。
var pLight = CameraPara.eye;
var pLightColor = scenePointLightColor;
var tick;

function main() {
    // Retrieve <canvas> element

    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    init();

    function init() {
        fov = CameraPara.fov;
        near = CameraPara.near;
        far = CameraPara.far;
        aspect = canvas.width / canvas.height;

        changeViewProjMatrix();
    }

    // Initialize shaders
    texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);

    texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
    texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
    texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
    texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');

    if (texProgram.a_Position < 0 || texProgram.a_TexCoord < 0 ||
        !texProgram.u_MvpMatrix || !texProgram.u_Sampler) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return;
    }


    /*********************obj文件创建program 代码start ****************************/

    objProgram = createProgram(gl, OBJECT_VSHADER_SOURCE, OBJECT_FSHADER_SOURCE);

    if (!objProgram) {
        console.log('Failed to create obj program');
        return;
    }
    objProgram.a_Position = gl.getAttribLocation(objProgram, 'a_Position');
    objProgram.a_Color = gl.getAttribLocation(objProgram, 'a_Color');
    objProgram.a_Normal = gl.getAttribLocation(objProgram, 'a_Normal');
    objProgram.u_MvpMatrix = gl.getUniformLocation(objProgram, 'u_MvpMatrix');
    objProgram.u_NormalMatrix = gl.getUniformLocation(objProgram, 'u_NormalMatrix');
    objProgram.u_DirectionLight = gl.getUniformLocation(objProgram, 'u_DirectionLight');
    objProgram.u_AmbientLight = gl.getUniformLocation(objProgram, 'u_AmbientLight');
    if (objProgram.a_Position < 0 || objProgram.a_Color < 0 || objProgram.a_Normal < 0
        || !objProgram.u_MvpMatrix || !objProgram.u_NormalMatrix || !objProgram.u_DirectionLight
        || !objProgram.u_AmbientLight) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return;
    }
    /*********************obj文件创建program 代码end ****************************/



    var box = initVertexBuffers4TexEntity(gl, boxRes);
    if (!box) {
        console.log('Failed to set the vertex information');
        return;
    }
    var floor = initVertexBuffers4TexEntity(gl, floorRes);
    if (!floor) {
        console.log('Failed to init floor');
        return;
    }
    // Set texture
    var boxTexture = initTextures(gl, texProgram, box, 0);
    if (!boxTexture) {
        console.log('Failed to intialize the texture.');
        return;
    }
    var floorTexture = initTextures(gl, texProgram, floor, 1);
    if (!floorTexture) {
        console.log('failed to init floor texture');
        return;
    }


    /*****************************从scene文件读取配置信息 start*********************************/
    for (var i = 0, objNum = ObjectList.length; i < objNum; i++) {
        var obj = ObjectList[i];
        var sceneObj = new SceneObject();
        sceneObj.model = initVertexBuffers(gl, objProgram);
        if (!sceneObj.model) {
            console.log('Failed to set the vertex information');
            sceneObj.valid = 0;
            continue;
        }
        sceneObj.valid = 1;
        sceneObj.kads = obj.kads;
        sceneObj.transform = obj.transform;
        sceneObj.objFilePath = obj.objFilePath;
        // printMessage(obj.transform[0].content);
        sceneObj.color = obj.color;
        // console.log('color: ' + obj.color);
        // printMessage('scene color: ' + sceneObj.color);
        //补齐最后一个alpha值
        if (sceneObj.color.length === 3) {
            sceneObj.color.push(1.0);
        }
        readOBJFile(sceneObj, gl, 1.0, true);

        sceneObjList.push(sceneObj);

    }
    /*****************************从scene文件读取配置信息 end*********************************/
    // Set the clear color and enable the depth test
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, .0, 1.0);

    // Calculate the view projection matrix

    document.onkeydown = function (evt) {

        keyDownEvent(evt);
        // printMessage(eye.elements[0]);
    };
    document.onkeyup = function (evt) {
        if (evt) {
            nums = 0;
        }
    };
    // document.onkeyup = function (evt) {
    //     nums = 3;
        // printMessage('h');
    // };
    /*
     * TODO 动画与其它
     */
    // Start drawing
    var currentAngle = 0.0; // Current rotation angle (degrees)

    tick = function () {
        // currentAngle = animate(currentAngle);  // Update current rotation angle

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
        drawTexture(gl, texProgram, box, boxTexture);
        drawTexture(gl, texProgram, floor, floorTexture);
        deltaViewProjMatrix(deltaEye, deltaAt, deltaUp);
        renderScene(gl);
        // last = Date.now();
        window.requestAnimationFrame(tick);
    };
    tick();


}

var count = 0;
// TODO
// 如果不使用这个函数，就会加载不出纹理效果。
// 只有使用了requestAnimationFrame以后才能正常运行
// 还要在研究研究
function mytrick(f) {

    if (count < 2) {
        window.requestAnimationFrame(f);
        count++;
    }
}

var last = Date.now();

var deltaEye;
var deltaAt;
var deltaUp;
var nums;

function keyDownEvent(evt) {
    var cur = Date.now();
    var elapse = (cur - last) % 64 + 64;
    last = cur;
    var move = MOVE_VELOCITY * elapse / 1000;
    // printMessage(move);
    if (evt.keyCode === 65) {//a
        var v = vectorCross(up, vectorMinus(at, eye));
        deltaEye = vectorMultNum(v, 0.125);
        deltaAt = new Vector3(deltaEye.elements);
        deltaUp = new Vector3([0.0,0.0,0.0]);
        nums = Math.round(move* 1000);

        // for (var i = 0; i < move; i++) {
        //     eye = vectorAdd(eye, v);
        //     at = vectorAdd(at, v);
        //     tick();
        // }

    }
    else if (evt.keyCode === 83) { //s

    } else if (evt.keyCode === 68) { //d
        var v = vectorCross(up, vectorMinus(at, eye));
        v = vectorReverse(v);
        deltaEye = vectorMultNum(v, 0.125);
        deltaAt = new Vector3(deltaEye.elements);
        deltaUp = new Vector3([0.0,0.0,0.0]);
        nums = Math.round(move*1000);
    } else if (evt.keyCode === 87) { //w

    }
    // printMessage(deltaEye.elements + " nums: " + nums);
    // changeViewProjMatrix();
}

function deltaViewProjMatrix(deltaEye, deltaAt, deltaUp) {
    if (nums > 0) {
        nums--;
        eye = vectorAdd(eye, deltaEye);
        at = vectorAdd(at, deltaAt);
        up = vectorAdd(up, deltaUp);
        printMessage(eye.elements + '; at: ' + at.elements + "; nums: " + nums);
        changeViewProjMatrix();
    }
}
function changeViewProjMatrix() {
    /*
     * view 与 project 放一起了
     */
    viewProjMatrix.setPerspective(fov, aspect, near, far);
    viewProjMatrix.lookAt(eye.elements[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        up.elements[0], up.elements[1], up.elements[2]);

    pLight = eye.elements;
}

/**------------------------跟纹理有关的   start------------------------------------------*/
/**
 *
 * @param gl
 * @param target 要返回哪一个物体的顶点信息
 * @returns {null}
 */
function initVertexBuffers4TexEntity(gl, target) {

    var vertices = new Float32Array(target.vertex);
    var texCoords = new Float32Array(target.texCoord);
    var indices = new Uint8Array(target.index);
    var texObj = {}; // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    texObj.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    // o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    texObj.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    texObj.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!texObj.vertexBuffer || !texObj.texCoordBuffer || !texObj.indexBuffer) return null;

    texObj.numIndices = indices.length;
    texObj.texImagePath = target.texImagePath;
    texObj.scale = target.scale;
    texObj.translate = target.translate;
    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return texObj;
}

/**
 *
 * @param gl
 * @param program 纹理program
 * @param target 要贴上图像的实例：box、floor
 * @param flag 用来切换纹理单元的
 * @returns {*}
 */
function initTextures(gl, program, target, flag) {
    // var texture = {};

    var texture0 = gl.createTexture();   // Create a texture object
    if (!texture0) {
        console.log('Failed to create the texture object');
        return null;
    }

    var image0 = new Image();  // Create a image object
    if (!image0) {
        console.log('Failed to create the image object');
        return null;
    }
    // Register the event handler to be called when image loading is completed
    image0.onload = function () {
        loadTexture(gl, texture0, image0, program, flag);
    };

    // Tell the browser to load an Image
    image0.src = target.texImagePath;
    // console.log(target.texImagePath);

    return texture0;
}


/**
 *
 * @param gl
 * @param texture 纹理
 * @param image   图片
 * @param program
 * @param flag    确定纹理单元，这里不是0的都当作是1
 */
function loadTexture(gl, texture, image, program, flag) {
    // Write the image data to texture object
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
    if (flag === 0) {
        gl.activeTexture(gl.TEXTURE0);
        // printMessage('hello');
    } else {
        gl.activeTexture(gl.TEXTURE1);
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Pass the texure unit 0 to u_Sampler
    gl.useProgram(program);
    gl.uniform1i(program.u_Sampler, 0);

    gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
}


// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

// Coordinate transformation matrix

/**
 *
 * @param gl gl上下文
 * @param program 纹理program
 * @param texEntity 要添加纹理的实体
 * @param texture 纹理
 */
function drawTexture(gl, program, texEntity, texture) {
    gl.useProgram(program);   // Tell that this program object is used

    // Assign the buffer objects and enable the assignment
    initAttributeVariable(gl, program.a_Position, texEntity.vertexBuffer);  // Vertex coordinates
    // initAttributeVariable(gl, program.a_Normal, o.normalBuffer);    // Normal
    initAttributeVariable(gl, program.a_TexCoord, texEntity.texCoordBuffer);// Texture coordinates
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, texEntity.indexBuffer); // Bind indices

    // Bind texture object to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var g_modelMatrix = new Matrix4();
    var g_mvpMatrix = new Matrix4();
    // var g_normalMatrix = new Matrix4();
    // Calculate a model matrix
    var trans = texEntity.translate;
    var scale = texEntity.scale;
    g_modelMatrix.setTranslate(trans[0], trans[1], trans[2]);
    g_modelMatrix.scale(scale[0], scale[1], scale[2]);
    // viewProjMatrix.setLookAt()
    g_mvpMatrix.set(viewProjMatrix);
    // printMessage('eye[0]' + eye.elements[0]);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, texEntity.numIndices, texEntity.indexBuffer.type, 0);   // Draw
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Keep the information necessary to assign to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
    var buffer = gl.createBuffer();　  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}

/**--------------------------跟纹理有关的 end ---------------------------------------*/


/**--------------------------跟Obj模型有关的 start ---------------------------------------*/
function renderScene(gl) {
    // TODO
    gl.useProgram(objProgram);
    var modelMatrix = new Matrix4();
    var normalMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    gl.uniform3f(objProgram.u_DirectionLight, dLight[0], dLight[1], dLight[2]);
    gl.uniform3f(objProgram.u_AmbientLight, aLight[0], aLight[1], aLight[2]);

    for (var i = 0, num = sceneObjList.length; i < num; i++) {
        var so = sceneObjList[i];
        if (so.objDoc != null && so.objDoc.isMTLComplete()) { // OBJ and all MTLs are available
            so.drawingInfo = onReadComplete(gl, so.model, so.objDoc);
            sceneObjList[i].objname = so.objDoc.objects[0].name;
            so.objname = so.objDoc.objects[0].name;
            so.objDoc = null;
        }
        if (so.drawingInfo) {
            modelMatrix.setIdentity();
            manipulateObj(so.transform, modelMatrix);

            mvpMatrix.set(viewProjMatrix).multiply(modelMatrix);
            gl.uniformMatrix4fv(objProgram.u_MvpMatrix, false, mvpMatrix.elements);

            normalMatrix.setInverseOf(modelMatrix);
            normalMatrix.transpose();
            gl.uniformMatrix4fv(objProgram.u_NormalMatrix, false, normalMatrix.elements);

            initAttributeVariable(gl, objProgram.a_Position, so.model.vertexBuffer);  // Vertex coordinates
            initAttributeVariable(gl, objProgram.a_Normal, so.model.normalBuffer);    // Normal
            initAttributeVariable(gl, objProgram.a_Color, so.model.colorBuffer);// Texture coordinates

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, so.model.indexBuffer);
            // Draw
            gl.drawElements(gl.TRIANGLES, so.drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }

}

/**
 * 对obj进行转换
 * @param op          一个数组，记录要执行什么操作
 * @param modelMatrix 被操作的矩阵
 */
function manipulateObj(op, modelMatrix) {
    for (var i = 0; i < op.length; i++) {
        // var so = sceneObjList[0];

        // printMessage(op[i].type);
        if (op[i].type === 'rotate') {
            modelMatrix.rotate(op[i].content[0], op[i].content[1], op[i].content[2], op[i].content[3]);
        } else if (op[i].type === 'translate') {
            modelMatrix.translate(op[i].content[0], op[i].content[1], op[i].content[2]);
        } else if (op[i].type === 'scale') {
            modelMatrix.scale(op[i].content[0], op[i].content[1], op[i].content[2]);
        }
    }
}

function initVertexBuffers(gl, program) {
    var o = {}; // Utilize Object object to return multiple buffer objects
    o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
    o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
    o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
    o.indexBuffer = gl.createBuffer();
    if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer) {
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer = gl.createBuffer();  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

    //在buffer中填入type和element数量信息，以备之后绘制过程中绑定shader使用
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

/**
 * 读入模型
 * @param so
 * @param gl
 * @param scale
 * @param reverse
 */
// Read a file
function readOBJFile(so, gl, scale, reverse) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status !== 404) {
            onReadOBJFile(request.responseText, so, gl, scale, reverse);
        }
    };
    request.open('GET', so.objFilePath, true); // Create a request to acquire the file
    request.send();                      // Send the request
}

// OBJ File has been read
function onReadOBJFile(fileString, so, gl, scale, reverse) {
    var objDoc = new OBJDoc(so.filePath);  // Create a OBJDoc object
    objDoc.defaultColor = so.color;
    var result = objDoc.parse(fileString, scale, reverse); // Parse the file
    if (!result) {
        so.objDoc = null;
        so.drawingInfo = null;
        console.log("OBJ file parsing error.");
        return;
    }
    so.objDoc = objDoc;
}

function onReadComplete(gl, model, objDoc) {
    // Acquire the vertex coordinates and colors from OBJ file
    var drawingInfo = objDoc.getDrawingInfo();

    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);
    // console.log('drawingInfo.colors: ' + drawingInfo.colors);
    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
}

/**--------------------------跟Obj模型有关的 end ---------------------------------------*/

function printMessage(message) {
    var mb = document.getElementById("messageBox");
    mb.innerHTML = "message:\t" + message;
}

// var ANGLE_STEP = 30;   // The increments of rotation angle (degrees)

// var last = Date.now(); // Last time that this function was called
// function animate(angle) {
//   var now = Date.now();   // Calculate the elapsed time
//   var elapsed = now - last;
//   last = now;
//   // Update the current rotation angle (adjusted by the elapsed time)
//   var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
//   return newAngle % 360;
// }
