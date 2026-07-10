import { createAdminClient } from '@/lib/supabase/admin'
import { isCurrentUserAdmin } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

async function getReports() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('reports')
    .select(
      `id, reason, description, status, created_at,
       reporter:reporter_id ( id, full_name ),
       reported:reported_id ( id, full_name )`
    )
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

async function updateReportStatus(formData: FormData) {
  'use server'
  const admin = await isCurrentUserAdmin()
  if (!admin) return

  const reportId = formData.get('reportId') as string
  const status = formData.get('status') as string

  const supabaseAdmin = createAdminClient()
  await supabaseAdmin
    .from('reports')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', reportId)

  revalidatePath('/admin/reports')
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  reviewing: 'bg-blue-500/20 text-blue-500',
  resolved: 'bg-green-500/20 text-green-500',
  dismissed: 'bg-muted text-muted-foreground',
}

export default async function AdminReportsPage() {
  const reports = await getReports()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports ({reports.length})</h1>
      <div className="space-y-4">
        {reports.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No reports yet</p>
        )}
        {reports.map((report: any) => (
          <Card key={report.id} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{report.reason}</Badge>
                    <Badge className={STATUS_COLORS[report.status]}>{report.status}</Badge>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">{report.reporter?.full_name || 'Unknown'}</span>{' '}
                    reported{' '}
                    <span className="font-medium">{report.reported?.full_name || 'Unknown'}</span>
                  </p>
                  {report.description && (
                    <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(new Date(report.created_at))}
                  </p>
                </div>
                {report.status === 'pending' || report.status === 'reviewing' ? (
                  <div className="flex gap-2 shrink-0">
                    <form action={updateReportStatus}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <Button size="sm" variant="outline" type="submit">
                        Resolve
                      </Button>
                    </form>
                    <form action={updateReportStatus}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value="dismissed" />
                      <Button size="sm" variant="ghost" type="submit">
                        Dismiss
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
