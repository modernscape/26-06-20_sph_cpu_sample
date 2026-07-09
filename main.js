import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// STEP 1
// □ 定数
// □ Particle Buffers
// □ Scene
// □ Camera
// □ Renderer
// □ Controls
// □ Geometry
// □ Material
// □ Points
// □ initParticles()
// □ updateParticles()
// □ updateGeometry()
// □ animate()
// □ resize()

/******************************************************
 * 定数
 *****************************************************/
const MAX_PARTICLES = 5000
let count = 0

/******************************************************
 * データ構造
 *****************************************************/
// Position
// Velocity
// Force
// Density
// Pressure
// Mass
// Color
// Lambda
// DeltaPosition

const posX = new Float32Array(MAX_PARTICLES)
const posY = new Float32Array(MAX_PARTICLES)
const posZ = new Float32Array(MAX_PARTICLES)

const velX = new Float32Array(MAX_PARTICLES)
const velY = new Float32Array(MAX_PARTICLES)
const velZ = new Float32Array(MAX_PARTICLES)

const forceX = new Float32Array(MAX_PARTICLES)
const forceY = new Float32Array(MAX_PARTICLES)
const forceZ = new Float32Array(MAX_PARTICLES)

const density = new Float32Array(MAX_PARTICLES)
const pressure = new Float32Array(MAX_PARTICLES)
const mass = new Float32Array(MAX_PARTICLES)

const colorR = new Float32Array(MAX_PARTICLES)
const colorG = new Float32Array(MAX_PARTICLES)
const colorB = new Float32Array(MAX_PARTICLES)

// Position Based Fluids
const lambda = new Float32Array(MAX_PARTICLES)
const deltaPosX = new Float32Array(MAX_PARTICLES)
const deltaPosY = new Float32Array(MAX_PARTICLES)
const deltaPosZ = new Float32Array(MAX_PARTICLES)

/******************************************************
 * シーン構築
 *****************************************************/
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000,
)
camera.position.x = 0
camera.position.y = 2
camera.position.z = 2

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.getElementById("app").appendChild(renderer.domElement)
const controls = new OrbitControls(camera, renderer.domElement)
controls.minDistance = 0
controls.maxDistance = 10000
controls.minPolarAngle = 0
controls.maxPolarAngle = Math.PI

/******************************************************
 * points オブジェクト
 *****************************************************/
const geometry = new THREE.BufferGeometry()
const posArray = new Float32Array(MAX_PARTICLES * 3)

geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))
const material = new THREE.PointsMaterial({
  size: 0.02,
  transparent: false,
  color: 0xff0000,
  opacity: 0.8,
})

const points = new THREE.Points(geometry, material)
points.geometry.computeBoundingSphere()
points.geometry.boundingSphere.radius += 10
scene.add(points)

/******************************************************
 * initParticles()
 *****************************************************/
async function initParticles() {
  await addParticleSeqentially(200)
}

// 粒子を順番に追加
function addParticleSeqentially(num, intervalMs = 10) {
  return new Promise((resolve) => {
    let added = 0
    const timer = setInterval(() => {
      addParticle()
      added++
      if (added >= num) {
        clearInterval(timer)
        resolve()
      }
    }, intervalMs)
  })
}

// 粒子を追加
function addParticle() {
  if (count >= MAX_PARTICLES) return

  const range = 1.0
  posX[count] = (Math.random() - 0.5) * (range * 2)
  posY[count] = 0.0
  posZ[count] = (Math.random() - 0.5) * (range * 2)

  geometry.attributes.position.setXYZ(
    count,
    posX[count],
    posY[count],
    posZ[count],
  )
  geometry.attributes.position.needsUpdate = true

  count++
}

initParticles()
animate()

/******************************************************
 * updateParticles()
 *****************************************************/
function updateParticles() {}

/******************************************************
 * animate()
 *****************************************************/
function animate() {
  requestAnimationFrame(animate)

  updateParticles()

  renderer.render(scene, camera)
  controls.update()
}
