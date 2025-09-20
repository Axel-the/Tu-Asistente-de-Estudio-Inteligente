import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { text, style, length, includeKeyPoints, generateQuestions, addExamples, translateTerms } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
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

    // Build the prompt based on options
    let prompt = `Genera un resumen del siguiente texto:\n\n${text}\n\n`

    if (style) {
      prompt += `Estilo del resumen: ${style}\n`
    }

    if (length) {
      const lengthMap = {
        'Corto (25% del original)': 'resume el contenido en aproximadamente el 25% de su longitud original',
        'Medio (50% del original)': 'resume el contenido en aproximadamente el 50% de su longitud original',
        'Largo (75% del original)': 'resume el contenido en aproximadamente el 75% de su longitud original',
        'Personalizado': 'resume el contenido de manera concisa pero completa'
      }
      prompt += `Longitud: ${lengthMap[length] || length}\n`
    }

    const requirements = []
    if (includeKeyPoints) requirements.push('puntos clave')
    if (generateQuestions) requirements.push('preguntas de estudio')
    if (addExamples) requirements.push('ejemplos prácticos')
    if (translateTerms) requirements.push('traducción de términos técnicos')

    if (requirements.length > 0) {
      prompt += `Incluir: ${requirements.join(', ')}\n`
    }

    prompt += `
    Responde en formato JSON con la siguiente estructura:
    {
      "summary": "string",
      "keyPoints": ["string"],
      "studyQuestions": ["string"],
      "examples": ["string"],
      "translatedTerms": [{"term": "string", "translation": "string"}]
    }
    `

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en resumen de textos y creación de contenido educativo. Genera resúmenes claros, concisos y útiles para el estudio.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let summaryData
    try {
      summaryData = JSON.parse(aiResponse)
    } catch (error) {
      // If JSON parsing fails, create a basic structure
      summaryData = {
        summary: aiResponse,
        keyPoints: [],
        studyQuestions: [],
        examples: [],
        translatedTerms: []
      }
    }

    // Calculate reduction percentage
    const originalLength = text.length
    const summaryLength = summaryData.summary.length
    const reduction = originalLength > 0 ? ((originalLength - summaryLength) / originalLength) * 100 : 0

    // Save summary to database
    const summary = await db.summary.create({
      data: {
        title: `Resumen generado - ${new Date().toLocaleDateString()}`,
        originalText: text,
        summaryText: summaryData.summary,
        keyPoints: JSON.stringify(summaryData.keyPoints || []),
        studyQuestions: JSON.stringify(summaryData.studyQuestions || []),
        style: style || 'Puntos Clave',
        length: length || 'Medio',
        sourceType: 'text',
        reduction: Math.round(reduction * 100) / 100,
        userId: userId // Use the ensured user ID
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        id: summary.id,
        title: summary.title,
        summaryText: summaryData.summary,
        keyPoints: summaryData.keyPoints || [],
        studyQuestions: summaryData.studyQuestions || [],
        examples: summaryData.examples || [],
        translatedTerms: summaryData.translatedTerms || [],
        reduction: Math.round(reduction * 100) / 100,
        createdAt: summary.createdAt
      }
    })

  } catch (error) {
    console.error('Error generating summary:', error)
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
    const summaryId = searchParams.get('summaryId')

    if (!summaryId) {
      return NextResponse.json(
        { error: 'Summary ID is required' },
        { status: 400 }
      )
    }

    // Verify summary belongs to user
    const summary = await db.summary.findUnique({
      where: { id: summaryId, userId }
    })

    if (!summary) {
      return NextResponse.json(
        { error: 'Summary not found' },
        { status: 404 }
      )
    }

    // Delete the summary
    await db.summary.delete({
      where: { id: summaryId }
    })

    return NextResponse.json({
      success: true,
      message: 'Summary deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting summary:', error)
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

    const summaries = await db.summary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      summaries: summaries.map(summary => ({
        ...summary,
        keyPoints: summary.keyPoints ? JSON.parse(summary.keyPoints) : [],
        studyQuestions: summary.studyQuestions ? JSON.parse(summary.studyQuestions) : []
      }))
    })

  } catch (error) {
    console.error('Error fetching summaries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}