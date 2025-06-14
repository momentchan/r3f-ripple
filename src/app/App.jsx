import { CameraControls, OrbitControls, useFBO, useTexture } from "@react-three/drei";
import { Canvas, useThree } from '@react-three/fiber'
import { useRef, useEffect, useMemo } from 'react'
import Utilities from "../r3f-gist/utility/Utilities";
import { CustomShaderMaterial } from "../r3f-gist/shader/CustomShaderMaterial";
import fragmentShader from "../shader/test/fragment.glsl";
import { useControls } from 'leva'
import * as THREE from 'three'
import { useFrame } from "@react-three/fiber";

function BasicMesh() {
    const materialRef = useRef()
    const { size, camera, set, scene,gl } = useThree()
    const prevMousePos = useRef(new THREE.Vector2())
    const currentWave = useRef(0)

    const distorFBO = useFBO()

    const { alpha } = useControls('Torus Material', {
        alpha: {
            value: 1,
            min: 0,
            max: 1,
            step: 0.01
        }
    })

    const brush = useTexture('/brush.png')
    const texture = useTexture('/ocean.jpg')

    const count = 100

    const meshes = useRef([])

    useEffect(() => {
        const geometry = new THREE.PlaneGeometry(64, 64, 1, 1)
        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshBasicMaterial({
                map: brush,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            })
            const mesh = new THREE.Mesh(geometry, mat)
            mesh.visible = false
            mesh.rotation.z = 2 * Math.PI * Math.random()
            meshes.current.push(mesh)
            scene.add(mesh)
        }

        return () => {
            meshes.current.forEach(mesh => {
                scene.remove(mesh)
                mesh.geometry.dispose()
                mesh.material.map?.dispose()
                mesh.material.dispose()

            })
            meshes.current = []
        }
    }, [])

    useEffect(() => {
        const aspect = size.width / size.height
        const frustum = size.height

        const orthoCam = new THREE.OrthographicCamera(
            (frustum * aspect) / -2,
            (frustum * aspect) / 2,
            frustum / 2,
            frustum / -2,
            -1000,
            1000
        )
        orthoCam.position.set(0, 0, 2)
        set({ camera: orthoCam })
    }, [size, set])

    const sceneOutput = useRef(null)

    useEffect(() => {
        sceneOutput.current = new THREE.Scene()
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(size.width, size.height) },
                uTexture: { value: texture },
                uDistortion: { value: distorFBO.texture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /*glsl*/`
                uniform float uTime;
                uniform vec2 uResolution;
                varying vec2 vUv;

                uniform sampler2D uTexture;
                uniform sampler2D uDistortion;
                float PI = 3.1415926535897932384626433832795;
                void main() {
                    vec3 distortion = texture2D(uDistortion, vUv).rgb;
                    float delta = distortion.r * 2. * PI;
                    
                    vec2 dir = vec2(cos(delta), sin(delta));
                    
                    vec2 uv = vUv + dir * distortion.r * 0.1;
                    
                    vec3 color = texture2D(uTexture, uv).rgb ;
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        })
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(size.width, size.height, 1, 1),
            material
        )
        sceneOutput.current.add(mesh)
    }, [])

    useFrame(({ pointer }) => {
        const currentPos = new THREE.Vector2(pointer.x * size.width * 0.5, pointer.y * size.height * 0.5)

        const delta = currentPos.clone().sub(prevMousePos.current)

        if (Math.abs(delta.x) < 4 && Math.abs(delta.y) < 4) {
        } else {
            const mesh = meshes.current[currentWave.current]

            mesh.position.x = currentPos.x
            mesh.position.y = currentPos.y
            mesh.visible = true
            mesh.material.opacity = 0.5
            mesh.scale.x = mesh.scale.y = 0.2

            currentWave.current = (currentWave.current + 1) % count
        }

        prevMousePos.current.set(currentPos.x, currentPos.y)

        meshes.current.forEach((mesh, index) => {

            if (mesh.visible) {
                mesh.rotation.z += 0.01
                mesh.material.opacity *= 0.96;


                mesh.scale.x = 0.982 * mesh.scale.x + 0.108
                mesh.scale.y = mesh.scale.x
            }
            // if (mesh.material.opacity < 0.001) { mesh.visible = false }
        })

        gl.setRenderTarget(distorFBO)
        gl.render(scene, camera)


        gl.setRenderTarget(null)
        gl.clear()
        gl.render(sceneOutput.current, camera)
    }, 1)

    return (
        <>
        </>
    )
}

export default function App() {
    return <>
        <Canvas
            shadows
            gl={{ preserveDrawingBuffer: true }}
            orthographic
        >
            <color attach="background" args={['#000']} />
            <OrbitControls makeDefault />
            <BasicMesh />
            <Utilities />
        </Canvas>
    </>
}