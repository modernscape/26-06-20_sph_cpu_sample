import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

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

// const geometry = new THREE.BufferGeometry()
// geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3))
// geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
// const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true })
// const points = new THREE.Points(geometry, material)
// scene.add(points)

/******************************************************
 * 定数
 *****************************************************/
const MAX_PARTICLES = 5000

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
