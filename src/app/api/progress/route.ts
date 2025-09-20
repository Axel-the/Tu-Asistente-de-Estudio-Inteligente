import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user'
    const subject = searchParams.get('subject')

    let whereClause: any = { userId }
    if (subject) {
      whereClause.subject = subject
    }

    const progressRecords = await db.progressRecord.findMany({
      where: whereClause,
      orderBy: { lastStudied: 'desc' }
    })

    // Get overall statistics
    const totalSessions = await db.studySession.count({
      where: { userId, completed: true }
    })

    const totalStudyPlans = await db.studyPlan.count({
      where: { userId }
    })

    const completedPlans = await db.studyPlan.count({
      where: { userId, status: 'completed' }
    })

    const totalSummaries = await db.summary.count({
      where: { userId }
    })

    const totalTutoringSessions = await db.tutoringSession.count({
      where: { userId }
    })

    // Calculate total study time
    const studySessions = await db.studySession.findMany({
      where: { userId, completed: true },
      select: { duration: true }
    })

    const totalHours = studySessions.reduce((sum, session) => sum + session.duration, 0) / 60

    // Get recent activity
    const recentActivity = await Promise.all([
      db.studySession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          completed: true,
          createdAt: true,
          type: 'study' as const
        }
      }),
      db.summary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          createdAt: true,
          type: 'summary' as const
        }
      }),
      db.tutoringSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          subject: true,
          createdAt: true,
          type: 'tutoring' as const
        }
      })
    ])

    // Combine and sort recent activity
    const allActivity = recentActivity.flat().map(item => ({
      ...item,
      title: item.type === 'tutoring' ? `Tutoría: ${item.subject}` : item.title,
      timestamp: item.createdAt
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)

    return NextResponse.json({
      success: true,
      progress: {
        records: progressRecords,
        overall: {
          totalSessions,
          totalStudyPlans,
          completedPlans,
          totalSummaries,
          totalTutoringSessions,
          totalHours: Math.round(totalHours * 100) / 100,
          completionRate: totalStudyPlans > 0 ? Math.round((completedPlans / totalStudyPlans) * 100) : 0
        },
        recentActivity: allActivity
      }
    })

  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subject, level, hours, sessions, mastery } = await request.json()

    if (!subject || !level) {
      return NextResponse.json(
        { error: 'Subject and level are required' },
        { status: 400 }
      )
    }

    // Check if progress record exists for this subject and level
    const existingRecord = await db.progressRecord.findFirst({
      where: {
        userId: 'demo-user', // In a real app, get from auth
        subject,
        level
      }
    })

    let progressRecord

    if (existingRecord) {
      // Update existing record
      progressRecord = await db.progressRecord.update({
        where: { id: existingRecord.id },
        data: {
          totalHours: (existingRecord.totalHours || 0) + (hours || 0),
          completedSessions: (existingRecord.completedSessions || 0) + (sessions || 0),
          masteryLevel: mastery || existingRecord.masteryLevel,
          lastStudied: new Date()
        }
      })
    } else {
      // Create new record
      progressRecord = await db.progressRecord.create({
        data: {
          subject,
          level,
          totalHours: hours || 0,
          completedSessions: sessions || 0,
          masteryLevel: mastery || 0,
          lastStudied: new Date(),
          userId: 'demo-user' // In a real app, get from auth
        }
      })
    }

    return NextResponse.json({
      success: true,
      progressRecord
    })

  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}