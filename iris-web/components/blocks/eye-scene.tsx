'use client'
import { useEffect, useRef } from 'react'

/**
 * Interactive 3D eye built with three.js (no external model files):
 * - a glossy eyeball with a procedurally drawn grayscale iris and a bulging, see-through cornea
 * - dark eyelid shells that give it an almond shape and blink every few seconds
 * - it looks at your cursor (or your finger) and glances around on its own when idle
 * - `flashSignal` changes → the pupil does a real light reflex: a short delay, a fast
 *   squeeze, then a slow relax back
 */

type Props = {
    className?: string
    /** Increment to fire a "flash of light". */
    flashSignal: number
    /** Pupil size as a fraction of the iris (about 0.2–0.5), reported ~10 times a second. */
    onPupilChange?: (size: number) => void
}

const IRIS_ANGLE = 0.6 // angular radius of the iris on the eyeball (radians)
const PUPIL_REST = 0.46 // dilated: the scene is dark
const PUPIL_LIT = 0.2 // constricted after a flash
const REFLEX_DELAY = 0.25 // seconds before the pupil starts to react
const REFLEX_HOLD = 0.6 // seconds the light "stays on" for the pupil

function drawIrisTexture(size = 1024) {
    // Polar layout: x = angle around the pupil, y = distance (top = pupil, bottom = edge of the iris).
    const w = size
    const h = size / 2
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    let seed = 42
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

    const base = g.createLinearGradient(0, 0, 0, h)
    base.addColorStop(0, '#202020')
    base.addColorStop(0.18, '#4a4a4a')
    base.addColorStop(0.33, '#9a9a9a')
    base.addColorStop(0.38, '#b8b8b8') // collarette
    base.addColorStop(0.45, '#8c8c8c')
    base.addColorStop(0.8, '#6e6e6e')
    base.addColorStop(0.92, '#3a3a3a')
    base.addColorStop(1, '#0c0c0c') // limbal ring
    g.fillStyle = base
    g.fillRect(0, 0, w, h)

    // Radial fibres (vertical strokes in polar space).
    for (let i = 0; i < 2200; i++) {
        const x = rand() * w
        const y0 = h * (0.12 + rand() * 0.3)
        const y1 = h * (0.55 + rand() * 0.42)
        const drift = (rand() - 0.5) * 18
        const light = rand() > 0.55
        g.strokeStyle = light ? `rgba(235,235,235,${0.05 + rand() * 0.16})` : `rgba(10,10,10,${0.06 + rand() * 0.2})`
        g.lineWidth = 0.6 + rand() * 1.8
        g.beginPath()
        g.moveTo(x, y0)
        g.quadraticCurveTo(x + drift, (y0 + y1) / 2, x + drift * 0.4, y1)
        g.stroke()
    }

    // Crypts: small dark pits around the collarette.
    for (let i = 0; i < 90; i++) {
        const x = rand() * w
        const y = h * (0.36 + rand() * 0.25)
        g.fillStyle = `rgba(0,0,0,${0.18 + rand() * 0.25})`
        g.beginPath()
        g.ellipse(x, y, 2 + rand() * 7, 6 + rand() * 16, 0, 0, Math.PI * 2)
        g.fill()
    }

    // Soft ring at the pupil edge.
    const ruff = g.createLinearGradient(0, 0, 0, h * 0.2)
    ruff.addColorStop(0, 'rgba(0,0,0,0.9)')
    ruff.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = ruff
    g.fillRect(0, 0, w, h * 0.2)
    return c
}

