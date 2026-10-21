'use client'
import { useEffect, useRef } from 'react'

/**
 * Interactive 3D eye built with three.js (no external model files):
 * - a full, wet-looking eyeball: veined sclera, a detailed blue-gray iris and a bulging,
 *   see-through cornea with a glossy highlight
 * - it looks at your cursor (or your finger) and glances around on its own when idle
 * - `flashSignal` changes → the pupil does a real light reflex: a short delay, a fast
 *   squeeze, then a slow relax back
 *
 * The rest of the site is black and white. Set EYE_PALETTE to 'mono' for a grayscale eye.
 */

type Props = {
    className?: string
    /** Increment to fire a "flash of light". */
    flashSignal: number
    /** Pupil size as a fraction of the iris (about 0.2–0.5), reported ~10 times a second. */
    onPupilChange?: (size: number) => void
}

const EYE_PALETTE: 'color' | 'mono' = 'color'

const IRIS_ANGLE = 0.6 // angular radius of the iris on the eyeball (radians)
const PUPIL_REST = 0.46 // dilated: the scene is dark
const PUPIL_LIT = 0.2 // constricted after a flash
const REFLEX_DELAY = 0.25 // seconds before the pupil starts to react
const REFLEX_HOLD = 0.6 // seconds the light "stays on" for the pupil

const palettes = {
    color: {
        // pupil edge → collarette → mid iris → limbal ring
        iris: ['#14100c', '#4a4136', '#5d7384', '#8fa6b5', '#a9bac4', '#7d93a3', '#5c7183', '#2c3946', '#0b1016'],
        fibreLight: '214,228,236',
        fibreDark: '12,22,32',
        // front (around the iris) → back of the eye
        sclera: ['#f7ece8', '#f0d8d1', '#e8bfb6', '#dc9f96', '#c47f78'],
        vein: '168,28,34',
    },
    mono: {
        iris: ['#202020', '#3a3a3a', '#4a4a4a', '#9a9a9a', '#b8b8b8', '#8c8c8c', '#6e6e6e', '#3a3a3a', '#0c0c0c'],
        fibreLight: '235,235,235',
        fibreDark: '10,10,10',
        sclera: ['#f4f4f4', '#ececec', '#dedede', '#cfcfcf', '#bdbdbd'],
        vein: '90,90,90',
    },
}[EYE_PALETTE]

function seeded(seed: number) {
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
}

function drawIrisTexture(size = 1024) {
    // Polar layout: x = angle around the pupil, y = distance (top = pupil, bottom = edge of the iris).
    const w = size
    const h = size / 2
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    const rand = seeded(42)

    const base = g.createLinearGradient(0, 0, 0, h)
    ;[0, 0.14, 0.24, 0.33, 0.38, 0.47, 0.8, 0.92, 1].forEach((stop, i) => base.addColorStop(stop, palettes.iris[i]))
    g.fillStyle = base
    g.fillRect(0, 0, w, h)

    // Radial fibres (vertical strokes in polar space).
    for (let i = 0; i < 2600; i++) {
        const x = rand() * w
        const y0 = h * (0.1 + rand() * 0.3)
        const y1 = h * (0.55 + rand() * 0.42)
        const drift = (rand() - 0.5) * 18
        const light = rand() > 0.5
        g.strokeStyle = light ? `rgba(${palettes.fibreLight},${0.05 + rand() * 0.18})` : `rgba(${palettes.fibreDark},${0.06 + rand() * 0.22})`
        g.lineWidth = 0.6 + rand() * 1.8
        g.beginPath()
        g.moveTo(x, y0)
        g.quadraticCurveTo(x + drift, (y0 + y1) / 2, x + drift * 0.4, y1)
        g.stroke()
    }

    // Crypts: small dark pits around the collarette.
    for (let i = 0; i < 110; i++) {
        const x = rand() * w
        const y = h * (0.34 + rand() * 0.28)
        g.fillStyle = `rgba(${palettes.fibreDark},${0.2 + rand() * 0.3})`
        g.beginPath()
        g.ellipse(x, y, 2 + rand() * 7, 6 + rand() * 16, 0, 0, Math.PI * 2)
        g.fill()
    }

    // Wavy collarette ring.
    g.strokeStyle = `rgba(${palettes.fibreLight},0.35)`
    g.lineWidth = 3
    g.beginPath()
    for (let x = 0; x <= w; x += 4) {
        const y = h * (0.36 + 0.025 * Math.sin(x * 0.05) + 0.015 * Math.sin(x * 0.013 + 1))
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
    }
    g.stroke()

    // Soft ring at the pupil edge and a dark limbal ring at the outside.
    const ruff = g.createLinearGradient(0, 0, 0, h * 0.2)
    ruff.addColorStop(0, 'rgba(0,0,0,0.9)')
    ruff.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = ruff
    g.fillRect(0, 0, w, h * 0.2)
    const limbus = g.createLinearGradient(0, h * 0.86, 0, h)
    limbus.addColorStop(0, 'rgba(0,0,0,0)')
    limbus.addColorStop(1, 'rgba(0,0,0,0.75)')
    g.fillStyle = limbus
    g.fillRect(0, h * 0.86, w, h * 0.14)
    return c
}

