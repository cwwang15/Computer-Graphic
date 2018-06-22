window.addEventListener("load", main, false);
document.onkeydown = function (evt) {

    keyDownEvent(evt);
    // printMessage(eye.elements[0]);
};
document.onkeyup = function (evt) {
    if (evt.keyCode !== 70) {
        nums = 0;

    }
    if (evt.keyCode === 70)
        usingPointLight = false;
};

// ProgramObject.js (c) 2012 matsuda and kanda
// Vertex shader for single color drawing


// 影子
var SHADOW_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '}\n';

// Fragment shader program for generating a shadow map
var SHADOW_FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'void main() {\n' +
    '  gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 0.0);\n' + // Write the z-value in R
    '}\n';

// perspective 的参数信息
var fov;
var near;
var far;
var aspect;
// view 的参数信息
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);
// 雾的参数信息
var fogColor = new Float32Array([0.937, .931, 1.0]);
var fogDist = new Float32Array([3, 28]);


var viewProjMatrix = new Matrix4();
var viewProjMatrixFromLight = new Matrix4();

var OFFSCREEN_WIDTH = 2048, OFFSCREEN_HEIGHT = 2048;
var aspectFromLight = OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT;
var fovFromLight = 80;
var eyeFromLight = CameraPara.eye;
var atFromLight = CameraPara.at;
var upFromLight = CameraPara.up;


var objProgram;
var texProgram;
var shadowProgram;

//帧缓冲
var fbo;

var canvas;

// 保存模型信息
var SceneObject = function () {
    this.model;  	 //a model contains some vertex buffer
    this.filePath;   //obj file path
    this.objDoc;
    this.drawingInfo;
    this.transform;
    this.valid = 0;
};

var sceneObjList = [];

// 平行光、环境光的配置信息
var dLight = sceneDirectionLight;
var aLight = sceneAmbientLight;
var sLight = sceneDirectionLight;
// pLight点光源与眼睛相同。是否使用点光源
var usingPointLight = false;
var pLight = CameraPara.eye;
var pLightColor = scenePointLightColor;
var tick;

function main() {
    // Retrieve <canvas> element

    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    init(canvas);


    // Initialize shaders
    texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
    if (!texProgram) {
        console.log('falied to create texture program');
        return;
    }
    initTexProgram(gl);

    /*********************obj文件创建program 代码start ****************************/

    shadowProgram = createProgram(gl, SHADOW_VSHADER_SOURCE, SHADOW_FSHADER_SOURCE);
    if (!shadowProgram) {
        console.log('Faild to create shadow program');
        return;
    }
    shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
    shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');
    if (shadowProgram.a_Position < 0 || !shadowProgram.u_MvpMatrix) {
        console.log('Failed to get the storage location of attribute or uniform variable from shadowProgram');
        return;
    }

    // Initialize framebuffer object (FBO)
    fbo = initFramebufferObject(gl);
    if (!fbo) {
        console.log('Failed to initialize frame buffer object');
        return;
    }

    gl.activeTexture(gl.TEXTURE2); // Set a texture object to the texture unit
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);

    objProgram = createProgram(gl, OBJECT_VSHADER_SOURCE, OBJECT_FSHADER_SOURCE);

    if (!objProgram) {
        console.log('Failed to create obj program');
        return;
    }
    initObjProgram(gl);
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
        sceneObj.color = obj.color;
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
    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);

    // Calculate the view projection matrix

    /*
      * 动画
      */
    // Start drawing
    // var currentAngle = 0.0; // Current rotation angle (degrees)

    tick = function () {
        // currentAngle = animate(currentAngle);  // Update current rotation angle
        currentAngle = animate(currentAngle);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
        // if (usingPointLight) {
        // }

        deltaViewProjMatrix(deltaEye, deltaAt, deltaUp);
        renderScene(gl);
        drawTexture(gl, texProgram, box, boxTexture);
        drawTexture(gl, texProgram, floor, floorTexture);
        // last = Date.now();
        window.requestAnimationFrame(tick);
    };
    tick();


}

var count = 0;

