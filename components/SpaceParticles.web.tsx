import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export default function SpaceParticles() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: 'transparent' },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: { value: 68, density: { enable: true, area: 900 } },
        color: { value: ['#ffffff', '#efd7a1'] },
        opacity: {
          value: { min: 0.02, max: 0.14 },
          animation: {
            enable: true,
            speed: 0.22,
            minimumValue: 0.02,
            sync: false,
          },
        },
        size: { value: { min: 0.5, max: 2.2 } },
        move: {
          enable: true,
          speed: 0.18,
          direction: 'top' as const,
          random: true,
          straight: false,
          outModes: { default: 'out' as const },
        },
      },
      interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
    }),
    []
  )

  if (!ready) return null

  return (
    <Particles
      id="space-particles"
      options={options}
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.72,
        pointerEvents: 'none',
      }}
    />
  )
}
