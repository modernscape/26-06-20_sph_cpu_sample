import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// 初期設定
const count = 2000
const h = 0.6 // 影響範囲
const restDensity = 2.0 // 理想密度
const stiffness = 0.5 // 圧力係数
const viscosity = 0.15 // 粘度係数
const gravity = -0.005

// シーン・カメラ・レンダラー等は既存のまま使用
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.set(0, 0, 5)
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)

const STORAGE_KEY = "camera-state-data"
let saveTimer = null // タイマー管理用

/**
 * 視点を保存する関数（デバウンス用）
 */
function debouncedSaveCameraState() {
  // 既存のタイマーがあればキャンセル
  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  // 500ms 操作が止まったら保存を実行
  saveTimer = setTimeout(() => {
    const state = {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      target: {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    console.log("カメラの状態を保存しました:", state)
  }, 500)
}
// OrbitControls の変更イベントを監視
controls.addEventListener("change", () => {
  debouncedSaveCameraState()
})

// --- 初期化時に復元（前回と同じ） ---
window.addEventListener("DOMContentLoaded", () => {
  const savedState = localStorage.getItem(STORAGE_KEY)
  if (savedState) {
    try {
      const state = JSON.parse(savedState)
      camera.position.set(state.position.x, state.position.y, state.position.z)
      controls.target.set(state.target.x, state.target.y, state.target.z)
      controls.update()
    } catch (e) {
      console.error("復元データが不正です:", e)
    }
  }
})
// ジオメトリ
const geometry = new THREE.BufferGeometry()
const posArray = new Float32Array(count * 3)
for (let i = 0; i < count; i++) {
  // 容器の範囲内に密集させて配置
  posArray[i * 3 + 0] = (Math.random() - 0.5) * 2.0
  posArray[i * 3 + 1] = (Math.random() - 0.5) * 2.0
  posArray[i * 3 + 2] = (Math.random() - 0.5) * 2.0
}
geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))
const material = new THREE.PointsMaterial({ size: 0.05, color: 0x0077ff })
const points = new THREE.Points(geometry, material)
scene.add(points)

const velocities = new Float32Array(count * 3)
const densities = new Float32Array(count)

function animate() {
  requestAnimationFrame(animate)
  const pos = geometry.attributes.position.array

  // 1. 密度計算
  for (let i = 0; i < count; i++) {
    let d = 0
    for (let j = 0; j < count; j++) {
      const dx = pos[i * 3] - pos[j * 3],
        dy = pos[i * 3 + 1] - pos[j * 3 + 1],
        dz = pos[i * 3 + 2] - pos[j * 3 + 2]
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq < h * h) {
        const w = 1.0 - Math.sqrt(distSq) / h
        d += w * w // 二乗カーネル
      }
    }
    densities[i] = Math.max(d, 0.0001)
  }

  // 2. 圧力・粘性計算
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      if (i === j) continue
      const dx = pos[i * 3] - pos[j * 3],
        dy = pos[i * 3 + 1] - pos[j * 3 + 1],
        dz = pos[i * 3 + 2] - pos[j * 3 + 2]
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq < h * h && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const w = 1.0 - dist / h

        // 圧力 (反発)
        const p = stiffness * (densities[i] + densities[j] - 2 * restDensity)
        const force = (p * w * w) / densities[j]
        velocities[i * 3] += (dx / dist) * force * 0.01
        velocities[i * 3 + 1] += (dy / dist) * force * 0.01
        velocities[i * 3 + 2] += (dz / dist) * force * 0.01

        // 粘性 (同期)
        const vdx = velocities[j * 3] - velocities[i * 3]
        const vdy = velocities[j * 3 + 1] - velocities[i * 3 + 1]
        const vdz = velocities[j * 3 + 2] - velocities[i * 3 + 2]
        velocities[i * 3] += vdx * viscosity * w * w
        velocities[i * 3 + 1] += vdy * viscosity * w * w
        velocities[i * 3 + 2] += vdz * viscosity * w * w
      }
    }
  }

  // 3. 物理更新と境界判定
  for (let i = 0; i < count; i++) {
    velocities[i * 3 + 1] += gravity
    pos[i * 3] += velocities[i * 3]
    pos[i * 3 + 1] += velocities[i * 3 + 1]
    pos[i * 3 + 2] += velocities[i * 3 + 2]

    // 境界判定 (床と壁)
    if (pos[i * 3 + 1] < -2.0) {
      pos[i * 3 + 1] = -2.0
      velocities[i * 3 + 1] *= -0.5
    }
    if (Math.abs(pos[i * 3]) > 2.0) {
      pos[i * 3] = Math.sign(pos[i * 3]) * 2.0
      velocities[i * 3] *= -0.5
    }
    if (Math.abs(pos[i * 3 + 2]) > 2.0) {
      pos[i * 3 + 2] = Math.sign(pos[i * 3 + 2]) * 2.0
      velocities[i * 3 + 2] *= -0.5
    }

    // 減衰
    velocities[i * 3] *= 0.99
    velocities[i * 3 + 1] *= 0.99
    velocities[i * 3 + 2] *= 0.99
  }

  geometry.attributes.position.needsUpdate = true
  renderer.render(scene, camera)
  controls.update()
}
animate()
