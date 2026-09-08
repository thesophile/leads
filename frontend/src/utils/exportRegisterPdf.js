import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '../api/client'

/**
 * Build a paginated A4 register PDF (with company header, applied-filters box
 * and an audit footer on every page) and download it.
 *
 * Reserved print areas: logo, company name, title, printed/records meta and the
 * filters strip on top; client IP / branding / page numbers on every footer;
 * a REGISTER AUDIT summary line under the final table row.
 *
 * @param {object} options
 * @param {string} options.title            Title shown top-right (uppercase).
 * @param {string} options.fileNamePrefix   Saved file name prefix (date appended).
 * @param {string[]} options.columns        Table header cells.
 * @param {Array<Array<unknown>>} options.rows  Table body rows (flat cells).
 * @param {object} [options.filters]        Object of applied filter label->value.
 * @param {object} [options.columnStyles]   jspdf-autotable per-column styles.
 */
export async function exportRegisterPdf({
  title,
  fileNamePrefix,
  columns,
  rows,
  filters = {},
  columnStyles = {},
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 40
  const marginY = 40
  const contentW = pageW - marginX * 2

  // Resolve the caller's IP for the audit footer (fall back if unavailable).
  let clientIp = '-'
  try {
    const ipData = await api.get('/auth/client-ip/')
    if (ipData && ipData.ip) clientIp = ipData.ip
  } catch {
    clientIp = '-'
  }

  // Resolve the company profile (name / address / logo) for the PDF header.
  let companyName = 'Your Company'
  let companyAddress = ''
  let logo = null
  let logoRatio = 1
  try {
    const company = await api.get('/auth/company/')
    if (company) {
      if (company.name) companyName = company.name
      if (company.address) companyAddress = company.address
      if (company.logo) {
        const resp = await fetch(company.logo)
        if (resp.ok) {
          const blob = await resp.blob()
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
          })
          if (dataUrl) {
            logo = dataUrl
            // Read intrinsic size so the logo keeps its aspect ratio in the PDF.
            const natural = await new Promise((resolve) => {
              const img = new Image()
              img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
              img.onerror = () => resolve(null)
              img.src = dataUrl
            })
            if (natural && natural.w > 0 && natural.h > 0) logoRatio = natural.w / natural.h
          }
        }
      }
    }
  } catch {
    // The register still works without a company profile.
  }

  const stamp = new Date().toLocaleDateString('en-GB')
  const activeFilters = Object.entries(filters).filter(([, value]) => value)

  const drawHeader = () => {
    let cursorY = marginY

    // Reserve a fixed box for the logo so any logo is shrunk to fit it
    // proportionally (no stretching) and the text never collides.
    const logoMaxW = 60
    const logoMaxH = 44
    const rightCol = 170 // reserved width for the title / printed-meta block

    // Left side: logo (contain-fit into the reserved box) + company block
    let textX = marginX
    let logoW
    if (logo) {
      // Contain-fit: scale down to the box width, then cap the height.
      let logoH = logoMaxW / logoRatio
      if (logoH > logoMaxH) logoH = logoMaxH
      logoW = Math.round(logoH * logoRatio)
      logoH = Math.round(logoH)
      doc.addImage(logo, 'PNG', marginX, cursorY, logoW, logoH)
      textX = marginX + logoW + 10
    }

    // Max width available to the left-side text before the right column.
    const leftMax = pageW - marginX - rightCol - (textX - marginX)

    // Company name — shrink the font so it never runs into the right column.
    let companySize = 15
    while (companySize > 8) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(companySize)
      if (doc.getTextWidth(companyName) <= leftMax) break
      companySize -= 1
    }
    doc.setTextColor(0)
    doc.text(companyName, textX, cursorY + 16)

    // Address — shrink the font so it never runs into the right column.
    let addressSize = 8
    while (addressSize > 6) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(addressSize)
      if (doc.getTextWidth(companyAddress) <= leftMax) break
      addressSize -= 1
    }
    doc.setTextColor(80)
    doc.text(companyAddress, textX, cursorY + 27)

    // Right side: title + printed meta
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(title, pageW - marginX, cursorY + 12, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.text(`Printed: ${stamp}  |  Records: ${rows.length}`, pageW - marginX, cursorY + 22, { align: 'right' })

    cursorY += 48

    // Applied filters line
    if (activeFilters.length > 0) {
      const parts = activeFilters.map(([label, value]) => `${label}: ${value}`)
      doc.setFillColor(241, 245, 249)
      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(marginX, cursorY, contentW, 18, 3, 3, 'FD')
      doc.setFontSize(8)
      doc.setTextColor(0)
      doc.text(parts.join('   •   '), marginX + 8, cursorY + 12)
      cursorY += 26
    }
    return cursorY
  }

  const drawFooter = (pageNumber, totalPages) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.text(clientIp, marginX, pageH - 18)
    doc.text('Leads | Powered by Programers.in', pageW / 2, pageH - 18, { align: 'center' })
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageW - marginX, pageH - 18, {
      align: 'right',
    })
  }

  autoTable(doc, {
    startY: drawHeader(),
    head: [columns],
    body: rows,
    margin: { left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [226, 226, 226],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles,
    didDrawPage: () => {},
  })

  // Draw the audit footer on every page (all pages the table touched).
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(p, totalPages)
  }

  // Footer stats under the final table row
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setDrawColor(0)
  doc.setLineWidth(0.5)
  doc.line(marginX, finalY - 4, pageW - marginX, finalY - 4)
  doc.setFontSize(8)
  doc.setTextColor(0)
  doc.text(`Showing ${rows.length} total records`, marginX, finalY + 10)
  doc.text(`${companyName.toUpperCase()}  •  REGISTER AUDIT`, pageW - marginX, finalY + 10, {
    align: 'right',
  })

  doc.save(`${fileNamePrefix}_${stamp.replace(/\//g, '-')}.pdf`)
}