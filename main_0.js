import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

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
const restDensity = 10.0 // 理想密度
const stiffness = 50 //10 //0.5 // 圧力係数
// const viscosity = 0.15 // 粘度係数
// const gravity = -0.005

/******************************************************
 * 物理計算用バッファの定義
 *****************************************************/
// 位置・速度・加速度（各粒子 x, y, z の3次元分確保）
// 3次元座標を計算しやすいよう、X, Y, Zそれぞれの配列で管理するのがコツです
const posX = new Float32Array(MAX_PARTICLES)
const posY = new Float32Array(MAX_PARTICLES)
const posZ = new Float32Array(MAX_PARTICLES)

const velX = new Float32Array(MAX_PARTICLES)
const velY = new Float32Array(MAX_PARTICLES)
const velZ = new Float32Array(MAX_PARTICLES)

const accX = new Float32Array(MAX_PARTICLES)
const accY = new Float32Array(MAX_PARTICLES)
const accZ = new Float32Array(MAX_PARTICLES)

// 各粒子の色情報を管理するバッファ
const colorR = new Float32Array(MAX_PARTICLES)
const colorG = new Float32Array(MAX_PARTICLES)
const colorB = new Float32Array(MAX_PARTICLES)

// 物理状態用のバッファ
const densityBuffer = new Float32Array(MAX_PARTICLES)
const pressureBuffer = new Float32Array(MAX_PARTICLES)

// 質量用（初期値はすべて 1.0 に埋めておくと密度計算が楽です）
const massBuffer = new Float32Array(MAX_PARTICLES).fill(1.0)

// let velocities = new Float32Array(MAX_PARTICLES * 3)
let densities = new Float32Array(MAX_PARTICLES)
// let colors = new Float32Array(MAX_PARTICLES * 3)

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
  // --- ここを追加 ---
  // 粒子の色情報を保持するための空の配列を用意し、ジオメトリに登録する
  const colorAttribute = new THREE.BufferAttribute(
    new Float32Array(MAX_PARTICLES * 3),
    3,
  )
  geometry.setAttribute("color", colorAttribute)

  // 位置情報も同様に登録されているか確認
  const posAttribute = new THREE.BufferAttribute(
    new Float32Array(MAX_PARTICLES * 3),
    3,
  )
  geometry.setAttribute("position", posAttribute)
  // -------------------

  for (let i = 0; i < MAX_PARTICLES; i++) {
    // 速度の初期化
    velX[i] = 0
    velY[i] = 0
    velZ[i] = 0

    // 色の初期化
    colorR[i] = 0.0
    colorG[i] = 0.0
    colorB[i] = 0.0
  }

  //  2. Three.jsのジオメトリにセットする際は「DynamicDrawUsage」を使うと高速
  const colorBuffer = new THREE.BufferAttribute(
    new Float32Array(MAX_PARTICLES * 3),
    3,
  )
  colorBuffer.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute("color", colorBuffer)
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

  const range = 1.0

  // 位置の初期化
  posX[count] = (Math.random() - 0.5) * (range * 2)
  posY[count] = 2.0 // 少し高い位置から
  posZ[count] = (Math.random() - 0.5) * (range * 2)

  // 速度の初期化
  velX[count] = 0
  velY[count] = -0.01
  velZ[count] = 0

  densities[count] = restDensity // 初期値を設定

  // 色の初期化
  colorR[count] = r
  colorG[count] = g
  colorB[count] = b

  geometry.attributes.color.setXYZ(count, r, g, b)
  geometry.attributes.position.setXYZ(
    count,
    posX[count],
    posY[count],
    posZ[count],
  )

  showCount()

  count++

  geometry.attributes.color.count = count
  geometry.attributes.position.count = count

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true

  geometry.attributes.color.needsUpdate = true
  geometry.setDrawRange(0, count)
}
init()

/******************************************************
 * カーネル関数
 *****************************************************/
