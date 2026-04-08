import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)

  const colors = ["#8b5cf6", "#6366f1", "#ec4899", "#a855f7", "#3b82f6"]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }

    resize()
    window.addEventListener("resize", resize)

    const createParticles = () => {
      const count = 50
      particlesRef.current = []
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 3 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.4 + 0.2,
        })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000
      mouseRef.current.y = -1000
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    createParticles()

    const animate = () => {
      if (!ctx || !canvas) return

      // 绘制渐变背景
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      )
      gradient.addColorStop(0, "#1e1b4b")
      gradient.addColorStop(1, "#312e81")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current

      // 绘制连接线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - distance / 120)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // 绘制鼠标光晕
      if (mouseRef.current.x > 0) {
        const mouseGradient = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          150,
        )
        mouseGradient.addColorStop(0, "rgba(236, 72, 153, 0.15)")
        mouseGradient.addColorStop(1, "rgba(139, 92, 246, 0)")
        ctx.fillStyle = mouseGradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // 更新和绘制粒子
      particles.forEach((particle) => {
        // 鼠标吸引力
        const dx = mouseRef.current.x - particle.x
        const dy = mouseRef.current.y - particle.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 150 && mouseRef.current.x > 0) {
          particle.vx += (dx / dist) * 0.02
          particle.vy += (dy / dist) * 0.02
        }

        // 速度限制
        const speed = Math.sqrt(
          particle.vx * particle.vx + particle.vy * particle.vy,
        )
        if (speed > 1) {
          particle.vx = (particle.vx / speed) * 1
          particle.vy = (particle.vy / speed) * 1
        }

        // 摩擦力
        particle.vx *= 0.99
        particle.vy *= 0.99

        // 更新位置
        particle.x += particle.vx
        particle.y += particle.vy

        // 边界反弹
        if (particle.x < 0) {
          particle.x = 0
          particle.vx *= -0.8
        }
        if (particle.x > canvas.width) {
          particle.x = canvas.width
          particle.vx *= -0.8
        }
        if (particle.y < 0) {
          particle.y = 0
          particle.vy *= -0.8
        }
        if (particle.y > canvas.height) {
          particle.y = canvas.height
          particle.vy *= -0.8
        }

        // 绘制粒子
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.alpha
        ctx.fill()

        // 绘制发光
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139, 92, 246, ${particle.alpha * 0.3})`
        ctx.fill()

        ctx.globalAlpha = 1
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationRef.current)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [colors])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}
