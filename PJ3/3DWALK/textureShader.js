// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec2 a_TexCoord;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'varying vec2 v_TexCoord;\n' +

    'attribute vec4 a_Color;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'attribute vec4 a_Normal;\n' +
    // 'uniform vec3 u_LightColor;\n' +
    'uniform vec3 u_DirectionLight;\n' +
    'uniform vec3 u_AmbientLight;\n' +
    'varying vec4 v_Color;\n' +
    // 雾
    'varying float v_Dist;\n' +

    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
    '  vec3 diffuse = a_Color.rgb * nDotL;\n' +
    '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +

    '  v_Color = vec4(vec3(0.6, 0.1, 0.1) +diffuse + ambient, a_Color.a);\n' +

    '  v_TexCoord = a_TexCoord;\n' +
    '  v_Dist = gl_Position.w;\n' +
    '}\n';

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform sampler2D u_Sampler;\n' +
    'varying vec2 v_TexCoord;\n' +
    'varying vec4 v_Color;\n' +
    'uniform vec3 u_FogColor;\n' +
    'uniform vec2 u_FogDist;\n' +
    'varying float v_Dist;\n' +
    // 'varying float v_NdotL;\n' +
    'void main() {\n' +
    '  float fogFactor = (u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x);\n' +
    '  vec3 color = mix(u_FogColor, vec3(v_Color), clamp(fogFactor, 0.0, 1.0));\n' +

    '  vec4 FragColor = vec4(texture2D(u_Sampler, vec2(v_TexCoord.s, v_TexCoord.t)).rgb' +
    '                      * v_Color.rgb, v_Color.a);\n' +
    '  gl_FragColor = vec4(0.9 * color + 0.1* FragColor.rgb, FragColor.a);\n' +
    '}\n';
