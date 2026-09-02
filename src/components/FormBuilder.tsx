'use client'
import { useEffect, useRef, useState } from 'react'
import { BMS_LOGO_DATA_URL } from '@/lib/bmsLogo'

// ── คลังแบบฟอร์ม ─────────────────────────────────────────────────────────────
// เพิ่มแม่แบบใหม่ได้ที่นี่ (สร้าง builder อีกตัวแล้วผูกใน SHEETS)
type TemplateId = 'kiosk-activation' | 'delivery-handover' | 'work-notice'
type Template = { id: TemplateId; title: string; desc: string; defaultCat: string; accent: string }
const TEMPLATES: Template[] = [
  {
    id: 'kiosk-activation',
    title: 'ขออนุมัติเปิดสิทธิ์การใช้งาน Kiosk',
    desc: 'แบบฟอร์มขออนุมัติเปิดสิทธิ์ BMS Smart Hospital Kiosk (ส่งตรวจ) — แก้ไขได้ทุกช่อง',
    defaultCat: 'สัญญา / PO',
    accent: '#C6303A',
  },
  {
    id: 'delivery-handover',
    title: 'แบบฟอร์มแจ้งส่งมอบ',
    desc: 'แจ้งทำหนังสือส่งมอบงาน / แจ้งหน่วยงานภายนอก — ติ๊ก/แก้ไขได้ทุกช่อง',
    defaultCat: 'ใบแจ้งส่งมอบงาน',
    accent: '#1E7F4C',
  },
  {
    id: 'work-notice',
    title: 'แบบฟอร์มแจ้งเข้าดำเนินการ',
    desc: 'แจ้งทำหนังสือแจ้งเข้าดำเนินการ / เปลี่ยนอุปกรณ์ — ติ๊ก/แก้ไขได้ทุกช่อง',
    defaultCat: 'ใบแจ้งเข้าดำเนินการ',
    accent: '#2563C9',
  },
]

type JobHit = { id: string; jobCode: string; contractNo: string | null; province: string | null; hospital: { name: string } | null }

const A4_W = 794 // px @ ~96dpi

// ฟอนต์ให้เลือก (ฟอนต์ไทยที่มักติดตั้งในเครื่อง Windows)
const FONTS: { key: string; label: string; stack: string }[] = [
  { key: 'sarabun', label: 'Sarabun', stack: "'Sarabun','TH Sarabun New','Leelawadee UI',sans-serif" },
  { key: 'thsarabun', label: 'TH Sarabun New', stack: "'TH Sarabun New','TH SarabunPSK','Sarabun',sans-serif" },
  { key: 'angsana', label: 'Angsana New', stack: "'Angsana New','AngsanaUPC','TH Sarabun New',serif" },
  { key: 'cordia', label: 'Cordia New', stack: "'Cordia New','CordiaUPC','Leelawadee UI',sans-serif" },
  { key: 'tahoma', label: 'Tahoma', stack: "Tahoma,'Leelawadee UI',sans-serif" },
  { key: 'system', label: 'ค่าเริ่มต้นระบบ', stack: "system-ui,'Segoe UI','Leelawadee UI',sans-serif" },
]

// ── ตัวสร้าง HTML ของฟอร์ม (inline style ล้วน เพื่อเรนเดอร์เป็นรูปได้ครบ) ──────
// โลโก้ BMS ใช้ไฟล์ทางการฝังเป็น data URI (ทำงานทั้งบนจอ, ตอนเรนเดอร์เป็นรูป และพิมพ์)
function bmsLogoImg(w = 84) {
  return `<img src="${BMS_LOGO_DATA_URL}" alt="BMS" width="${w}" height="${w}" style="display:block;width:${w}px;height:${w}px;object-fit:contain;" />`
}

const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))

// บรรทัดรายการเครื่อง (ตู้ที่ / BMS Serial / MAC) แบบมีเส้นบรรทัด ตามฟอร์มต้นฉบับ
function unitRowHtml(i: number, serial = '', mac = ''): string {
  const s = esc(serial), m = esc(mac)
  const text = (s || m)
    ? `- ตู้ที่ ${i} &nbsp;&nbsp;MAC Address&nbsp;&nbsp; เลข BMS Serial: ${s}${m ? ` : ${m}` : ''}`
    : '&nbsp;'
  return `<tr>
      <td class="ff-unit" style="border-bottom:1px solid #000;padding:5px 6px 5px 18px;" contenteditable="true">${text}</td>
      <td class="ff-noprint" style="width:28px;text-align:center;border:0;vertical-align:middle;"><button type="button" class="ff-delrow" title="ลบบรรทัด" style="border:0;background:#f3d9db;color:#a02a32;border-radius:6px;width:22px;height:22px;cursor:pointer;font-weight:700;">✕</button></td>
    </tr>`
}

const COMPANY_LINES = 'บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)<br>เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร<br>โทรศัพท์ 0-2427-9991 โทรสาร 0-2873-0292<br>เลขที่ประจำตัวผู้เสียภาษี 0105548152334'

