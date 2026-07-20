import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GrannyKnot } from "three/examples/jsm/curves/CurveExtras.js"

/******************************************************
 * UI
 *****************************************************/
window.addEventListener("resize", onWindowResize, false)

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

// ==========================
// Constants : Engine Parameters
// ==========================
const MAX_PARTICLES = 5000

// ======================
// Constants : Simulation Parameters
// ======================
const PARTICLE_SPACING = 0.05 //0.05
const KERNEL_RADIUS = 0.1
const CELL_SIZE = 0.1
const GRAVITY = -0.2

// ======================
// Constants : Fluid Parameters
// ======================
const REST_DENSITY = 2.0 // 自然な密度
const STIFFNESS = 1.0 // 圧力の強さ
const VISCOSITY = 0.5 // 粘性　：速度を平均化しようとする度合い
const RESTITUTION = 0.9
const BOX = 0.8

// Density は 1〜5程度に収まるように設計する。
// REST_DENSITY は、初期状態の平均密度に合わせる。
// Pressure は 0〜1程度から始め、必要に応じて STIFFNESS

// ======================
// Constants : Rendering Parameters
// ======================

/******************************************************
 * Data : Position
 *****************************************************/
const posX = new Float32Array(MAX_PARTICLES)
const posY = new Float32Array(MAX_PARTICLES)
const posZ = new Float32Array(MAX_PARTICLES)

/******************************************************
 * Data : Velocity
 *****************************************************/
const velX = new Float32Array(MAX_PARTICLES)
const velY = new Float32Array(MAX_PARTICLES)
const velZ = new Float32Array(MAX_PARTICLES)

/******************************************************
 * Data : Mass
 *****************************************************/
const mass = new Float32Array(MAX_PARTICLES).fill(1)

/******************************************************
 * Data : Color
 *****************************************************/
const colorR = new Float32Array(MAX_PARTICLES)
const colorG = new Float32Array(MAX_PARTICLES)
const colorB = new Float32Array(MAX_PARTICLES)

const forceX = new Float32Array(MAX_PARTICLES)
const forceY = new Float32Array(MAX_PARTICLES)
const forceZ = new Float32Array(MAX_PARTICLES)

const density = new Float32Array(MAX_PARTICLES)
const pressure = new Float32Array(MAX_PARTICLES)

// Viscosity（粘性）
const viscosity = new Float32Array(MAX_PARTICLES)

const viscosityForceX = new Float32Array(MAX_PARTICLES)
const viscosityForceY = new Float32Array(MAX_PARTICLES)
const viscosityForceZ = new Float32Array(MAX_PARTICLES)

// Position Based Fluids
// const lambda = new Float32Array(MAX_PARTICLES)
// const deltaPosX = new Float32Array(MAX_PARTICLES)
// const deltaPosY = new Float32Array(MAX_PARTICLES)
// const deltaPosZ = new Float32Array(MAX_PARTICLES)

let particleCount = 0

/******************************************************
 * View : Scene
 *****************************************************/
const scene = new THREE.Scene()

/******************************************************
 * View : Camera
 *****************************************************/
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000,
)
camera.position.x = 0
camera.position.y = 1.5
camera.position.z = 1.5

/******************************************************
 * View : Renderer
 *****************************************************/
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.getElementById("app").appendChild(renderer.domElement)

/******************************************************
 * View : Controls
 *****************************************************/
const controls = new OrbitControls(camera, renderer.domElement)
controls.minDistance = 0
controls.maxDistance = 10000
controls.minPolarAngle = 0
controls.maxPolarAngle = Math.PI

/******************************************************
 * View : Geometry
 *****************************************************/
const geometry = new THREE.BufferGeometry()

const posArray = new Float32Array(MAX_PARTICLES * 3)
const positionAttribute = new THREE.BufferAttribute(posArray, 3)
positionAttribute.setUsage(THREE.DynamicDrawUsage)
geometry.setAttribute("position", positionAttribute)

const colorArray = new Float32Array(MAX_PARTICLES * 3)
const colorAttribute = new THREE.BufferAttribute(colorArray, 3)
colorAttribute.setUsage(THREE.DynamicDrawUsage)
geometry.setAttribute("color", colorAttribute)

/******************************************************
 * View : Material
 *****************************************************/
const material = new THREE.PointsMaterial({
  size: 0.01,
  transparent: false,
  vertexColors: true,
  opacity: 0.8,
})

/******************************************************
 * View : Points
 *****************************************************/
const points = new THREE.Points(geometry, material)
points.geometry.computeBoundingSphere()
points.geometry.boundingSphere.radius += 10
scene.add(points)

/******************************************************
 * View : Misc.
 *****************************************************/
const axes = new THREE.AxesHelper(1)
scene.add(axes)

/******************************************************
 * System : initParticles()
 *****************************************************/
