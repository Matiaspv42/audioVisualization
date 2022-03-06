import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import sphereVertexShader from './shaders/sphereShaders/vertex.glsl'
import sphereFragmentShader from './shaders/sphereShaders/fragment.glsl'


function avg(arr) {
    var total = arr.reduce(function (sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr) {
    return arr.reduce(function (a, b) { return Math.max(a, b); })
}
function modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
}
function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Sphere
 */

const radius =4

const sphereGeometry = new THREE.DodecahedronGeometry(radius,10)
const sphereMaterial = new THREE.ShaderMaterial({
    wireframe:true,
    vertexShader:sphereVertexShader,
    fragmentShader:sphereFragmentShader,
    uniforms:{
        uTime:{value:0}
    }
})

const sphere = new THREE.Mesh(sphereGeometry,sphereMaterial)
scene.add(sphere)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha:true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Audio
 */
const audioContext = new AudioContext();
// get the audio element
const audioElement = document.querySelector('audio');
// pass it into the audio context
const track = audioContext.createMediaElementSource(audioElement);

// Create analyser
var analyser = audioContext.createAnalyser();
track.connect(analyser)
analyser.connect(audioContext.destination)
analyser.fftSize = 1024;
const bufferLength = analyser.frequencyBinCount
console.log(bufferLength)
var dataArray = new Float32Array(bufferLength);
analyser.getFloatFrequencyData(dataArray)


// add attributes to sphere


// select our play button
const playButton = document.querySelector('button');
playButton.addEventListener('click', function() {
    // check if context is in suspended state (autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // play or pause track depending on state
    if (this.dataset.playing === 'false') {
        audioElement.play();
        this.dataset.playing = 'true';
    } else if (this.dataset.playing === 'true') {
        audioElement.pause();
        this.dataset.playing = 'false';
    }
}, false);

/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime

    sphereMaterial.uniforms.uTime.value = elapsedTime

   if (playButton.dataset.playing === 'true') {
        analyser.getFloatFrequencyData(dataArray)
        var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
        var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

        var overallAvg = avg(dataArray);
        var lowerMax = max(lowerHalfArray);
        var lowerAvg = avg(lowerHalfArray);
        var upperMax = max(upperHalfArray);
        var upperAvg = avg(upperHalfArray);

        

        var lowerMaxFr = lowerMax / lowerHalfArray.length;
        var lowerAvgFr = lowerAvg / lowerHalfArray.length;
        var upperMaxFr = upperMax / upperHalfArray.length;
        var upperAvgFr = upperAvg / upperHalfArray.length;


        var scalingRate = Math.tanh(lowerAvgFr) * 4 + 1;

        sphere.scale.set(1+(scalingRate*0.5),1+(scalingRate*0.5),1+(scalingRate*0.5));

        const count = sphereGeometry.attributes.position.count
        const randoms = new Float32Array(count)
        randoms.fill(modulate(upperAvgFr, 0, 1, 0, 4))
        const randoms2 = new Float32Array(count)
        randoms2.fill(lowerMaxFr)
        console.log(lowerMaxFr, modulate(lowerMaxFr, 0, 1, 0, 4), upperMaxFr, randoms[0])
        sphereGeometry.setAttribute('aBass', new THREE.BufferAttribute(randoms2,1))
        sphereGeometry.setAttribute('aTreble', new THREE.BufferAttribute(randoms,1))
    }
    
    // rotation 
    sphere.rotation.x +=0.0003
    sphere.rotation.y +=0.0002
    sphere.rotation.z +=0.0008

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

