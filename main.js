import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

let msg = ""
const params = new URLSearchParams(window.location.search)
const case_value = params.get("case")
switch (case_value) {
  case "01":
    msg = "01"
    break
  case "soft":
    msg = "非圧縮適用なし"
    break
  case "02":
    msg = "02"
    break
  default:
    // msg = "default"
    break
}

document.getElementById("msgSpan").textContent = msg

const addBtn = document.getElementById("addBtn")
addBtn.addEventListener("click", () => {
  const addCount = 1
  for (let i = 0; i < addCount; i++) {
    addParticle()
  }
})

function addParticle() {
  if (count >= MAX_PARTICLES) return

  const range = 0.2
  posArray[count * 3 + 0] = (Math.random() - range) * (range * 2)
  posArray[count * 3 + 1] = 2.0 // 少し高い位置から
  posArray[count * 3 + 2] = (Math.random() - range) * (range * 2)

  velocities[count * 3 + 0] = 0
  velocities[count * 3 + 1] = -0.02 // 下向きの初速
  velocities[count * 3 + 2] = 0

  // 2. densities 配列も拡張する！
  densities[count] = restDensity // 初期値を設定

  colors[count * 3 + 0] = 1.0 // R
  colors[count * 3 + 1] = 0.0 // G
  colors[count * 3 + 2] = 0.0 // B

  // 色
  geometry.attributes.color.setXYZ(count, 1.0, 0.0, 0.0)

  // 粒子数を更新
  count += 1
  showCount()

  geometry.attributes.color.count = count
  geometry.attributes.position.count = count

  // geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  // geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))

  // 4. フラグを立てる
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true

  geometry.attributes.color.needsUpdate = true
  geometry.setDrawRange(0, count)
}

function showCount() {
  const c = document.getElementById("count")
  c.textContent = count
}

// 初期設定
const MAX_PARTICLES = 10000
let count = 1000
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
// controls.enablePan = false

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
      // console.error("復元データが不正です:", e)
    }
  }
})
// ジオメトリ
const geometry = new THREE.BufferGeometry()
// let posArray = new Float32Array(count * 3)
let posArray = new Float32Array(MAX_PARTICLES * 3)

for (let i = 0; i < count; i++) {
  // 容器の範囲内に密集させて配置
  posArray[i * 3 + 0] = (Math.random() - 0.5) * 2.0 // -1 〜 1
  posArray[i * 3 + 1] = (Math.random() - 0.5) * 2.0
  posArray[i * 3 + 2] = (Math.random() - 0.5) * 2.0
}
// console.log(posArray[count * 3 - 1])
// console.log(posArray[count * 3])
// console.log(posArray[count * 3 + 1])
// console.log(posArray[count * 3 + 2])

geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))
const material = new THREE.PointsMaterial({
  size: 0.03,
  transparent: false,
  opacity: 1.0,
  vertexColors: true,
  // color: 0xff7700,
  opacity: 0.8,
})

const points = new THREE.Points(geometry, material)
scene.add(points)

// let velocities = new Float32Array(count * 3)
let velocities = new Float32Array(MAX_PARTICLES * 3)
let densities = new Float32Array(MAX_PARTICLES)
let colors = new Float32Array(MAX_PARTICLES * 3)

// リセット用の定数
const RESET_INTERVAL = 8000 // 5000ms = 5秒
let lastResetTime = Date.now()

// 粒子を初期化する関数
function initParticles() {
  // for (let i = 0; i < MAX_PARTICLES; i++) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    // 速度もリセット
    velocities[i * 3 + 0] = 0
    velocities[i * 3 + 1] = 0
    velocities[i * 3 + 2] = 0

    // 色
    colors[i * 3 + 0] = 15 / 255
    colors[i * 3 + 1] = 227 / 255
    colors[i * 3 + 2] = 255 / 255

    // console.log(i)
    // 0 - 9999

    // count++
  }
  // count++

  geometry.setDrawRange(0, count)
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  // geometry.attributes.position.needsUpdate = true

  lastResetTime = Date.now()
}

initParticles()

