import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { traa } from "three/examples/jsm/tsl/display/TRAANode.js"

/******************************************************
 * UI
 *****************************************************/
function showCount() {
  const c = document.getElementById("count")
  c.textContent = count
}

// パラメータによってメッセージを設定
let msg = ""
const params = new URLSearchParams(window.location.search)
const case_value = params.get("case")
switch (case_value) {
  case "parameter":
    msg = "メッセージ"
    break
  default:
    msg = ""
    break
}
document.getElementById("msgSpan").textContent = msg

// ボタンをクリックしたら粒子を追加
const addBtn = document.getElementById("addBtn")
addBtn.disabled = true
addBtn.addEventListener("click", () => {
  addParticleSeqentially(50, 1, 0, 0)
})

/******************************************************
 * 定数
 *****************************************************/
const MAX_PARTICLES = 5000
let count = 0
const h = 0.6 // 影響範囲
const restDensity = 2.0 // 理想密度
const stiffness = 0.5 // 圧力係数
const viscosity = 0.15 // 粘度係数
const gravity = -0.005

/******************************************************
 * シーン、カメラ、レンダラー
 *****************************************************/

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.001,
  1000,
)
camera.position.set(0, 0, 5)
camera.updateProjectionMatrix() // これを忘れないようにしてください
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.minDistance = 0
controls.maxDistance = 10000
controls.minPolarAngle = 0
controls.maxPolarAngle = Math.PI

/******************************************************
 * カメラの状態を保存
 *****************************************************/
const STORAGE_KEY = "camera-state-data"
let saveTimer = null // タイマー管理用

// 視点を保存する関数（デバウンス用）
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

// 初期化時に復元（前回と同じ）
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

/******************************************************
 * points オブジェクト
 *****************************************************/
const geometry = new THREE.BufferGeometry()
let posArray = new Float32Array(MAX_PARTICLES * 3)

geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))
const material = new THREE.PointsMaterial({
  size: 0.03,
  transparent: false,
  vertexColors: true,
  opacity: 0.8,
})

const points = new THREE.Points(geometry, material)
points.geometry.computeBoundingSphere()
points.geometry.boundingSphere.radius += 10 // 半径を広げて誤判定を防ぐ
scene.add(points)

/******************************************************
 * 粒子を作成、追加
 *****************************************************/
let velocities = new Float32Array(MAX_PARTICLES * 3)
let densities = new Float32Array(MAX_PARTICLES)
let colors = new Float32Array(MAX_PARTICLES * 3)

// 初期化
async function init() {
  initParticles()

  await addParticleSeqentially(300, 255 / 255, 10 / 255, 10 / 255)
  await addParticleSeqentially(300, 10 / 255, 255 / 255, 10 / 255)
  await addParticleSeqentially(300, 10 / 255, 255 / 255, 255 / 255)
  addBtn.disabled = false
}

// 粒子を初期化
function initParticles() {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    // 速度を初期化
    velocities[i * 3 + 0] = 0
    velocities[i * 3 + 1] = 0
    velocities[i * 3 + 2] = 0

    // 色を初期化
    colors[i * 3 + 0] = 0.0
    colors[i * 3 + 1] = 0.0
    colors[i * 3 + 2] = 0.0
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
}

// 粒子を順番に追加
function addParticleSeqentially(num, r, g, b, intervalMs = 10) {
  return new Promise((resolve) => {
    let added = 0
    const timer = setInterval(() => {
      addParticle(r, g, b)
      added++
      if (added >= num) {
        clearInterval(timer)
        // count += added
        resolve()
      }
    }, intervalMs)
  })
}

// 粒子を追加
function addParticle(r, g, b) {
  if (count >= MAX_PARTICLES) return

  const range = 0.2
  posArray[count * 3 + 0] = (Math.random() - range) * (range * 2)
  posArray[count * 3 + 1] = 2.0 // 少し高い位置から
  posArray[count * 3 + 2] = (Math.random() - range) * (range * 2)

  velocities[count * 3 + 0] = 0
  velocities[count * 3 + 1] = -0.04 // 下向きの初速
  velocities[count * 3 + 2] = 0

  densities[count] = restDensity // 初期値を設定

  colors[count * 3 + 0] = r //15 / 255
  colors[count * 3 + 1] = g //227 / 255
  colors[count * 3 + 2] = b //255 / 255

  geometry.attributes.color.setXYZ(count, r, g, b)

  showCount()

  count += 1

  geometry.attributes.color.count = count
  geometry.attributes.position.count = count

  // フラグを立てる
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true

  geometry.attributes.color.needsUpdate = true
  geometry.setDrawRange(0, count)
}

init()

/******************************************************
 * 汎用関数
 *****************************************************/