// 速度
// 位置
// 色
// 密度
// 圧力
// 粘度

/******************************************************
 * CUR
 *****************************************************/
// 色計算
// let nextColors = new Float32Array(colors.length)
// function diffuseColor() {
//   const h = 0.5

//   for (let i = 0; i < count; i++) {
//     let rSum = 0,
//       gSum = 0,
//       bSum = 0
//     let weightSum = 0

//     for (let j = 0; j < count; j++) {
//       if (i === j) continue

//       const dist = getDistance(i, j)

//       if (dist > 0 && dist < h) {
//         const weight = 1 - dist / h
//         rSum += colors[j * 3 + 0] * weight
//         gSum += colors[j * 3 + 1] * weight
//         bSum += colors[j * 3 + 2] * weight
//         weightSum += weight
//       }
//     }

//     if (weightSum > 0) {
//       nextColors[i * 3 + 0] = rSum / weightSum
//       nextColors[i * 3 + 1] = gSum / weightSum
//       nextColors[i * 3 + 2] = bSum / weightSum
//     } else {
//       nextColors[i * 3 + 0] = colors[i * 3 + 0]
//       nextColors[i * 3 + 1] = colors[i * 3 + 1]
//       nextColors[i * 3 + 2] = colors[i * 3 + 2]
//     }
//   }
//   colors.set(nextColors)

//   const colorAttr = geometry.attributes.color

//   for (let i = 0; i < count; i++) {
//     colorAttr.setXYZ(
//       i,
//       colors[i * 3 + 0], //
//       colors[i * 3 + 1],
//       colors[i * 3 + 2],
//     )
//   }
//   colorAttr.needsUpdate = true
// }

// 密度計算
// function calcDensities() {
//   for (let i = 0; i < count; i++) {
//     let d = 0
//     for (let j = 0; j < count; j++) {
//       const dx = pos[i * 3] - pos[j * 3],
//         dy = pos[i * 3 + 1] - pos[j * 3 + 1],
//         dz = pos[i * 3 + 2] - pos[j * 3 + 2]
//       const distSq = dx * dx + dy * dy + dz * dz
//       if (distSq < h * h) {
//         const w = 1.0 - Math.sqrt(distSq) / h
//         d += w * w // 二乗カーネル
//       }
//     }
//     densities[i] = Math.max(d, 0.0001)
//   }
// }

// 圧力・粘性計算
// function calcPressure() {
//   for (let i = 0; i < count; i++) {
//     for (let j = 0; j < count; j++) {
//       if (i === j) continue
//       const dx = pos[i * 3] - pos[j * 3],
//         dy = pos[i * 3 + 1] - pos[j * 3 + 1],
//         dz = pos[i * 3 + 2] - pos[j * 3 + 2]
//       const distSq = dx * dx + dy * dy + dz * dz
//       if (distSq < h * h && distSq > 0.0001) {
//         const dist = Math.sqrt(distSq)
//         const w = 1.0 - dist / h

//         // 圧力 (反発)
//         const p = stiffness * (densities[i] + densities[j] - 2 * restDensity)
//         const force = (p * w * w) / densities[j]
//         velocities[i * 3] += (dx / dist) * force * 0.01
//         velocities[i * 3 + 1] += (dy / dist) * force * 0.01
//         velocities[i * 3 + 2] += (dz / dist) * force * 0.01

//         // 粘性 (同期)
//         const vdx = velocities[j * 3] - velocities[i * 3]
//         const vdy = velocities[j * 3 + 1] - velocities[i * 3 + 1]
//         const vdz = velocities[j * 3 + 2] - velocities[i * 3 + 2]
//         velocities[i * 3] += vdx * viscosity * w * w
//         velocities[i * 3 + 1] += vdy * viscosity * w * w
//         velocities[i * 3 + 2] += vdz * viscosity * w * w
//       }
//     }
//   }
// }

