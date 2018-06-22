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

    'uniform mat4 u_MvpMatrixFromLight;\n' +
    'varying vec4 v_PositionFromLight;\n' +
    'void main() {\n' +
    '  float Kd = 0.4;\n' +
    '  float Ka = 0.4;\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  v_PositionFromLight = u_MvpMatrixFromLight * a_Position;\n' +
    '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
    '  vec3 diffuse = Kd * vec3(1.0, 1.0, 1.0) * nDotL;\n' +
    '  vec3 ambient = Ka * u_AmbientLight * vec3(1.0, 1.0, 1.0);\n' +

    '  v_Color = vec4(diffuse + ambient, a_Color.a);\n' +

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
    '' +
    'uniform sampler2D u_ShadowMap;\n' +
    'varying vec4 v_PositionFromLight;\n' +
    // 'varying float v_NdotL;\n' +
    'void main() {\n' +
    '  float fogFactor = (u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x);\n' +
    '  vec3 color = mix(u_FogColor, vec3(v_Color), clamp(fogFactor, 0.0, 1.0));\n' +
    '  float visibility = 1.0;\n' +
    // 影子
    // '  vec3 shadowCoord = vec3(v_PositionFromLight);\n'+
    '  vec3 shadowCoord = (v_PositionFromLight.xyz / v_PositionFromLight.w) / 2.0 + 0.5;\n' +
    '  vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);\n' +
    '  float depth = rgbaDepth.r;\n' + // Retrieve the z-value from R
    '  visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0;\n' +

    // 纹理与光照的结合
    // '  vec4 FragColor = vec4(' +
    // '                      * v_Color.rgb, v_Color.a);\n' +
    // '  gl_FragColor = vec4(0.0 * color + 0.5 * FragColor.rgb, FragColor.a);\n' +
    '  gl_FragColor = vec4((0.3 * texture2D(u_Sampler, v_TexCoord).rgb * v_Color.rgb + 0.7 * color) * visibility, v_Color.a);\n' +
    '}\n';
