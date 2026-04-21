import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { GLView } from 'expo-gl'
import Renderer from 'expo-three/build/Renderer'
import { loadTextureAsync } from 'expo-three/build/loaders/loadTextureAsync'
import * as THREE from 'three'
import { colors } from '../constants/colors'
import { typography } from '../constants/typography'

const EARTH_DAY = require('../assets/textures/earth-blue-marble.jpg')
const EARTH_NIGHT = require('../assets/textures/earth-night.jpg')
const EARTH_BUMP = require('../assets/textures/earth-topology.png')

type Props = {
  name: string
  location: string
  lat: number
  lng: number
  birthHour?: number | null
  onFocusComplete?: () => void
}

function easeInOutCubic(v: number) {
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function inferDayBirth(hour?: number | null) {
  if (hour == null || Number.isNaN(hour)) return true
  return hour >= 6 && hour < 19
}

function formatLocationLabel(name: string, location: string) {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean)
  const city = parts[0] ?? location
  const country = parts[parts.length - 1] ?? ''
  return `${name} - ${city}${country && country !== city ? `, ${country}` : ''}`
}

function latLngToVector(lat: number, lng: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lng + 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

export default function BirthCinematicGL({ name, location, lat, lng, birthHour, onFocusComplete }: Props) {
  const label = useMemo(() => formatLocationLabel(name, location), [name, location])
  const labelOpacity = useRef(new Animated.Value(0)).current
  const cleanupRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    Animated.sequence([
      Animated.delay(2000),
      Animated.timing(labelOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
    const focusTimer = setTimeout(() => onFocusComplete?.(), 3300)
    return () => {
      clearTimeout(focusTimer)
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [labelOpacity, onFocusComplete])

  const onContextCreate = async (
    gl: WebGLRenderingContext & { endFrameEXP?: () => void; drawingBufferWidth: number; drawingBufferHeight: number }
  ) => {
    const scene = new THREE.Scene()
    const renderer = new Renderer({ gl, alpha: true, antialias: true, width: gl.drawingBufferWidth, height: gl.drawingBufferHeight }) as unknown as THREE.WebGLRenderer
    renderer.setClearColor(0x000000, 0)

    const camera = new THREE.PerspectiveCamera(36, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100)
    camera.position.set(0, 0.08, 3.5)

    const dayTexture = await loadTextureAsync({ asset: EARTH_DAY as any })
    const nightTexture = await loadTextureAsync({ asset: EARTH_NIGHT as any })
    const bumpTexture = await loadTextureAsync({ asset: EARTH_BUMP as any })

    const earthTexture = inferDayBirth(birthHour) ? dayTexture : nightTexture
    earthTexture.colorSpace = THREE.SRGBColorSpace
    nightTexture.colorSpace = THREE.SRGBColorSpace

    const globeGeometry = new THREE.SphereGeometry(1, 64, 64)
    const globeMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, bumpMap: bumpTexture, bumpScale: 0.035, shininess: 12, specular: new THREE.Color('#5f6f93') })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 48, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#b5dbff'), transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending, side: THREE.BackSide })
    )
    scene.add(atmosphere)

    scene.add(new THREE.AmbientLight(0x6880b6, 0.72))
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.3)
    sunLight.position.set(3.4, 1.8, 2.9)
    scene.add(sunLight)
    const rimLight = new THREE.PointLight(0x7db6ff, 0.45, 10)
    rimLight.position.set(-2.4, -0.8, 1.8)
    scene.add(rimLight)

    const markerCore = new THREE.Mesh(new THREE.SphereGeometry(0.018, 18, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.goldLight) }))
    const markerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.gold), transparent: true, opacity: 0.46 }))
    const markerPos = latLngToVector(clamp(lat, -85, 85), lng, 1.012)
    markerCore.position.copy(markerPos)
    markerGlow.position.copy(markerPos)
    scene.add(markerCore)
    scene.add(markerGlow)

    const startTime = Date.now()
    const targetRotX = THREE.MathUtils.degToRad(clamp(lat, -85, 85))
    const targetRotY = THREE.MathUtils.degToRad(-lng)
    let frameId = 0

    const render = () => {
      frameId = requestAnimationFrame(render)
      const elapsed = Date.now() - startTime
      let rotX = 0.34
      let rotY = -0.9 + elapsed * 0.00016
      let altitude = 2.5

      if (elapsed > 1000) {
        const eased = easeInOutCubic(clamp((elapsed - 1000) / 2200, 0, 1))
        rotX = THREE.MathUtils.lerp(0.34, targetRotX, eased)
        rotY = THREE.MathUtils.lerp(-0.9, targetRotY, eased)
        altitude = THREE.MathUtils.lerp(2.5, 0.08, eased)
      }

      globe.rotation.x = rotX
      globe.rotation.y = rotY
      atmosphere.rotation.x = rotX
      atmosphere.rotation.y = rotY
      markerCore.rotation.x = rotX
      markerCore.rotation.y = rotY
      markerGlow.rotation.x = rotX
      markerGlow.rotation.y = rotY

      const pulse = 1 + Math.sin(elapsed * 0.005) * 0.22
      markerGlow.scale.setScalar(pulse)
      ;(markerGlow.material as THREE.MeshBasicMaterial).opacity = 0.28 + (pulse - 1) * 0.45

      camera.position.z = 1 + altitude
      camera.position.y = THREE.MathUtils.lerp(0.08, 0.03, clamp((elapsed - 1000) / 2200, 0, 1))
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      gl.endFrameEXP?.()
    }
    render()

    cleanupRef.current = () => {
      cancelAnimationFrame(frameId)
      globeGeometry.dispose()
      globeMaterial.dispose()
      atmosphere.geometry.dispose()
      ;(atmosphere.material as THREE.Material).dispose()
      ;(markerCore.geometry as THREE.BufferGeometry).dispose()
      ;(markerCore.material as THREE.Material).dispose()
      ;(markerGlow.geometry as THREE.BufferGeometry).dispose()
      ;(markerGlow.material as THREE.Material).dispose()
      dayTexture.dispose?.()
      nightTexture.dispose?.()
      bumpTexture.dispose?.()
      renderer.dispose()
    }
  }

  return (
    <View style={styles.wrap}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
      <Animated.View style={[styles.overlay, { opacity: labelOpacity }]}>
        <Text style={styles.locationText}>{label}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  gl: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 132,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 10, 22, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 122, 0.14)',
  },
  locationText: { color: colors.goldLight, fontFamily: typography.body, fontSize: 13, letterSpacing: 1.8 },
})
