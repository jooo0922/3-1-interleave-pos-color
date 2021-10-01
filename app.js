"use strict";

let gl, canvas, shaderProgram, triangleVertexBuffer;

function createContext(canvas) {
  const names = ["webgl", "experimental-webgl"];
  let context = null;

  for (let i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch (error) {}

    if (context) {
      break;
    }
  }

  if (context) {
  } else {
    alert("Failed to create WebGL context!");
  }

  return context;
}

function loadShaderFromDOM(id) {
  const shaderScript = document.getElementById(id);

  if (!shaderScript) {
    return null;
  }

  let shaderSource = "";
  let currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType === 3) {
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  let shader;
  if (shaderScript.type === "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else if (shaderScript.type === "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("Error compiling shader" + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function setupShaders() {
  const vertexShader = loadShaderFromDOM("shader-vs");
  const fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexPosition"
  );

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexColor"
  );

  // 이번 예제에서는 버텍스 셰이더의 각 attribute에 사용될 배열을 활성화해주는 작업을 setupShader() 함수에서 미리 해줌.
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
}

function setupBuffers(params) {
  triangleVertexBuffer = gl.createBuffer(); // WebGLBuffer를 생성함.
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
  const triangleVertices = [
    // 각 버텍스마다 (x y z) (r g b a) 이런 식으로 반복 작성하는 게 직관적으로 코드를 이해하기 좋음.
    // --------------------------------------
    0.0,
    0.5,
    0.0,
    255,
    0,
    0,
    255, // V0
    0.5,
    -0.5,
    0.0,
    0,
    250,
    6,
    255, // V1
    -0.5,
    -0.5,
    0.0,
    0,
    0,
    255,
    255, // V2
  ];

  const nbrOfVertices = 3; // 전체 버텍스 개수는 3개
  const vertexSizeInBytes =
    3 * Float32Array.BYTES_PER_ELEMENT + 4 * Uint8Array.BYTES_PER_ELEMENT;
  /**
   * vertexSizeInBytes 는 하나의 버텍스를
   * 이후에 생성할 ArrayBuffer(const buffer)에 바이너리로 저장할 때 필요한
   * 전체 바이트 수를 계산한 것.
   *
   * ArrayBuffer의 크기값을 계산할 때, for 반복문을 돌릴 때 사용할거임.
   *
   * 하나의 Float32Array(부동소수점 표현 구조는 인터넷 검색!) = 32bit = 4byte 로 표현되고,
   * Uint8Array = 8bit = 1byte로 표현되므로,
   * 3 * 4 + 4 * 1 = 16byte임. 즉 버텍스 하나에 필요한 데이터들을 바이너리로 저장할 때 16바이트가 필요하다는 뜻.
   */

  const vertexSizeInFloats = vertexSizeInBytes / Float32Array.BYTES_PER_ELEMENT;
  /**
   * 이거는 뭐냐면
   *
   * Float32Array 뷰 타입을 기준으로 ArrayBuffer 전체 용량을 칸 수로 나눴을 때
   * 48바이트 / 4바이트 = 12칸이 나오는데,
   *
   * 여기서 버텍스 전체의 사이즈인 16바이트는 몇 칸에 해당하는지를 구한거임.
   * 마찬가지로 16바이트 / 4바이트 나눠주면 4칸이 나오니까 4가 들어가게 됨.
   *
   * 이 값을 왜 구해줬냐면 아래의 for 반복문에서
   * Float32Array 뷰 타입을 기준으로 ArrayBuffer에 접근할 때,
   * ArrayBuffer의 몇 번째 칸에 넣어줄 것인지 그 인덱스값을 구할 때 사용하려는 것!
   */

  const buffer = new ArrayBuffer(nbrOfVertices * vertexSizeInBytes); // 3 * 16 = 48바이트 사이즈의 실제 버텍스 데이터를 저장할 ArrayBuffer를 직접 만들어서 메모리를 할당함.

  // 하나의 ArrayBuffer에 대해 두 개의 뷰 타입을 각각 생성함. 관련 내용 p.146 ~ p.147 참고
  const positionView = new Float32Array(buffer);
  const colorView = new Uint8Array(buffer);

  let positionOffsetInFloats = 0; // Float32Array 뷰 타입을 기준으로 ArrayBuffer에 접근할 때 사용할 인덱스값(칸 수)
  let colorOffsetInBytes = 12; // Uinf8Array 뷰 타입을 기준으로 ArrayBuffer에 접근할 때 사용할 인덱스값(칸 수)
  let k = 0; // 일반 자바스크립트 배열인 triangleVertices에 접근할 때 사용할 인덱스값
  for (let i = 0; i < nbrOfVertices; i++) {
    /**
     * 총 버텍스 개수(3개)만큼 반복문을 돌리면서
     * 두 개의 뷰타입을 기준으로 ArrayBuffer에 접근해서
     * 알맞은 인덱스 자리에 triangleVertices의 요소 값들을 복사하여 넣어줌. p.166 참고
     */
    positionView[positionOffsetInFloats] = triangleVertices[k]; // x좌표값을 넣어줌.
    positionView[positionOffsetInFloats + 1] = triangleVertices[k + 1]; // y좌표값을 넣어줌.
    positionView[positionOffsetInFloats + 2] = triangleVertices[k + 2]; // z좌표값을 넣어줌.
    colorView[colorOffsetInBytes] = triangleVertices[k + 3]; // r 색상값을 넣어줌.
    colorView[colorOffsetInBytes + 1] = triangleVertices[k + 4]; // g 색상값을 넣어줌.
    colorView[colorOffsetInBytes + 2] = triangleVertices[k + 5]; // b 색상값을 넣어줌.
    colorView[colorOffsetInBytes + 3] = triangleVertices[k + 6]; // a 색상값을 넣어줌.
    positionOffsetInFloats += vertexSizeInFloats; // Float32Array 뷰타입 기준 하나의 버텍스 데이터가 4칸을 차지하니까, 다음 반복문(버텍스)으로 넘어가려면 += 4칸 해준 것.
    colorOffsetInBytes += vertexSizeInBytes; // Uint8Array 뷰타입 기준 하나의 버텍스 데이터가 12칸을 차지하니까, 다음 반복문(버텍스)으로 넘어가려면 += 12칸 해준 것.
    k += 7; // triangleVertices에서 하나의 버텍스마다 7개의 데이터가 들어있으니, 다음 반복문(버텍스)로 넘어가려면 += 7 해준 것.
  }
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW); // 바인딩된 버퍼에 ArrayBuffer 에 기록된 버텍스 데이터를 기록해 줌.
  triangleVertexBuffer.positionSize = 3;
  triangleVertexBuffer.colorSize = 4; // 각각의 attribute 별로 몇 개의 원소가 필요한 지 WebGLBuffer의 커스텀 프로퍼티에 저장함.
  triangleVertexBuffer.numberOfItems = 3; // 버텍스의 전체 개수도 WebGLBuffer의 커스텀 프로퍼티에 저장함.
}

