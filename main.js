import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// 1. シーンの作成
const scene = new THREE.Scene()

// 2. カメラの作成 (視野角, アスペクト比, 近接クリッピング, 遠方クリッピング)
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.y = 3
camera.position.z = 5

// 3. レンダラーの作成
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)

const geometry = new THREE.BufferGeometry()
const material = new THREE.RawShaderMaterial({
  uniforms: {},
  vertexShader: document.getElementById("vertexShader").textContent,
  fragmentShader: document.getElementById("fragmentShader").textContent,
})

const count = 2000
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

function calclatePressureForces() {
  const h = 0.5
  const restDensity = 0.5
  const stiffness = 0.1

  for (let i = 0; i < count; i++) {
    let density = 0.0 // 密度

    for (let j = 0; j < count; j++) {
      if (i === j) continue

      const dx = pos[i * 3 + 0] - pos[j * 3 + 0]
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
      const distSq = dx * dx + dy * dy + dz * dz

      if (distSq < h * h) {
        const dist = Math.sqrt(distSq)
        // density += 1.0 - dist / h //密度を累計
        const weight = 1.0 - dist / h
        density += weight * weight
      }

      const pressure = stiffness * (density - restDensity) // 圧力は密度に比例
    }
  }
}

const h = 0.5
const densities = new Float32Array(count)

// 5. アニメーションループ
function animate() {
  requestAnimationFrame(animate)

  function computeDensity() {
    const pos = geometry.attributes.instancePosition.array

    for (let i = 0; i < count; i++) {
      let d = 0
      for (let j = 0; j < count; j++) {
        const dx = pos[i * 3 + 0] - pos[j * 3 + 0]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < h * h) {
          const dist = Math.sqrt(distSq)
          d += 1.0 - dist / h //密度を累計
        }
      }
      densities[i] = Math.max(d, 0.0001)
    }
  }

  // 圧力の係数
  const stiffness = 0.02 // 20.0
  const restDensity = 5.0
  const viscosity = 0.05 //粘度
  let do_viscosity = true

  function applyPressureForces() {
    const pos = geometry.attributes.instancePosition.array
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        const dx = pos[i * 3 + 0] - pos[j * 3 + 0]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < h * h && distSq > 0.0001) {
          const dist = Math.sqrt(distSq)

          // 圧力
          const p_i = stiffness * (densities[i] - restDensity)
          const p_j = stiffness * (densities[j] - restDensity)

          // 圧力による力のベクトル（反発方向）
          const force = (p_i + p_j) / (2.0 * densities[i] * densities[j])

          // 速度に反映
          // const s = force * (1.0 - dist / h)
          const weight = 1.0 - dist / h
          const s = force * weight * weight
          const strength = Math.min(s, 0.5)

          velocities[i * 3 + 0] += (dx / dist) * strength * 0.1
          velocities[i * 3 + 1] += (dy / dist) * strength * 0.1
          velocities[i * 3 + 2] += (dz / dist) * strength * 0.1

          if (do_viscosity) {
            // 粘度
            const vdx = velocities[j * 3 + 0] - velocities[i * 3 + 0]
            const vdy = velocities[j * 3 + 1] - velocities[i * 3 + 1]
            const vdz = velocities[j * 3 + 2] - velocities[i * 3 + 2]

            // velocities[i * 3 + 0] += vdx * viscosity * (1.0 - dist / h)
            // velocities[i * 3 + 1] += vdy * viscosity * (1.0 - dist / h)
            // velocities[i * 3 + 2] += vdz * viscosity * (1.0 - dist / h)
            const weight = 1.0 - dist / h
            velocities[i * 3 + 0] += vdx * viscosity * weight * weight
            velocities[i * 3 + 1] += vdy * viscosity * weight * weight
            velocities[i * 3 + 2] += vdz * viscosity * weight * weight
          }
        }
      }
    }
  }

  computeDensity()
  applyPressureForces()

  const pos = geometry.attributes.instancePosition.array
  for (let i = 0; i < count; i++) {
    // 重力を追加
    velocities[i * 3 + 1] -= 0.002

    // velocities[i * 3 + 1] += gravity // y方向
    pos[i * 3 + 0] += velocities[i * 3 + 0]
    pos[i * 3 + 1] += velocities[i * 3 + 1]
    pos[i * 3 + 2] += velocities[i * 3 + 2]

    // 速度の減衰（少しずつエネルギーを失わせる）
    velocities[i * 3 + 0] *= 0.999
    velocities[i * 3 + 1] *= 0.999
    velocities[i * 3 + 2] *= 0.999

    // 3. 容器の境界判定
    const wallX = 2.0 // 左右の壁
    const wallZ = 2.0 // 奥と手前の壁
    const floorY = -2.5

    // x, z 方向にも壁を作る
    if (pos[i * 3 + 0] > wallX) {
      pos[i * 3 + 0] = wallX
      velocities[i * 3 + 0] *= -0.5
    }
    if (pos[i * 3 + 0] < -wallX) {
      pos[i * 3 + 0] = -wallX
      velocities[i * 3 + 0] *= -0.5
    }
    if (pos[i * 3 + 2] > wallZ) {
      pos[i * 3 + 2] = wallZ
      velocities[i * 3 + 2] *= -0.5
    }
    if (pos[i * 3 + 2] < -wallZ) {
      pos[i * 3 + 2] = -wallZ
      velocities[i * 3 + 2] *= -0.5
    }

    // 床の跳ね返り（既存）
    if (pos[i * 3 + 1] < floorY) {
      pos[i * 3 + 1] = floorY
      velocities[i * 3 + 1] *= -0.5
    }
  }
  geometry.attributes.instancePosition.needsUpdate = true
  renderer.render(scene, camera)
  // コントロールの更新
  controls.update()
}
animate()

// ウィンドウリサイズ対応
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