export function EyeScene({ className, flashSignal, onPupilChange }: Props) {
    const mountRef = useRef<HTMLDivElement>(null)
    const flashRef = useRef<() => void>(() => {})
    const onPupilRef = useRef(onPupilChange)

    useEffect(() => {
        onPupilRef.current = onPupilChange
    }, [onPupilChange])

    useEffect(() => {
        if (flashSignal > 0) flashRef.current()
    }, [flashSignal])

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return
        let disposed = false
        let cleanup = () => {}

        ;(async () => {
            const THREE = await import('three')
            const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
            if (disposed) return

            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            let width = mount.clientWidth || 1
            let height = mount.clientHeight || 1

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.setSize(width, height)
            renderer.outputColorSpace = THREE.SRGBColorSpace
            renderer.toneMapping = THREE.ACESFilmicToneMapping
            renderer.toneMappingExposure = 1.15
            renderer.domElement.style.display = 'block'
            renderer.domElement.style.width = '100%'
            renderer.domElement.style.height = '100%'
            mount.appendChild(renderer.domElement)

            const scene = new THREE.Scene()
            const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100)
            camera.position.set(0, 0, 5.4)

            const pmrem = new THREE.PMREMGenerator(renderer)
            const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
            scene.environment = envTex
            scene.environmentIntensity = 0.7

            const key = new THREE.DirectionalLight(0xffffff, 1.6)
            key.position.set(-2.5, 3, 4)
            scene.add(key)
            const rim = new THREE.DirectionalLight(0xffffff, 0.8)
            rim.position.set(3, -1, -2)
            scene.add(rim)
            scene.add(new THREE.AmbientLight(0xffffff, 0.15))

            // ----- eyeball -----
            const eye = new THREE.Group()
            scene.add(eye)

            const scleraGeo = new THREE.SphereGeometry(1, 96, 64)
            const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.4 })
            eye.add(new THREE.Mesh(scleraGeo, scleraMat))

            const irisTex = new THREE.CanvasTexture(drawIrisTexture())
            irisTex.colorSpace = THREE.SRGBColorSpace
            irisTex.wrapS = THREE.RepeatWrapping
            irisTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
            const irisGeo = new THREE.SphereGeometry(1.002, 128, 24, 0, Math.PI * 2, 0, IRIS_ANGLE)
            irisGeo.rotateX(Math.PI / 2) // cap faces the camera (+Z)
            const pupil = { value: PUPIL_REST }
            const irisMat = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.55 })
            irisMat.onBeforeCompile = (shader) => {
                shader.uniforms.uPupil = pupil
                shader.fragmentShader = shader.fragmentShader
                    .replace('#include <common>', '#include <common>\nuniform float uPupil;')
                    .replace(
                        '#include <map_fragment>',
                        `#include <map_fragment>
                        float pupilEdge = 1.0 - uPupil;
                        float inPupil = smoothstep(pupilEdge - 0.015, pupilEdge + 0.004, vMapUv.y);
                        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.004), inPupil);`,
                    )
                    // The pupil is a hole: also drop the reflections the material would add on top.
                    .replace('#include <dithering_fragment>', 'gl_FragColor.rgb *= 1.0 - 0.96 * inPupil;\n#include <dithering_fragment>')
            }
            eye.add(new THREE.Mesh(irisGeo, irisMat))

            // Cornea: a smaller sphere cap that bulges over the iris and catches reflections.
            const edgeR = Math.sin(IRIS_ANGLE + 0.03)
            const corneaR = 0.64
            const corneaZ = Math.cos(IRIS_ANGLE + 0.03) - Math.sqrt(corneaR * corneaR - edgeR * edgeR)
            const corneaGeo = new THREE.SphereGeometry(corneaR, 96, 48, 0, Math.PI * 2, 0, Math.asin(edgeR / corneaR))
            corneaGeo.rotateX(Math.PI / 2)
            corneaGeo.translate(0, 0, corneaZ)
            const corneaMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transmission: 1,
                thickness: 0.15,
                ior: 1.376,
                roughness: 0.02,
                specularIntensity: 1,
                transparent: true,
                envMapIntensity: 0.12, // keep the pupil black: just a crisp highlight, not a milky reflection
            })
            eye.add(new THREE.Mesh(corneaGeo, corneaMat))

            // ----- eyelids: an almond-shaped opening drawn in front of the eye -----
            // A card-coloured plane with a soft almond hole (and a shadow under the upper lid).
            // It fades out away from the eye so the background grid still shows.
            const LID_Z = 1.26
            const lid = {
                uOpen: { value: 1 },
                uOffset: { value: 0 },
                uK: { value: 1 },
            }
            const updateLidScale = () => {
                lid.uK.value = camera.position.z / (camera.position.z - LID_Z)
            }
            updateLidScale()
            const lidMat = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                uniforms: { ...lid, uColor: { value: new THREE.Color(10 / 255, 10 / 255, 10 / 255) } },
                vertexShader: `varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `
                    varying vec2 vPos;
                    uniform float uOpen; uniform float uOffset; uniform float uK; uniform vec3 uColor;
                    void main() {
                        // Work in "eyeball units": the plane sits in front of the eye, so scale by perspective.
                        vec2 p = vPos * uK;
                        float w = 0.98, h = 0.6;
                        float x = p.x / w;
                        float y = p.y - uOffset;
                        float opening = h * uOpen * pow(max(0.0, 1.0 - x * x), 0.8);
                        float d = abs(y) - opening;
                        float lidA = smoothstep(-0.015, 0.015, d);
                        float shade = y > 0.0 ? smoothstep(-0.26, 0.0, d) * 0.6 : smoothstep(-0.1, 0.0, d) * 0.35;
                        float a = max(lidA, shade);
                        a *= 1.0 - smoothstep(1.08, 1.45, length(p));
                        gl_FragColor = vec4(uColor, a);
                    }`,
            })
            const lidMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), lidMat)
            lidMesh.position.z = LID_Z
            lidMesh.renderOrder = 10
            scene.add(lidMesh)

            // ----- interaction -----
            const target = { x: 0, y: 0 }
            const look = { x: 0, y: 0 }
            let lastPointer = 0
            const onPointer = (e: PointerEvent) => {
                const r = mount.getBoundingClientRect()
                const cx = r.left + r.width / 2
                const cy = r.top + r.height / 2
                target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)))
                target.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5)))
                lastPointer = performance.now()
            }
            window.addEventListener('pointermove', onPointer, { passive: true })

            let flashAt = -Infinity
            flashRef.current = () => {
                flashAt = performance.now() / 1000
            }

            // ----- animation loop (only while on screen) -----
            const clock = new THREE.Clock()
            let nextGlance = 0
            let nextBlink = 2 + Math.random() * 3
            let blinkStart = -1
            let lastReport = 0
            let visible = true
            let frame = 0

            const tick = () => {
                frame = 0
                if (!visible || disposed) return
                const dt = Math.min(clock.getDelta(), 0.05)
                const t = clock.elapsedTime
                const now = performance.now()

                // Idle: glance around when the pointer hasn't moved for a while.
                if (!reduceMotion && now - lastPointer > 2500 && t > nextGlance) {
                    target.x = (Math.random() - 0.5) * 0.9
                    target.y = (Math.random() - 0.5) * 0.6
                    nextGlance = t + 1.2 + Math.random() * 1.8
                }
                const follow = 1 - Math.exp(-dt * 7)
                look.x += (target.x - look.x) * follow
                look.y += (target.y - look.y) * follow
                eye.rotation.y = look.x * 0.55
                eye.rotation.x = look.y * 0.38

                // Pupillary light reflex: delay → fast constriction → slow recovery.
                const since = now / 1000 - flashAt // flashAt is in performance.now() seconds
                const lit = since > REFLEX_DELAY && since < REFLEX_DELAY + REFLEX_HOLD
                const goal = lit ? PUPIL_LIT : PUPIL_REST
                const tau = goal < pupil.value ? 0.12 : 1.1
                pupil.value += (goal - pupil.value) * (1 - Math.exp(-dt / tau))

                // Blink (lids also follow the gaze a little).
                if (!reduceMotion && t > nextBlink && blinkStart < 0) blinkStart = t
                let closed = 0
                if (blinkStart >= 0) {
                    const p = (t - blinkStart) / 0.22
                    closed = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2)
                    if (p >= 1) {
                        blinkStart = -1
                        nextBlink = t + 2.5 + Math.random() * 4
                    }
                }
                lid.uOpen.value = 1 - closed
                lid.uOffset.value = -look.y * 0.12

                renderer.render(scene, camera)

                if (onPupilRef.current && now - lastReport > 100) {
                    lastReport = now
                    onPupilRef.current(pupil.value)
                }
                frame = requestAnimationFrame(tick)
            }

            const io = new IntersectionObserver(([entry]) => {
                visible = entry.isIntersecting
                if (visible && !frame) {
                    clock.getDelta()
                    frame = requestAnimationFrame(tick)
                }
            })
            io.observe(mount)

            const ro = new ResizeObserver(() => {
                width = mount.clientWidth || 1
                height = mount.clientHeight || 1
                renderer.setSize(width, height)
                camera.aspect = width / height
                // Pull back on narrow, tall containers so the eye always fits.
                camera.position.z = camera.aspect < 1 ? 5.4 / camera.aspect : 5.4
                camera.updateProjectionMatrix()
                updateLidScale()
            })
            ro.observe(mount)

            frame = requestAnimationFrame(tick)

            cleanup = () => {
                cancelAnimationFrame(frame)
                io.disconnect()
                ro.disconnect()
                window.removeEventListener('pointermove', onPointer)
                scene.traverse((o) => {
                    const m = o as import('three').Mesh
                    if (m.geometry) m.geometry.dispose()
                })
                ;[scleraMat, irisMat, corneaMat, lidMat].forEach((m) => m.dispose())
                irisTex.dispose()
                envTex.dispose()
                pmrem.dispose()
                renderer.dispose()
                renderer.domElement.remove()
            }
        })()

        return () => {
            disposed = true
            cleanup()
        }
    }, [])

    return <div ref={mountRef} className={className} />
}