function draw() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer); // WebGLBuffer와 버텍스 데이터가 기록된 ArrayBuffer를 다시 바인딩해줌

  // vertexShader의 aVertexPosition attribute가 WebGLBuffer에 바인딩되어 기록된 버텍스 데이터들을 어떻게 가져올건지 방법을 지정함.
  // 각 인자에 대한 설명은 p.167에 아주 자세히 나와있음!
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    triangleVertexBuffer.positionSize,
    gl.FLOAT,
    false,
    16,
    0
  );

  // vertexShader의 aVertexColor attribute가 WebGLBuffer에 바인딩되어 기록된 버텍스 데이터들을 어떻게 가져올건지 방법을 지정함.
  // 마찬가지로 p.167에 설명이 아주 잘 되어있음
  gl.vertexAttribPointer(
    shaderProgram.vertexColorAttribute,
    triangleVertexBuffer.colorSize,
    gl.UNSIGNED_BYTE,
    true, // 3번째 인자가 gl.FLOAT이 아니면 무조건 true로 넣어준다고 생각하면 됨.
    16,
    12
  );

  gl.drawArrays(gl.TRIANGLES, 0, triangleVertexBuffer.numberOfItems); // gl.drawArrays() 메서드로 버텍스를 중복사용하지 않는 독립 삼각형을 그려줌. 자세한 내용은 p.137
}

function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = WebGLDebugUtils.makeDebugContext(createContext(canvas));
  setupShaders();
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // 캔버스의 모든 픽셀을 gl.clear()로 채울 때의 색상을 지정함. white 컬러로 나오겠군
  draw();
}