// 物理更新と境界判定
// function calcPhysics() {
//   const floor_y = 1.5
//   const wall_x = 1.5
//   const wall_z = 1.5

//   for (let i = 0; i < count; i++) {
//     velocities[i * 3 + 1] += gravity
//     pos[i * 3] += velocities[i * 3]
//     pos[i * 3 + 1] += velocities[i * 3 + 1]
//     pos[i * 3 + 2] += velocities[i * 3 + 2]

//     // 境界判定 (床と壁)
//     if (pos[i * 3 + 1] < -floor_y) {
//       pos[i * 3 + 1] = -floor_y
//       velocities[i * 3 + 1] *= -0.5
//     }
//     if (Math.abs(pos[i * 3]) > wall_x) {
//       pos[i * 3] = Math.sign(pos[i * 3]) * wall_z
//       velocities[i * 3] *= -0.5
//     }
//     if (Math.abs(pos[i * 3 + 2]) > wall_z) {
//       pos[i * 3 + 2] = Math.sign(pos[i * 3 + 2]) * wall_z
//       velocities[i * 3 + 2] *= -0.5
//     }

//     // 減衰
//     velocities[i * 3] *= 0.99
//     velocities[i * 3 + 1] *= 0.99
//     velocities[i * 3 + 2] *= 0.99
//   }
// }
// // 非圧縮性
// // イテレーション回数（最初は2〜3で十分です）
// const MAX_ITERATIONS = 2

// function computeDensity() {
//   const pos = geometry.attributes.position.array
//   const h2 = h * h // 影響範囲の二乗（計算効率のため）

//   for (let i = 0; i < count; i++) {
//     let d = 0

//     // 自分の位置を取得
//     const xi = pos[i * 3 + 0]
//     const yi = pos[i * 3 + 1]
//     const zi = pos[i * 3 + 2]

//     for (let j = 0; j < count; j++) {
//       // 自分自身は含めない（あるいは含めるカーネルもあるが、基本は除外）
//       if (i === j) continue

//       const dx = xi - pos[j * 3 + 0]
//       const dy = yi - pos[j * 3 + 1]
//       const dz = zi - pos[j * 3 + 2]
//       const distSq = dx * dx + dy * dy + dz * dz

//       // 影響範囲内であれば計算
//       if (distSq < h2) {
//         const dist = Math.sqrt(distSq)
//         // 二乗カーネル (1 - r/h)^2
//         const w = 1.0 - dist / h
//         d += w * w
//       }
//     }
//     // 密度が0にならないよう微小値を加算
//     densities[i] = Math.max(d, 0.0001)
//   }
// }

// function applyCorrection() {
//   // 密度が restDensity になるまで反復する
//   for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
//     computeDensity() // 1. 最新の密度を計算

//     // 圧力による力を適用
//     for (let i = 0; i < count; i++) {
//       for (let j = 0; j < count; j++) {
//         if (i === j) continue

//         const dx = pos[i * 3] - pos[j * 3],
//           dy = pos[i * 3 + 1] - pos[j * 3 + 1],
//           dz = pos[i * 3 + 2] - pos[j * 3 + 2]
//         const distSq = dx * dx + dy * dy + dz * dz

//         if (distSq < h * h && distSq > 0.0001) {
//           const dist = Math.sqrt(distSq)
//           const w = 1.0 - dist / h

//           // 圧力の差分を計算（密度のエラー分だけ強く反発させる）
//           const densityError = densities[i] - restDensity
//           const pressure = stiffness * densityError

//           // 力を適用（密度が高いほど強く弾く）
//           const force = (pressure * w * w) / densities[i]
//           velocities[i * 3] += (dx / dist) * force * 0.05
//           velocities[i * 3 + 1] += (dy / dist) * force * 0.05
//           velocities[i * 3 + 2] += (dz / dist) * force * 0.05
//         }
//       }
//     }
//   }
// }