function buildKioskActivation(): string {
  const ed = 'contenteditable="true"'
  const sig = 'border-bottom:1px dotted #000;height:1px;margin-bottom:6px;'
  const chk = '<span class="ff-check" data-checked="0" style="display:inline-block;width:17px;height:17px;border:1.3px solid #000;text-align:center;line-height:15px;font-size:13px;cursor:pointer;vertical-align:middle;"></span>'
  // ตัวอย่างเริ่มต้น 3 บรรทัด + บรรทัดว่างมีเส้น 3 บรรทัด (ให้ดูเป็นฟอร์มเหมือนต้นฉบับ)
  const rows = [1, 2, 3].map((i) => unitRowHtml(i, `BMS-KI69-0${29 + i}`)).concat([unitRowHtml(0), unitRowHtml(0), unitRowHtml(0)]).join('')
  return `
  <div id="ff-sheet" style="width:${A4_W}px;box-sizing:border-box;background:#fff;color:#000;font-family:'Sarabun','TH Sarabun New','Leelawadee UI',system-ui,'Segoe UI',sans-serif;font-size:13.5px;line-height:1.55;">
    <div style="border:1px solid #000;">

      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;border-bottom:1px solid #000;">
        <div style="flex:0 0 auto;">${bmsLogoImg(48)}</div>
        <div ${ed} style="font-size:10px;line-height:1.5;">${COMPANY_LINES}</div>
      </div>

      <div style="text-align:center;padding:7px 12px;border-bottom:1px solid #000;">
        <span ${ed} style="text-decoration:underline;font-weight:700;font-size:15px;">เอกสารการขออนุมัติเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk (ส่งตรวจ)</span>
      </div>

      <div style="text-align:center;padding:6px 12px;border-bottom:1px solid #000;">
        ชื่อผู้ร้องขอ(BMS)&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #000;padding:0 6px;">นางสาวธนิตา สายวารี</span>&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #000;padding:0 6px;">เจ้าหน้าที่ชำนาญการขายและการตลาด</span>
      </div>

      <div style="padding:8px 12px 0;">
        <p ${ed} style="margin:0 0 8px;">ขออนุมัติเพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk ส่งตรวจอัตโนมัติรุ่น Smart Kiosk Hi-End และเปิดสิทธิ์การใช้งาน BMS HOSxP Mobile Gateway Package จำนวน 1 โรงพยาบาล ทั้งหมดจำนวน 3 ตู้ ดังนี้</p>
        <div style="border-bottom:1px solid #000;padding:2px 0 4px 6px;">1. <span id="ff-hospital" ${ed} style="padding:0 4px;font-weight:600;">โรงพยาบาล………………………</span>&nbsp;จังหวัด <span id="ff-province" ${ed} style="padding:0 4px;">………………</span></div>
        <table style="width:100%;border-collapse:collapse;">
          <tbody id="ff-units">${rows}</tbody>
        </table>
        <div class="ff-noprint" style="margin:6px 0 2px;"><button type="button" id="ff-addrow" style="border:1px dashed #b9c2cf;background:#f7f9fc;color:#3c4a5e;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer;">＋ เพิ่มบรรทัด</button></div>
      </div>

      <div ${ed} style="padding:6px 12px;border-bottom:1px solid #000;">ดังนั้นฝ่ายการตลาด จึงขออนุมัติเพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk ส่งตรวจอัตโนมัติ รุ่น Smart Kiosk Hi-End และเปิดสิทธิ์การใช้งาน BMS HOSxP Mobile Gateway Package จำนวน 1 โรงพยาบาล ทั้งหมดจำนวน 3 ตู้</div>

      <div style="padding:12px 12px 4px;">เริ่มตั้งแต่วันที่&nbsp;&nbsp;<span ${ed} style="border-bottom:1px dotted #000;padding:0 46px;"></span></div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 16px 0;">
        <div>
          <div style="margin-bottom:4px;">จึงเรียนมาเพื่อโปรดพิจารณา</div>
          <div style="padding-left:26px;">
            <div style="margin:5px 0;">${chk}&nbsp;อนุมัติ</div>
            <div style="margin:5px 0;">${chk}&nbsp;ไม่อนุมัติ</div>
          </div>
        </div>
        <div style="text-align:center;min-width:250px;margin-top:26px;">
          <div style="${sig}"></div>
          <div>( <span ${ed}>นางสาวนิธยาภรณ์ สุทธินุ่น</span> )</div>
          <div ${ed}>ผู้อนุมัติ</div>
        </div>
      </div>

      <div ${ed} style="padding:8px 12px 0;">ฝ่ายการตลาดรับทราบและดำเนินการแจ้งทีม Call Center เพื่อเปิดสิทธิ์การใช้งาน BMS Smart Hospital Kiosk (ส่งตรวจ) ต่อไป</div>

      <div style="display:flex;justify-content:center;padding:18px 12px 0;">
        <div style="text-align:center;min-width:250px;">
          <div style="${sig}"></div>
          <div>( <span ${ed}>นางสาวธนิตา สายวารี</span> )</div>
          <div ${ed}>ผู้จัดทำ</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;gap:30px;padding:26px 24px 16px;">
        <div style="text-align:center;flex:1;">
          <div style="${sig}"></div>
          <div>(<span ${ed}>นางสาวภัคธินันท์ วิโรจน์ธานีกุล</span>)</div>
          <div ${ed}>หัวหน้าแผนกการขายและการตลาด</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="${sig}"></div>
          <div>(<span ${ed}>นางสาวปราณี มีเกาะ</span>)</div>
          <div ${ed}>ผู้ดำเนินการเปิด Activation</div>
        </div>
      </div>

    </div>
  </div>`
}

