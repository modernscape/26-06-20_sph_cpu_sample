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

/******************************************************
 * 定数
 *****************************************************/
const MAX_PARTICLES = 5000
let particleCount = 0

/******************************************************
 * データ
 *****************************************************/

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
const colorArray = new Float32Array(MAX_PARTICLES * 3)

geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))
geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3))
const material = new THREE.PointsMaterial({
  size: 0.02,
  transparent: false,
  vertexColors: true,
  opacity: 0.8,
})

const points = new THREE.Points(geometry, material)
points.geometry.computeBoundingSphere()
points.geometry.boundingSphere.radius += 10
scene.add(points)

/******************************************************
 * initParticles()
 *****************************************************/
async function initParticles(num) {
  const range = 1.0
  for (let i = 0; i < num; i++) {
    createParticle(
      (Math.random() - 0.5) * (range * 2),
      0.0,
      (Math.random() - 0.5) * (range * 2),
      0.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
    )
  }
}

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

initParticles(10)
animate()

function updateGeometry() {
  for (let i = 0; i < particleCount; i++) {
    geometry.attributes.position.setXYZ(i, posX[i], posY[i], posZ[i])
    geometry.attributes.color.setXYZ(i, colorR[i], colorG[i], colorB[i])
  }
  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
}

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

  updateGeometry()

  controls.update()

  renderer.render(scene, camera)
}