// 用于计算偏移量
var deltaEye;
var deltaAt;
var deltaUp = zero;
var nums;
// 每60帧移动 MOVE_VELOCITY，据说 requestAnimationFrame 是每秒60帧
var move_velocity = MOVE_VELOCITY / 60.0;
var rot_velocity = ROT_VELOCITY / 360.0;
var cos = Math.cos(rot_velocity);
var sin = Math.sin(rot_velocity);

/**
 *
 * @param evt 响应键盘事件
 */
function keyDownEvent(evt) {
    if (evt.keyCode === 38) {
        if (fogDist[1] < 300)
            fogDist[1] += 1;
    } else if (evt.keyCode === 40) {
        if (fogDist[1] > fogDist[0])
            fogDist[1] -= 1;
    } else if (evt.keyCode === 70) {
        usingPointLight = true;
    } else {
        // deltaUp = zero;
        deltaEye = zero;
        deltaAt = zero;

        var face = vectorMinus(at, eye).normalize();
        var v = vectorCross(up, face).normalize();
        // var axis = vectorCross(v, face).normalize();
        if (evt.keyCode === 65) {//a
            deltaEye = vectorAdd(deltaEye, vectorMultNum(v, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);
        }
        if (evt.keyCode === 83) { //s
            var tmp_face = vectorReverse(face);
            deltaEye = vectorAdd(deltaEye, vectorMultNum(tmp_face, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);

        }
        if (evt.keyCode === 68) { //d
            var temp_v = vectorReverse(v);
            deltaEye = vectorAdd(deltaEye, vectorMultNum(temp_v, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);
        }
        if (evt.keyCode === 87) { //w
            deltaEye = vectorAdd(deltaEye, vectorMultNum(face, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);
        }

        /***********        旋转           ********************/
        /**
         * 说明：
         * 旋转这里做的可能不是太好，我的计算方式是
         * 1，计算look-at-point的delta（偏移）
         * 2，根据改变后的look-at-point位置（偏移后的），计算新的up-vector
         *    使新的up-vector与之正交。
         *    更新up-vector在函数 {@code deltaViewProjMatrix} 中
         */
        var left;
        var new_pos;
        if (evt.keyCode === 74) { //j
            left = vectorCopy(v);
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(left, sin));
            deltaAt = vectorMinus(new_pos, face);
        }
        if (evt.keyCode === 76) { // l
            left = vectorReverse(v);
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(left, sin));
            deltaAt = vectorMinus(new_pos, face);
        }
        if (evt.keyCode === 73) { // i 向上旋转
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(up, sin));
            deltaAt = vectorMinus(new_pos, face);

        }
        if (evt.keyCode === 75) { //k
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(up, -sin));
            deltaAt = vectorMinus(new_pos, face);
        }
        /********************      旋转结束          **************************************/
        nums = 10000;
    }
}

/**
 *  对 perspective 所需要的的参数进行初始化
 * @param canvas
 */
function init(canvas) {
    fov = CameraPara.fov;
    near = CameraPara.near;
    far = CameraPara.far;
    aspect = canvas.width / canvas.height;
    viewProjMatrixFromLight.setPerspective(fovFromLight, aspectFromLight, near, far * 2.0);
    viewProjMatrixFromLight.lookAt(eyeFromLight[0], eyeFromLight[1], eyeFromLight[2],
        atFromLight[0], atFromLight[1], atFromLight[2],
        upFromLight[0], upFromLight[1], upFromLight[2]);
    // viewProjMatrixFromLight.lookAt();
    changeViewProjMatrix();
}

/**
 * 将 texture program 中的值进行初始化
 * @param gl
 */