// แบบฟอร์มแจ้งทำหนังสือส่งมอบงาน / แจ้งหน่วยงานภายนอก
function buildDeliveryHandover(): string {
  const ed = 'contenteditable="true"'
  const font = "'Sarabun','TH Sarabun New','Leelawadee UI',system-ui,'Segoe UI',sans-serif"
  const cw = 'display:inline-flex;align-items:center;gap:5px;'
  const box = (on = false) => `<span class="ff-check" data-checked="${on ? 1 : 0}" style="display:inline-block;width:15px;height:15px;border:1.2px solid #000;text-align:center;line-height:13px;font-size:12px;cursor:pointer;vertical-align:middle;">${on ? '✓' : ''}</span>`
  const L = (txt = '', min = '') => `<span ${ed} style="border-bottom:1px dotted #000;padding:0 5px;${min ? `display:inline-block;min-width:${min};` : ''}">${txt}</span>`
  // ป้าย/ข้อความแก้ไขได้ทุกจุด
  const T = (txt: string, extra = '') => `<span ${ed} style="${extra}">${txt}</span>`
  const Tb = (txt: string) => `<span ${ed} style="font-weight:700;">${txt}</span>`
  // ช่องติ๊ก + ป้ายที่แก้ได้
  const ck = (on: boolean, label: string) => `<span style="${cw}">${box(on)} ${T(label)}</span>`
  const grid = [
    ck(false, 'เข้าปฏิบัติงานติดตั้ง'),
    `<span style="${cw}">${box(false)} ${T('Re-visit ครั้งที่')} ${L('', '28px')}/${L('', '28px')}</span>`,
    ck(false, 'ตอบกลับวิทยากร'),
    `<span style="${cw}">${box(false)} ${T('MA ครั้งที่')} ${L('', '28px')}/${L('', '28px')}</span>`,
    ck(false, 'นำเสนอโปรแกรม เชิงรุก/เชิงรับ'),
    `<span style="${cw}">${box(false)} ${T('อื่นๆ ระบุ')} ${L('', '80px')}</span>`,
    ck(false, 'สำรวจระบบ'),
    `<span style="${cw}">${box(true)} ${T('ส่งมอบงาน')} ${L('KIOSK 1 เครื่อง', '140px')}</span>`,
    ck(false, 'ขอคัดลอกฐานข้อมูล'),
  ].join('')
  const names = [1, 2, 3, 4, 5].map((n) => `<div style="margin-top:7px;padding-left:26px;">${T(`${n}. ชื่อ-สกุล`)} ${L('', '250px')} ${T('ตำแหน่ง')} ${L('', '180px')}</div>`).join('')
  return `
  <div id="ff-sheet" style="width:${A4_W}px;box-sizing:border-box;background:#fff;color:#000;font-family:${font};font-size:13.5px;line-height:1.7;padding:22px 34px 26px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="flex:0 0 auto;">${bmsLogoImg(46)}</div>
        <div ${ed} style="font-size:10px;line-height:1.5;">${COMPANY_LINES}</div>
      </div>
      <div style="white-space:nowrap;padding-top:16px;">${T('No.')} ${L('', '90px')}</div>
    </div>

    <div style="margin-top:14px;">${Tb('วันที่')} ${L('19 ธันวาคม 2567', '200px')}</div>

    <div style="margin-top:10px;">${T('ชื่อ-นามสกุล นาย/นาง/นางสาว')} ${L('ธนิตา สายวารี', '200px')} ${T('ตำแหน่ง')} ${L('ชำนาญการ', '160px')}</div>
    <div style="margin-top:7px;">${T('แผนก/ฝ่าย')} ${L('การขายและการตลาด', '200px')} ${T('ขอแจ้งความประสงค์ทำหนังสือแจ้งหน่วยงานภายนอก')}</div>
    <div style="margin-top:7px;">${T('สิ่งที่ส่งมาด้วย จำนวน')} ${L('', '46px')} ${T('ฉบับ')} ${L('', '46px')} ${T('แผ่น')}</div>

    <div style="margin-top:8px;padding-left:24px;display:grid;grid-template-columns:190px 200px 1fr;gap:8px 12px;align-items:center;">
      ${ck(false, 'BMS-HOSxP')} ${ck(false, 'BMS-HOSxP XE')} <span style="${cw}">${box(true)} ${T('อื่นๆ ระบุ')} ${L('KIOSK 1 เครื่อง', '150px')}</span>
      ${ck(false, 'BMS Data Center')} ${ck(false, 'BMS-INVENTORY')} <span></span>
    </div>

    <div style="margin-top:14px;">${Tb('เรื่องที่ให้ดำเนินการ')}&nbsp;&nbsp;&nbsp;&nbsp;${ck(true, 'เซ็นสัญญาแล้ว')}&nbsp;&nbsp;&nbsp;&nbsp;${ck(false, 'ยังไม่เซ็นสัญญา')}</div>
    <div style="margin-top:8px;padding-left:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px 12px;align-items:center;">${grid}</div>

    <div style="margin-top:14px;">${T('วันที่ดำเนินงาน')} ${L('', '120px')} ${T('ถึง')} ${L('', '120px')} ${T('สถานที่')} <span id="ff-hospital" ${ed} style="border-bottom:1px dotted #000;padding:0 5px;">รพ.สามพราน จ.นครปฐม</span></div>

    <div style="margin-top:12px;">${T('รายชื่อผู้เข้าปฏิบัติงาน')} ${T('(ใส่ข้อมูลเฉพาะกรณีแจ้งออกหนังสือเพื่อเข้าปฏิบัติงาน)', 'font-size:11px;color:#333;')}</div>
    ${names}

    <div style="margin-top:16px;">${Tb('หนังสือแจ้งถึง')}</div>
    <div style="margin-top:6px;padding-left:24px;display:flex;flex-wrap:wrap;gap:6px 40px;">
      ${ck(true, 'เรียน ผู้อำนวยการโรงพยาบาล')} ${ck(false, 'นายแพทย์สำนักงานสาธารณสุข')}
    </div>
    <div style="margin-top:7px;padding-left:24px;"><span style="${cw}">${box(false)} ${T('อื่นๆ โปรดระบุ')} ${L('', '160px')} ${T('เรียน')} ${L('', '160px')}</span></div>

    <div style="margin-top:16px;">${Tb('หนังสือแจ้งเพื่อ')}</div>
    <div style="margin-top:6px;padding-left:24px;">${ck(false, 'เพื่อทราบ')}</div>
    <div style="margin-top:7px;padding-left:24px;">
      <span style="display:flex;gap:7px;align-items:flex-start;">${box(false)}<span>${T('ให้คณะกรรมการดำเนินการตรวจรับและเบิกจ่ายเงินต่อไป')} ${T('(กรณีที่ตรวจรับเบิกจ่ายเงิน ถ้าเป็นสัญญาจ้าง ให้ระบุเลขที่สัญญา, วันที่ลงนามในสัญญา, แต่ถ้าตอบรับใบเสนอราคา ให้ระบุใบเสนอราคา)', 'font-size:11px;color:#333;')}</span></span>
      <div style="padding-left:24px;margin-top:6px;">${T('สัญญาเลขที่')} ${L('', '160px')} ${T('จำนวน')} ${L('', '100px')} ${T('บาท')}</div>
      <div style="padding-left:24px;margin-top:4px;">${T('ลงวันที่')} ${L('', '160px')}</div>
      <div style="padding-left:24px;margin-top:4px;">${T('ใบเสนอราคา เลขที่')} ${L('', '210px')}</div>
    </div>

    <div style="margin-top:16px;">${T('ช่องทางที่ต้องการให้จัดส่ง')}&nbsp;&nbsp;&nbsp;${box(true)} ${T('ทางไปรษณีย์ EMS จ่าหน้าซอง พัสดุ ติดต่อคุณหนึ่ง 083-2487205')}</div>
    <div style="margin-top:6px;padding-left:172px;">${box(true)} ${T('ทาง E-mail')} ${L('', '190px')}</div>
    <div style="margin-top:6px;padding-left:78px;">${T('CC E-mail')} ${L('tanitasofia9641@gmail.com', '220px')}</div>
    <div style="margin-top:16px;text-align:center;">${Tb('** แนบพร้อมใบส่งของ/ใบแจ้งหนี้ **')}</div>
  </div>`
}

