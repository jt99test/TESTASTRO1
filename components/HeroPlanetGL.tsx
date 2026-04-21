import { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { GLView } from 'expo-gl'
import Renderer from 'expo-three/build/Renderer'
import { loadTextureAsync } from 'expo-three/build/loaders/loadTextureAsync'
import * as THREE from 'three'
import { colors } from '../constants/colors'

const MOON_TEXTURE = require('../assets/textures/nasa-moon-texture.jpg')

export default function HeroPlanetGL() {
  const drift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start()
  }, [drift])

  const onContextCreate = useCallback(async (gl: WebGLRenderingContext & { endFrameEXP?: () => void; drawingBufferWidth: number; drawingBufferHeight: number }) => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000)
    camera.position.z = 2.4

    const renderer = new Renderer({
      gl,
      alpha: true,
      antialias: true,
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
    }) as unknown as THREE.WebGLRenderer
    renderer.setClearColor(0x000000, 0)

    const texture = await loadTextureAsync({ asset: MOON_TEXTURE as any })
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const geometry = new THREE.SphereGeometry(0.9, 64, 64)
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.92,
      metalness: 0.02,
      color: new THREE.Color('#9097a6'),
      emissive: new THREE.Color('#0d1022'),
      emissiveIntensity: 0.12,
    })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.94, 64, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#d7b46a'), transparent: true, opacity: 0.055 })
    )
    scene.add(atmosphere)

    const rimLight = new THREE.DirectionalLight(0xe8c97a, 1.7)
    rimLight.position.set(2.3, 1.5, 2.9)
    scene.add(rimLight)

    const fillLight = new THREE.DirectionalLight(0x4e72a6, 0.42)
    fillLight.position.set(-2.6, -1.4, 1.3)
    scene.add(fillLight)

    const topLight = new THREE.PointLight(0xffffff, 0.35, 10)
    topLight.position.set(0, 2.4, 2.8)
    scene.add(topLight)

    scene.add(new THREE.AmbientLight(0x46546d, 0.9))

    let frameId = 0
    const render = () => {
      frameId = requestAnimationFrame(render)
      sphere.rotation.y += 0.0042
      sphere.rotation.x = Math.sin(Date.now() * 0.00018) * 0.08
      atmosphere.rotation.y = sphere.rotation.y * 0.94
      atmosphere.rotation.x = sphere.rotation.x
      renderer.render(scene, camera)
      gl.endFrameEXP?.()
    }
    render()

    return () => {
      cancelAnimationFrame(frameId)
      geometry.dispose()
      material.dispose()
      atmosphere.geometry.dispose()
      ;(atmosphere.material as THREE.Material).dispose()
    }
  }, [])

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] })
  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] })

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }, { scale }] }]}>
      <View style={styles.planetHalo} />
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: 278,
    height: 278,
    alignSelf: 'center',
    borderRadius: 139,
    overflow: 'hidden',
    marginBottom: 36,
  },
  gl: { flex: 1 },
  planetHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 139,
    backgroundColor: 'rgba(232, 201, 122, 0.14)',
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
})
