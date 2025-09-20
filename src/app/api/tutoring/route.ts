import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { message, subject, level, mode, sessionId } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Create ZAI instance
    const zai = await ZAI.create()

    // Get or create tutoring session
    let tutoringSession
    if (sessionId) {
      tutoringSession = await db.tutoringSession.findUnique({
        where: { id: sessionId },
        include: { messages: true }
      })
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

    if (!tutoringSession) {
      // Create new session
      tutoringSession = await db.tutoringSession.create({
        data: {
          subject: subject || 'General',
          level: level || 'Intermedio',
          mode: mode || 'Explicación',
          duration: 0,
          status: 'active',
          topicsCovered: '[]',
          userId: userId
        }
      })
    }

    // Save user message
    await db.tutoringMessage.create({
      data: {
        content: message,
        role: 'user',
        sessionId: tutoringSession.id
      }
    })

    // Build conversation history for context
    const recentMessages = await db.tutoringMessage.findMany({
      where: { sessionId: tutoringSession.id },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    const conversationHistory = recentMessages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Build the system prompt based on session parameters
    const systemPrompt = `Eres un tutor de IA experto en ${tutoringSession.subject} nivel ${tutoringSession.level}. 
    Tu modo de tutoría es: ${tutoringSession.mode}.
    
    Directrices:
    - Sé paciente y alentador
    - Proporciona explicaciones claras y paso a paso
    - Adapta tu lenguaje al nivel del estudiante
    - Usa ejemplos relevantes cuando sea posible
    - Fomenta el pensamiento crítico
    - Sé conciso pero completo
    
    Modo ${tutoringSession.mode}:
    - Explicación: Enfócate en conceptos claros y fundamentos
    - Resolución de Problemas: Guía paso a paso en la resolución
    - Práctica Guiada: Proporciona ejercicios y retroalimentación
    
    Responde en español y mantén un tono profesional pero amigable.`

    // Generate AI response
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Save AI response
    await db.tutoringMessage.create({
      data: {
        content: aiResponse,
        role: 'assistant',
        sessionId: tutoringSession.id
      }
    })

    // Update session duration and topics covered
    const updatedTopicsCovered = tutoringSession.topicsCovered 
      ? JSON.parse(tutoringSession.topicsCovered)
      : []
    
    // Extract potential topics from the message (simple keyword extraction)
    const topicKeywords = extractTopics(message)
    topicKeywords.forEach(topic => {
      if (!updatedTopicsCovered.includes(topic)) {
        updatedTopicsCovered.push(topic)
      }
    })

    await db.tutoringSession.update({
      where: { id: tutoringSession.id },
      data: {
        duration: tutoringSession.duration + 1, // Increment by 1 minute per interaction
        topicsCovered: JSON.stringify(updatedTopicsCovered)
      }
    })

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId: tutoringSession.id,
      messageCount: recentMessages.length + 2
    })

  } catch (error) {
    console.error('Error in tutoring chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user'
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify session belongs to user
    const session = await db.tutoringSession.findUnique({
      where: { id: sessionId, userId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete all messages in the session first
    await db.tutoringMessage.deleteMany({
      where: { sessionId }
    })

    // Delete the session
    await db.tutoringSession.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting tutoring session:', error)
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
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Get specific session
      const session = await db.tutoringSession.findUnique({
        where: { id: sessionId, userId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' }
          }
        }
      })

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        session: {
          ...session,
          topicsCovered: session.topicsCovered ? JSON.parse(session.topicsCovered) : []
        }
      })
    } else {
      // Get all sessions for user
      const sessions = await db.tutoringSession.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({
        success: true,
        sessions: sessions.map(session => ({
          ...session,
          topicsCovered: session.topicsCovered ? JSON.parse(session.topicsCovered) : []
        }))
      })
    }

  } catch (error) {
    console.error('Error fetching tutoring sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to extract topics from messages
function extractTopics(message: string): string[] {
  const topics: string[] = []
  const lowerMessage = message.toLowerCase()
  
  // Simple keyword-based topic extraction
  const topicKeywords = {
    'matemáticas': ['ecuación', 'derivada', 'integral', 'función', 'álgebra', 'cálculo', 'geometría'],
    'física': ['fuerza', 'energía', 'movimiento', 'velocidad', 'aceleración', 'gravedad', 'ley'],
    'química': ['molécula', 'átomo', 'reacción', 'elemento', 'compuesto', 'solución'],
    'biología': ['célula', 'adn', 'gen', 'organismo', 'ecosistema', 'evolución'],
    'historia': ['guerra', 'revolución', 'imperio', 'civilización', 'cultura', 'periodo'],
    'literatura': ['autor', 'obra', 'género', 'personaje', 'tema', 'análisis']
  }
  
  for (const [subject, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      topics.push(subject)
    }
  }
  
  return topics
}