// แบบฟอร์มแจ้งทำหนังสือแจ้งเข้าดำเนินการ / เปลี่ยนอุปกรณ์ (โครงเดียวกับแจ้งส่งมอบ)
function buildWorkNotice(): string {
  const ed = 'contenteditable="true"'
  const font = "'Sarabun','TH Sarabun New','Leelawadee UI',system-ui,'Segoe UI',sans-serif"
  const cw = 'display:inline-flex;align-items:center;gap:5px;'
  const box = (on = false) => `<span class="ff-check" data-checked="${on ? 1 : 0}" style="display:inline-block;width:15px;height:15px;border:1.2px solid #000;text-align:center;line-height:13px;font-size:12px;cursor:pointer;vertical-align:middle;">${on ? '✓' : ''}</span>`
  const L = (txt = '', min = '') => `<span ${ed} style="border-bottom:1px dotted #000;padding:0 5px;${min ? `display:inline-block;min-width:${min};` : ''}">${txt}</span>`
  const T = (txt: string, extra = '') => `<span ${ed} style="${extra}">${txt}</span>`
  const Tb = (txt: string) => `<span ${ed} style="font-weight:700;">${txt}</span>`
  const ck = (on: boolean, label: string) => `<span style="${cw}">${box(on)} ${T(label)}</span>`
  const grid = [
    ck(false, 'เข้าปฏิบัติงานติดตั้ง'),
    `<span style="${cw}">${box(false)} ${T('Re-visit ครั้งที่')} ${L('', '28px')}/${L('', '28px')}</span>`,
    ck(false, 'ตอบกลับวิทยากร'),
    `<span style="${cw}">${box(false)} ${T('MA ครั้งที่')} ${L('', '28px')}/${L('', '28px')}</span>`,
    ck(false, 'นำเสนอโปรแกรม เชิงรุก/เชิงรับ'),
    `<span style="${cw}">${box(true)} ${T('อื่นๆ ระบุ')} ${L('', '80px')}</span>`,
    ck(false, 'สำรวจระบบ'),
    `<span style="${cw}">${box(false)} ${T('ส่งมอบงาน')} ${L('', '140px')}</span>`,
    ck(false, 'ขอคัดลอกฐานข้อมูล'),
  ].join('')
  const names = [
    { n: '1', name: 'นายภัทรดล พลแดง', pos: 'หัวหน้าทีม Smart Innovation' },
    { n: '2', name: '', pos: '' }, { n: '3', name: '', pos: '' }, { n: '4', name: '', pos: '' }, { n: '5', name: '', pos: '' },
  ].map((r) => `<div style="margin-top:7px;padding-left:26px;">${T(`${r.n}. ชื่อ-สกุล`)} ${L(r.name, '250px')} ${T('ตำแหน่ง')} ${L(r.pos, '180px')}</div>`).join('')
  return `
  <div id="ff-sheet" style="width:${A4_W}px;box-sizing:border-box;background:#fff;color:#000;font-family:${font};font-size:13.5px;line-height:1.7;padding:22px 34px 26px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="flex:0 0 auto;">${bmsLogoImg(46)}</div>
        <div ${ed} style="font-size:10px;line-height:1.5;">${COMPANY_LINES}</div>
      </div>
      <div style="white-space:nowrap;padding-top:16px;">${T('No.')} ${L('', '90px')}</div>
    </div>

    <div style="margin-top:14px;">${Tb('วันที่')} ${L('11 สิงหาคม 2569', '200px')}</div>

    <div style="margin-top:10px;">${T('ชื่อ-นามสกุล นาย/นาง/นางสาว')} ${L('ณัฐฉัตร วงค์วันดี', '200px')} ${T('ตำแหน่ง')} ${L('เจ้าหน้าที่ประสานงานขาย', '190px')}</div>
    <div style="margin-top:7px;">${T('แผนก/ฝ่าย')} ${L('คลังข้อมูล', '200px')} ${T('ขอแจ้งความประสงค์ทำหนังสือแจ้งหน่วยงานภายนอก')}</div>
    <div style="margin-top:8px;">${T('สิ่งที่ส่งมาด้วย')}</div>

    <div style="margin-top:6px;padding-left:24px;display:grid;grid-template-columns:190px 200px 1fr;gap:8px 12px;align-items:center;">
      ${ck(false, 'BMS-HOSxP')} ${ck(false, 'BMS-HOSxP XE')} <span style="${cw}">${box(true)} ${T('อื่นๆ ระบุ')} ${L('', '150px')}</span>
      ${ck(false, 'BMS Data Center')} ${ck(false, 'BMS-INVENTORY')} <span></span>
    </div>

    <div style="margin-top:14px;">${Tb('เรื่องที่ให้ดำเนินการ')}&nbsp;&nbsp;&nbsp;&nbsp;${ck(true, 'เซ็นสัญญาแล้ว')}&nbsp;&nbsp;&nbsp;&nbsp;${ck(false, 'ยังไม่เซ็นสัญญา')}</div>
    <div style="margin-top:8px;padding-left:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px 12px;align-items:center;">${grid}</div>

    <div style="margin-top:10px;padding-left:8px;">${Tb('** เข้าดำเนินงานเปลี่ยนอุปกรณ์ Mother board 4+32 G จำนวน 1 ชิ้น ของโรงพยาบาลกบินทร์บุรี จังหวัดปราจีนบุรี')}</div>

    <div style="margin-top:12px;">${T('วันที่ดำเนินงาน')} ${L('19 สิงหาคม 2569', '150px')} ${T('ถึง')} ${L('19 สิงหาคม 2569', '150px')} ${T('(1 วัน)')} ${T('สถานที่')} <span id="ff-hospital" ${ed} style="border-bottom:1px dotted #000;padding:0 5px;">โรงพยาบาลกบินทร์บุรี จังหวัดปราจีนบุรี</span></div>

    <div style="margin-top:12px;">${T('รายชื่อผู้เข้าปฏิบัติงาน')} ${T('(ใส่ข้อมูลเฉพาะกรณีแจ้งออกหนังสือเพื่อเข้าปฏิบัติงาน)', 'font-size:11px;color:#333;')}</div>
    ${names}

    <div style="margin-top:16px;">${Tb('หนังสือแจ้งถึง')}</div>
    <div style="margin-top:6px;padding-left:24px;display:flex;flex-wrap:wrap;gap:6px 40px;">
      ${ck(true, 'เรียน ผู้อำนวยการโรงพยาบาล')} ${ck(false, 'นายแพทย์สำนักงานสาธารณสุข')}
    </div>
    <div style="margin-top:7px;padding-left:24px;"><span style="${cw}">${box(false)} ${T('อื่นๆ โปรดระบุ')} ${L('', '160px')} ${T('เรียน')} ${L('', '160px')}</span></div>

    <div style="margin-top:16px;">${Tb('หนังสือแจ้งเพื่อ')}</div>
    <div style="margin-top:6px;padding-left:24px;">${ck(true, 'เพื่อทราบ')}</div>
    <div style="margin-top:7px;padding-left:24px;">
      <span style="display:flex;gap:7px;align-items:flex-start;">${box(false)}<span>${T('ให้คณะกรรมการดำเนินการตรวจรับและเบิกจ่ายเงินต่อไป')} ${T('(กรณีที่ตรวจรับเบิกจ่ายเงิน ถ้าเป็นสัญญาจ้าง ให้ระบุเลขที่สัญญา, วันที่ลงนามในสัญญา, แต่ถ้าตอบรับใบเสนอราคา ให้ระบุใบเสนอราคา)', 'font-size:11px;color:#333;')}</span></span>
      <div style="padding-left:24px;margin-top:6px;">${T('ใบสั่งจ้าง เลขที่')} ${L('', '160px')} ${T('จำนวน')} ${L('', '100px')} ${T('บาท')}</div>
      <div style="padding-left:24px;margin-top:4px;">${T('ลงวันที่')} ${L('', '160px')}</div>
      <div style="padding-left:24px;margin-top:4px;">${T('ใบเสนอราคา เลขที่')} ${L('', '210px')}</div>
    </div>

    <div style="margin-top:16px;">${T('ช่องทางที่ต้องการให้จัดส่ง')}&nbsp;&nbsp;&nbsp;${box(true)} ${T('ทางไปรษณีย์ EMS จ่าหน้า คุณขวัญเรือน 0614199332')}</div>
    <div style="margin-top:6px;padding-left:172px;">${box(true)} ${T('ทาง E-mail')} ${L('Itkabinburi@gmail.com', '210px')}</div>
    <div style="margin-top:6px;padding-left:78px;">${T('CC E-mail')} ${L('tanitasofia9641@gmail.com/wong.nattachat@gmail.com', '320px')}</div>
  </div>`
}

function buildSheet(id: TemplateId): string {
  switch (id) {
    case 'kiosk-activation': return buildKioskActivation()
    case 'delivery-handover': return buildDeliveryHandover()
    case 'work-notice': return buildWorkNotice()
    default: return ''
  }
}

