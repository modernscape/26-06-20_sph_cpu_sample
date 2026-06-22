import * as THREE from "three"

// 1. シーンの作成
const scene = new THREE.Scene()

// 2. カメラの作成 (視野角, アスペクト比, 近接クリッピング, 遠方クリッピング)
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.z = 5

// 3. レンダラーの作成
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const geometry = new THREE.BufferGeometry()
const material = new THREE.RawShaderMaterial({
  uniforms: {},
  vertexShader: document.getElementById("vertexShader").textContent,
  fragmentShader: document.getElementById("fragmentShader").textContent,
})

const count = 1000
const positions = new Float32Array(count * 3)
const instancePositions = new Float32Array(count * 3)

for (let i = 0; i < count; i++) {
  positions[i * 3 + 0] = 0
  positions[i * 3 + 1] = 0
  positions[i * 3 + 2] = 0

  instancePositions[i * 3 + 0] = (Math.random() - 0.5) * 5 // -2.5 〜 2.5
  instancePositions[i * 3 + 1] = (Math.random() - 0.5) * 5
  instancePositions[i * 3 + 2] = (Math.random() - 0.5) * 5
}

// BufferAttributeとしてgeometryに登録
// setAttributeの名前を「instancePosition」にしてシェーダーと合わせる
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

geometry.setAttribute(
  "instancePosition",
  new THREE.BufferAttribute(instancePositions, 3),
)
// ※注意: インスタンス描画を使う場合は InstancedBufferAttribute を使うのがベストですが
// まずは「データがシェーダーに届くか」を確認するため、
// ここでは各頂点に instancePosition を割り当てる手法（または頂点ID）で進めます。

// 速度
const velocities = new Float32Array(count * 3)

const points = new THREE.Points(geometry, material)
scene.add(points)

// 5. アニメーションループ
function animate() {
  requestAnimationFrame(animate)

  // 速度
  const pos = geometry.attributes.instancePosition.array
  const gravity = -0.01

  for (let i = 0; i < count; i++) {
    velocities[i * 3 + 1] += gravity // y方向

    // if (pos[i * 3 + 1] > -2.5) {
    //   velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.1
    //   velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1
    // } else {
    //   velocities[i * 3 + 0] = 0
    //   velocities[i * 3 + 2] = 0
    // }

    pos[i * 3 + 0] += velocities[i * 3 + 0]
    pos[i * 3 + 1] += velocities[i * 3 + 1]
    pos[i * 3 + 1] += velocities[i * 3 + 2]

    if (pos[i * 3 + 1] < -2.5) {
      pos[i * 3 + 1] = -2.5
      velocities[i * 3 + 1] *= -0.5
    }
  }

  geometry.attributes.instancePosition.needsUpdate = true
  renderer.render(scene, camera)
}
animate()

// ウィンドウリサイズ対応
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
