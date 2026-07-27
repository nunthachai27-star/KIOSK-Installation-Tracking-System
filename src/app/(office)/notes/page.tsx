import { prisma } from '@/lib/prisma'
import { NoteBoard } from '@/components/NoteBoard'
import { FileVault } from '@/components/FileVault'

export default async function NotesPage() {
  const [rows, folderRows, fileRows] = await Promise.all([
    prisma.note.findMany({ orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] }),
    prisma.fileFolder.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { files: true } } } }),
    prisma.fileAsset.findMany({ orderBy: { createdAt: 'desc' } }),
  ])
  const folders = folderRows.map((f) => ({ id: f.id, name: f.name, count: f._count.files }))
  const files = fileRows.map((f) => ({
    id: f.id, name: f.name, ext: f.ext, size: f.size, note: f.note,
    folderId: f.folderId, downloads: f.downloads,
    createdAt: f.createdAt.toISOString(), uploadedByName: f.uploadedByName,
  }))
  const notes = rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    color: n.color,
    pinned: n.pinned,
    link: n.link,
    remindAt: n.remindAt ? n.remindAt.toISOString() : null,
    authorName: n.authorName,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1160px] mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#FFF6D6] grid place-items-center text-[20px]">📌</span>
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">โน้ตทีม</h1>
          <p className="text-[13px] text-[#8492A6] mt-0.5">กระดานโน้ตเรื่องสำคัญที่ทุกคนเห็นและแก้ไขร่วมกันได้ · ปักหมุดเรื่องด่วน · แนบลิงก์ · ตั้งวันเตือน</p>
        </div>
      </div>
      <FileVault folders={folders} files={files} />
      <NoteBoard initial={notes} />
    </div>
  )
}
