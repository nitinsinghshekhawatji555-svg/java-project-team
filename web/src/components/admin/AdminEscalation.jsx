'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function AdminEscalation() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [users, setUsers] = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function fetchNonAdminUsers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        toast.error('Failed to load users')
      } else {
        setUsers(data || [])
      }
      setFetching(false)
    }

    fetchNonAdminUsers()
  }, [])

  async function handleCreateAdmin() {
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/admin/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to escalate user')
        return
      }

      toast.success(`${email} has been promoted to admin`)
      setEmail('')
      setShowForm(false)

      // Refresh users list
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })

      setUsers(data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 border-2 border-amber-200 bg-amber-50/50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-black">Admin Control</p>
          <h3 className="mt-2 text-sm font-black">User Escalation Portal</h3>
          <p className="mt-1 text-xs text-slate-600">Promote users to administrator role</p>
        </div>
        <Badge label="Secret" variant="default" />
      </div>

      {!showForm ? (
        <Button 
          onClick={() => setShowForm(true)} 
          className="mb-6 bg-amber-600 hover:bg-amber-700 text-white"
        >
          Create New Admin
        </Button>
      ) : (
        <div className="mb-6 space-y-3 p-4 rounded-lg bg-white border border-amber-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="user@roadrescue.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateAdmin}
              disabled={loading || !email}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? 'Processing...' : 'Escalate to Admin'}
            </Button>
            <Button
              onClick={() => {
                setShowForm(false)
                setEmail('')
              }}
              disabled={loading}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Non-admin users list */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-black mb-3">
          Available Users ({users.length})
        </p>
        {fetching ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">All users are admins</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-amber-300 transition">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{u.full_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={u.role} variant={u.role === 'driver' ? 'default' : 'pending'} />
                  <button
                    onClick={() => {
                      setEmail(u.email || '')
                      setShowForm(true)
                    }}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-100 transition"
                  >
                    Promote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
