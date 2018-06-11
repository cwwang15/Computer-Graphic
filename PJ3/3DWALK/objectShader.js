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
    '    gl_FragColor = vec4((0.5 * diffusePoint + mix(diffuseDirection + ambient , color, 0.5))*visibility , v_Color.a);\n' +
    '  }\n' +
    '  else\n' +
    '    gl_FragColor = vec4(mix(ambient + diffuseDirection, color, 0.9), v_Color.a);\n' +
    // '  gl_FragColor = vec4(color, v_Color.a);\n'+
    '}\n';
