/**
 *
 * @param gl gl上下文
 * @param program 纹理program
 * @param texEntity 要添加纹理的实体
 * @param texture 纹理
 */
function drawTexture(gl, program, texEntity, texture) {
    gl.useProgram(program);   // Tell that this program object is used
    gl.uniform1i(program.u_ShadowMap, 2);
    // gl.uniform3f(program.u_LightColor, 1.0, 1.0, 1.0);
    gl.uniform3f(program.u_DirectionLight, dLight[0], dLight[1], dLight[2]);
    gl.uniform3f(program.u_AmbientLight, aLight[0], aLight[1], aLight[2]);
    gl.uniform3fv(program.u_FogColor, fogColor);
    gl.uniform2fv(program.u_FogDist, fogDist);

    // Assign the buffer objects and enable the assignment
    initAttributeVariable(gl, program.a_Position, texEntity.vertexBuffer);  // Vertex coordinates
    // initAttributeVariable(gl, program.a_Normal, o.normalBuffer);    // Normal
    initAttributeVariable(gl, program.a_TexCoord, texEntity.texCoordBuffer);// Texture coordinates
    initAttributeVariable(gl, program.a_Normal, texEntity.normalBuffer);
    // initAttributeVariable(gl, program.a_Normal, texEntity.normals);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, texEntity.indexBuffer); // Bind indices

    // Bind texture object to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var g_modelMatrix = new Matrix4();
    var g_mvpMatrix = new Matrix4();
    var mvpMatrixFromLight = new Matrix4();
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
    var normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(g_modelMatrix);
    normalMatrix.transpose();

    mvpMatrixFromLight.set(viewProjMatrix).multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrixFromLight, false, mvpMatrixFromLight.elements);
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, texEntity.numIndices, texEntity.indexBuffer.type, 0);   // Draw
}


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
    var normals = new Float32Array(target.normals);
    // var normals = new Float32Array()
    var texObj = {}; // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    texObj.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    // o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    texObj.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    texObj.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    texObj.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    // texObj.normals = initArrayBufferForLaterUse(gl, )
    if (!texObj.vertexBuffer || !texObj.texCoordBuffer || !texObj.indexBuffer || !texObj.normalBuffer) return null;

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