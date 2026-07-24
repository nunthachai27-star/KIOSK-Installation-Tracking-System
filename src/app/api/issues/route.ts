import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { IssueStatus, IssueMethod, IssueWarranty, IssueType } from '@prisma/client'
import { warrantyStateFrom, ISSUE_WARRANTY } from '@/lib/issue'

const VALID = new Set<string>(Object.values(IssueStatus))
const METHODS = new Set<string>(Object.values(IssueMethod))
const WARRANTIES = new Set<string>(Object.values(IssueWarranty))

// Log an equipment claim (เคลม) or general problem report. May be tied to a unit
// (serialId → job) or standalone with free-text serial/hospital when the unit isn't in the system.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'OFFICE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { serialId, title, solution, status, method, failedSerial, replacementSerial, cost, warrantyState, machineSerial, hospitalName } = body
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }
  const issueType: IssueType = body.issueType === 'GENERAL' ? 'GENERAL' : 'CLAIM'

  let jobId: string | null = null
  let serial: string | null = null
  let autoWarranty: IssueWarranty = 'UNKNOWN'
  if (typeof serialId === 'string' && serialId) {
    const s = await prisma.serialNumber.findUnique({
      where: { id: serialId },
      select: { id: true, jobId: true, job: { select: { invoice: { select: { warrantyEndDate: true } } } } },
    })
    if (!s) return NextResponse.json({ error: 'serial not found' }, { status: 404 })
    serial = s.id
    jobId = s.jobId
    autoWarranty = warrantyStateFrom(s.job.invoice?.warrantyEndDate?.toISOString() ?? null)
  }
  // Standalone (no job) — keep the typed serial/hospital as free text.
  const mSerial = !serial && typeof machineSerial === 'string' && machineSerial.trim() ? machineSerial.trim() : null
  const hName = !jobId && typeof hospitalName === 'string' && hospitalName.trim() ? hospitalName.trim() : null

  const initialStatus = status && VALID.has(status) ? (status as IssueStatus) : 'RECEIVED'
  const initialSolution = typeof solution === 'string' && solution.trim() ? solution.trim() : null
  // Warranty: use the explicit choice if valid, else the auto value from the invoice.
  const warranty: IssueWarranty = warrantyState && WARRANTIES.has(warrantyState) ? (warrantyState as IssueWarranty) : autoWarranty
  const claimMethod: IssueMethod | null = method && METHODS.has(method) ? (method as IssueMethod) : null
  const costNum = cost !== undefined && cost !== null && cost !== '' && !isNaN(Number(cost)) ? Number(cost) : null
  const actorName = session.user.name ?? null

  const created = await prisma.issue.create({
    data: {
      jobId,
      serialId: serial,
      issueType,
      machineSerial: mSerial,
      hospitalName: hName,
      productType: typeof body.productType === 'string' && body.productType.trim() ? body.productType.trim() : null,
      equipment: typeof body.equipment === 'string' && body.equipment.trim() ? body.equipment.trim() : null,
      title: title.trim(),
      solution: initialSolution,
      status: initialStatus,
      warrantyState: warranty,
      method: claimMethod,
      failedSerial: typeof failedSerial === 'string' && failedSerial.trim() ? failedSerial.trim() : null,
      replacementSerial: typeof replacementSerial === 'string' && replacementSerial.trim() ? replacementSerial.trim() : null,
      cost: costNum,
      reporterId: session.user.id ?? null,
      assignedToId: typeof body.assignedToId === 'string' && body.assignedToId ? body.assignedToId : (session.user.id ?? null),
      events: {
        create: [
          { type: 'CREATED', toStatus: initialStatus, note: title.trim(), actorName },
          ...(warranty !== 'UNKNOWN' ? [{ type: 'WARRANTY_SET' as const, note: ISSUE_WARRANTY[warranty].label, actorName }] : []),
          ...(initialSolution ? [{ type: 'SOLUTION_UPDATED' as const, note: initialSolution, actorName }] : []),
        ],
      },
    },
  })
  await logAction(session.user, 'CREATE', 'แจ้งปัญหา/เคลม', `แจ้ง "${created.title}"`)
  return NextResponse.json(created, { status: 201 })
}
