import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { subject, level, duration, hoursPerWeek, objectives, learningStyle } = await request.json()

    if (!subject || !level || !duration || !hoursPerWeek) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Ensure user exists or create demo user
    const userId = 'demo-user'
    try {
      await db.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: 'demo@example.com',
          name: 'Demo User'
        }
      })
    } catch (error) {
      console.log('User already exists or created:', error)
    }

    // Create ZAI instance
    const zai = await ZAI.create()

    // Generate study plan using AI
    const prompt = `
    Crea un plan de estudio personalizado para ${subject} nivel ${level}.

    Detalles:
    - Duración: ${duration} semanas
    - Horas por semana: ${hoursPerWeek}
    - Objetivos: ${objectives || 'No especificados'}
    - Estilo de aprendizaje: ${learningStyle || 'No especificado'}

    Genera un plan estructurado que incluya:
    1. Objetivos generales del plan
    2. Distribución semanal de temas
    3. Actividades de aprendizaje recomendadas
    4. Recursos sugeridos
    5. Hitos de evaluación

    Responde en formato JSON con la siguiente estructura:
    {
      "objectives": "string",
      "weeklyPlan": [
        {
          "week": 1,
          "title": "string",
          "objectives": "string",
          "topics": ["string"],
          "activities": ["string"],
          "resources": ["string"]
        }
      ],
      "recommendations": "string"
    }
    `

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en educación y creación de planes de estudio personalizados. Genera planes estructurados y efectivos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let planData
    try {
      planData = JSON.parse(aiResponse)
    } catch (error) {
      // If JSON parsing fails, create a basic structure
      planData = {
        objectives: "Plan de estudio generado por IA",
        weeklyPlan: [],
        recommendations: aiResponse
      }
    }

    // Create study plan in database
    const studyPlan = await db.studyPlan.create({
      data: {
        title: `${subject} - Nivel ${level}`,
        subject,
        level,
        duration: parseInt(duration),
        hoursPerWeek: parseInt(hoursPerWeek),
        objectives: objectives || null,
        learningStyle: learningStyle ? JSON.stringify([learningStyle]) : null,
        generatedContent: JSON.stringify(planData),
        userId: userId // Use the ensured user ID
      }
    })

    // Create weekly plans
    if (planData.weeklyPlan && Array.isArray(planData.weeklyPlan)) {
      for (const weekData of planData.weeklyPlan) {
        await db.weeklyPlan.create({
          data: {
            weekNumber: weekData.week,
            title: weekData.title,
            objectives: weekData.objectives,
            topics: JSON.stringify(weekData.topics || []),
            activities: JSON.stringify(weekData.activities || []),
            resources: JSON.stringify(weekData.resources || []),
            studyPlanId: studyPlan.id
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      studyPlan: {
        id: studyPlan.id,
        title: studyPlan.title,
        subject: studyPlan.subject,
        level: studyPlan.level,
        duration: studyPlan.duration,
        hoursPerWeek: studyPlan.hoursPerWeek,
        generatedContent: planData
      }
    })

  } catch (error) {
    console.error('Error generating study plan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user'

    const studyPlans = await db.studyPlan.findMany({
      where: { userId },
      include: {
        weeklyPlans: true,
        studySessions: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      studyPlans: studyPlans.map(plan => ({
        ...plan,
        generatedContent: plan.generatedContent ? JSON.parse(plan.generatedContent) : null,
        learningStyle: plan.learningStyle ? JSON.parse(plan.learningStyle) : null
      }))
    })

  } catch (error) {
    console.error('Error fetching study plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}