function createGridParticles(num) {
  const centerOffset = 0.5
  const cols = Math.floor(Math.sqrt(num))
  const rows = Math.ceil(num / cols)

  for (let i = 0; i < num; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    const x = PARTICLE_SPACING * (col - cols * centerOffset + centerOffset)
    const z = PARTICLE_SPACING * (row - rows * centerOffset + centerOffset)
    const y = 0

    createParticle(
      x, //
      0,
      z,
      0,
      0,
      0,
      1,
      0,
      0,
    )
  }
}

/******************************************************
 * System : createParticle()
 *****************************************************/
function createParticle(x, y, z, vx, vy, vz, r, g, b) {
  if (particleCount >= MAX_PARTICLES) return

  const i = particleCount++

  posX[i] = x
  posY[i] = y
  posZ[i] = z

  velX[i] = vx
  velY[i] = vy
  velZ[i] = vz

  colorR[i] = r
  colorG[i] = g
  colorB[i] = b
}

/******************************************************
 * System : updateParticles()
 *****************************************************/
const corectionX = new Float32Array(MAX_PARTICLES)
const corectionY = new Float32Array(MAX_PARTICLES)
const corectionZ = new Float32Array(MAX_PARTICLES)
const prevPosX = new Float32Array(MAX_PARTICLES)
const prevPosY = new Float32Array(MAX_PARTICLES)
const prevPosZ = new Float32Array(MAX_PARTICLES)

const iteration = 1

function updateParticles(dt) {
  calcPosition(dt)
  for (let j = 0; j < iteration; j++) {
    calcConstraint()
    correctPosition()
  }
}

// function calcPosition__(dt) {
//   for (let i = 0; i < particleCount; i++) {
//     // 1. 前回の位置を保存
//     const tempX = posX[i]
//     const tempY = posY[i]
//     const tempZ = posZ[i]

//     // 2. 速度（位置の差分）を更新（慣性を考慮）
//     // 慣性係数 damping (例: 0.99) をかけると安定します
//     const damping = 0.99
//     const vx = (posX[i] - prevPosX[i]) * damping
//     const vy = (posY[i] - prevPosY[i]) * damping
//     const vz = (posZ[i] - prevPosZ[i]) * damping

//     // 3. 現在の位置を更新 (Verlet積分)
//     // 外力(加速度)を加える
//     const acc_x = forceX[i] / mass[i]
//     const acc_y = (forceY[i] + GRAVITY) / mass[i]
//     const acc_z = forceZ[i] / mass[i]

//     posX[i] += vx + acc_x * dt * dt
//     posY[i] += vy + acc_y * dt * dt
//     posZ[i] += vz + acc_z * dt * dt

//     // 4. prevPosを更新
//     prevPosX[i] = tempX
//     prevPosY[i] = tempY
//     prevPosZ[i] = tempZ

//     checkBoundary(i)
//   }
// }

function calcPosition(dt) {
  for (let i = 0; i < particleCount; i++) {
    prevPosX[i] = posX[i]
    prevPosY[i] = posY[i]
    prevPosZ[i] = posZ[i]
    const totalForce_x = forceX[i] + viscosityForceX[i]
    const totalForce_y = forceY[i] + viscosityForceY[i] + GRAVITY
    const totalForce_z = forceZ[i] + viscosityForceZ[i]
    const acc_x = totalForce_x / mass[i]
    const acc_y = totalForce_y / mass[i]
    const acc_z = totalForce_z / mass[i]
    velX[i] += acc_x * dt
    velY[i] += acc_y * dt
    velZ[i] += acc_z * dt
    posX[i] += velX[i] * dt
    posY[i] += velY[i] * dt
    posZ[i] += velZ[i] * dt

    checkBoundary(i)
  }
}

const correctionFactor = 0.00001
function calcConstraint() {
  for (let i = 0; i < particleCount; i++) {
    const neighbors = getNeighbors(i)
    if (neighbors.length === 0) {
    }
    corectionX[i] = 0
    corectionY[i] = 0
    corectionZ[i] = 0
    for (const j of neighbors) {
      const direction = getDirection(i, j)
      if (direction.dist > PARTICLE_SPACING) continue

      const correction =
        (Math.max(0, density[i] - REST_DENSITY) * correctionFactor) /
        neighbors.length
      corectionX[i] += direction.nx * correction
      corectionY[i] += direction.ny * correction
      corectionZ[i] += direction.nz * correction
    }
  }
}

function correctPosition() {
  for (let i = 0; i < particleCount; i++) {
    posX[i] += corectionX[i]
    posY[i] += corectionY[i]
    posZ[i] += corectionZ[i]
  }
}

function getDistanceSquared(i, j) {
  const dx = posX[j] - posX[i]
  const dy = posY[j] - posY[i]
  const dz = posZ[j] - posZ[i]
  return dx * dx + dy * dy + dz * dz
}

function getWeight(dist) {
  if (dist >= KERNEL_RADIUS) return 0
  return 1 - dist / KERNEL_RADIUS
}

function getDirection(i, j) {
  const dx = posX[j] - posX[i]
  const dy = posY[j] - posY[i]
  const dz = posZ[j] - posZ[i]
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist === 0) {
    return { nx: 0, ny: 0, nz: 0, dist: 0 }
  }
  return {
    nx: dx / dist, //
    ny: dy / dist,
    nz: dz / dist,
    dist: dist,
  }
}

