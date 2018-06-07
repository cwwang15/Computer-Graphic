window.addEventListener("load", main, false);
// ProgramObject.js (c) 2012 matsuda and kanda
// Vertex shader for single color drawing

// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec2 a_TexCoord;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'varying vec2 v_TexCoord;\n' +
    'uniform mat4 u_ModelMatrix;\n' +

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

var OBJECT_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec4 a_Normal;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    // 'uniform bool u_UsingPointLight;\n' +
    // 点光源
    // 'uniform vec3 u_LightColor;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    // 'uniform vec3 u_LightPosition;\n' +
    // Ambient light color 环境光还要加上，点光源也要加上，还有颜色
    // 'uniform vec3 u_AmbientLight;\n' +

    // 'uniform vec3 u_DirectionLight;\n' +

    // 逐片元着色
    'varying vec4 v_Color;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +
    // 雾化效果
    'uniform vec4 u_Eye;\n' +
    'varying float v_Dist;\n' +
    // 影子
    'uniform mat4 u_MvpMatrixFromLight;\n' +
    'varying vec4 v_PositionFromLight;\n' +
    '' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
    // 影子
    '  v_PositionFromLight = u_MvpMatrixFromLight * a_Position;\n' +
    // '  vec3 lightDirection = normalize(u_LightPosition - vec3(vertexPosition));\n' +
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  v_Color = a_Color;\n' +
    '  v_Dist = gl_Position.w;\n' +
    // '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
    // '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
    // '  vec3 diffuse = a_Color.rgb * nDotL;\n' +
    // '  if (u_UsingPointLight) {' +
    // '    float cos = max(dot(lightDirection, normal), 0.0);\n' +
    // '    vec3 diffuse2 = u_LightColor * a_Color.rgb * cos;\n' +
    // TODO 这里有些不好的地方
    // '    v_Color = vec4(ambient*diffuse2+diffuse, a_Color.a);\n' +
    // '  }\n' +
    // '  else' +
    // '    v_Color = vec4(ambient+diffuse, a_Color.a);\n' +
    '}\n';


var OBJECT_FSHADER_SOURCE =

    'precision mediump float;\n' +
    'uniform bool u_UsingPointLight;\n' +
    'uniform vec3 u_LightColor;\n' +
    'uniform vec3 u_LightPosition;\n' +
    'uniform vec3 u_AmbientLight;\n' +
    'uniform vec3 u_DirectionLight;\n' +
    'varying vec3 v_Normal;\n' +
    'varying vec3 v_Position;\n' +
    //'#endif\n' +
    'varying vec4 v_Color;\n' +
    // 雾
    'uniform vec3 u_FogColor;\n' +
    'uniform vec2 u_FogDist;\n' +
    'varying float v_Dist;\n' +
    // 影子
    'uniform sampler2D u_ShadowMap;\n' +
    'varying vec4 v_PositionFromLight;\n' +
    'void main() {\n' +
    '  vec3 normal = normalize(v_Normal);\n' +
    '  vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
    '  float cos = max(dot(lightDirection, normal), 0.0);\n' +
    '  float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);\n' +
    '  vec3 color = mix(u_FogColor, vec3(v_Color), fogFactor);\n' +

    '  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
    '  float nDotL = max(dot(u_DirectionLight, normal), 0.0);\n' +
    '  vec3 diffuseDirection = v_Color.rgb * nDotL;\n' +
    '  float visibility = 1.0;\n' +
    // 影子
    // '  vec3 shadowCoord = vec3(v_PositionFromLight);\n'+

    // 点光源
    '  if (u_UsingPointLight) {\n' +
    '    vec3 shadowCoord = (v_PositionFromLight.xyz / v_PositionFromLight.w) / 2.0 + 0.5;\n' +
    '    vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);\n' +
    '    float depth = rgbaDepth.r;\n' + // Retrieve the z-value from R
    '    visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0;\n' +

    '    vec3 diffusePoint = u_LightColor * v_Color.rgb * cos;\n' +
    '    gl_FragColor = vec4((ambient + color + mix(diffuseDirection,diffusePoint, 0.5))*visibility , v_Color.a);\n' +
    '  }\n' +
    '  else\n' +
    '    gl_FragColor = vec4(mix(ambient + diffuseDirection, color, 0.9), v_Color.a);\n' +
    // '  gl_FragColor = vec4(color, v_Color.a);\n'+
    '}\n';


