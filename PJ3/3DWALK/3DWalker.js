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

var fov;
var near;
var far;
var aspect;
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);

var viewProjMatrix = new Matrix4();

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
        /*
         * view 与 project 放一起了
         */
        viewProjMatrix.setPerspective(fov, aspect, near, far);
        viewProjMatrix.lookAt(eye.elements[0], eye.elements[1], eye.elements[2],
            at.elements[0], at.elements[1], at.elements[2],
            up.elements[0], up.elements[1], up.elements[2]);
    }

    // Initialize shaders
    var texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);

    texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
    texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
    texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
    texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');

    if (texProgram.a_Position < 0 || texProgram.a_TexCoord < 0 ||
        !texProgram.u_MvpMatrix || !texProgram.u_Sampler) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return;
    }

    // Set the vertex information
    var box = initVertexBuffers(gl, boxRes);
    if (!box) {
        console.log('Failed to set the vertex information');
        return;
    }
    var floor = initVertexBuffers(gl, floorRes);
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

    // Set the clear color and enable the depth test
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);

    // Calculate the view projection matrix


    // Start drawing
    var currentAngle = 0.0; // Current rotation angle (degrees)
    var tick = function () {
        // currentAngle = animate(currentAngle);  // Update current rotation angle

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
        drawTexture(gl, texProgram, box, boxTexture);
        drawTexture(gl, texProgram, floor, floorTexture);
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

function initVertexBuffers(gl, target) {

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

function printMessage(message) {
    var mb = document.getElementById("messageBox");
    mb.innerHTML = "message:\t" + message;
}

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

    g_mvpMatrix.set(viewProjMatrix);
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