function calcDensity() {
  for (let i = 0; i < particleCount; i++) {
    density[i] = 0
    const neighbors = getNeighbors(i)
    let densitySum = 0
    for (const j of neighbors) {
      const dist = Math.sqrt(getDistanceSquared(i, j))
      if (dist >= KERNEL_RADIUS) continue
      densitySum += mass[j] * getWeight(dist)
    }
    density[i] = densitySum
  }
}

function calcPressure() {
  for (let i = 0; i < particleCount; i++) {
    pressure[i] = STIFFNESS * Math.max(0, density[i] - REST_DENSITY)
  }
}

function calcPressureForce(i) {
  forceX[i] = 0
  forceY[i] = 0
  forceZ[i] = 0
  const neighbors = getNeighbors(i)
  for (const j of neighbors) {
    const pressureTerm = -(pressure[j] + pressure[i]) * 0.5
    const direction = getDirection(i, j)
    const weight = getWeight(direction.dist)
    const force_x = pressureTerm * weight * direction.nx
    const force_y = pressureTerm * weight * direction.ny
    const force_z = pressureTerm * weight * direction.nz
    forceX[i] += force_x
    forceY[i] += force_y
    forceZ[i] += force_z
  }
}

function calcViscosityForce(i) {
  viscosityForceX[i] = 0
  viscosityForceY[i] = 0
  viscosityForceZ[i] = 0
  const neighbors = getNeighbors(i)
  for (const j of neighbors) {
    const dvx = velX[j] - velX[i]
    const dvy = velY[j] - velY[i]
    const dvz = velZ[j] - velZ[i]
    const dist = Math.sqrt(getDistanceSquared(i, j))
    const weight = getWeight(dist)
    viscosityForceX[i] += VISCOSITY * dvx * weight
    viscosityForceY[i] += VISCOSITY * dvy * weight
    viscosityForceZ[i] += VISCOSITY * dvz * weight
  }
}

function checkBoundary(i) {
  if (posY[i] <= -BOX) {
    posY[i] = -BOX
    velY[i] *= -1.0 * RESTITUTION
  }
  if (posX[i] <= -BOX) {
    posX[i] = -BOX
    velX[i] *= -1.0 * RESTITUTION
  }
  if (posX[i] >= BOX) {
    posX[i] = BOX
    velX[i] *= -1.0 * RESTITUTION
  }
  if (posZ[i] <= -BOX) {
    posZ[i] = -BOX
    velZ[i] *= -1.0 * RESTITUTION
  }
  if (posZ[i] >= BOX) {
    posZ[i] = BOX
    velZ[i] *= -1.0 * RESTITUTION
  }
  // console.log("after boundary", i, posX[i])
}

/******************************************************
 * System : updateGeometry()
 *****************************************************/
function updateGeometry() {
  for (let i = 0; i < particleCount; i++) {
    positionAttribute.setXYZ(i, posX[i], posY[i], posZ[i])
    colorAttribute.setXYZ(i, colorR[i], colorG[i], colorB[i])
  }
  positionAttribute.needsUpdate = true
  colorAttribute.needsUpdate = true
  geometry.setDrawRange(0, particleCount)
}

/******************************************************
 * System : updateUniformGrid()
 *****************************************************/
const grid = new Map()
function updateUniformGrid() {
  grid.clear()
  for (let i = 0; i < particleCount; i++) {
    const x = Math.floor(posX[i] / CELL_SIZE)
    const y = Math.floor(posY[i] / CELL_SIZE)
    const z = Math.floor(posZ[i] / CELL_SIZE)
    const key = `${x},${y},${z}`
    if (!grid.has(key)) {
      grid.set(key, [])
    }
    grid.get(key).push(i)
  }
}

/******************************************************
 * System : getNeighbors()
 *****************************************************/
function getNeighbors(i) {
  const x0 = Math.floor(posX[i] / CELL_SIZE)
  const y0 = Math.floor(posY[i] / CELL_SIZE)
  const z0 = Math.floor(posZ[i] / CELL_SIZE)
  const neighbors = []
  for (let x = x0 - 1; x < x0 + 2; x++) {
    for (let y = y0 - 1; y < y0 + 2; y++) {
      for (let z = z0 - 1; z < z0 + 2; z++) {
        const key = `${x},${y},${z}`
        const indexes = grid.get(key)
        if (!indexes) continue
        for (const j of indexes) {
          if (j !== i) {
            neighbors.push(j)
          }
        }
      }
    }
  }
  return neighbors
}

/******************************************************
 * System : animate()
 *****************************************************/
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  updateUniformGrid()

  calcDensity()
  calcPressure()

  for (let i = 0; i < particleCount; i++) {
    calcPressureForce(i)
    calcViscosityForce(i)
  }

  const dt = clock.getDelta()
  updateParticles(dt)

  updateGeometry()
  controls.update()
  renderer.render(scene, camera)
}

/******************************************************
 * System : Execution
 *****************************************************/
createGridParticles(900)
animate()