var fov;
var near;
var far;
var aspect;
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);

var fogColor = new Float32Array([0.137, .231, .423]);
var fogDist = new Float32Array([0, 30]);


var viewProjMatrix = new Matrix4();
var viewProjMatrixFromLight = new Matrix4();
var OFFSCREEN_WIDTH = 2048, OFFSCREEN_HEIGHT = 2048;
var aspectFromLight = OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT;
var fovFromLight = 80;

var objProgram;
var texProgram;
var shadowProgram;

//帧缓冲
var fbo;

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
var usingPointLight = false;
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

    // 点光源
    objProgram.u_UsingPointLight = gl.getUniformLocation(objProgram, 'u_UsingPointLight');
    objProgram.u_LightColor = gl.getUniformLocation(objProgram, 'u_LightColor');
    objProgram.u_LightPosition = gl.getUniformLocation(objProgram, 'u_LightPosition');
    objProgram.u_ModelMatrix = gl.getUniformLocation(objProgram, 'u_ModelMatrix');
    // 雾
    objProgram.u_Eye = gl.getUniformLocation(objProgram, 'u_Eye');
    objProgram.u_FogColor = gl.getUniformLocation(objProgram, 'u_FogColor');
    objProgram.u_FogDist = gl.getUniformLocation(objProgram, 'u_FogDist');
    // 影子
    objProgram.u_MvpMatrixFromLight = gl.getUniformLocation(objProgram, 'u_MvpMatrixFromLight');
    objProgram.u_ShadowMap = gl.getUniformLocation(objProgram, 'u_ShadowMap');
    // printMessage(!objProgram.u_AmbientLight);
    if (objProgram.a_Position < 0 || objProgram.a_Color < 0 || objProgram.a_Normal < 0
        || !objProgram.u_MvpMatrix || !objProgram.u_NormalMatrix || !objProgram.u_DirectionLight
        || !objProgram.u_AmbientLight
        || !objProgram.u_UsingPointLight || !objProgram.u_LightColor || !objProgram.u_LightPosition
        || !objProgram.u_ModelMatrix
        || !objProgram.u_ShadowMap || !objProgram.u_MvpMatrixFromLight) {
        console.log('obj : Failed to get the storage location of attribute or uniform variable');
        return;
    }
    /*********************obj文件创建program 代码end ****************************/

    fbo = initFramebufferObject(gl);
    if (!fbo) {
        console.log('Failed to initialize frame buffer object');
        return;
    }
    gl.activeTexture(gl.TEXTURE2); // Set a texture object to the texture unit
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);


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
    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);

    // Calculate the view projection matrix

    document.onkeydown = function (evt) {

        keyDownEvent(evt);
        // printMessage(eye.elements[0]);
    };
    document.onkeyup = function (evt) {
        if (evt.keyCode !== 70) {
            nums = 0;

        }
        usingPointLight = false;
    };
    // document.onkeyup = function (evt) {
    //     nums = 3;
    // printMessage('h');
    // };
    /*
     * TODO 动画与其它
     */
    // Start drawing
    // var currentAngle = 0.0; // Current rotation angle (degrees)

    tick = function () {
        // currentAngle = animate(currentAngle);  // Update current rotation angle
        currentAngle = animate(currentAngle);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
        if (usingPointLight) {
            drawTexture(gl, texProgram, box, boxTexture);
            drawTexture(gl, texProgram, floor, floorTexture);
        }

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


var deltaEye;
var deltaAt;
var deltaUp = zero;
var nums;
// 每60帧移动MOVE_VELOCITY，据说requestAnimationFrame是每秒60帧
var move_velocity = MOVE_VELOCITY / 60.0;
var rot_velocity = ROT_VELOCITY / 120.0;
var cos = Math.cos(rot_velocity);
var sin = Math.sin(rot_velocity);

/**
 *
 * @param evt 响应键盘事件
 */
function keyDownEvent(evt) {
    // printMessage(move);
    if (evt.keyCode === 38) {
        fogDist[1] += 1;
    } else if (evt.keyCode === 40) {
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

function changeViewProjMatrix() {
    /*
     * view 与 project 放一起了
     */
    viewProjMatrix.setPerspective(fov, aspect, near, far);
    viewProjMatrix.lookAt(eye.elements[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        up.elements[0], up.elements[1], up.elements[2]);
    viewProjMatrixFromLight.setPerspective(fovFromLight, aspectFromLight, near, far);
    viewProjMatrixFromLight.lookAt(eye.elements[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        up.elements[0], up.elements[1], up.elements[2]);
    pLight = eye.elements;
}

/**##########################跟纹理有关的   start##################################/
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
    // var normals = new Float32Array()
    var texObj = {}; // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    texObj.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    // o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    texObj.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    texObj.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    // texObj.normals = initArrayBufferForLaterUse(gl, )
    if (!texObj.vertexBuffer || !texObj.texCoordBuffer || !texObj.indexBuffer) return null;

    texObj.numIndices = indices.length;
    texObj.texImagePath = target.texImagePath;
    texObj.scale = target.scale;
    texObj.translate = target.translate;
    // texObj.normals = target.normals;
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
    // initAttributeVariable(gl, program.a_Normal, texEntity.normals);
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

/**##############################跟纹理有关的 end ###################################*/


/**^^^^^^^^^^^^^^^^^^^^^^^^^^跟Obj模型有关的 start ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/
function renderScene(gl) {

    gl.useProgram(objProgram);
    var modelMatrix = new Matrix4();
    var normalMatrix = new Matrix4();
    var mvpMatrix = new Matrix4();
    var mvpMatrixFromLight = new Matrix4();
    // var mvpMatrixFromLight_p = new Matrix4();
    gl.uniform3f(objProgram.u_DirectionLight, dLight[0], dLight[1], dLight[2]);
    gl.uniform3f(objProgram.u_AmbientLight, aLight[0], aLight[1], aLight[2]);
    gl.uniform1i(objProgram.u_UsingPointLight, usingPointLight);
    gl.uniform3f(objProgram.u_LightColor, pLightColor[0], pLight[1], pLightColor[2]);
    gl.uniform3fv(objProgram.u_FogColor, fogColor);
    gl.uniform2fv(objProgram.u_FogDist, fogDist);
    gl.uniform4fv(objProgram.u_Eye, new Float32Array(eye.elements));
    // console.log(pLightColor);
    gl.uniform3f(objProgram.u_LightPosition, eye.elements[0], eye.elements[1], eye.elements[2]);
    for (var i = 0, num = sceneObjList.length; i < num; i++) {

        // gl.uniform1i(objProgram.u_ShadowMap, 2);

        var so = sceneObjList[i];
        if (so.objDoc != null && so.objDoc.isMTLComplete()) { // OBJ and all MTLs are available
            so.drawingInfo = onReadComplete(gl, so.model, so.objDoc);
            sceneObjList[i].objname = so.objDoc.objects[0].name;
            so.objname = so.objDoc.objects[0].name;
            so.objDoc = null;
            // console.log(so.objname === 'bird');
        }
        if (so.drawingInfo) {
            modelMatrix.setIdentity();
            manipulateObj(so.transform, modelMatrix, so.objname);
            gl.uniformMatrix4fv(objProgram.u_ModelMatrix, false, modelMatrix.elements);

            mvpMatrix.set(viewProjMatrix).multiply(modelMatrix);
            gl.uniformMatrix4fv(objProgram.u_MvpMatrix, false, mvpMatrix.elements);

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
 * 对obj进行转换
 * @param op          一个数组，记录要执行什么操作
 * @param modelMatrix 被操作的矩阵
 * @param name
 */
var test = 0;

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
    // console.log('drawingInfo.colors: ' + drawingInfo.colors);
    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
}

function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    var error = function () {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    };

    // Create a framebuffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    framebuffer.texture = texture; // keep the required object

    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return framebuffer;
}

/**^^^^^^^^^^^^^^^^^^^^^^^^^^跟Obj模型有关的 end ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/

function printMessage(message) {
    var mb = document.getElementById("messageBox");
    mb.innerHTML = "message:\t" + message;
}

var ANGLE_STEP = 90;   // The increments of rotation angle (degrees)
var currentAngle = 0;
var last = Date.now(); // Last time that this function was called
function animate(angle) {
    var now = Date.now();   // Calculate the elapsed time
    var elapsed = now - last;
    last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}
