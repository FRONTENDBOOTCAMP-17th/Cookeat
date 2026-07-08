import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { changePassword } from './changePassword'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('phone, point, nickname, role, user_id')
    .eq('auth_id', user.id)
    .maybeSingle()

  const VALID_ROLES = ['user', 'seller', 'admin'] as const
  const rawRole = profile?.role
  const role = (VALID_ROLES as readonly string[]).includes(rawRole ?? '')
    ? (rawRole as (typeof VALID_ROLES)[number])
    : 'user'

  return NextResponse.json({
    complete: !!profile?.phone,
    point: profile?.point ?? 0,
    email: user.email ?? '',
    nickname: profile?.nickname ?? '',
    phone: profile?.phone ?? '',
    isSocial: user.app_metadata?.provider !== 'email',
    profileImage: user.user_metadata?.custom_avatar_url ?? user.user_metadata?.avatar_url ?? null,
    role,
    dbUserId: profile?.user_id ?? 0,
  })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { nickname, phone, currentPassword, newPassword } = await req.json()

  if (nickname?.trim() || phone?.trim()) {
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ ...(nickname?.trim() && { nickname: nickname.trim() }), ...(phone?.trim() && { phone: phone.trim() }) })
      .eq('auth_id', user.id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  if (currentPassword && newPassword) {
    const isSocial = user.app_metadata?.provider !== 'email'
    const { error: pwErr } = await changePassword(user.id, user.email!, isSocial, currentPassword, newPassword)
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
