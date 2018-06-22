window.addEventListener("load", main, false);
document.onkeydown = function (evt) {

    keyDownEvent(evt);
};
document.onkeyup = function (evt) {
    if (evt.keyCode !== 70) {
        nums = 0;

    }
    if (evt.keyCode === 70)
        usingPointLight = false;
};




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
    initProgram(gl);

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


    tick = function () {
        currentAngle = animate(currentAngle);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
        deltaViewProjMatrix(deltaEye, deltaAt, deltaUp);
        renderScene(gl);
        drawTexture(gl, texProgram, box, boxTexture);
        drawTexture(gl, texProgram, floor, floorTexture);
        window.requestAnimationFrame(tick);
    };
    tick();
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
