"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, Brain, Target, TrendingUp, Clock, Star, Loader2, Send, MessageSquare, FileText, Link, Trash2, Download, Eye, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // All hooks must be called at the top level
  const [activeTab, setActiveTab] = useState("dashboard")
  const { toast } = useToast()
  
  // Study Plans State
  const [studyPlanForm, setStudyPlanForm] = useState({
    subject: "",
    level: "",
    duration: "",
    hoursPerWeek: "",
    objectives: "",
    learningStyle: [] as string[]
  })
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<any>(null)
  const [studyPlans, setStudyPlans] = useState<any[]>([])
  
  // Summaries State
  const [summaryForm, setSummaryForm] = useState({
    text: "",
    style: "Puntos Clave",
    length: "Medio (50% del original)",
    includeKeyPoints: true,
    generateQuestions: false,
    addExamples: false,
    translateTerms: false
  })
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [generatedSummary, setGeneratedSummary] = useState<any>(null)
  const [summaries, setSummaries] = useState<any[]>([])
  
  // Tutoring State
  const [tutoringForm, setTutoringForm] = useState({
    subject: "Matemáticas",
    level: "Intermedio",
    mode: "Explicación"
  })
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [tutoringSessions, setTutoringSessions] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // All effects must be called at the top level
  useEffect(() => {
    // Check authentication status
    const authStatus = localStorage.getItem("isAuthenticated")
    const userData = localStorage.getItem("user")
    
    if (authStatus === "true" && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    } else {
      router.push("/login")
    }
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return
    
    // Fetch study plans on component mount and when tab changes
    if (activeTab === "plans") {
      fetchStudyPlans()
    } else if (activeTab === "summaries") {
      fetchSummaries()
    } else if (activeTab === "tutoring") {
      fetchTutoringSessions()
      // Initialize chat with welcome message if empty
      if (messages.length === 0) {
        startNewSession()
      }
    }
  }, [activeTab, isAuthenticated])

  // Auto-scroll to bottom of chat - optimizado para mejor experiencia
  useEffect(() => {
    if (!isAuthenticated) return
    
    const chatContainer = document.getElementById('chat-messages')
    if (chatContainer) {
      const shouldScroll = chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 100
      if (shouldScroll || messages.length === 1) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [messages, isLoading, isAuthenticated])
  
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto text-purple-500 mb-4" />
          <p className="text-lg text-slate-600 dark:text-slate-300">Cargando...</p>
        </div>
      </div>
    )
  }

  const fetchSummaries = async () => {
    try {
      const response = await fetch(`/api/summaries?userId=demo-user`)
      const data = await response.json()
      if (data.success) {
        setSummaries(data.summaries)
      }
    } catch (error) {
      console.error("Error fetching summaries:", error)
    }
  }

  const fetchTutoringSessions = async () => {
    try {
      const response = await fetch(`/api/tutoring?userId=demo-user`)
      const data = await response.json()
      if (data.success) {
        setTutoringSessions(data.sessions)
      }
    } catch (error) {
      console.error("Error fetching tutoring sessions:", error)
    }
  }

  const startNewSession = () => {
    setMessages([])
    setCurrentSessionId(null)
    // Add welcome message
    setMessages([{
      role: "assistant",
      content: `¡Hola! Soy tu tutor de IA especializado en ${tutoringForm.subject}. Estoy aquí para ayudarte a entender conceptos, resolver problemas y guiarte en tu aprendizaje. ¿En qué tema específico necesitas ayuda hoy?`,
      timestamp: new Date()
    }])
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    // Add user message to chat
    setMessages(prev => [...prev, userMessage])
    const messageToSend = inputMessage.trim()
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/tutoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          subject: tutoringForm.subject,
          level: tutoringForm.level,
          mode: tutoringForm.mode,
          sessionId: currentSessionId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Add AI response to chat
        const aiMessage = {
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        
        // Update session ID if this is a new session
        if (data.sessionId && !currentSessionId) {
          setCurrentSessionId(data.sessionId)
        }
        
        // Refresh sessions list
        fetchTutoringSessions()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo enviar el mensaje",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const deleteTutoringSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const response = await fetch(`/api/tutoring?userId=demo-user&sessionId=${sessionId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Conversación eliminada",
          description: "La conversación ha sido eliminada exitosamente"
        })
        // Refresh sessions list
        fetchTutoringSessions()
        // If current session was deleted, start new session
        if (currentSessionId === sessionId) {
          startNewSession()
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar la conversación",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      })
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const deleteSummary = async (summaryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const response = await fetch(`/api/summaries?userId=demo-user&summaryId=${summaryId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Resumen eliminado",
          description: "El resumen ha sido eliminado exitosamente"
        })
        // Refresh summaries list
        fetchSummaries()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el resumen",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      })
    }
  }

  const downloadSummary = (summary: any) => {
    const content = `Resumen Generado - ${summary.title}\n\n` +
                   `Fecha: ${new Date(summary.createdAt).toLocaleDateString()}\n\n` +
                   `Resumen:\n${summary.summaryText}\n\n` +
                   `Puntos Clave:\n${summary.keyPoints.join('\n')}\n\n` +
                   `Preguntas de Estudio:\n${summary.studyQuestions.join('\n')}`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumen-${summary.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSummarySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!summaryForm.text.trim()) {
      toast({
        title: "Texto requerido",
        description: "Por favor ingresa el texto que quieres resumir",
        variant: "destructive"
      })
      return
    }

    setIsGeneratingSummary(true)
    
    try {
      const response = await fetch('/api/summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(summaryForm)
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedSummary(data.summary)
        toast({
          title: "Resumen generado exitosamente",
          description: "Tu resumen ha sido creado con IA"
        })
        // Refresh summaries list
        fetchSummaries()
        // Reset form
        setSummaryForm(prev => ({...prev, text: ""}))
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo generar el resumen",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const fetchStudyPlans = async () => {
    try {
      const response = await fetch(`/api/study-plans?userId=demo-user`)
      const data = await response.json()
      if (data.success) {
        setStudyPlans(data.studyPlans)
      }
    } catch (error) {
      console.error("Error fetching study plans:", error)
    }
  }

  const handleStudyPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!studyPlanForm.subject || !studyPlanForm.level || !studyPlanForm.duration || !studyPlanForm.hoursPerWeek) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    setIsGeneratingPlan(true)
    
    try {
      const response = await fetch('/api/study-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...studyPlanForm,
          duration: parseInt(studyPlanForm.duration),
          hoursPerWeek: parseInt(studyPlanForm.hoursPerWeek),
          learningStyle: studyPlanForm.learningStyle.length > 0 ? studyPlanForm.learningStyle[0] : null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedPlan(data.studyPlan)
        toast({
          title: "Plan generado exitosamente",
          description: "Tu plan de estudio ha sido creado con IA"
        })
        // Refresh study plans list
        fetchStudyPlans()
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo generar el plan de estudio",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const handleLearningStyleChange = (style: string, checked: boolean) => {
    setStudyPlanForm(prev => ({
      ...prev,
      learningStyle: checked 
        ? [...prev.learningStyle, style]
        : prev.learningStyle.filter(s => s !== style)
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Asistente de Estudio IA</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Tu plataforma inteligente de aprendizaje</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Bienvenido, {user?.username}
                </span>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs sm:text-sm shadow-sm">
                Beta
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 p-2"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8 h-auto p-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg">
            <TabsTrigger 
              value="dashboard" 
              className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 rounded-lg data-[state=active]:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">📊</span>
            </TabsTrigger>
            <TabsTrigger 
              value="plans" 
              className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 rounded-lg data-[state=active]:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="hidden sm:inline">Planes</span>
              <span className="sm:hidden">📋</span>
            </TabsTrigger>
            <TabsTrigger 
              value="summaries" 
              className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 rounded-lg data-[state=active]:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="hidden sm:inline">Resúmenes</span>
              <span className="sm:hidden">📝</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tutoring" 
              className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 rounded-lg data-[state=active]:shadow-md transition-all duration-300 hover:scale-105"
            >
              <span className="hidden sm:inline">Tutoría</span>
              <span className="sm:hidden">🎓</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Hero Section */}
            <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Tu Asistente de Estudio Inteligente
              </h2>
              <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto px-4">
                Crea planes de estudio personalizados, genera resúmenes automáticos y recibe tutoría inteligente con IA
              </p>
              <div className="flex justify-center space-x-2 sm:space-x-4">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  🚀 24/7 Disponible
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  🎯 Personalizado
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  🧠 IA Avanzada
                </Badge>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Sesiones de Estudio</CardTitle>
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">24</div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">+20% desde la semana pasada</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Tiempo de Estudio</CardTitle>
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">48h</div>
                  <p className="text-xs text-green-600 dark:text-green-400">+12h esta semana</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Progreso General</CardTitle>
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">78%</div>
                  <Progress value={78} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white dark:bg-gray-800 transform hover:scale-105">
                <CardHeader className="text-center sm:text-left">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 mx-auto sm:mx-0 shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Planes de Estudio Personalizados</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    Crea planes de estudio adaptados a tu ritmo y objetivos de aprendizaje
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full text-sm bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg" onClick={() => setActiveTab("plans")}>
                    Crear Plan
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white dark:bg-gray-800 transform hover:scale-105">
                <CardHeader className="text-center sm:text-left">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 mx-auto sm:mx-0 shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Resúmenes Inteligentes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    Genera resúmenes automáticos de tus materiales de estudio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg" onClick={() => setActiveTab("summaries")}>
                    Generar Resumen
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white dark:bg-gray-800 transform hover:scale-105">
                <CardHeader className="text-center sm:text-left">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 mx-auto sm:mx-0 shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Tutoría IA</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    Recibe ayuda personalizada de tu tutor inteligente 24/7
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg" onClick={() => setActiveTab("tutoring")}>
                    Iniciar Tutoría
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base sm:text-lg">Progreso por Materia</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Tu rendimiento en diferentes áreas de estudio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Matemáticas</span>
                      <span className="text-sm text-muted-foreground">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Física</span>
                      <span className="text-sm text-muted-foreground">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Química</span>
                      <span className="text-sm text-muted-foreground">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Historia</span>
                      <span className="text-sm text-muted-foreground">91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base sm:text-lg">Estadísticas de Aprendizaje</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Métricas de tu progreso general</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">127</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Horas Totales</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">24</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Sesiones</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">15</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Resúmenes</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">8</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Tutorías</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Learning Insights */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg">Insights de Aprendizaje</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Análisis de tus patrones de estudio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-medium mb-1">Mejor Rendimiento</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Mañanas (9-12 AM)</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-medium mb-1">Enfoque Principal</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Ciencias Exactas</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-medium mb-1">Tiempo Promedio</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">2.5 horas por sesión</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Planes de Estudio</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Crea y gestiona tus planes de estudio personalizados
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create New Plan */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Crear Nuevo Plan de Estudio</CardTitle>
                  <CardDescription>Define tus objetivos y preferencias de aprendizaje</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleStudyPlanSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium">Materia</Label>
                        <Input 
                          id="subject"
                          type="text" 
                          placeholder="Ej: Matemáticas, Historia, etc."
                          value={studyPlanForm.subject}
                          onChange={(e) => setStudyPlanForm(prev => ({...prev, subject: e.target.value}))}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="level" className="text-sm font-medium">Nivel</Label>
                        <Select value={studyPlanForm.level} onValueChange={(value) => setStudyPlanForm(prev => ({...prev, level: value}))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona nivel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Principiante">Principiante</SelectItem>
                            <SelectItem value="Intermedio">Intermedio</SelectItem>
                            <SelectItem value="Avanzado">Avanzado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-sm font-medium">Duración (semanas)</Label>
                        <Input 
                          id="duration"
                          type="number" 
                          placeholder="4"
                          value={studyPlanForm.duration}
                          onChange={(e) => setStudyPlanForm(prev => ({...prev, duration: e.target.value}))}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hoursPerWeek" className="text-sm font-medium">Horas por semana</Label>
                        <Input 
                          id="hoursPerWeek"
                          type="number" 
                          placeholder="10"
                          value={studyPlanForm.hoursPerWeek}
                          onChange={(e) => setStudyPlanForm(prev => ({...prev, hoursPerWeek: e.target.value}))}
                          className="w-full"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="objectives" className="text-sm font-medium">Objetivos de Aprendizaje</Label>
                        <Textarea 
                          id="objectives"
                          placeholder="Describe qué quieres lograr con este plan de estudio..."
                          value={studyPlanForm.objectives}
                          onChange={(e) => setStudyPlanForm(prev => ({...prev, objectives: e.target.value}))}
                          className="w-full h-24 resize-none"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-sm font-medium">Estilo de Aprendizaje Preferido</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="visual"
                              checked={studyPlanForm.learningStyle.includes("Visual")}
                              onCheckedChange={(checked) => handleLearningStyleChange("Visual", checked as boolean)}
                            />
                            <Label htmlFor="visual" className="text-sm cursor-pointer">Visual</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="auditivo"
                              checked={studyPlanForm.learningStyle.includes("Auditivo")}
                              onCheckedChange={(checked) => handleLearningStyleChange("Auditivo", checked as boolean)}
                            />
                            <Label htmlFor="auditivo" className="text-sm cursor-pointer">Auditivo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="kinestesico"
                              checked={studyPlanForm.learningStyle.includes("Kinestésico")}
                              onCheckedChange={(checked) => handleLearningStyleChange("Kinestésico", checked as boolean)}
                            />
                            <Label htmlFor="kinestesico" className="text-sm cursor-pointer">Kinestésico</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="lectura"
                              checked={studyPlanForm.learningStyle.includes("Lectura")}
                              onCheckedChange={(checked) => handleLearningStyleChange("Lectura", checked as boolean)}
                            />
                            <Label htmlFor="lectura" className="text-sm cursor-pointer">Lectura</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      disabled={isGeneratingPlan}
                    >
                      {isGeneratingPlan ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando Plan...
                        </>
                      ) : (
                        "Generar Plan de Estudio con IA"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Active Plans */}
              <Card>
                <CardHeader>
                  <CardTitle>Planes Activos</CardTitle>
                  <CardDescription>Tus planes de estudio en curso</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studyPlans.length > 0 ? (
                      studyPlans.map((plan) => (
                        <div key={plan.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{plan.title}</h4>
                            <Badge variant={plan.status === 'active' ? 'secondary' : plan.status === 'completed' ? 'default' : 'outline'}>
                              {plan.status === 'active' ? 'Activo' : plan.status === 'completed' ? 'Completado' : 'En Pausa'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progreso</span>
                              <span>{plan.progress}%</span>
                            </div>
                            <Progress value={plan.progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{plan.duration} semanas</span>
                              <span>{plan.hoursPerWeek}h/semana</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-sm text-muted-foreground">No tienes planes de estudio aún</p>
                        <p className="text-xs text-muted-foreground">Crea tu primer plan para comenzar</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generated Plan */}
            {generatedPlan && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan de Estudio Generado</CardTitle>
                  <CardDescription>Tu plan personalizado creado por IA</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{generatedPlan.duration}</div>
                        <div className="text-sm text-muted-foreground">Semanas</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{generatedPlan.hoursPerWeek}</div>
                        <div className="text-sm text-muted-foreground">Horas/Semana</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {generatedPlan.generatedContent?.weeklyPlan?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Lecciones</div>
                      </div>
                    </div>

                    {generatedPlan.generatedContent?.objectives && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Objetivos del Plan</h4>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {generatedPlan.generatedContent.objectives}
                          </p>
                        </div>
                      </div>
                    )}

                    {generatedPlan.generatedContent?.weeklyPlan && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Cronograma Semanal</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {generatedPlan.generatedContent.weeklyPlan.map((week: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="font-medium text-sm mb-1">Semana {week.week}</div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="font-medium">{week.title}</div>
                                {week.topics?.slice(0, 2).map((topic: string, topicIndex: number) => (
                                  <div key={topicIndex}>• {topic}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {generatedPlan.generatedContent?.recommendations && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Recomendaciones</h4>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {generatedPlan.generatedContent.recommendations}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <Button className="flex-1">
                        Iniciar Plan
                      </Button>
                      <Button variant="outline">
                        Descargar PDF
                      </Button>
                      <Button variant="outline">
                        Compartir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="summaries" className="space-y-6">
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Resúmenes Inteligentes</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Genera resúmenes automáticos de tus materiales de estudio
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create New Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Generar Nuevo Resumen</CardTitle>
                  <CardDescription>Elige cómo quieres generar tu resumen</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSummarySubmit} className="space-y-6">
                    {/* Text Input */}
                    <div className="space-y-2">
                      <Label htmlFor="summary-text" className="text-sm font-medium">Texto para resumir</Label>
                      <Textarea 
                        id="summary-text"
                        placeholder="Pega aquí el texto que quieres resumir..."
                        value={summaryForm.text}
                        onChange={(e) => setSummaryForm(prev => ({...prev, text: e.target.value}))}
                        className="w-full h-40 resize-none"
                      />
                    </div>

                    {/* Summary Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Longitud del Resumen</Label>
                        <Select 
                          value={summaryForm.length} 
                          onValueChange={(value) => setSummaryForm(prev => ({...prev, length: value}))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Corto (25% del original)">Corto (25% del original)</SelectItem>
                            <SelectItem value="Medio (50% del original)">Medio (50% del original)</SelectItem>
                            <SelectItem value="Largo (75% del original)">Largo (75% del original)</SelectItem>
                            <SelectItem value="Personalizado">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Estilo del Resumen</Label>
                        <Select 
                          value={summaryForm.style} 
                          onValueChange={(value) => setSummaryForm(prev => ({...prev, style: value}))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Puntos Clave">Puntos Clave</SelectItem>
                            <SelectItem value="Párrafo Resumen">Párrafo Resumen</SelectItem>
                            <SelectItem value="Esquema">Esquema</SelectItem>
                            <SelectItem value="Preguntas y Respuestas">Preguntas y Respuestas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Opciones Adicionales</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="keypoints"
                            checked={summaryForm.includeKeyPoints}
                            onCheckedChange={(checked) => setSummaryForm(prev => ({...prev, includeKeyPoints: checked as boolean}))}
                          />
                          <Label htmlFor="keypoints" className="text-sm cursor-pointer">Incluir conceptos clave</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="questions"
                            checked={summaryForm.generateQuestions}
                            onCheckedChange={(checked) => setSummaryForm(prev => ({...prev, generateQuestions: checked as boolean}))}
                          />
                          <Label htmlFor="questions" className="text-sm cursor-pointer">Generar preguntas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="examples"
                            checked={summaryForm.addExamples}
                            onCheckedChange={(checked) => setSummaryForm(prev => ({...prev, addExamples: checked as boolean}))}
                          />
                          <Label htmlFor="examples" className="text-sm cursor-pointer">Añadir ejemplos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="translate"
                            checked={summaryForm.translateTerms}
                            onCheckedChange={(checked) => setSummaryForm(prev => ({...prev, translateTerms: checked as boolean}))}
                          />
                          <Label htmlFor="translate" className="text-sm cursor-pointer">Traducir términos</Label>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      disabled={isGeneratingSummary}
                    >
                      {isGeneratingSummary ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando Resumen...
                        </>
                      ) : (
                        "Generar Resumen con IA"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Summaries */}
              <Card>
                <CardHeader>
                  <CardTitle>Resúmenes Recientes</CardTitle>
                  <CardDescription>Tus últimos resúmenes generados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summaries.length > 0 ? (
                      summaries.map((summary) => (
                        <div key={summary.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{summary.title}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant={summary.sourceType === 'text' ? 'outline' : summary.sourceType === 'url' ? 'default' : 'secondary'}>
                                {summary.sourceType === 'text' ? 'Texto' : summary.sourceType === 'url' ? 'URL' : 'Archivo'}
                              </Badge>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => downloadSummary(summary)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Descargar resumen"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => deleteSummary(summary.id, e)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Eliminar resumen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {summary.summaryText.substring(0, 100)}...
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              {new Date(summary.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="ghost" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-sm text-muted-foreground">No tienes resúmenes aún</p>
                        <p className="text-xs text-muted-foreground">Crea tu primer resumen para comenzar</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generated Summary */}
            {generatedSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumen Generado</CardTitle>
                  <CardDescription>Tu resumen personalizado creado por IA</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {Math.round(generatedSummary.reduction)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Reducción</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {generatedSummary.keyPoints?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Puntos Clave</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {generatedSummary.studyQuestions?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Preguntas</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {Math.round(generatedSummary.summaryText.length / 5)}
                        </div>
                        <div className="text-sm text-muted-foreground">Segundos</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-medium mb-3">Resumen Ejecutivo</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {generatedSummary.summaryText}
                        </p>
                      </div>

                      {generatedSummary.keyPoints && generatedSummary.keyPoints.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-medium mb-3">Puntos Clave</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {generatedSummary.keyPoints.map((point: string, index: number) => (
                                <li key={index}>• {point}</li>
                              ))}
                            </ul>
                          </div>

                          {generatedSummary.studyQuestions && generatedSummary.studyQuestions.length > 0 && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <h4 className="font-medium mb-3">Preguntas de Estudio</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {generatedSummary.studyQuestions.map((question: string, index: number) => (
                                  <li key={index}>• {question}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-3">
                      <Button className="flex-1">
                        Copiar Resumen
                      </Button>
                      <Button variant="outline">
                        Descargar PDF
                      </Button>
                      <Button variant="outline">
                        Compartir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tutoring" className="space-y-6">
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tutoría Inteligente</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Chatea con tu tutor de IA para obtener ayuda personalizada
              </p>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
              {/* Configuración Simplificada - Optimizada para móviles */}
              <Card className="xl:col-span-1 shadow-lg border-0 bg-white dark:bg-gray-800">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-lg p-4 sm:p-6">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-sm sm:text-base">Configuración IA</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Materia</Label>
                    <Select 
                      value={tutoringForm.subject} 
                      onValueChange={(value) => setTutoringForm(prev => ({...prev, subject: value}))}
                    >
                      <SelectTrigger className="w-full border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Matemáticas">📐 Matemáticas</SelectItem>
                        <SelectItem value="Física">⚛️ Física</SelectItem>
                        <SelectItem value="Química">🧪 Química</SelectItem>
                        <SelectItem value="Biología">🧬 Biología</SelectItem>
                        <SelectItem value="Historia">📜 Historia</SelectItem>
                        <SelectItem value="Literatura">📖 Literatura</SelectItem>
                        <SelectItem value="Programación">💻 Programación</SelectItem>
                        <SelectItem value="Otro">🔍 Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nivel</Label>
                    <Select 
                      value={tutoringForm.level} 
                      onValueChange={(value) => setTutoringForm(prev => ({...prev, level: value}))}
                    >
                      <SelectTrigger className="w-full border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Principiante">🌱 Principiante</SelectItem>
                        <SelectItem value="Intermedio">🌿 Intermedio</SelectItem>
                        <SelectItem value="Avanzado">🌳 Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Mensajes</span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{messages.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Estado</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {currentSessionId ? "Activo" : "Nueva"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={startNewSession}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transition-all duration-200 text-sm"
                  >
                    🔄 Nueva Conversación
                  </Button>

                  {/* Historial Simplificado */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Conversaciones Anteriores</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {tutoringSessions.length > 0 ? (
                        tutoringSessions.slice(0, 3).map((session) => (
                          <div 
                            key={session.id} 
                            className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors text-xs group"
                            onClick={() => {
                              setCurrentSessionId(session.id)
                              setMessages(session.messages.map((msg: any) => ({
                                role: msg.role,
                                content: msg.content,
                                timestamp: new Date(msg.timestamp)
                              })))
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800 dark:text-gray-200">{session.subject}</span>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={(e) => deleteTutoringSession(session.id, e)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-2">
                          No hay conversaciones anteriores
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chat Interface Mejorado - Optimizado para móviles */}
              <Card className="xl:col-span-3 shadow-2xl border-0 bg-white dark:bg-gray-800 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div>
                      <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                        <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-sm sm:text-xl">Tutoría Inteligente IA</span>
                      </CardTitle>
                      <CardDescription className="text-purple-100 text-xs sm:text-sm">
                        Especialista en {tutoringForm.subject} - Nivel {tutoringForm.level}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-100">En línea</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[600px] sm:h-[600px] flex flex-col">
                  {/* Área de Mensajes */}
                  <div className="flex-1 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 overflow-y-auto" id="chat-messages">
                    <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
                      {messages.map((message, index) => (
                        <div 
                          key={index} 
                          className={`flex items-start space-x-2 sm:space-x-3 ${message.role === "user" ? "justify-end" : ""}`}
                        >
                          {message.role === "assistant" && (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                          )}
                          
                          <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                            <div className={`p-3 sm:p-4 rounded-2xl inline-block max-w-xs sm:max-w-md lg:max-w-lg shadow-lg ${
                              message.role === "user" 
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" 
                                : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                            }`}>
                              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 block">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          
                          {message.role === "user" && (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-xs sm:text-sm font-medium text-white">Tú</span>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white dark:bg-gray-700 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-lg">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Tu tutor IA está respondiendo...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                  
                  {/* Área de Input - Optimizada para móviles */}
                  <div className="border-t bg-gray-50 dark:bg-gray-800 p-3 sm:p-4">
                    <div className="flex space-x-2 sm:space-x-3 max-w-4xl mx-auto">
                      <Input 
                        type="text" 
                        placeholder="Escribe tu pregunta aquí..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 text-sm shadow-sm"
                      />
                      <Button 
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transition-all duration-200 disabled:opacity-50 px-4 sm:px-6"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-2 max-w-4xl mx-auto">
                      💡 Puedes hacer preguntas sobre conceptos, pedir ejemplos o solicitar ayuda con problemas
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sección de Herramientas Útiles Eliminada - No funcional */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}