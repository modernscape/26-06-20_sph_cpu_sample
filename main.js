import * as THREE from "three"

// 1. 設定
const PARTICLE_COUNT = 1000
const H = 0.8 // 影響半径
const DT = 0.05 // 時間刻み
const GRAVITY = -0.02 // 重力
const GAS_CONST = 2.0 // 圧力係数
const REST_DENSITY = 1.0
const WALL_BOUNDARY = 4.0

// シーン構築
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.z = 8

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.getElementById("app").appendChild(renderer.domElement)

// 粒子データ管理
const pos = new Float32Array(PARTICLE_COUNT * 3)
const vel = new Float32Array(PARTICLE_COUNT * 3)
const colors = new Float32Array(PARTICLE_COUNT * 3)
const density = new Float32Array(PARTICLE_COUNT)
const pressure = new Float32Array(PARTICLE_COUNT)

for (let i = 0; i < PARTICLE_COUNT; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 6
  pos[i * 3 + 1] = (Math.random() - 0.5) * 6 + 2
  pos[i * 3 + 2] = 0
  // 初期色: 青
  colors[i * 3] = 0.2
  colors[i * 3 + 1] = 0.5
  colors[i * 3 + 2] = 1.0
}
// インク（赤）を少し混ぜる
for (let i = 0; i < 50; i++) {
  colors[i * 3] = 1.0
  colors[i * 3 + 1] = 0.0
  colors[i * 3 + 2] = 0.0
}

const geometry = new THREE.BufferGeometry()
geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3))
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true })
const points = new THREE.Points(geometry, material)
scene.add(points)

// SPH物理エンジン
function updateSimulation() {
  // A. 密度計算
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    density[i] = 0
    for (let j = 0; j < PARTICLE_COUNT; j++) {
      const dx = pos[i * 3] - pos[j * 3]
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
      const r2 = dx * dx + dy * dy
      if (r2 < H * H) density[i] += (H * H - r2) ** 2
    }
    pressure[i] = GAS_CONST * (density[i] - REST_DENSITY)
  }

  // B. 力の計算と移動
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let fx = 0,
      fy = GRAVITY // 重力
    for (let j = 0; j < PARTICLE_COUNT; j++) {
      if (i === j) continue
      const dx = pos[j * 3] - pos[i * 3]
      const dy = pos[j * 3 + 1] - pos[i * 3 + 1]
      const r = Math.sqrt(dx * dx + dy * dy)
      if (r < H && r > 0.1) {
        const p = (pressure[i] + pressure[j]) / (2 * density[i] + 0.1)
        fx += (dx / r) * p * (H - r)
        fy += (dy / r) * p * (H - r)
      }
    }
    vel[i * 3] += fx * DT
    vel[i * 3 + 1] += fy * DT

    // 位置更新
    pos[i * 3] += vel[i * 3] * DT
    pos[i * 3 + 1] += vel[i * 3 + 1] * DT

    // 壁反射
    if (pos[i * 3] > WALL_BOUNDARY || pos[i * 3] < -WALL_BOUNDARY)
      vel[i * 3] *= -0.5
    if (pos[i * 3 + 1] < -WALL_BOUNDARY) {
      pos[i * 3 + 1] = -WALL_BOUNDARY
      vel[i * 3 + 1] *= -0.5
    }
  }

  // C. 色の拡散（色が隣接粒子に伝わる）
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = 0; j < PARTICLE_COUNT; j++) {
      const dx = pos[i * 3] - pos[j * 3]
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
      if (dx * dx + dy * dy < H * H) {
        colors[i * 3] += (colors[j * 3] - colors[i * 3]) * 0.005
      }
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
}

// レンダリングループ
function animate() {
  requestAnimationFrame(animate)
  updateSimulation() // これを忘れていました
  renderer.render(scene, camera)
}
animate()
