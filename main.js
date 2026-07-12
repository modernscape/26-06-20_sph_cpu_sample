import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

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
const PARTICLE_SPACING = 0.05

// ======================
// Constants : Fluid Parameters
// ======================

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

// const forceX = new Float32Array(MAX_PARTICLES)
// const forceY = new Float32Array(MAX_PARTICLES)
// const forceZ = new Float32Array(MAX_PARTICLES)

// const density = new Float32Array(MAX_PARTICLES)
// const pressure = new Float32Array(MAX_PARTICLES)

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
camera.position.y = 1
camera.position.z = 1

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
function updateParticles(dt) {}

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
 * System : animate()
 *****************************************************/
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

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