// จัดรูปแบบข้อความที่เลือก (ตัวหนา/บาง/ขีดเส้นใต้) เฉพาะจุด — ทำงานบนช่อง contenteditable
function execFmt(cmd: 'bold' | 'underline' | 'italic') {
  try { document.execCommand('styleWithCSS', false, 'true') } catch { /* บางเบราว์เซอร์ */ }
  try { document.execCommand(cmd) } catch { /* ไม่รองรับ */ }
}
// กำหนดน้ำหนักฟอนต์ตามค่าที่ต้องการ (เช่น 300 บาง, 400 ปกติ, 700 หนา) ให้ช่วงที่เลือก
function setSelWeight(w: number) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
  const range = sel.getRangeAt(0)
  const span = document.createElement('span')
  span.style.fontWeight = String(w)
  try { span.appendChild(range.extractContents()); range.insertNode(span); sel.removeAllRanges() } catch { /* ช่วงเลือกซับซ้อน */ }
}

// HTML ของเอกสารที่สะอาด (ตัดปุ่ม/ตัวช่วยที่ไม่ต้องพิมพ์ออก) — ใช้ทำรูป/พิมพ์/Word
function cleanSheetClone(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.ff-noprint').forEach((n) => n.remove())
  clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
  clone.querySelectorAll('.ff-sel').forEach((n) => n.classList.remove('ff-sel'))
  return clone
}

// ── DOM → Canvas ด้วย SVG foreignObject (ไม่พึ่ง library) ─────────────────────
async function nodeToCanvas(node: HTMLElement, scale = 2): Promise<HTMLCanvasElement> {
  const clone = cleanSheetClone(node)
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  const w = node.offsetWidth || A4_W
  const h = node.scrollHeight || node.offsetHeight
  const xml = new XMLSerializer().serializeToString(clone)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">${xml}</foreignObject></svg>`
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const img = new Image()
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('render')); img.src = url })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  return canvas
}

async function nodeToPngBlob(node: HTMLElement, scale = 2): Promise<Blob> {
  const canvas = await nodeToCanvas(node, scale)
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'))
}

// ── Canvas (JPEG) → PDF หน้าเดียวขนาด A4 (สร้าง PDF เองแบบไม่พึ่ง library) ─────
async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpeg = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', 0.92))
  const jb = new Uint8Array(await jpeg.arrayBuffer())
  const iw = canvas.width, ih = canvas.height
  const pageW = 595.28, pageH = 841.89, margin = 28 // A4 @72dpi
  const s = Math.min((pageW - 2 * margin) / iw, (pageH - 2 * margin) / ih)
  const w = iw * s, h = ih * s
  const x = (pageW - w) / 2, y = pageH - margin - h // ชิดบน
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  let len = 0
  const off: number[] = []
  const push = (u: Uint8Array) => { chunks.push(u); len += u.length }
  const put = (str: string) => push(enc.encode(str))
  const obj = (n: number, body: string) => { off[n] = len; put(`${n} 0 obj\n${body}\nendobj\n`) }
  put('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`)
  const content = `q\n${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`
  obj(4, `<< /Length ${content.length} >>\nstream\n${content}endstream`)
  off[5] = len
  put(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jb.length} >>\nstream\n`)
  push(jb)
  put('\nendstream\nendobj\n')
  const xrefStart = len
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) xref += String(off[i]).padStart(10, '0') + ' 00000 n \n'
  put(xref)
  put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(len)
  let o = 0
  for (const c of chunks) { out.set(c, o); o += c.length }
  return new Blob([out], { type: 'application/pdf' })
}

// ── เอกสาร → Word (.doc) : HTML ที่ Word เปิดได้ (ไม่พึ่ง library) ─────────────
function sheetToDocBlob(node: HTMLElement, title: string): Blob {
  const inner = cleanSheetClone(node).outerHTML
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--><style>@page{size:A4;margin:1.2cm}body{margin:0}</style></head><body>${inner}</body></html>`
  return new Blob(['﻿', html], { type: 'application/msword' })
}

