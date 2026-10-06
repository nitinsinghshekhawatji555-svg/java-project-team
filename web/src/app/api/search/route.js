import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] }, { status: 200 })
    }

    const searchTerm = `%${q}%`
    const role = profile.role

    if (role === 'driver') {
      let query = supabase
        .from('mechanic_public')
        .select('user_id, business_name, specializations, rating_avg, rating_count, location_label, current_location')
        .or(`business_name.ilike.${searchTerm},location_label.ilike.${searchTerm}`)
        .limit(20)

      let { data, error } = await query

      if (error && error.message.includes('location_label')) {
        const fallbackQuery = supabase
          .from('mechanic_public')
          .select('user_id, business_name, specializations, rating_avg, rating_count, current_location')
          .ilike('business_name', searchTerm)
          .limit(20)
        const fbRes = await fallbackQuery
        data = fbRes.data
        error = fbRes.error
      }

      if (error) {
        console.error('[SEARCH DRIVER]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ results: data || [], role: 'driver' }, { status: 200 })
    }

    if (role === 'mechanic') {
      const { data, error } = await supabase
        .from('rescue_requests')
        .select('id, status, service_type, problem_description, vehicle_plate, incident_address, created_at, driver_id, mechanic_id')
        .eq('mechanic_id', user.id)
        .or(`problem_description.ilike.${searchTerm},vehicle_plate.ilike.${searchTerm},incident_address.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error('[SEARCH MECHANIC]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ results: data || [], role: 'mechanic' }, { status: 200 })
    }

    if (role === 'admin') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)
      
      let query = supabase
        .from('rescue_requests')
        .select('id, status, service_type, problem_description, vehicle_plate, incident_address, created_at, driver_id, mechanic_id')

      if (isUuid) {
        query = query.or(`id.eq.${q},problem_description.ilike.${searchTerm},vehicle_plate.ilike.${searchTerm}`)
      } else {
        query = query.or(`problem_description.ilike.${searchTerm},vehicle_plate.ilike.${searchTerm}`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[SEARCH ADMIN]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ results: data || [], role: 'admin' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Unsupported role.' }, { status: 403 })
  } catch (err) {
    console.error('[SEARCH ROUTE]:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