showCount()
function animate() {
  requestAnimationFrame(animate)

  const pos = geometry.attributes.position.array

  let nextColors = new Float32Array(colors.length)

  function diffuseColor() {
    const h = 5.0

    for (let i = 0; i < count; i++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0
      let weightSum = 0

      for (let j = 0; j < count; j++) {
        const dist = getDistance(i, j)

        if (dist < h && dist > 0) {
          const weight = 1 - dist / h
          rSum += colors[j * 3 + 0] * weight
          gSum += colors[j * 3 + 1] * weight
          bSum += colors[j * 3 + 2] * weight

          weightSum += weight
        }
      }

      if (weightSum > 0) {
        nextColors[i * 3 + 0] = rSum / weightSum
        nextColors[i * 3 + 1] = gSum / weightSum
        nextColors[i * 3 + 2] = bSum / weightSum
      } else {
        nextColors[i * 3 + 0] = colors[i * 3 + 0]
        nextColors[i * 3 + 1] = colors[i * 3 + 1]
        nextColors[i * 3 + 2] = colors[i * 3 + 2]
      }
    }
    // colors = nextColors
    colors.set(nextColors)
  }

  diffuseColor()

  function getDistance(i, j) {
    const dx = pos[j * 3 + 0] - pos[i * 3 + 0]
    const dy = pos[j * 3 + 1] - pos[i * 3 + 1]
    const dz = pos[j * 3 + 2] - pos[i * 3 + 2]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  // 2. GPUへデータを転送する
  const colorAttr = geometry.attributes.color

  for (let i = 0; i < count; i++) {
    colorAttr.setXYZ(i, colors[i * 3 + 0], colors[i * 3 + 1], colors[i * 3 + 2])
  }

  function diffuseColor_old() {
    // 色
    let nextColors = new Float32Array(colors)

    for (let i = 0; i < count; i++) {
      let sumColor = colors[i]
      let neighborCount = 1

      for (let j = 0; j < count; j++) {
        if (i === j) continue
        const dx = pos[i * 3 + 0] - pos[j * 3 + 0]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq < h * h) {
          const dist = Math.sqrt(distSq)
          const weight = Math.pow(1.0 - dist / h, 2)

          sumColor += colors[j] * weight
          neighborCount += weight
        }
        colors[i] = sumColor / neighborCount
      }
      geometry.attributes.color.setXYZ(
        i,
        colors[i * 3 + 0],
        colors[i * 3 + 1],
        colors[i * 3 + 2],
      )
      colors = nextColors
    }
  }
  // diffuseColor()

  // geometry.attributes.color.setXYZ(count, 1.0, 0.0, 0.0)

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

  function computeDensity() {
    const pos = geometry.attributes.position.array
    const h2 = h * h // 影響範囲の二乗（計算効率のため）

    for (let i = 0; i < count; i++) {
      let d = 0

      // 自分の位置を取得
      const xi = pos[i * 3 + 0]
      const yi = pos[i * 3 + 1]
      const zi = pos[i * 3 + 2]

      for (let j = 0; j < count; j++) {
        // 自分自身は含めない（あるいは含めるカーネルもあるが、基本は除外）
        if (i === j) continue

        const dx = xi - pos[j * 3 + 0]
        const dy = yi - pos[j * 3 + 1]
        const dz = zi - pos[j * 3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz

        // 影響範囲内であれば計算
        if (distSq < h2) {
          const dist = Math.sqrt(distSq)
          // 二乗カーネル (1 - r/h)^2
          const w = 1.0 - dist / h
          d += w * w
        }
      }
      // 密度が0にならないよう微小値を加算
      densities[i] = Math.max(d, 0.0001)
    }
  }

  // イテレーション回数（最初は2〜3で十分です）
  const MAX_ITERATIONS = 2

  function applyCorrection() {
    // 密度が restDensity になるまで反復する
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      computeDensity() // 1. 最新の密度を計算

      // 2. 圧力による力を適用
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

            // 圧力の差分を計算（密度のエラー分だけ強く反発させる）
            const densityError = densities[i] - restDensity
            const pressure = stiffness * densityError

            // 力を適用（密度が高いほど強く弾く）
            const force = (pressure * w * w) / densities[i]
            velocities[i * 3] += (dx / dist) * force * 0.05
            velocities[i * 3 + 1] += (dy / dist) * force * 0.05
            velocities[i * 3 + 2] += (dz / dist) * force * 0.05
          }
        }
      }
    }
  }

  geometry.attributes.color.array.set(colors)
  geometry.attributes.color.needsUpdate = true

  if (case_value != "soft") applyCorrection()

  geometry.attributes.position.needsUpdate = true
  renderer.render(scene, camera)
  controls.update()
}
animate()