function initTexProgram(gl) {
    texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
    texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
    texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
    texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');

    // texProgram.u_LightColor = gl.getUniformLocation(texProgram, 'u_LightColor');
    texProgram.a_Color = gl.getAttribLocation(texProgram, 'a_Color');
    texProgram.a_Normal = gl.getAttribLocation(texProgram, 'a_Normal');
    texProgram.u_DirectionLight = gl.getUniformLocation(texProgram, 'u_DirectionLight');

    texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, 'u_NormalMatrix');
    texProgram.u_AmbientLight = gl.getUniformLocation(texProgram, 'u_AmbientLight');
    texProgram.u_FogDist = gl.getUniformLocation(texProgram, 'u_FogDist');
    texProgram.u_FogColor = gl.getUniformLocation(texProgram, 'u_FogColor');

    texProgram.u_MvpMatrixFromLight = gl.getUniformLocation(texProgram, 'u_MvpMatrixFromLight');
    texProgram.u_ShadowMap = gl.getUniformLocation(texProgram, 'u_ShadowMap');
    printMessage(texProgram.u_MvpMatrixFromLight);
    if (texProgram.a_Position < 0 || texProgram.a_TexCoord < 0 ||
        !texProgram.u_MvpMatrix || !texProgram.u_Sampler ||
        !texProgram.a_Color ||
        !texProgram.a_Normal || !texProgram.u_DirectionLight ||
        !texProgram.u_NormalMatrix || !texProgram.u_AmbientLight ||
        !texProgram.u_FogColor || !texProgram.u_FogDist ||
        !texProgram.u_ShadowMap || !texProgram.u_MvpMatrixFromLight) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return;
    }

}

/**
 * 对 objProgram 中的的值进行初始化
 * @param gl
 */
function initObjProgram(gl) {
    objProgram.a_Position = gl.getAttribLocation(objProgram, 'a_Position');
    objProgram.a_Color = gl.getAttribLocation(objProgram, 'a_Color');
    objProgram.a_Normal = gl.getAttribLocation(objProgram, 'a_Normal');
    objProgram.u_MvpMatrix = gl.getUniformLocation(objProgram, 'u_MvpMatrix');
    objProgram.u_NormalMatrix = gl.getUniformLocation(objProgram, 'u_NormalMatrix');
    objProgram.u_DirectionLight = gl.getUniformLocation(objProgram, 'u_DirectionLight');
    objProgram.u_AmbientLight = gl.getUniformLocation(objProgram, 'u_AmbientLight');

    // 点光源
    objProgram.u_UsingPointLight = gl.getUniformLocation(objProgram, 'u_UsingPointLight');
    objProgram.u_LightColor = gl.getUniformLocation(objProgram, 'u_LightColor');
    objProgram.u_LightPosition = gl.getUniformLocation(objProgram, 'u_LightPosition');
    objProgram.u_ModelMatrix = gl.getUniformLocation(objProgram, 'u_ModelMatrix');
    // 雾
    // objProgram.u_Eye = gl.getUniformLocation(objProgram, 'u_Eye');
    objProgram.u_FogColor = gl.getUniformLocation(objProgram, 'u_FogColor');
    objProgram.u_FogDist = gl.getUniformLocation(objProgram, 'u_FogDist');
    // 影子
    objProgram.u_MvpMatrixFromLight = gl.getUniformLocation(objProgram, 'u_MvpMatrixFromLight');
    objProgram.u_ShadowMap = gl.getUniformLocation(objProgram, 'u_ShadowMap');
    // phong
    // objProgram.u_PhongViewMatrix = gl.getUniformLocation(objProgram, 'u_PhongViewMatrix');
    objProgram.u_PhongLightPosition = gl.getUniformLocation(objProgram, 'u_PhongLightPosition');
    objProgram.u_ModelViewMatrix = gl.getUniformLocation(objProgram, 'u_ModelViewMatrix');
    if (objProgram.a_Position < 0 || objProgram.a_Color < 0 || objProgram.a_Normal < 0
        || !objProgram.u_MvpMatrix || !objProgram.u_NormalMatrix || !objProgram.u_DirectionLight
        || !objProgram.u_AmbientLight
        || !objProgram.u_UsingPointLight || !objProgram.u_LightColor || !objProgram.u_LightPosition
        || !objProgram.u_ModelMatrix
        || !objProgram.u_ShadowMap || !objProgram.u_MvpMatrixFromLight
        || !objProgram.u_PhongLightPosition
        || !objProgram.u_ModelViewMatrix) {
        console.log('obj : Failed to get the storage location of attribute or uniform variable');
        return;
    }
}

/**
 * 传入 eye，look-at，up 向量的偏移量，计算新的位置
 *
 * @param deltaEye 眼睛位置的偏移量
 * @param deltaAt  look-at-point的偏移量
 * @param deltaUp  这个没用，根据deltaEye和deltaAt计算。
 */