/**
 * 성능 향상을 위한 버텍스 데이터 끼워넣기
 *
 * 버텍스 데이터를 집어넣는 WebGLBuffer 객체에는 버텍스들의 좌표 정보만 들어가는 게 아님.
 * 노말, 색상, 텍스처 좌표 등 각각의 버텍스별로 다양한 데이터들이 필요하게 됨.
 *
 * 이 데이터들을 각각의 배열로 구분해서 저정하는 structure of arrays 방식이 있는가 하면,
 * 하나의 배열안에 다 끼워넣어 버리는 array of structures 방식이 있다.
 *
 * 성능 관점에서 보면 하나의 배열에 다 끼워넣는 array of structures 방식이
 * 버텍스 데이터의 메모리 지역성을 높일 수 있어서 더 좋다.
 *
 *
 *
 * 이번 예제에서는 setupBuffers() 함수에서 버텍스 데이터 끼워넣기를 구현해놓았고,
 * 아래는 관련 중요 내용들을 정리한 것이다.
 *
 *
 * 1. 처음 일반 자바스크립트 배열에 버텍스 데이터들을 저장할 때,
 * triangleVertices 에 작성한 것처럼 (x y z) (r g b a) 이런 식으로
 * 각 버텍스마다 위치 데이터 다음 색상 데이터를 끼워넣는 식으로 반복하여 작성해준다.
 *
 *
 * 2. 이전 예제에서는 바인딩된 WebGLBuffer에 버텍스 데이터를 기록할 때
 * 그냥 타입배열(형식화배열)에 버텍스 데이터 배열을 전달하면서 기록해 버렸는데,
 * 지금은 버텍스 데이터 배열(triangleVertices)에 담긴 요소들의 데이터 타입이 다르기 때문에
 * (왜 다르냐? 위치값은 -1.0 ~ 1.0 사이의 실수값으로 표현되고,
 * 색상값은 0 ~ 255 사이의 부호없는 정수값으로 표현되니까
 * 이거를 바이너리 데이터로 변경할 때 사용할 뷰 타입도 달라져야 함!)
 * 아래와 같은 순서로 버텍스 데이터를 버퍼에 기록해줘야 한다.
 *
 * -ArrayBuffer 하나를 직접 생성하고, (이때 ArrayBuffer의 크기도 미리 직접 계산해놔야 함.)
 * -해당 ArrayBuffer에 두 개의 뷰 타입(Float32Array, Uint8Array)들을 각각 생성하여 맵핑한 뒤,
 * -for 반복문을 돌면서 ArrayBuffer의 각 자리에 알맞게 버텍스 데이터 배열(triangleVertices)의 요소들을 넣어줘야 함.
 */

/**
 * gl.bindBuffer(gl.ARRAY_BUFFER, WebGLBuffer)
 *
 * 여기서 gl.ARRAY_BUFFER라는 GLenum은 왜 넣는걸까?
 * 왜 하필 저게 target 인자로 들어가는걸까?
 *
 * 왜 그러냐면, 먼저 자바스크립트 배열로 정리된 버텍스 데이터들은
 * 바이너리 데이터로 변환된 상태로 버퍼에 기록되어야 하는데,
 *
 * 이전 예제에서도 봐왔지만 바이너리 데이터로 변환할 때 뭘 썼지?
 * Float32Array(버텍스 데이터 배열)
 * 이런 식으로 타입 배열(형식화 배열) 형태의 뷰 타입을 생성하는 식이었지.
 *
 * 이때, 책 p.146 ~ p.147의 '버퍼와 뷰' 관련 내용에 잘 정리가 되어있는 부분인데,
 * 바이너리 데이터를 다루는 타입 배열은 '버퍼' + '버퍼에 대한 하나 이상의 뷰 타입' 을
 * 개념적으로 가지고 있다고 보면 됨.
 *
 * 그니까, 뷰 타입만으로 일반 배열을 타입 배열로 변환하는 과정에서
 * 모든 뷰 타입 객체들의 생성자는
 * '전달받은 버텍스 데이터 배열을 수용할 수 있는 크기의 ArrayBuffer를 자동으로 생성'
 * 한다는 걸 반드시 명심해야 함!
 *
 * 즉, 이번 예제처럼 특수한 케이스로 인해 ArrayBuffer를 따로 만들건,
 * 아니면 이전 예제처럼 뷰 타입 객체를 생성하면서 ArrayBuffer가 자동으로 생성되건,
 *
 * 우리는 ArrayBuffer를 만든 뒤,
 * 인자로 받은 일반 배열의 버텍스 데이터를 바이너리 데이터로 변한해서 ArrayBuffer에 기록하기 때문에,
 * WebGLBuffer를 ArrayBuffer에 바인딩해줘야 하는 것이고, (바인딩되면 데이터가 동시에 기록되니까)
 * 그것을 바인딩 해줄 때 사용하는 GLEnum이 gl.ARRAY_BUFFER가 되는거임.
 */

/**
 * gl.drawArrays()
 *
 * 이 메서드에서
 * 세 번째 인자는 총 몇개의 버텍스가 사용되는지,
 * 두 번째 인자는 모든 버텍스들 중에서 몇 번째 버텍스를 첫 번째로 사용할건지를 정해줌.
 *
 * 자세한 내용은 p.137
 */
