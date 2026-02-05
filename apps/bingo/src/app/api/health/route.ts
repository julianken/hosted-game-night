import { createClient } from '@beak-gaming/database/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test connection via auth (doesn't require tables)
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Auth connection failed',
        error: error.message
      }, { status: 500 })
    }

    // Also test if profiles table exists
    const { error: tableError } = await supabase.from('profiles').select('id').limit(1)

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase connection successful',
      auth: 'connected',
      session: data.session ? 'active' : 'none',
      database: tableError ? `table issue: ${tableError.message}` : 'profiles table accessible',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: 'Connection failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}