function deltaViewProjMatrix(deltaEye, deltaAt, deltaUp) {
    if (nums > 0) {
        nums--;
        var face = vectorMinus(at, eye);
        var left = vectorCross(face, up);

        eye = vectorAdd(eye, deltaEye);
        at = vectorAdd(at, deltaAt);
        face = vectorMinus(at, eye);
        up = vectorCross(left, face);
        up.normalize();
        changeViewProjMatrix();
    }
}

/**
 * 更新 viewProj 矩阵
 */
function changeViewProjMatrix() {
    /*
     * view 与 project 放一起了
     */
    viewProjMatrix.setPerspective(fov, aspect, near, far);
    viewProjMatrix.lookAt(eye.elements[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        up.elements[0], up.elements[1], up.elements[2]);
    viewProjMatrixFromLight.setPerspective(fovFromLight, aspectFromLight, near, far * 2);
    viewProjMatrixFromLight.lookAt(CameraPara.eye[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        up.elements[0], up.elements[1], up.elements[2]);
    pLight = eye.elements;
}


/**^^^^^^^^^^^^^^^^^^^^^^^^^^跟Obj模型有关的 start ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/
/**
 * 把模型文件绘制到屏幕上
 *
 * @param gl
 */
var times = 1;
var soList = [];

function renderScene(gl) {
    var modelMatrix = new Matrix4();
    var normalMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    var mvpMatrixFromLight = new Matrix4();
    var viewMatrix = new Matrix4();
    var modelViewMatrix = new Matrix4();
    viewMatrix.setLookAt(eye.elements[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        up.elements[0], up.elements[1], up.elements[2]);

    gl.useProgram(shadowProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);               // Change the drawing destination to FBO
    gl.viewport(0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT); // Set view port for FBO
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);   // Clear FBO
    for (let k = 0; k < soList.length; k++) {
        so = soList[k];
        if (so.drawingInfo) {
            modelMatrix.setIdentity();
            manipulateObj(so.transform, modelMatrix, so.objname);
            mvpMatrix.set(viewProjMatrixFromLight).multiply(modelMatrix);
            gl.uniformMatrix4fv(shadowProgram.u_MvpMatrix, false, mvpMatrix.elements);

            initAttributeVariable(gl, shadowProgram.a_Position, so.model.vertexBuffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, so.model.indexBuffer);
            // Draw
            gl.drawElements(gl.TRIANGLES, so.drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);               // Change the drawing destination to color buffer
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(objProgram);
    gl.uniform1i(objProgram.u_ShadowMap, 2);
    // gl.uniformMatrix4fv(objProgram.u_PhongViewMatrix, false, viewMatrix.elements);
    gl.uniform3f(objProgram.u_PhongLightPosition, sLight[0], sLight[1], sLight[2]);
    // var mvpMatrixFromLight_p = new Matrix4();
    gl.uniform3f(objProgram.u_DirectionLight, dLight[0], dLight[1], dLight[2]);
    gl.uniform3f(objProgram.u_AmbientLight, aLight[0], aLight[1], aLight[2]);
    gl.uniform1i(objProgram.u_UsingPointLight, usingPointLight);
    gl.uniform3f(objProgram.u_LightColor, pLightColor[0], pLight[1], pLightColor[2]);
    gl.uniform3fv(objProgram.u_FogColor, fogColor);
    gl.uniform2fv(objProgram.u_FogDist, fogDist);
    // gl.uniform4fv(objProgram.u_Eye, new Float32Array(eye.elements));
    gl.uniform3f(objProgram.u_LightPosition, eye.elements[0], eye.elements[1], eye.elements[2]);
    for (var i = 0, num = sceneObjList.length; i < num; i++) {

        // gl.uniform1i(objProgram.u_ShadowMap, 2);

        var so = sceneObjList[i];
        if (so.objDoc != null && so.objDoc.isMTLComplete()) { // OBJ and all MTLs are available
            so.drawingInfo = onReadComplete(gl, so.model, so.objDoc);
            sceneObjList[i].objname = so.objDoc.objects[0].name;
            so.objname = so.objDoc.objects[0].name.trim();
            so.objDoc = null;
            // soList[i] = so;
            soList[soList.length] = {};
            soList[soList.length - 1].objname = so.objname;
            soList[soList.length - 1].transform = so.transform;
            soList[soList.length - 1].drawingInfo = so.drawingInfo;
            soList[soList.length - 1].model = so.model;
        }

    }

    // gl.useProgram(objProgram);
    for (let j = 0; j < soList.length; j++) {
        so = soList[j];
        if (so.drawingInfo) {
            modelMatrix.setIdentity();
            manipulateObj(so.transform, modelMatrix, so.objname);
            gl.uniformMatrix4fv(objProgram.u_ModelMatrix, false, modelMatrix.elements);

            modelViewMatrix.setLookAt(eye.elements[0], eye.elements[1], eye.elements[2],
                at.elements[0], at.elements[1], at.elements[2],
                up.elements[0], up.elements[1], up.elements[2]);
            modelViewMatrix.multiply(modelMatrix);
            gl.uniformMatrix4fv(objProgram.u_ModelViewMatrix, false, modelViewMatrix.elements);

            mvpMatrix.set(viewProjMatrix).multiply(modelMatrix);
            gl.uniformMatrix4fv(objProgram.u_MvpMatrix, false, mvpMatrix.elements);
            mvpMatrixFromLight.set(viewProjMatrixFromLight).multiply(modelMatrix);
            gl.uniformMatrix4fv(objProgram.u_MvpMatrixFromLight, false, mvpMatrixFromLight.elements);
            normalMatrix.setInverseOf(modelMatrix);
            normalMatrix.transpose();
            gl.uniformMatrix4fv(objProgram.u_NormalMatrix, false, normalMatrix.elements);

            initAttributeVariable(gl, objProgram.a_Position, so.model.vertexBuffer);
            initAttributeVariable(gl, objProgram.a_Normal, so.model.normalBuffer);
            initAttributeVariable(gl, objProgram.a_Color, so.model.colorBuffer);//

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, so.model.indexBuffer);
            // Draw
            gl.drawElements(gl.TRIANGLES, so.drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }


}

/**
 * 对obj进行转换，比如缩放、平移、旋转，以及鸟的动画效果
 *
 * @param op          一个数组，记录要执行什么操作
 * @param modelMatrix 被操作的矩阵
 * @param name
 */

function manipulateObj(op, modelMatrix, name) {
    for (var i = 0; i < op.length; i++) {
        // var so = sceneObjList[0];
        if (name === 'bird') {
            modelMatrix.rotate(currentAngle, 0, 1, 0);
            if (op[i].type === 'translate') {
                // 来两次三角函数升降
                op[i].content[1] = 3 * Math.sin((currentAngle + 160) * Math.PI / 90) + 6;
            }
        }
        if (op[i].type === 'rotate') {
            modelMatrix.rotate(op[i].content[0], op[i].content[1], op[i].content[2], op[i].content[3]);
        } else if (op[i].type === 'translate') {
            modelMatrix.translate(op[i].content[0], op[i].content[1], op[i].content[2]);
        } else if (op[i].type === 'scale') {
            modelMatrix.scale(op[i].content[0], op[i].content[1], op[i].content[2]);
        }
        if (name === 'bird') {
            // modelMatrix.rotate(300, 0, 1, 0);
            // WARNING: 如果不这样做，鸟会自旋
            modelMatrix.rotate(-currentAngle / 2 + 300, 0, 1, 0);
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
    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
}


/**^^^^^^^^^^^^^^^^^^^^^^^^^^跟Obj模型有关的 end ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/

function printMessage(message) {
    var mb = document.getElementById("messageBox");
    mb.innerHTML = "message:\t" + message;
}

/**
 * 鸟的旋转速度的配置信息
 *
 * @type {number}
 */
var ANGLE_STEP = 90;   // The increments of rotation angle (degrees)
var currentAngle = 0;
var last = Date.now(); // Last time that this function was called

/**
 * 更新鸟的旋转角度
 *
 * @param angle
 * @returns {number}
 */
function animate(angle) {
    var now = Date.now();   // Calculate the elapsed time
    var elapsed = now - last;
    last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}
