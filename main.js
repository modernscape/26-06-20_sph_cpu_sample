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