// 距離
function getDistance(i, j) {
  const dx = pos[j * 3 + 0] - pos[i * 3 + 0]
  const dy = pos[j * 3 + 1] - pos[i * 3 + 1]
  const dz = pos[j * 3 + 2] - pos[i * 3 + 2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// 近傍探索
function getNeighbors(i) {
  let neighbors = []
  for (let j = 0; j < count; j++) {
    if (i === j) continue
    const dist = getDistance(i, j)
    if (0 < dist && dist < h) {
      const weight = calculateWeight(dist, h)
    }
  }

  return []
}

function calculateWeight(dist, h) {
  if (dist > 0) return 0
  return 1 - dist / h
}

// 加重平均
function getWeightedAverage(targetPropertyArray, i, neighbors, propetySize) {
  let sum = 0
  let weightSum = 0
  for (const n of neighbors) {
    sum += targetPropertyArray[n.index] * n.weight
    weightSum += n.weight
  }
  return weightSum > 0 ? sum / weightSum : targetPropertyArray[i]
}

/******************************************************
 * カーネル関数
 *****************************************************/
// 速度
// 位置
// 色
// 密度
// 圧力
// 粘度

// 密度
function updateDensityAndPressure(i, neighbors) {}

// 粘度
function applyViscosityAndCorrection(i, neighbors) {}

// 色
function applyColorDiffusion(i, neighbors) {}

/******************************************************
 * カーネル関数 OLD
 *****************************************************/
// 色計算
let nextColors = new Float32Array(colors.length)
function diffuseColor() {
  const h = 0.5

  for (let i = 0; i < count; i++) {
    let rSum = 0,
      gSum = 0,
      bSum = 0
    let weightSum = 0

    for (let j = 0; j < count; j++) {
      if (i === j) continue

      const dist = getDistance(i, j)

      if (dist > 0 && dist < h) {
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
  colors.set(nextColors)

  const colorAttr = geometry.attributes.color

  for (let i = 0; i < count; i++) {
    colorAttr.setXYZ(
      i,
      colors[i * 3 + 0], //
      colors[i * 3 + 1],
      colors[i * 3 + 2],
    )
  }
  colorAttr.needsUpdate = true
}

// 密度計算
function calcDensities() {
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
}

// 圧力・粘性計算
function calcPressure() {
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
}

// 物理更新と境界判定
function calcPhysics() {
  const floor_y = 1.5
  const wall_x = 1.5
  const wall_z = 1.5

  for (let i = 0; i < count; i++) {
    velocities[i * 3 + 1] += gravity
    pos[i * 3] += velocities[i * 3]
    pos[i * 3 + 1] += velocities[i * 3 + 1]
    pos[i * 3 + 2] += velocities[i * 3 + 2]

    // 境界判定 (床と壁)
    if (pos[i * 3 + 1] < -floor_y) {
      pos[i * 3 + 1] = -floor_y
      velocities[i * 3 + 1] *= -0.5
    }
    if (Math.abs(pos[i * 3]) > wall_x) {
      pos[i * 3] = Math.sign(pos[i * 3]) * wall_z
      velocities[i * 3] *= -0.5
    }
    if (Math.abs(pos[i * 3 + 2]) > wall_z) {
      pos[i * 3 + 2] = Math.sign(pos[i * 3 + 2]) * wall_z
      velocities[i * 3 + 2] *= -0.5
    }

    // 減衰
    velocities[i * 3] *= 0.99
    velocities[i * 3 + 1] *= 0.99
    velocities[i * 3 + 2] *= 0.99
  }
}

// 非圧縮性
// イテレーション回数（最初は2〜3で十分です）
const MAX_ITERATIONS = 2

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
function applyCorrection() {
  // 密度が restDensity になるまで反復する
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    computeDensity() // 1. 最新の密度を計算

    // 圧力による力を適用
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

/******************************************************
 * 粒子の更新 （メインループ） OLD
 *****************************************************/
function updateParticles_cur() {
  // 色計算
  diffuseColor()

  // 密度計算
  calcDensities()

  // 圧力・粘性計算
  calcPressure()

  // 物理更新と境界判定
  calcPhysics()

  // 非圧縮性
  applyCorrection()
}

/******************************************************
 * 粒子の更新 （メインループ）
 *****************************************************/
function updateParticles_0() {
  // 統合ループ
  for (let i = 0; i < count; i++) {
    const neighbors = getNeighbors(i)

    // 1. 密度と圧力を計算して「密度状態」を確定
    updateDensityAndPressure(i, neighbors)

    // 2. 確定した圧力をもとに「速度」を加重平均（粘性と圧力補正）
    applyViscosityAndCorrection(i, neighbors)

    // 3. 速度と圧力を経て「色」を加重平均
    applyColorDiffusion(i, neighbors)
  }
}

const densityBuffer = new Float32Array(MAX_PARTICLES)
const pressureBuffer = new Float32Array(MAX_PARTICLES)
const velBufferX = new Float32Array(MAX_PARTICLES)

function updateParticles() {
  // 統合ループ
  for (let i = 0; i < count; i++) {
    const neighbors = getNeighbors(i)

    // 1. 密度の更新
    // 密度は「質量（今回は1とする）」の重み付き合計で求まる
    // 汎用化のため、densityBuffer という配列を用意しておくと便利です
    densityBuffer[i] = getWeightedAverage(dummyMassArray, i, neighbors)

    // 2. 圧力の更新（密度から計算）
    // 圧力は密度を使って計算する物理式なので、ここは少しカスタマイズが必要
    pressureBuffer[i] = calculatePressureFromDensity(densityBuffer[i])

    // 3. 速度の拡散（粘性）
    // 速度配列(velBufferX, velBufferY)を周囲と混ぜる
    velBufferX[i] = getWeightedAverage(velBufferX, i, neighbors)
    velBufferY[i] = getWeightedAverage(velBufferY, i, neighbors)
  }
}

/******************************************************
 * フレーム更新
 *****************************************************/
const pos = geometry.attributes.position.array

function animate() {
  requestAnimationFrame(animate)

  updateParticles_cur()
  // updateParticles()

  // geometry.attributes.color.array.set(colors)

  controls.update()

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true

  renderer.render(scene, camera)
}
animate()
