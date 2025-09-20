"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        // Login logic
        if (formData.username === "bot" && formData.password === "123") {
          // Simulate successful login
          localStorage.setItem("isAuthenticated", "true")
          localStorage.setItem("user", JSON.stringify({
            username: "bot",
            email: "bot@example.com"
          }))
          router.push("/")
        } else {
          setError("Credenciales inválidas")
        }
      } else {
        // Register logic
        if (formData.password !== formData.confirmPassword) {
          setError("Las contraseñas no coinciden")
          setIsLoading(false)
          return
        }

        // Simulate successful registration
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("user", JSON.stringify({
          username: formData.username,
          email: formData.email
        }))
        router.push("/")
      }
    } catch (error) {
      setError("Error en la conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tu Asistente de Estudio Inteligente
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            {isLogin ? "Inicia sesión para continuar" : "Crea tu cuenta para comenzar"}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm dark:bg-slate-800/90">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {isLogin ? "Iniciar Sesión" : "Registrarse"}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              {isLogin ? "Ingresa tus credenciales para acceder" : "Crea una nueva cuenta para empezar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Usuario</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder={isLogin ? "bot" : "Ingresa tu usuario"}
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "123" : "Ingresa tu contraseña"}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirma tu contraseña"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required={!isLogin}
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isLogin ? "Iniciando sesión..." : "Creando cuenta..."}
                  </div>
                ) : (
                  isLogin ? "Iniciar Sesión" : "Registrarse"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                {isLogin 
                  ? "¿No tienes cuenta? Regístrate aquí" 
                  : "¿Ya tienes cuenta? Inicia sesión aquí"
                }
              </button>
            </div>

            {isLogin && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Credenciales de demo:</strong><br />
                  Usuario: bot<br />
                  Contraseña: 123
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}