export function FormBuilder({ initialJobId }: { initialJobId?: string }) {
  const [tpl, setTpl] = useState<Template | null>(null)
  const [job, setJob] = useState<JobHit | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<JobHit[]>([])
  const [searching, setSearching] = useState(false)
  const [cats, setCats] = useState<string[]>([])
  const [cat, setCat] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [fontKey, setFontKey] = useState('sarabun')
  const [fontPx, setFontPx] = useState(13.5)
  const [lineH, setLineH] = useState(1.55)
  const [layout, setLayout] = useState(false)
  const [fmt, setFmt] = useState<'pdf' | 'png' | 'doc'>('pdf')
  const sheetWrap = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const scalerRef = useRef<HTMLDivElement>(null)
  const selBlock = useRef<HTMLElement | null>(null)

  // ชนิดเอกสาร (จาก ตั้งค่า › ชนิดเอกสารงาน)
  useEffect(() => {
    fetch('/api/settings/options?category=JOB_DOC_TYPE', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: { value: string; active: boolean }[]) => {
        const vals = (items || []).filter((i) => i.active).map((i) => i.value)
        if (vals.length) setCats(vals)
      }).catch(() => {})
  }, [])

  // เปิดฟอร์มมาจากลิงก์งาน (?job=)
  useEffect(() => {
    if (!initialJobId) return
    fetch(`/api/jobs/${initialJobId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.id) setJob({ id: j.id, jobCode: j.jobCode, contractNo: j.contractNo ?? null, province: j.province ?? null, hospital: j.hospital ? { name: j.hospital.name } : null }) })
      .catch(() => {})
  }, [initialJobId])

  // เมื่อเลือกแม่แบบ → วางฟอร์มลง DOM ครั้งเดียว แล้วผูก event เอง (ไม่ให้ React มายุ่ง)
  useEffect(() => {
    const wrap = sheetWrap.current
    if (!wrap || !tpl) return
    wrap.innerHTML = buildSheet(tpl.id)
    setCat((c) => c || tpl.defaultCat)

    const ac = new AbortController()
    const tbody = wrap.querySelector('#ff-units') as HTMLTableSectionElement | null
    function makeRow(): HTMLTableRowElement {
      const tbl = document.createElement('tbody')
      tbl.innerHTML = unitRowHtml((tbody?.rows.length ?? 0) + 1)
      return tbl.rows[0]
    }
    wrap.addEventListener('click', (e) => {
      const t = e.target as HTMLElement
      if (t.id === 'ff-addrow') { tbody?.appendChild(makeRow()); return }
      if (t.classList?.contains('ff-delrow')) { t.closest('tr')?.remove(); return }
      if (t.classList?.contains('ff-check')) {
        const on = t.getAttribute('data-checked') === '1'
        t.setAttribute('data-checked', on ? '0' : '1')
        t.textContent = on ? '' : '✓'
      }
    }, { signal: ac.signal })
    return () => ac.abort()
  }, [tpl])

  // ย่อเอกสารให้พอดีความกว้างที่มี (ไม่เกินขนาดจริง) — กันแถบเลื่อนแนวนอน
  // แต่ยังเรนเดอร์/พิมพ์ที่ความละเอียดเต็ม A4 เพราะ transform ไม่กระทบ layout box
  useEffect(() => {
    const outer = fitRef.current
    const inner = scalerRef.current
    if (!outer || !inner) return
    const apply = () => {
      const avail = outer.clientWidth
      const natW = inner.offsetWidth || 1
      const s = Math.min(1, avail / natW)
      inner.style.transformOrigin = 'top left'
      inner.style.transform = `scale(${s})`
      outer.style.height = inner.offsetHeight * s + 'px'
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(outer); ro.observe(inner)
    return () => ro.disconnect()
  }, [tpl])

  // เติมข้อมูลงานเมื่อเลือก: ชื่อ รพ./จังหวัด + ตาราง BMS Serial & MAC จากงานจริง
  useEffect(() => {
    const wrap = sheetWrap.current
    if (!wrap || !job) return
    let alive = true
    const h = wrap.querySelector('#ff-hospital')
    const p = wrap.querySelector('#ff-province')
    if (h && job.hospital?.name) h.textContent = job.hospital.name
    if (p && job.province) p.textContent = job.province
    // ดึง Serial + MAC ของเครื่องในงาน มาเติมตาราง
    fetch(`/api/jobs/${job.id}/units`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { units: [] }))
      .then((j: { units: { serialNo: string; mac: string }[] }) => {
        if (!alive) return
        const tbody = wrap.querySelector('#ff-units') as HTMLTableSectionElement | null
        const units = j.units || []
        if (tbody && units.length) {
          const rowsHtml = units.map((u, i) => unitRowHtml(i + 1, u.serialNo, u.mac))
          for (let i = units.length; i < 6; i++) rowsHtml.push(unitRowHtml(0)) // บรรทัดว่างมีเส้น
          tbody.innerHTML = rowsHtml.join('')
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [job, tpl])

  // ฟอนต์ / ขนาดตัวอักษร / ระยะบรรทัด — ตั้งที่ root ของเอกสาร (ติดไปตอนบันทึก/พิมพ์ด้วย)
  useEffect(() => {
    const sheet = sheetWrap.current?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet) return
    sheet.style.fontFamily = (FONTS.find((f) => f.key === fontKey) ?? FONTS[0]).stack
    sheet.style.fontSize = fontPx + 'px'
    sheet.style.lineHeight = String(lineH)
  }, [tpl, job, fontKey, fontPx, lineH])

  // โหมดจัดวาง — คลิกเลือกบล็อก/บรรทัด แล้วเลื่อนขึ้น-ลง/เว้นระยะ/เยื้องได้
  useEffect(() => {
    const wrap = sheetWrap.current
    const sheet = wrap?.querySelector('#ff-sheet') as HTMLElement | null
    const container = sheet?.firstElementChild as HTMLElement | null
    if (!wrap || !sheet || !container) return
    if (!layout) return
    const editables = Array.from(sheet.querySelectorAll('[contenteditable="true"]')) as HTMLElement[]
    editables.forEach((e) => e.setAttribute('contenteditable', 'false')) // ปิดพิมพ์ชั่วคราวเพื่อคลิกเลือก
    sheet.classList.add('ff-layout')
    const onClick = (e: Event) => {
      let el = e.target as HTMLElement | null
      while (el && el.parentElement !== container) el = el.parentElement // หาบล็อกระดับบนสุด
      if (!el) return
      wrap.querySelectorAll('.ff-sel').forEach((n) => n.classList.remove('ff-sel'))
      el.classList.add('ff-sel')
      selBlock.current = el
    }
    container.addEventListener('click', onClick)
    return () => {
      container.removeEventListener('click', onClick)
      sheet.classList.remove('ff-layout')
      wrap.querySelectorAll('.ff-sel').forEach((n) => n.classList.remove('ff-sel'))
      editables.forEach((e) => e.setAttribute('contenteditable', 'true'))
      selBlock.current = null
    }
  }, [layout, tpl, job])

  function moveBlock(dir: -1 | 1) {
    const el = selBlock.current, par = el?.parentElement
    if (!el || !par) return
    const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling
    if (!sib) return
    if (dir < 0) par.insertBefore(el, sib)
    else par.insertBefore(sib, el)
  }
  function nudge(prop: 'marginTop' | 'marginLeft', d: number) {
    const el = selBlock.current
    if (!el) return
    const cur = parseFloat(el.style[prop] || '0') || 0
    el.style[prop] = Math.max(0, cur + d) + 'px'
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    const term = q.trim()
    if (!term) return
    setSearching(true); setMsg(null)
    try {
      const r = await fetch(`/api/jobs?q=${encodeURIComponent(term)}`, { cache: 'no-store' })
      const list = r.ok ? await r.json() : []
      setHits((Array.isArray(list) ? list : []).slice(0, 12).map((j: { id: string; jobCode: string; contractNo?: string | null; province?: string | null; hospital?: { name: string } | null }) => ({
        id: j.id, jobCode: j.jobCode, contractNo: j.contractNo ?? null, province: j.province ?? null, hospital: j.hospital ?? null,
      })))
    } finally { setSearching(false) }
  }

  // สร้างไฟล์ตามรูปแบบที่เลือก (pdf / png / doc)
  async function makeFile(): Promise<{ blob: Blob; ext: string; mime: string }> {
    const sheet = sheetWrap.current?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet) throw new Error('no sheet')
    if (fmt === 'doc') return { blob: sheetToDocBlob(sheet, tpl?.title ?? 'แบบฟอร์ม'), ext: 'doc', mime: 'application/msword' }
    const canvas = await nodeToCanvas(sheet, 3)
    if (fmt === 'pdf') return { blob: await canvasToPdfBlob(canvas), ext: 'pdf', mime: 'application/pdf' }
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'))
    return { blob, ext: 'png', mime: 'image/png' }
  }
  const baseName = () => `${tpl?.title ?? 'แบบฟอร์ม'}${job ? '-' + job.jobCode : ''}`.replace(/[\\/:*?"<>|]+/g, '-')

  async function saveToJob() {
    const sheet = sheetWrap.current?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet || !tpl) return
    if (!job) { setMsg({ kind: 'err', text: 'เลือกงานปลายทางก่อน (ค้นหาด้วยเลขสัญญา/รหัสงาน)' }); return }
    setBusy(true); setMsg(null)
    try {
      setPhase('กำลังสร้างเอกสาร…')
      const { blob, ext, mime } = await makeFile()
      const file = new File([blob], `${baseName()}.${ext}`, { type: mime })
      setPhase('กำลังบันทึกเข้าเอกสารงาน…')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', cat || tpl.defaultCat)
      const r = await fetch(`/api/jobs/${job.id}/documents`, { method: 'POST', body: fd })
      const j = await r.json().catch(() => ({}))
      if (r.ok) setMsg({ kind: 'ok', text: `บันทึกเข้าเอกสารงาน ${job.jobCode} แล้ว (${ext.toUpperCase()})` })
      else setMsg({ kind: 'err', text: j.message || 'บันทึกไม่สำเร็จ' })
    } catch {
      setMsg({ kind: 'err', text: 'สร้างเอกสารไม่สำเร็จ (เบราว์เซอร์ไม่รองรับการเรนเดอร์) — ลองใช้ Chrome/Edge' })
    } finally { setBusy(false); setPhase('') }
  }

  // ดาวน์โหลดลงเครื่องตามรูปแบบที่เลือก (ไม่ต้องแนบเข้างาน)
  async function downloadFile() {
    setBusy(true); setMsg(null)
    try {
      setPhase('กำลังสร้างไฟล์…')
      const { blob, ext } = await makeFile()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${baseName()}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      setMsg({ kind: 'err', text: 'สร้างไฟล์ไม่สำเร็จ — ลองใช้ Chrome/Edge' })
    } finally { setBusy(false); setPhase('') }
  }

  // พิมพ์ผ่าน iframe + Blob URL (เสถียรกว่า window.open('about:blank') ที่ Chrome มัก
  // พิมพ์ไม่ผ่าน) และรอให้รูปโหลดเสร็จก่อนสั่งพิมพ์ กัน "Print Failed"
  function printSheet() {
    const wrap = sheetWrap.current
    const sheet = wrap?.querySelector('#ff-sheet') as HTMLElement | null
    if (!sheet) return
    const clone = sheet.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.ff-noprint').forEach((n) => n.remove())
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
    // ย่อให้พอดี 1 หน้า A4 เสมอ (A4 @96dpi = 794×1123px, เว้นขอบ ~9mm)
    const PAGE_W = 794, PAGE_H = 1123, PAD = 34
    const sheetH = sheet.scrollHeight || sheet.offsetHeight
    const scale = Math.min((PAGE_W - 2 * PAD) / A4_W, (PAGE_H - 2 * PAD) / sheetH, 1)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${tpl?.title ?? 'แบบฟอร์ม'}</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0}.pg{width:${PAGE_W}px;height:${PAGE_H}px;box-sizing:border-box;padding:${PAD}px;display:flex;justify-content:center;align-items:flex-start;overflow:hidden}.ft{transform:scale(${scale});transform-origin:top center}</style></head><body><div class="pg"><div class="ft">${clone.outerHTML}</div></div></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const ifr = document.createElement('iframe')
    ifr.setAttribute('aria-hidden', 'true')
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    ifr.src = url
    ifr.onload = () => {
      const w = ifr.contentWindow
      if (!w) return
      const go = () => { try { w.focus(); w.print() } catch { /* ผู้ใช้ยกเลิก */ } }
      // รอรูป (โลโก้) ให้พร้อมก่อนพิมพ์
      const imgs = Array.from(w.document.images)
      const pending = imgs.filter((im) => !im.complete)
      if (!pending.length) setTimeout(go, 150)
      else {
        let left = pending.length
        const done = () => { if (--left <= 0) setTimeout(go, 100) }
        pending.forEach((im) => { im.addEventListener('load', done); im.addEventListener('error', done) })
        setTimeout(go, 1500) // กันค้าง
      }
      setTimeout(() => { URL.revokeObjectURL(url); ifr.remove() }, 60000)
    }
    document.body.appendChild(ifr)
  }

  const catList = cats.length ? cats : [tpl?.defaultCat ?? 'สัญญา / PO']

  // ── หน้าเลือกแม่แบบ ─────────────────────────────────────────────────────────
  if (!tpl) {
    return (
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-[20px] font-bold text-[#1F2A3C] mb-1">📝 แบบฟอร์มเอกสาร</h1>
        <p className="text-[13px] text-[#8492A6] mb-5">เลือกแบบฟอร์ม → แก้ไขได้ทุกช่อง → ค้นหางานด้วยเลขสัญญา/PO แล้วบันทึกเข้า “เอกสารงาน” ของงานนั้นได้เลย</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => setTpl(t)}
              className="text-left bg-white border border-[#E7EDF4] rounded-2xl p-5 hover:border-[var(--brand)] hover:shadow-[0_12px_30px_-16px_rgba(18,45,90,0.35)] transition">
              <div className="w-10 h-10 grid place-items-center rounded-xl mb-3 text-white text-[18px]" style={{ background: t.accent }}>📄</div>
              <div className="text-[15px] font-bold text-[#233047] mb-1">{t.title}</div>
              <div className="text-[12.5px] text-[#8492A6] leading-relaxed">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── หน้าแก้ไข + บันทึก ───────────────────────────────────────────────────────
  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6">
      <style>{`#ff-sheet [contenteditable]:hover{background:#fff8e6}#ff-sheet [contenteditable]:focus{outline:2px solid var(--brand);outline-offset:1px;background:#fffdf5;border-radius:3px}#ff-sheet.ff-layout,#ff-sheet.ff-layout *{cursor:pointer}#ff-sheet.ff-layout>div>*{outline:1px dashed #C3D0E0;outline-offset:-1px}#ff-sheet .ff-sel{outline:2px solid var(--brand)!important;background:#FFF6E0}`}</style>

      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => { setTpl(null); setJob(null); setHits([]); setMsg(null) }}
          className="text-[13px] text-[#5A6B82] hover:text-[var(--brand)] font-semibold">← เลือกแบบฟอร์มอื่น</button>
        <span className="text-[#C9D3E0]">/</span>
        <span className="text-[15px] font-bold text-[#233047]">{tpl.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* แผงควบคุม */}
        <div className="lg:sticky lg:top-20 self-start space-y-4">
          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
            <div className="text-[13px] font-bold text-[#233047] mb-2">1) งานปลายทาง</div>
            <form onSubmit={search} className="flex gap-2 mb-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="เลขสัญญา / PO / รหัสงาน / โรงพยาบาล"
                className="flex-1 text-[13px] border border-[#DCE4EE] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--brand)]" />
              <button type="submit" disabled={searching}
                className="text-[13px] font-semibold px-3 py-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] disabled:opacity-60">
                {searching ? '…' : 'ค้นหา'}
              </button>
            </form>
            {hits.length > 0 && !job && (
              <div className="border border-[#EEF2F7] rounded-xl divide-y divide-[#F1F4F8] max-h-64 overflow-auto">
                {hits.map((h) => (
                  <button key={h.id} type="button" onClick={() => { setJob(h); setHits([]) }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F7F9FC]">
                    <div className="text-[13px] font-semibold text-[#233047]">{h.jobCode}{h.contractNo ? ` · ${h.contractNo}` : ''}</div>
                    <div className="text-[11.5px] text-[#8492A6]">{h.hospital?.name ?? '—'}{h.province ? ` · ${h.province}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
            {job && (
              <div className="bg-[#F1FBF5] border border-[#BFE6CE] rounded-xl px-3 py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-[#157F4C]">✓ {job.jobCode}{job.contractNo ? ` · ${job.contractNo}` : ''}</div>
                  <div className="text-[11.5px] text-[#5A6B82]">{job.hospital?.name ?? '—'}{job.province ? ` · ${job.province}` : ''}</div>
                </div>
                <button type="button" onClick={() => setJob(null)} className="text-[12px] text-[#8492A6] hover:text-[#C13540] font-semibold">เปลี่ยน</button>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4">
            <div className="text-[13px] font-bold text-[#233047] mb-2">2) ชนิดเอกสาร</div>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {catList.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className={`text-[12px] font-semibold px-2.5 py-1.5 rounded-full border ${cat === c ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-3">
            <div className="text-[13px] font-bold text-[#233047]">3) ฟอนต์ &amp; รูปแบบ</div>
            <div>
              <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ฟอนต์</div>
              <select value={fontKey} onChange={(e) => setFontKey(e.target.value)}
                className="w-full text-[13px] border border-[#DCE4EE] rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-[var(--brand)]">
                {FONTS.map((f) => <option key={f.key} value={f.key} style={{ fontFamily: f.stack }}>{f.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ขนาดตัวอักษร</div>
                <div className="flex items-center border border-[#DCE4EE] rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setFontPx((v) => Math.max(11, +(v - 0.5).toFixed(1)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">−</button>
                  <span className="flex-1 text-center text-[12.5px] tabular-nums">{fontPx}px</span>
                  <button type="button" onClick={() => setFontPx((v) => Math.min(20, +(v + 0.5).toFixed(1)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">＋</button>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">ระยะบรรทัด</div>
                <div className="flex items-center border border-[#DCE4EE] rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setLineH((v) => Math.max(1.1, +(v - 0.1).toFixed(2)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">−</button>
                  <span className="flex-1 text-center text-[12.5px] tabular-nums">{lineH.toFixed(2)}</span>
                  <button type="button" onClick={() => setLineH((v) => Math.min(2.4, +(v + 0.1).toFixed(2)))} className="px-2.5 py-1.5 text-[15px] font-bold text-[#5A6B82] hover:bg-[#F4F7FB]">＋</button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">จัดข้อความที่เลือก <span className="font-normal text-[#96A2B5]">(ลากคลุมข้อความในเอกสารก่อน)</span></div>
              <div className="grid grid-cols-4 gap-1.5">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt('bold') }} title="ตัวหนา"
                  className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)] text-[13px] font-bold">หนา</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); setSelWeight(300) }} title="ตัวบาง"
                  className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)] text-[13px]" style={{ fontWeight: 300 }}>บาง</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); setSelWeight(400) }} title="ปกติ"
                  className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)] text-[13px]">ปกติ</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); execFmt('underline') }} title="ขีดเส้นใต้"
                  className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)] text-[13px] underline">ใต้</button>
              </div>
            </div>

            <div className="pt-1 border-t border-[#F0F3F7]">
              <button type="button" onClick={() => setLayout((v) => !v)}
                className={`w-full text-[13px] font-semibold px-3 py-2 rounded-lg border ${layout ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#3C4A5E] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                {layout ? '✓ โหมดจัดวาง (กำลังเปิด)' : '↕ โหมดจัดวาง (เลื่อนบรรทัด/ตำแหน่ง)'}
              </button>
              {layout && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-[#96A2B5] leading-relaxed">คลิกเลือกบรรทัด/บล็อกในเอกสาร แล้วใช้ปุ่มด้านล่างเลื่อน (ในโหมดนี้พิมพ์แก้ข้อความไม่ได้ชั่วคราว)</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[12px] font-semibold">
                    <button type="button" onClick={() => moveBlock(-1)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">▲ เลื่อนขึ้น</button>
                    <button type="button" onClick={() => moveBlock(1)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">▼ เลื่อนลง</button>
                    <button type="button" onClick={() => nudge('marginTop', 4)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">＋ เว้นบน</button>
                    <button type="button" onClick={() => nudge('marginTop', -4)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">− เว้นบน</button>
                    <button type="button" onClick={() => nudge('marginLeft', 8)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">→ เยื้องขวา</button>
                    <button type="button" onClick={() => nudge('marginLeft', -8)} className="px-2 py-1.5 rounded-lg border border-[#DCE4EE] hover:border-[var(--brand)]">← เยื้องซ้าย</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E7EDF4] rounded-2xl p-4 space-y-2">
            <div className="text-[13px] font-bold text-[#233047] mb-1">4) บันทึก / พิมพ์</div>
            <div>
              <div className="text-[11.5px] font-semibold text-[#5A6B82] mb-1">รูปแบบไฟล์</div>
              <div className="grid grid-cols-3 gap-1.5">
                {([['pdf', 'PDF'], ['png', 'รูป (PNG)'], ['doc', 'Word']] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setFmt(k)}
                    className={`text-[12px] font-semibold px-2 py-1.5 rounded-lg border ${fmt === k ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[#5A6B82] border-[#DCE4EE] hover:border-[var(--brand)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={saveToJob} disabled={busy}
              className="w-full text-[13.5px] font-semibold px-3 py-2.5 rounded-lg bg-[#157F4C] text-white hover:bg-[#0F6B3E] disabled:opacity-60">
              💾 บันทึกเข้าเอกสารงาน ({fmt.toUpperCase()})
            </button>
            <button type="button" onClick={downloadFile} disabled={busy}
              className="w-full text-[13px] font-semibold px-3 py-2.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              ⬇ ดาวน์โหลดลงเครื่อง ({fmt.toUpperCase()})
            </button>
            <button type="button" onClick={printSheet} disabled={busy}
              className="w-full text-[13px] font-semibold px-3 py-2.5 rounded-lg border border-[#DCE4EE] text-[#3C4A5E] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              🖨️ พิมพ์
            </button>
            {busy && <div className="text-[12.5px] text-[var(--brand)] font-semibold">{phase || 'กำลังทำงาน…'}</div>}
            {msg && (
              <div className={`text-[12.5px] rounded-lg px-3 py-2 ${msg.kind === 'ok' ? 'text-[#157F4C] bg-[#EAF7EF] border border-[#BFE6CE]' : 'text-[#B0272F] bg-[#FBE9E9] border border-[#E7B4B4]'}`}>
                {msg.text}{msg.kind === 'ok' && job && <> · <a href={`/jobs/${job.id}`} className="underline font-semibold">เปิดงาน</a></>}
              </div>
            )}
            <p className="text-[11px] text-[#96A2B5] leading-relaxed">คลิกในเอกสารเพื่อแก้ไขข้อความได้ทุกจุด · ช่องติ๊ก ✓ กดที่กล่องเพื่อสลับ · ปุ่มลบแถว/เพิ่มแถวจะไม่ติดไปในไฟล์ที่บันทึก</p>
          </div>
        </div>

        {/* ตัวเอกสาร (แก้ไขได้) — ย่อพอดีจอ ไม่มีแถบเลื่อนล่าง */}
        <div ref={fitRef} className="min-w-0 overflow-hidden">
          <div ref={scalerRef} className="inline-block bg-[#EEF1F5] rounded-2xl p-4 shadow-inner">
            <div ref={sheetWrap} className="bg-white shadow-[0_10px_40px_-16px_rgba(18,45,90,0.4)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
