import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/validate'

export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const requestId = resolvedParams?.id

    if (!requestId) {
      return NextResponse.json({ error: 'requestId parameter is required' }, { status: 400 })
    }

    // Verify user is a participant
    const { data: rescueRequest, error: requestError } = await supabase
      .from('rescue_requests')
      .select('id, driver_id, mechanic_id, status')
      .eq('id', requestId)
      .single()

    if (requestError || !rescueRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const isParticipant = rescueRequest.driver_id === user.id || rescueRequest.mechanic_id === user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, message, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    return NextResponse.json({ 
      messages, 
      requestStatus: rescueRequest.status,
      driverId: rescueRequest.driver_id,
      mechanicId: rescueRequest.mechanic_id,
    }, { status: 200 })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const requestId = resolvedParams?.id

    if (!requestId) {
      return NextResponse.json({ error: 'requestId parameter is required' }, { status: 400 })
    }

    const rawBody = await request.json()
    const body = sanitizeInput(rawBody)
    const message = body.message?.trim()

    if (!message || message.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message cannot exceed 1000 characters' }, { status: 400 })
    }

    // Verify user is a participant and get their role
    const { data: rescueRequest, error: requestError } = await supabase
      .from('rescue_requests')
      .select('id, driver_id, mechanic_id, status')
      .eq('id', requestId)
      .single()

    if (requestError || !rescueRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (rescueRequest.status === 'completed' || rescueRequest.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot send messages on a ${rescueRequest.status} rescue request.` },
        { status: 400 }
      )
    }

    let senderRole = null
    if (rescueRequest.driver_id === user.id) {
      senderRole = 'driver'
    } else if (rescueRequest.mechanic_id === user.id) {
      senderRole = 'mechanic'
    }

    if (!senderRole) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Insert the message
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        request_id: requestId,
        sender_id: user.id,
        message,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Trigger real-time notification for the assigned participant
    const recipientId = senderRole === 'driver' ? rescueRequest.mechanic_id : rescueRequest.driver_id
    if (recipientId) {
      try {
        await serviceSupabase.from('notifications').insert({
          profile_id: recipientId,
          request_id: requestId,
          title: senderRole === 'driver' ? 'New Message from Driver' : 'New Message from Mechanic',
          body: `${message} [req_id: ${requestId}]`,
          type: 'chat',
          is_read: false,
        })
      } catch (notifError) {
        console.error('Failed to dispatch chat notification:', notifError)
      }
    }

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}