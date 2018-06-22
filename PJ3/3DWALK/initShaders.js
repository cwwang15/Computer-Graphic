/**
 * 创建 program，包括 texture, object, shadow
 * @param gl 传入 gl
 */
function initProgram(gl) {

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
    if (texProgram.a_Position < 0 || texProgram.a_TexCoord < 0 ||
        !texProgram.u_MvpMatrix || !texProgram.u_Sampler ||
        !texProgram.a_Color ||
        !texProgram.a_Normal || !texProgram.u_DirectionLight ||
        !texProgram.u_NormalMatrix || !texProgram.u_AmbientLight ||
        !texProgram.u_FogColor || !texProgram.u_FogDist ||
        !texProgram.u_ShadowMap || !texProgram.u_MvpMatrixFromLight) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return -1;
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
        return -1;
    }
}