// function updateParticles_cur() {
//   // 色計算
//   diffuseColor()

//   // 密度計算
//   calcDensities()

//   // 圧力・粘性計算
//   calcPressure()

//   // 物理更新と境界判定
//   calcPhysics()

//   // 非圧縮性
//   applyCorrection()
// }

/******************************************************
 * 粒子の更新 （メインループ）
 *****************************************************/
// 統合されたメイン更新関数
function updateParticles(dt) {
  // すべての計算で共通の「近傍リスト」を生成
  // ※毎回生成すると重いので、実際は最適化が必要ですが、まずはこれで整理
  const allNeighbors = []
  for (let i = 0; i < count; i++) {
    allNeighbors[i] = getNeighbors(i)
  }

  // 1. 密度と圧力の更新（状態決定）
  // for (let i = 0; i < count; i++) {
  //   densityBuffer[i] = getWeightedAverage(massBuffer, i, allNeighbors[i])
  //   pressureBuffer[i] = calculatePressureFromDensity(densityBuffer[i])
  // }

  // 1. 密度と圧力の更新
  for (let i = 0; i < count; i++) {
    // 変更点：getWeightedAverage ではなく getWeightedSum を使う！
    // 質量（massBuffer）の重み付き合計が、その点の密度になります
    densityBuffer[i] = getWeightedSum(massBuffer, i, allNeighbors[i])

    pressureBuffer[i] = calculatePressureFromDensity(densityBuffer[i])
  }

  // 2. 力の計算（圧力勾配・粘性）
  for (let i = 0; i < count; i++) {
    // 汎用エンジンを使って、力をベクトルとして算出
    const force = calculateTotalForce(i, allNeighbors[i])

    // 重力の影響もここに入れると良いです
    velY[i] -= 9.8 * dt

    // 力（加速度）を速度に反映
    velX[i] += force.x * dt
    velY[i] += force.y * dt
    velZ[i] += force.z * dt
  }

  // 3. 物理更新（積分・境界判定）
  for (let i = 0; i < count; i++) {
    // 【ここに減衰処理を追加】
    const damping = 0.99 // 1より少し小さい値を掛ける
    velX[i] *= damping
    velY[i] *= damping
    velZ[i] *= damping

    // 位置の更新
    posX[i] += velX[i] * dt
    posY[i] += velY[i] * dt
    posZ[i] += velZ[i] * dt

    applyBoundary(i)
  }

  // 4. その他（色拡散など）
  for (let i = 0; i < count; i++) {
    applyColorDiffusion(i, allNeighbors[i])
  }
}

/******************************************************
 * 属性計算
 *****************************************************/
// 1. 密度と圧力の更新（状態決定）
/**
 * 密度から圧力を算出する
 * @param {number} density - 現在の密度
 * @returns {number} - 算出された圧力
 */
function calculatePressureFromDensity(density) {
  // 1. 理想密度との差分を求める
  // const densityError = density - restDensity

  // 2. 差分に係数（stiffness）を掛けて圧力にする
  // 密度が理想より高ければプラス（押し出す力）、低ければマイナス（吸い寄せる力）になります
  let pressure = stiffness * (density - restDensity)

  // 3. 負の圧力（吸い込み）は液体ではあまり起こらないため、0以上にする（任意）
  // 完全に「水」のように振る舞わせたい場合は、ここを Math.max(0, pressure) にします
  // return pressure
  return Math.max(0, Math.min(pressure, 50.0))
}

