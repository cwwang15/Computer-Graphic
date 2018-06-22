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
    // 'uniform vec4 u_Eye;\n' +
    'varying float v_Dist;\n' +
    // TODO 影子
    'uniform mat4 u_MvpMatrixFromLight;\n' +
    'varying vec4 v_PositionFromLight;\n' +
    // Phong
    'uniform mat4 u_ModelViewMatrix;\n' +
    'varying vec3 v_VertPos;\n' +

    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  vec4 vertPos4 = u_ModelViewMatrix * a_Position;\n' +
    '  v_VertPos = vec3(vertPos4) / vertPos4.w;\n' +
    '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
    // 影子
    '  v_PositionFromLight = u_MvpMatrixFromLight * a_Position;\n' +
    // '  vec3 lightDirection = normalize(u_LightPosition - vec3(vertexPosition));\n' +
    '  v_Normal = vec3(u_NormalMatrix * a_Normal);\n' +
    '  v_Color = a_Color;\n' +
    '  v_Dist = gl_Position.w;\n' +
    // '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
    // '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
    // '  vec3 diffuse = a_Color.rgb * nDotL;\n' +
    // '  if (u_UsingPointLight) {' +
    // '    float cos = max(dot(lightDirection, normal), 0.0);\n' +
    // '    vec3 diffuse2 = u_LightColor * a_Color.rgb * cos;\n' +
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
    // DONE! 雾
    'uniform vec3 u_FogColor;\n' +
    'uniform vec2 u_FogDist;\n' +
    'varying float v_Dist;\n' +
    'uniform sampler2D u_ShadowMap;\n' +
    'varying vec4 v_PositionFromLight;\n' +
    // DONE! phong
    'uniform vec3 u_PhongLightPosition;\n' +
    // 'uniform mat4 u_PhongViewMatrix;\n' +
    '' +
    'varying vec3 v_VertPos;\n' +

    'void main() {\n' +
    '  float Ka = 0.1;\n' +
    '  float Kdp = 0.4;\n' +
    '  float Kdd = 0.4;\n' +
    '  float Ks = 0.4;\n' +
    '  float Kf = 0.7;\n' +
    '  vec3 normal = normalize(v_Normal);\n' +
    '  vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
    '  float pointLightDist = length(u_LightPosition - v_Position);\n' +
    '  float cos = max(dot(lightDirection, normal), 0.0);\n' +
    '  float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);\n' +
    '  vec3 color = Kf * mix(u_FogColor, vec3(v_Color), fogFactor);\n' +

    '  float specular = 0.0;\n' +
    '  vec3 L = normalize(u_PhongLightPosition - v_VertPos);\n' +
    '  float lambertian = max(dot(normal, L), 0.0);\n' +
    '  if (lambertian > 0.0) {\n' +
    '    vec3 R = reflect(-L, normal);\n' +
    '    vec3 V = normalize(-v_VertPos);\n' +
    '    float angle = max(dot(R, V), 0.0);\n' +
    '    specular = pow(angle, 120.0);\n' +
    '  }\n' +

    '  vec3 ambient = Ka * u_AmbientLight * v_Color.rgb;\n' +
    '  float nDotL = max(dot(u_DirectionLight, normal), 0.0);\n' +
    '  vec3 diffuseDirection = Kdd * v_Color.rgb * lambertian;\n' +
    '  float visibility = 1.0;\n' +
    // 影子
    // '  vec3 shadowCoord = vec3(v_PositionFromLight);\n'+
    '  vec3 shadowCoord = (v_PositionFromLight.xyz / v_PositionFromLight.w) / 2.0 + 0.5;\n' +
    '  vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);\n' +
    '  float depth = rgbaDepth.r;\n' + // Retrieve the z-value from R
    '  visibility = (shadowCoord.z > depth + 0.005) ? 0.3 : 1.0;\n' +
    // 点光源
    '  if (u_UsingPointLight) {\n' +
    '    visibility = 0.4;\n' +
    '    vec3 diffusePoint = Kdp / (0.01 * pow(pointLightDist, 2.0) + 0.01 * pointLightDist + 0.4) * u_LightColor * v_Color.rgb * cos;\n' +
    '    gl_FragColor = vec4((diffusePoint + specular + diffuseDirection + ambient + color)*visibility , v_Color.a);\n' +
    '  }\n' +
    '  else\n' +
    '    gl_FragColor = vec4((ambient + color + diffuseDirection +  specular) * visibility, v_Color.a);\n' +
    // '  gl_FragColor = vec4(color, v_Color.a);\n'+
    '}\n';