function drawScleraTexture(w = 2048, h = 1024) {
    // Same polar layout over the whole ball: top = front (under the iris), bottom = back of the eye.
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    const rand = seeded(7)

    const base = g.createLinearGradient(0, 0, 0, h)
    ;[0, 0.28, 0.42, 0.6, 1].forEach((stop, i) => base.addColorStop(stop, palettes.sclera[i]))
    g.fillStyle = base
    g.fillRect(0, 0, w, h)

    // Blotchy pink/white variation.
    for (let i = 0; i < 260; i++) {
        const x = rand() * w
        const y = h * (0.2 + rand() * 0.8)
        const r = 20 + rand() * 90
        const grad = g.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, rand() > 0.4 ? `rgba(${palettes.vein},0.06)` : 'rgba(255,255,255,0.12)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = grad
        g.fillRect(x - r, y - r, r * 2, r * 2)
    }

    // Veins: wandering, branching lines that start at the back and thin out toward the iris.
    g.lineCap = 'round'
    const vein = (x: number, y: number, width: number, depth: number) => {
        let angle = -Math.PI / 2 + (rand() - 0.5) * 0.9
        const steps = 30 + Math.floor(rand() * 50)
        for (let s = 0; s < steps && width > 0.35 && y > h * 0.16; s++) {
            const len = 6 + rand() * 10
            const nx = x + Math.cos(angle) * len * 1.6
            const ny = y + Math.sin(angle) * len
            const fade = Math.min(1, Math.max(0, (ny / h - 0.17) / 0.15)) // fade out near the iris
            g.strokeStyle = `rgba(${palettes.vein},${(0.5 + 0.45 * Math.min(1, width / 3)) * fade})`
            g.lineWidth = width
            g.beginPath()
            g.moveTo(x, y)
            g.lineTo(nx, ny)
            g.stroke()
            x = nx
            y = ny
            angle = Math.max(-Math.PI + 0.3, Math.min(-0.3, angle + (rand() - 0.5) * 0.7)) // keep heading to the front
            width *= 0.965
            if (depth < 3 && rand() < 0.09) vein(x, y, width * 0.65, depth + 1)
        }
    }
    for (let i = 0; i < 60; i++) vein(rand() * w, h * (0.42 + rand() * 0.45), 3 + rand() * 3.5, 0)
    for (let i = 0; i < 110; i++) vein(rand() * w, h * (0.28 + rand() * 0.22), 1.1 + rand() * 1.3, 2) // fine capillaries
    return c
}

function drawGlint(size = 128) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.85)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.18)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
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
            key.position.set(2.6, 3, 4) // top right, like the highlight
            scene.add(key)
            const rim = new THREE.DirectionalLight(0xffffff, 0.8)
            rim.position.set(-3, -1, -2)
            scene.add(rim)
            scene.add(new THREE.AmbientLight(0xffffff, 0.15))

            // ----- eyeball -----
            const eye = new THREE.Group()
            scene.add(eye)

            const scleraTex = new THREE.CanvasTexture(drawScleraTexture())
            scleraTex.colorSpace = THREE.SRGBColorSpace
            scleraTex.wrapS = THREE.RepeatWrapping
            scleraTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
            const scleraGeo = new THREE.SphereGeometry(1, 128, 96)
            scleraGeo.rotateX(Math.PI / 2) // the texture's top (the pole) faces the camera, under the iris
            // Wet surface: a glossy clear coat over a soft pinkish white.
            const scleraMat = new THREE.MeshPhysicalMaterial({ map: scleraTex, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: 0xffe4e0 })
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
                // Its own env map so the intensity applies (scene.environment ignores it): almost no room
                // reflection over the pupil; the glint below is the highlight.
                envMap: envTex,
                envMapIntensity: 0.03,
            })
            eye.add(new THREE.Mesh(corneaGeo, corneaMat))

            // Glossy window reflection, top right. Reflections stay put relative to the light, so the
            // glint doesn't rotate with the eye; it fades when the cornea turns away from under it.
            const glintTex = new THREE.CanvasTexture(drawGlint())
            const glintMat = new THREE.SpriteMaterial({ map: glintTex, transparent: true, depthTest: false, blending: THREE.AdditiveBlending })
            const glint = new THREE.Sprite(glintMat)
            const glintDir = new THREE.Vector3(0.3, 0.36, 1).normalize()
            glint.position.copy(glintDir).multiplyScalar(1.12)
            glint.scale.set(0.3, 0.22, 1)
            glint.renderOrder = 5
            scene.add(glint)
            const gaze = new THREE.Vector3()
            const placeGlint = () => {
                gaze.set(0, 0, 1).applyEuler(eye.rotation)
                glintMat.opacity = 0.9 * THREE.MathUtils.smoothstep(gaze.dot(glintDir), 0.8, 0.93)
            }

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

                placeGlint()
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
                ;[scleraMat, irisMat, corneaMat, glintMat].forEach((m) => m.dispose())
                ;[irisTex, scleraTex, glintTex].forEach((t) => t.dispose())
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