// 2. 力の計算（圧力勾配・粘性）
function calculateTotalForce(i, neighbors) {
  let forceX = 0
  let forceY = 0
  let forceZ = 0

  for (const n of neighbors) {
    const j = n.index

    // 1. 方向ベクトル (自分 i から 相手 j へのベクトル)
    const dx = posX[i] - posX[j]
    const dy = posY[i] - posY[j]
    const dz = posZ[i] - posZ[j]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist > 0 && dist < h) {
      // 2. 圧力による力 (圧力勾配)
      // 双方の圧力の平均が高いほど、強く押し返す
      const p_i = pressureBuffer[i]
      const p_j = pressureBuffer[j]
      const forceMag = (p_i + p_j) / 2.0 // 圧力の平均

      // 3. 力をベクトルに加算 (正規化した方向に力をかける)
      const w = 1.0 - dist / h // 距離が近いほど強く影響する重み
      forceX += (dx / dist) * forceMag * w
      forceY += (dy / dist) * forceMag * w
      forceZ += (dz / dist) * forceMag * w
    }
  }
  return { x: forceX, y: forceY, z: forceZ }
}

function applyBoundary(i) {
  const floorY = -1.5
  const wallX = 1.5
  const wallZ = 1.5
  const restitution = 0.001 // 反発係数（1.0で完全弾性衝突、0で全く跳ね返らない）

  // 床（Y軸の下限）
  if (posY[i] < floorY) {
    posY[i] = floorY
    velY[i] *= -restitution // 速度を反転させて跳ね返す
  }

  // 壁（X軸）
  if (Math.abs(posX[i]) > wallX) {
    posX[i] = Math.sign(posX[i]) * wallX
    velX[i] *= -restitution
  }

  // 壁（Z軸）
  if (Math.abs(posZ[i]) > wallZ) {
    posZ[i] = Math.sign(posZ[i]) * wallZ
    velZ[i] *= -restitution
  }
}

function applyColorDiffusion(i, neighbors) {
  const diffusionRate = 0.05 // 混ざり合う強さ（0.0〜1.0）

  // 周囲の粒子の色の平均を計算する
  const avgR = getWeightedAverage(colorR, i, neighbors)
  const avgG = getWeightedAverage(colorG, i, neighbors)
  const avgB = getWeightedAverage(colorB, i, neighbors)

  // 自分の色を、周囲の平均値へ少しだけ近づける
  colorR[i] += (avgR - colorR[i]) * diffusionRate
  colorG[i] += (avgG - colorG[i]) * diffusionRate
  colorB[i] += (avgB - colorB[i]) * diffusionRate
}

/******************************************************
 * 汎用関数
 *****************************************************/
// 1. 距離計算（バラバラの配列を参照しているか）
function getDistance(i, j) {
  const dx = posX[j] - posX[i]
  const dy = posY[j] - posY[i]
  const dz = posZ[j] - posZ[i]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// 2. 近傍探索（EPSILON保護はあるか）
function getNeighbors(i) {
  let neighbors = []
  const EPSILON = 0.0001
  for (let j = 0; j < count; j++) {
    if (i === j) continue
    const dist = getDistance(i, j)
    if (dist > EPSILON && dist < h) {
      const weight = calculateWeight(dist, h)
      neighbors.push({ index: j, weight: weight })
    }
  }
  return neighbors
}

function calculateWeight(dist, h) {
  if (dist >= h) return 0
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

// 【密度計算用：平均ではなく、重みの合計を出す】
function getWeightedSum(targetPropertyArray, i, neighbors) {
  let sum = 0
  for (const n of neighbors) {
    sum += targetPropertyArray[n.index] * n.weight
  }
  return sum
}

/******************************************************
 * フレーム更新
 *****************************************************/
const pos = geometry.attributes.position.array

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const dt = Math.min(clock.getDelta(), 0.033) // 最大でも 0.033秒(約30fps相当)までに制限

  // updateParticles_cur()
  updateParticles(dt)

  controls.update()

  for (let i = 0; i < count; i++) {
    // 位置の反映
    geometry.attributes.position.setXYZ(i, posX[i], posY[i], posZ[i])
    // 色を three.js のジオメトリにセット
    geometry.attributes.color.setXYZ(i, colorR[i], colorG[i], colorB[i])
  }

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true

  renderer.render(scene, camera)
}
animate()
