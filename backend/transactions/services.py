"""Server-side document and notification helpers.

``render_quotation_pdf`` produces the printable proposal document that is
attached to the client email, and ``build_client_email`` composes that email
(main quotation content inline + PDF + decision buttons).
"""

import io
import logging
import re
from datetime import date

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import code128
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)

CURRENCY_SYMBOLS = {'₹', '$', '€', '£', '﷼'}


def currency_label(value):
    """Turn a stored currency (e.g. ``INR (₹)``) into a render-safe label."""
    text = str(value or '').strip() or 'INR'
    # Drop parenthetical symbol part, e.g. "INR (₹)" -> "INR".
    if '(' in text:
        text = text.split('(', 1)[0].strip()
    for symbol in CURRENCY_SYMBOLS:
        text = text.replace(symbol, '').strip()
    return text.strip() or 'INR'


# ---------------------------------------------------------------------------
# PDF generation
# ---------------------------------------------------------------------------


def html_to_pdf_markup(html):
    """Convert the stored proposal HTML into reportlab Paragraph markup.

    Reportlab supports a small safe subset of tags (``b i u br p ul ol li``);
    everything else is folded into its contents or dropped. Entities are left
    intact because reportlab's Paragraph resolves them.
    """
    if not html:
        return ''
    KEEP = {'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'ul', 'ol', 'li'}
    text = str(html)
    text = text.replace('&#x27;', "'")
    text = text.replace('&#39;', "'")

    def repl(match):
        closing = match.group(1)
        tag = match.group(2).lower()
        if tag == 'br':
            return '<br/>'
        if tag in KEEP:
            return f'<{closing}{tag}>'
        if tag in ('div', 'section', 'article', 'table', 'tr'):
            return '<br/>' if not closing else ''
        if tag in ('td', 'th'):
            return '' if not closing else '<br/>'
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            return '<b>' if not closing else '</b><br/>'
        # Everything else is dropped (span, font, a, img, ...).
        return ''

    text = re.sub(r'<(/?)([a-zA-Z0-9]+)(\s[^<>]*?)?(/)?>', repl, text)
    text = re.sub(r'<p>\s*</p>', '<br/>', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


class _PdfStyles:
    title = ParagraphStyle(
        'title',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=2,
    )
    subtitle = ParagraphStyle(
        'subtitle',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
    )
    mono = ParagraphStyle(
        'mono',
        fontName='Courier-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#0f172a'),
    )
    section = ParagraphStyle(
        'section',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#ffffff'),
        backColor=colors.HexColor('#0f172a'),
        borderPadding=(3, 5, 3, 5),
        spaceAfter=6,
        spaceBefore=10,
    )
    body = ParagraphStyle(
        'body',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4,
    )
    footer = ParagraphStyle(
        'footer',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
    )
    label = ParagraphStyle(
        'label',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#64748b'),
        uppercase=True,
    )
    value = ParagraphStyle(
        'value',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#0f172a'),
    )
    money = ParagraphStyle(
        'money',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0f172a'),
    )


def render_quotation_pdf(quotation):
    """Return the quotation as a PDF ``bytes`` payload (or ``None``)."""
    try:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=14 * mm,
            rightMargin=14 * mm,
            topMargin=14 * mm,
            bottomMargin=16 * mm,
            title=f'{quotation.id} - {quotation.company}',
            author='LEADS',
        )
        pdf_styles = _PdfStyles()
        company = quotation.tenant
        elements = []

        # Header: company logo on the right, quotation id on the left.
        header_data = [
            [
                Paragraph(
                    f'<font color="#0f172a"><b>{quotation.id}</b></font>',
                    pdf_styles.mono,
                ),
                '',
            ],
            [
                Paragraph(
                    f'<b>{quotation.company}</b><br/>'
                    f'{quotation.customer} &nbsp;|&nbsp; {quotation.mobile or "—"}',
                    pdf_styles.value,
                ),
                '',
            ],
        ]
        logo = None
        if company and company.logo and company.logo.name:
            try:
                from pathlib import Path

                logo_path = Path(settings.MEDIA_ROOT) / company.logo.name
                with open(str(logo_path), 'rb') as handle:
                    img = Image(handle)
                ratio = img.imageWidth / (img.imageHeight or 1)
                height = 26 * mm
                img.drawHeight = height
                img.drawWidth = min(58 * mm, height * ratio)
                header_data[0][1] = img
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning('Could not embed company logo in PDF: %s', exc)

        header = Table(header_data, colWidths=[92 * mm, 70 * mm])
        header.setStyle(
            TableStyle(
                [
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 2),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ]
            )
        )
        elements.append(header)

        elements.append(
            Paragraph(
                'PROPOSAL FORM',
                ParagraphStyle(
                    'pagetitle',
                    parent=pdf_styles.title,
                    alignment=TA_CENTER,
                    spaceBefore=6,
                ),
            )
        )
        elements.append(
            Paragraph(
                'Commercial Proposal & Offer',
                ParagraphStyle(
                    'pagesub',
                    parent=pdf_styles.subtitle,
                    alignment=TA_CENTER,
                    spaceAfter=8,
                ),
            )
        )

        # Detail grid.
        detail_rows = [
            ('Quotation #', quotation.id, 'Date', quotation.date or '—'),
            ('Revision', quotation.revision_no or '—', 'Category', quotation.category or '—'),
            ('Prepared By', quotation.qtn_by or '—', 'BDM', quotation.bdm or '—'),
            ('Source', quotation.source or '—', 'City', quotation.city or '—'),
        ]
        cells = []
        for label, value, label2, value2 in detail_rows:
            cells.append(
                [
                    Paragraph(label.upper(), pdf_styles.label),
                    Paragraph(str(value or '—'), pdf_styles.value),
                    Paragraph(label2.upper(), pdf_styles.label),
                    Paragraph(str(value2 or '—'), pdf_styles.value),
                ]
            )
        detail = Table(cells, colWidths=[34 * mm, 44 * mm, 34 * mm, 50 * mm])
        detail.setStyle(
            TableStyle(
                [
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e2e8f0')),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(detail)

        # Financial banner.
        financial = Table(
            [
                [
                    Paragraph(
                        f'<b>Total:</b>  {quotation.total or "—"}',
                        pdf_styles.money,
                    ),
                    Paragraph(
                        f'<b>Discount:</b>  {quotation.discount or "0"}',
                        pdf_styles.money,
                    ),
                    Paragraph(
                        f'<b>Net:</b>  {quotation.net_amount or quotation.total or "—"}',
                        pdf_styles.money,
                    ),
                ]
            ],
            colWidths=[47 * mm, 47 * mm, 68 * mm],
        )
        financial.setStyle(
            TableStyle(
                [
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e2e8f0')),
                    ('TOPPADDING', (0, 0), (-1, -1), 7),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ]
            )
        )
        elements.append(Spacer(1, 8))
        elements.append(financial)

        # Scope & deliverables.
        scope_markup = html_to_pdf_markup(quotation.proposal_scope)
        if scope_markup:
            elements.append(Paragraph('SCOPE &amp; DELIVERABLES', pdf_styles.section))
            elements.append(Paragraph(scope_markup, pdf_styles.body))

        # Terms & conditions.
        terms_markup = html_to_pdf_markup(quotation.terms_conditions)
        if terms_markup:
            elements.append(Paragraph('PROPOSAL IN DETAIL', pdf_styles.section))
            elements.append(Paragraph(terms_markup, pdf_styles.body))

        company_terms_markup = html_to_pdf_markup(
            (getattr(company, 'terms_full_html', '') or getattr(company, 'terms_summary_html', '')) or ''
        )
        if company_terms_markup:
            elements.append(Paragraph('TERMS &amp; CONDITIONS', pdf_styles.section))
            elements.append(Paragraph(company_terms_markup, pdf_styles.body))

        # Footer.
        footer_parts = []
        if company:
            if company.name:
                footer_parts.append(company.name)
            if company.address:
                footer_parts.append(company.address)
            if company.email:
                footer_parts.append(company.email)
            if company.website:
                footer_parts.append(company.website)
            if company.phone:
                footer_parts.append(f'Ph: {company.phone}')
        footer_text = ' | '.join(footer_parts) or '— LEADS'
        elements.append(Spacer(1, 14))
        elements.append(
            Table(
                [[Paragraph(footer_text, pdf_styles.footer)]],
                colWidths=[182 * mm],
                style=TableStyle(
                    [
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('LEFTPADDING', (0, 0), (-1, -1), 8),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    ]
                ),
            )
        )

        doc.build(elements)
        return buf.getvalue()
    except Exception as exc:  # pragma: no cover - PDF must never break the action
        logger.warning('Failed to render quotation PDF for %s: %s', quotation.id, exc)
        return None


def _frontend_public_asset(name):
    """Best-effort path to a static asset shipped in the frontend public dir."""
    try:
        from pathlib import Path

        candidate = Path(settings.BASE_DIR).parent / 'frontend' / 'public' / name
        if candidate.exists():
            return str(candidate)
    except Exception:  # pragma: no cover - defensive
        pass
    return ''


def _draw_asset(canvas, path, x, y, height, center=False):
    """Draw an image at ``height`` preserving aspect ratio (bottom-left anchor).

    Logos are resampled to a sensible resolution first so the PDF/email
    attachment never carries a multi-megabyte source PNG.
    """
    if not path:
        return
    try:
        from io import BytesIO

        from PIL import Image as PILImage

        from reportlab.lib.utils import ImageReader

        source = PILImage.open(path)
        has_alpha = source.mode in ('RGBA', 'LA', 'P')
        if source.mode not in ('RGBA', 'RGB', 'L'):
            source = source.convert('RGBA' if has_alpha else 'RGB')
        source.thumbnail((420, 420))
        buffer = BytesIO()
        source.save(buffer, format='PNG' if has_alpha else 'JPEG', quality=85)
        reader = ImageReader(BytesIO(buffer.getvalue()))
        native_width, native_height = reader.getSize()
        draw_width = height * (native_width / (native_height or 1))
        if center:
            x = x - draw_width / 2
        canvas.drawImage(
            reader, x, y, width=draw_width, height=height,
            preserveAspectRatio=True, anchor='sw', mask='auto',
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning('Could not draw image %s: %s', path, exc)


def _qr_drawing(value, size):
    """A reportlab ``Drawing`` holding a QR code rendered at ``size`` points."""
    qr = QrCodeWidget(value or 'NO-LINK')
    bounds = qr.getBounds()
    qr_width = (bounds[2] - bounds[0]) or 1
    qr_height = (bounds[3] - bounds[1]) or 1
    drawing = Drawing(size, size, transform=[size / qr_width, 0, 0, size / qr_height, 0, 0])
    drawing.add(qr)
    return drawing


def _order_client_link(order):
    """Full client link for the order's QR code (falls back to a path)."""
    token = getattr(order, 'client_token', '') or ''
    if not token:
        return ''
    base = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    return f'{base}/order/{token}' if base else f'/order/{token}'


def _draw_order_header(canvas, order):
    """Draw the branded order-form header on a PDF page."""
    page_width, page_height = A4
    left = 10 * mm
    right = page_width - 10 * mm
    top = page_height - 10 * mm

    canvas.saveState()

    # Left: Programers logo with the order barcode underneath.
    logo_bottom = top - 8.5 * mm
    _draw_asset(canvas, _frontend_public_asset('programers-logo-BLACCK.png'), left, logo_bottom, 8.5 * mm)
    barcode_value = ''.join(ch for ch in str(order.id) if ch.isdigit()) or str(order.id)
    barcode_value = barcode_value[:14]
    if barcode_value:
        try:
            barcode = code128.Code128(
                barcode_value, barHeight=7.5 * mm, barWidth=0.82,
                humanReadable=True, fontSize=7,
            )
            barcode.drawOn(canvas, left, logo_bottom - 11 * mm)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning('Could not draw order barcode: %s', exc)

    # Center: ORDER FORM title and GeM logo.
    canvas.setFillColor(colors.black)
    canvas.setFont('Helvetica-Bold', 20)
    canvas.drawCentredString(page_width / 2, top - 7 * mm, 'ORDER FORM')
    _draw_asset(
        canvas, _frontend_public_asset('GeM.png'),
        page_width / 2, top - 20 * mm, 9 * mm, center=True,
    )

    # Right: order # / order date boxes and the client QR code.
    qr_size = 15 * mm
    qr_x = right - qr_size
    box_width = 26 * mm
    box_height = 4.8 * mm
    box_x = qr_x - 3 * mm - box_width

    def label_box(text, y):
        canvas.setFillColor(colors.black)
        canvas.rect(box_x, y, box_width, box_height, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont('Helvetica-Bold', 6.5)
        canvas.drawCentredString(box_x + box_width / 2, y + 1.5 * mm, text)
        canvas.setFillColor(colors.black)

    label_box('ORDER #', top - 5 * mm)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawCentredString(box_x + box_width / 2, top - 10 * mm, str(order.id))
    label_box('ORDER DATE', top - 15 * mm)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawCentredString(box_x + box_width / 2, top - 20 * mm, str(order.date or ''))

    try:
        renderPDF.draw(_qr_drawing(_order_client_link(order), qr_size), canvas, qr_x, top - qr_size)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning('Could not draw order QR code: %s', exc)

    header_bottom = top - 36 * mm
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(1.2)
    canvas.line(left, header_bottom, right, header_bottom)
    canvas.restoreState()


def _draw_order_footer(canvas):
    """Draw the shared order-form footer on a PDF page."""
    page_width, _ = A4
    left = 10 * mm
    right = page_width - 10 * mm
    canvas.saveState()
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(0.6)
    base = 13 * mm
    canvas.line(left, base + 6 * mm, right, base + 6 * mm)
    canvas.setFillColor(colors.HexColor('#334155'))
    canvas.setFont('Helvetica', 6.8)
    canvas.drawCentredString(
        page_width / 2, base + 3 * mm,
        '4th Floor, Park House ,Round North, Thrissur, Kerala, India - 680 001 | '
        'info@programers.in, www.programers.in | Ph: 9447151442, 9495951442, 9446451442',
    )
    canvas.setFont('Helvetica', 6.3)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawCentredString(page_width / 2, base, 'Purchase authorization request')
    canvas.restoreState()


def render_order_pdf(order):
    """Return the official order form as a PDF ``bytes`` payload (or ``None``).

    Mirrors the on-screen order form document (``OrderFormDocument``): same
    header with logo/barcode/QR, section boxes, financial banner, signature
    block and footer, so the emailed attachment, the downloaded PDF and the
    shared web page all show the same order form.
    """
    try:
        buf = io.BytesIO()
        content_width = 190 * mm
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=10 * mm,
            rightMargin=10 * mm,
            topMargin=44 * mm,
            bottomMargin=18 * mm,
            title=f'{order.id} - {order.company}',
            author='LEADS',
        )

        styles = {
            'body': ParagraphStyle(
                'o-body', fontName='Helvetica', fontSize=9, leading=12.5,
                textColor=colors.HexColor('#1e293b'),
            ),
            'body_small': ParagraphStyle(
                'o-body-sm', fontName='Helvetica', fontSize=8.5, leading=12,
                textColor=colors.HexColor('#334155'),
            ),
            'name': ParagraphStyle(
                'o-name', fontName='Helvetica-Bold', fontSize=11, leading=13,
                textColor=colors.black,
            ),
            'mono': ParagraphStyle(
                'o-mono', fontName='Courier-Bold', fontSize=9.5, leading=12,
                textColor=colors.HexColor('#334155'),
            ),
            'small': ParagraphStyle(
                'o-small', fontName='Helvetica', fontSize=9, leading=11.5,
                textColor=colors.HexColor('#475569'),
            ),
            'italic': ParagraphStyle(
                'o-italic', fontName='Helvetica-Oblique', fontSize=8, leading=10.5,
                textColor=colors.HexColor('#475569'), alignment=TA_CENTER,
            ),
            'fin': ParagraphStyle(
                'o-fin', fontName='Helvetica-Bold', fontSize=9.5, leading=12,
                textColor=colors.black,
            ),
            'fin_small': ParagraphStyle(
                'o-fin-sm', fontName='Helvetica-Bold', fontSize=8.5, leading=12,
                textColor=colors.HexColor('#334155'),
            ),
            'fin_net': ParagraphStyle(
                'o-fin-net', fontName='Helvetica-Bold', fontSize=9.5, leading=12,
                textColor=colors.white,
            ),
            'fin_note': ParagraphStyle(
                'o-fin-note', fontName='Helvetica-Bold', fontSize=6.8, leading=9,
                textColor=colors.black, alignment=TA_CENTER,
            ),
            'sig_company': ParagraphStyle(
                'o-sig-co', fontName='Helvetica-Bold', fontSize=9.5, leading=12,
                textColor=colors.HexColor('#1e293b'),
            ),
            'sig_note': ParagraphStyle(
                'o-sig-note', fontName='Helvetica', fontSize=7.5, leading=10,
                textColor=colors.HexColor('#94a3b8'),
            ),
        }

        def section_box(title, flowables, width):
            title_style = ParagraphStyle(
                'o-sec', fontName='Helvetica-Bold', fontSize=9, leading=11,
                textColor=colors.white, alignment=TA_CENTER,
            )
            body = list(flowables) or [Paragraph('&nbsp;', styles['body'])]
            table = Table(
                [[Paragraph(title, title_style)], [body]],
                colWidths=[width],
                repeatRows=1,
            )
            table.setStyle(
                TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.black),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, 0), 2.5),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 2.5),
                    ('TOPPADDING', (0, 1), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ])
            )
            return table

        def financial_box(width):
            note = Paragraph(
                'All Amt In | No Additional Service Or Items | E&amp;O',
                styles['fin_note'],
            )
            total = Paragraph(
                f'<b>Total:</b> <font face="Courier-Bold">{order.total or "—"}</font>',
                styles['fin'],
            )
            discount = Paragraph(
                f'(Discount: <font face="Courier-Bold">{order.discount or "0"}</font>)',
                styles['fin_small'],
            )
            net = Paragraph(
                f'<b>Net:</b> <font face="Courier-Bold">'
                f'{order.net_amount or order.total or "—"}</font>',
                styles['fin_net'],
            )
            row = Table(
                [[total, discount, net]],
                colWidths=[width * 0.36, width * 0.30, width * 0.34],
            )
            row.setStyle(
                TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BACKGROUND', (2, 0), (2, 0), colors.black),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ])
            )
            outer = Table([[note], [row]], colWidths=[width])
            outer.setStyle(
                TableStyle([
                    ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
                    ('LINEBELOW', (0, 0), (0, 0), 0.4, colors.HexColor('#cbd5e1')),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ])
            )
            return outer

        def signature_box(width):
            cell_width = width * 5 / 12 - 1 * mm
            qr_width = width * 2 / 12 - 1 * mm
            approved = section_box('APPROVED BY', [
                Paragraph('Programers International', styles['sig_company']),
                Spacer(1, 7 * mm),
                Paragraph('Authorised Signatory &#183; Signature &amp; date', styles['sig_note']),
            ], cell_width)
            accepted = section_box('ACCEPTED BY', [
                Paragraph(order.company or 'Client', styles['sig_company']),
                Spacer(1, 7 * mm),
                Paragraph("Client's Authorised Signatory &#183; Signature &amp; date", styles['sig_note']),
            ], cell_width)
            qr = _qr_drawing(_order_client_link(order), min(qr_width, 20 * mm))
            outer = Table(
                [[approved, accepted, qr]],
                colWidths=[cell_width + 1 * mm, cell_width + 1 * mm, qr_width + 1 * mm],
            )
            outer.setStyle(
                TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (2, 0), (2, 0), 'CENTER'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 1 * mm),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ])
            )
            return outer

        company = order.tenant
        elements = []

        # Metadata grid: customer / order / project details.
        col_width = (content_width - 2 * 3 * mm) / 3
        meta = Table(
            [[
                section_box('CUSTOMER DETAILS', [
                    Paragraph(order.customer or '&nbsp;', styles['name']),
                    Paragraph(order.mobile or '&nbsp;', styles['mono']),
                    Paragraph(order.city or '&nbsp;', styles['small']),
                ], col_width),
                section_box('ORDER DETAILS', [
                    Paragraph(order.company or '&nbsp;', styles['name']),
                    Paragraph(
                        'Proposal Date: '
                        f'<font face="Courier-Bold">{order.proposal_date or "—"}</font>',
                        styles['small'],
                    ),
                ], col_width),
                section_box('PROJECT DETAILS', [
                    Paragraph(f'BDO / BDM: <b>{order.bdm or "—"}</b>', styles['small']),
                    Paragraph(
                        f'Proposal #: <font face="Courier-Bold">{order.proposal_no or "—"}</font>',
                        styles['small'],
                    ),
                    Paragraph(f'Proposal By: {order.proposal_by or "—"}', styles['small']),
                ], col_width),
            ]],
            colWidths=[col_width + 3 * mm, col_width + 3 * mm, col_width],
        )
        meta.setStyle(
            TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3 * mm),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ])
        )
        elements.append(meta)
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph(
            'This Proposal form is issued in connection with the proposed project, and confirms '
            'our intent to proceed with the implementation as per the agreed terms and conditions.',
            styles['italic'],
        ))
        elements.append(Spacer(1, 3 * mm))

        # Page 1 middle: Order Summary + financial (left) and Terms (right).
        left_width = content_width * 7 / 12 - 1 * mm
        right_width = content_width * 5 / 12 - 1 * mm
        summary_markup = html_to_pdf_markup(order.scope)
        terms_summary_markup = html_to_pdf_markup(
            getattr(company, 'terms_summary_html', '') if company else ''
        )
        left_column = [
            section_box('ORDER SUMMARY', [Paragraph(summary_markup, styles['body'])], left_width),
            Spacer(1, 2 * mm),
            financial_box(left_width),
        ]
        right_column = section_box(
            'TERMS &amp; CONDITIONS',
            [Paragraph(terms_summary_markup or '&nbsp;', styles['body_small'])],
            right_width,
        )
        middle = Table(
            [[left_column, right_column]],
            colWidths=[left_width + 1 * mm, right_width + 1 * mm],
        )
        middle.setStyle(
            TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 1 * mm),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ])
        )
        elements.append(middle)
        elements.append(Spacer(1, 3 * mm))

        # Signature block.
        elements.append(signature_box(content_width))
        elements.append(Spacer(1, 5 * mm))

        # Order in details.
        details_markup = html_to_pdf_markup(order.details)
        elements.append(section_box(
            'ORDER IN DETAILS',
            [Paragraph(details_markup or '&nbsp;', styles['body'])],
            content_width,
        ))
        elements.append(Spacer(1, 5 * mm))

        # Detailed terms & conditions.
        company_terms_markup = html_to_pdf_markup(
            (getattr(company, 'terms_full_html', '') if company else '')
        )
        elements.append(section_box(
            'DETAILED TERMS &amp; CONDITIONS',
            [Paragraph(company_terms_markup or '&nbsp;', styles['body_small'])],
            content_width,
        ))

        def _on_page(canvas, _doc):
            _draw_order_header(canvas, order)
            _draw_order_footer(canvas)

        doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
        return buf.getvalue()
    except Exception as exc:  # pragma: no cover - PDF must never break the action
        logger.warning('Failed to render order PDF for %s: %s', order.id, exc)
        return None


# ---------------------------------------------------------------------------
# Client email
# ---------------------------------------------------------------------------


def _strip_html(html):
    text = str(html or '')
    text = re.sub(r'<[^>]+>', ' ', text)
    text = text.replace('&nbsp;', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _email_button(href, label):
    """Neutral (outline) button cell used in the client email template."""
    return (
        '<td align="center" style="padding:4px;">'
        '<table role="presentation" cellspacing="0" cellpadding="0"><tr>'
        '<td style="border-radius:6px; border:1px solid #cbd5e1; background-color:#ffffff;">'
        f'<a href="{href}" style="display:inline-block; padding:12px 26px; color:#0f172a; '
        f'font-size:13px; font-weight:bold; text-decoration:none;">{label}</a>'
        '</td></tr></table></td>'
    )


def _email_solid_button(href, label, color):
    """Filled button cell (Accept / Decline) used in the client email template."""
    return (
        '<td align="center" style="padding:4px;">'
        '<table role="presentation" cellspacing="0" cellpadding="0"><tr>'
        f'<td style="border-radius:6px; background-color:{color};">'
        f'<a href="{href}" style="display:inline-block; padding:12px 26px; color:#ffffff; '
        f'font-size:13px; font-weight:bold; text-decoration:none;">{label}</a>'
        '</td></tr></table></td>'
    )


_CLIENT_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a; padding:20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff; font-size:16px; font-weight:bold;">Quotation {quotation_id}</span>
                    <div style="color:#94a3b8; font-size:11px; margin-top:2px;">Proposal for {company}</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    {logo_html}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="color:#0f172a; font-size:14px; margin:0 0 12px 0; line-height:1.5;">
                Dear {customer},
              </p>
              <p style="color:#334155; font-size:13px; margin:0 0 18px 0; line-height:1.6;">
                {doc_intro}
              </p>

              {greeting_note}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:18px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:50%; padding:4px 0;">
                          <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Total</span>
                          <div style="color:#0f172a; font-size:14px; font-weight:bold;">{total}</div>
                        </td>
                        <td style="width:50%; padding:4px 0;">
                          <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Discount</span>
                          <div style="color:#0f172a; font-size:14px; font-weight:bold;">{discount}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top:1px solid #e2e8f0; padding:8px 0 2px 0;">
                          <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Net Amount</span>
                          <div style="color:#0f172a; font-size:18px; font-weight:bold;">{net}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {scope_html}

              <p style="color:#334155; font-size:13px; margin:0 0 18px 0; line-height:1.6;">
                {decision_instruction}
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  {decision_buttons}
                </tr>
              </table>

              <p style="color:#64748b; font-size:11px; margin:0; line-height:1.5;">
                {link_note}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 28px;">
              <p style="color:#64748b; font-size:11px; margin:0; line-height:1.6; text-align:center;">
                {footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_client_email(quotation, link, message=''):
    """Compose the one-time signed client email (HTML + text + PDF)."""
    company = quotation.tenant
    logo_html = ''
    if company and company.logo and company.logo.name:
        try:
            logo_url = company.logo.url
            logo_html = (
                f'<img src="{logo_url}" alt="{company.name}" style="max-height:38px; '
                f'max-width:160px; object-fit:contain;" />'
            )
        except Exception:
            logo_html = ''

    currency = currency_label(quotation.currency)
    amount = lambda value: f'{currency} {value}'.strip()
    total = amount(quotation.total or '0')
    discount = amount(quotation.discount or '0')
    net = amount(quotation.net_amount or quotation.total or '0')

    greeting_note = ''
    if message:
        message_html = _strip_html(message).replace('\n', '<br/>')
        greeting_note = (
            f'<p style="background-color:#eff6ff; border-left:3px solid #3b82f6; color:#1e3a8a; '
            f'padding:10px 14px; font-size:12px; margin:0 0 18px 0; line-height:1.5;">'
            f'{message_html}</p>'
        )

    scope = _strip_html(quotation.proposal_scope)
    scope_html = ''
    if scope:
        scope = scope[:420]
        scope_html = (
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
            'style="margin-bottom:18px;">'
            '<tr><td style="color:#0f172a; font-size:11px; font-weight:bold; '
            'text-transform:uppercase; padding-bottom:6px;">Scope &#038; Deliverables</td></tr>'
            f'<tr><td style="color:#475569; font-size:12px; line-height:1.6;">{scope}</td></tr>'
            '</table>'
        )

    footer_parts = []
    if company:
        if company.name:
            footer_parts.append(str(company.name))
        if company.email:
            footer_parts.append(str(company.email))
        if company.phone:
            footer_parts.append(f'Ph: {company.phone}')
        if company.website:
            footer_parts.append(str(company.website))
    footer = ' | '.join(footer_parts) or '&mdash; LEADS'

    subject = f'Quotation {quotation.id} — {quotation.company}'
    html_body = _CLIENT_EMAIL_TEMPLATE.format(
        quotation_id=quotation.id,
        company=str(getattr(company, 'name', None) or quotation.company),
        logo_html=logo_html,
        customer=quotation.customer or 'Customer',
        doc_intro=(
            f'Please find our quotation for <strong>{quotation.company}</strong>. We have also '
            f'attached the full proposal document to this email for your reference.'
        ),
        decision_instruction=(
            'You can review the full details and share your decision online. To accept this '
            'quotation, tap <strong>Accept</strong>; to decline it, tap <strong>Decline</strong>.'
        ),
        greeting_note=greeting_note,
        total=total,
        discount=discount,
        net=net,
        scope_html=scope_html,
        decision_buttons=(
            _email_solid_button(f'{link}?action=accept', 'Accept', '#10b981')
            + _email_solid_button(f'{link}?action=decline', 'Decline', '#f43f5e')
            + _email_button(link, 'View in site')
        ),
        link_note='This link is unique to you and will work for one response. Please do not share it further.',
        footer=footer,
    )
    text_body = (
        f'Dear {quotation.customer},\n\n'
        f'Please find our quotation {quotation.id} for {quotation.company}.\n\n'
        f'Total: {total}\nDiscount: {discount}\nNet: {net}\n\n'
        f'Accept: {link}?action=accept\n'
        f'Decline: {link}?action=decline\n'
        f'View in site: {link}\n\n'
        f'— {footer}'
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=None,
        to=[quotation.email],
        reply_to=[company.email] if company and company.email else None,
    )
    email.attach_alternative(html_body, 'text/html')
    pdf = render_quotation_pdf(quotation)
    if pdf:
        email.attach(f'{quotation.id}.pdf', pdf, 'application/pdf')
    return email


def build_order_client_email(order, link, message='', recipients=None, cc=None):
    """Compose the order share email (HTML + text + PDF).

    The order form is shared for reference only: it is not an approval request,
    so no Accept/Decline buttons are included. ``recipients`` overrides the
    default client recipient when the caller wants to send the form to other
    people as well.
    """
    company = order.tenant
    logo_html = ''
    if company and company.logo and company.logo.name:
        try:
            logo_url = company.logo.url
            logo_html = (
                f'<img src="{logo_url}" alt="{company.name}" style="max-height:38px; '
                f'max-width:160px; object-fit:contain;" />'
            )
        except Exception:
            logo_html = ''

    currency = currency_label(order.currency)
    amount = lambda value: f'{currency} {value}'.strip()
    total = amount(order.total or '0')
    discount = amount(order.discount or '0')
    net = amount(order.net_amount or order.total or '0')

    greeting_note = ''
    if message:
        message_html = _strip_html(message).replace('\n', '<br/>')
        greeting_note = (
            f'<p style="background-color:#eff6ff; border-left:3px solid #3b82f6; color:#1e3a8a; '
            f'padding:10px 14px; font-size:12px; margin:0 0 18px 0; line-height:1.5;">'
            f'{message_html}</p>'
        )

    scope = _strip_html(order.scope)
    scope_html = ''
    if scope:
        scope = scope[:420]
        scope_html = (
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
            'style="margin-bottom:18px;">'
            '<tr><td style="color:#0f172a; font-size:11px; font-weight:bold; '
            'text-transform:uppercase; padding-bottom:6px;">Order Summary</td></tr>'
            f'<tr><td style="color:#475569; font-size:12px; line-height:1.6;">{scope}</td></tr>'
            '</table>'
        )

    footer_parts = []
    if company:
        if company.name:
            footer_parts.append(str(company.name))
        if company.email:
            footer_parts.append(str(company.email))
        if company.phone:
            footer_parts.append(f'Ph: {company.phone}')
        if company.website:
            footer_parts.append(str(company.website))
    footer = ' | '.join(footer_parts) or '&mdash; LEADS'

    subject = f'Order Form {order.id} — {order.company}'
    html_body = _CLIENT_EMAIL_TEMPLATE.format(
        quotation_id=order.id,
        company=str(getattr(company, 'name', None) or order.company),
        logo_html=logo_html,
        customer=order.customer or 'Customer',
        doc_intro=(
            f'Please find our order form for <strong>{order.company}</strong>. We have also '
            f'attached the full order form document to this email for your reference.'
        ),
        decision_instruction=(
            'You can review the full order form online using the button below. A PDF copy '
            'is also attached to this email for your records.'
        ),
        greeting_note=greeting_note,
        total=total,
        discount=discount,
        net=net,
        scope_html=scope_html,
        decision_buttons=_email_button(link, 'View order form'),
        link_note='This link lets you view the order form online at any time.',
        footer=footer,
    )
    text_body = (
        f'Dear {order.customer},\n\n'
        f'Please find our order form {order.id} for {order.company}.\n\n'
        f'Total: {total}\nDiscount: {discount}\nNet: {net}\n\n'
        f'View order form: {link}\n'
        f'A PDF copy is attached to this email.\n\n'
        f'— {footer}'
    )

    to_addresses = [address for address in (recipients or []) if address]
    if not to_addresses and order.email:
        to_addresses = [order.email]
    cc_addresses = [address for address in (cc or []) if address]

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=None,
        to=to_addresses,
        cc=cc_addresses or None,
        reply_to=[company.email] if company and company.email else None,
    )
    email.attach_alternative(html_body, 'text/html')
    pdf = render_order_pdf(order)
    if pdf:
        email.attach(f'{order.id}.pdf', pdf, 'application/pdf')
    return email


_CONFIRMATION_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a; padding:20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff; font-size:16px; font-weight:bold;">Proposal Accepted</span>
                    <div style="color:#94a3b8; font-size:11px; margin-top:2px;">Ref {ref_no}</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    {logo_html}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="color:#0f172a; font-size:14px; margin:0 0 12px 0; line-height:1.5;">
                {greeting}
              </p>
              <p style="color:#334155; font-size:13px; margin:0 0 18px 0; line-height:1.6;">
                Thank you for accepting our proposal. We are excited about the opportunity
                to partner with your team and look forward to delivering exceptional results
                for this engagement.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:18px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <div style="color:#0f172a; font-size:11px; font-weight:bold; text-transform:uppercase; margin-bottom:10px;">Engagement Summary</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:50%; padding:4px 0;">
                          <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Project / Proposal Ref</span>
                          <div style="color:#0f172a; font-size:14px; font-weight:bold;">{ref_no}</div>
                        </td>
                        <td style="width:50%; padding:4px 0;">
                          <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Confirmation Date</span>
                          <div style="color:#0f172a; font-size:14px; font-weight:bold;">{confirmation_date}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e2e8f0; padding:8px 0 2px 0;">
                          <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Agreed Value</span>
                          <div style="color:#0f172a; font-size:18px; font-weight:bold;">{order_total}</div>
                        </td>
                        <td style="border-top:1px solid #e2e8f0; padding:16px 0 2px 0; vertical-align:middle; text-align:left;">
                          <span style="background-color:#16a34a; color:#ffffff; font-size:12px; font-weight:bold; text-transform:uppercase; padding:8px 16px; border-radius:999px; letter-spacing:0.5px; display:inline-block;">Approved</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td>
                    <div style="color:#0f172a; font-size:12px; font-weight:bold; margin:0 0 10px 0;">Next Steps</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:top; width:22px;">
                          <span style="color:#16a34a; font-size:14px; font-weight:bold;">&#8226;</span>
                        </td>
                        <td style="padding:0 0 12px 6px;">
                          <span style="color:#0f172a; font-size:13px; font-weight:bold;">Invoice &amp; Payment Schedule:</span>
                          <span style="color:#334155; font-size:13px; line-height:1.6;"> Our finance team will share the formal invoice along with the milestone payment schedule shortly.</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="vertical-align:top; width:22px;">
                          <span style="color:#16a34a; font-size:14px; font-weight:bold;">&#8226;</span>
                        </td>
                        <td style="padding:0 0 0 6px;">
                          <span style="color:#0f172a; font-size:13px; font-weight:bold;">Project Onboarding:</span>
                          <span style="color:#334155; font-size:13px; line-height:1.6;"> Our dedicated project lead will connect with you within 24&#8211;48 hours to schedule the initial kickoff meeting and finalize the delivery roadmap.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#334155; font-size:13px; margin:0 0 18px 0; line-height:1.6;">
                If you have any immediate queries or require further details, please feel
                free to reach out to us.
              </p>

              <p style="color:#334155; font-size:13px; margin:0 0 18px 0; line-height:1.6;">
                Thank you once again for your trust in {company_name}!
              </p>

              <p style="color:#334155; font-size:13px; margin:0; line-height:1.6;">
                Warm regards,<br/>
                For <strong>{company_name}</strong><br/>
                Authorised Signatory<br/>
                {company_signature_contact}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 28px;">
              <p style="color:#64748b; font-size:11px; margin:0; line-height:1.6; text-align:center;">
                {footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_quotation_accepted_email(quotation, order=None):
    """Compose the order-confirmation email sent when a client accepts.

    This is a courtesy confirmation only: no proposal/order-form PDF is ever
    attached.
    """
    company = quotation.tenant
    logo_html = ''
    if company and company.logo and company.logo.name:
        try:
            logo_url = company.logo.url
            logo_html = (
                f'<img src="{logo_url}" alt="{company.name}" style="max-height:38px; '
                f'max-width:160px; object-fit:contain;" />'
            )
        except Exception:
            logo_html = ''

    source = order if order is not None else quotation
    ref_no = str(getattr(order, 'proposal_no', None) or source.id or quotation.id)

    currency = currency_label(getattr(source, 'currency', None) or quotation.currency)
    raw_total = (
        getattr(source, 'net_amount', None)
        or getattr(source, 'total', None)
        or quotation.net_amount
        or quotation.total
        or '0'
    )
    order_total = f'{currency} {raw_total}'.strip()

    confirmation_date = ''
    if getattr(quotation, 'client_responded_at', None):
        try:
            confirmation_date = quotation.client_responded_at.strftime('%d-%b-%Y')
        except (AttributeError, ValueError):
            confirmation_date = ''
    if not confirmation_date:
        confirmation_date = str(getattr(source, 'date', None) or quotation.date or '')

    customer = str(quotation.customer or '').strip()
    client_company = str(
        getattr(source, 'company', None) or quotation.company or ''
    ).strip()
    if customer:
        greeting = f'Dear {customer},'
    elif client_company:
        greeting = f'Dear {client_company} Team,'
    else:
        greeting = 'Dear Sir/Madam,'
    if not client_company:
        client_company = quotation.id or 'Proposal'

    company_name = str(
        getattr(company, 'name', None) or quotation.company or ''
    ) or 'LEADS'

    contact_parts = []
    if company:
        if company.email:
            contact_parts.append(str(company.email))
        if company.phone:
            contact_parts.append(f'Ph: {company.phone}')
        if company.website:
            contact_parts.append(str(company.website))
    company_contact = ' | '.join(contact_parts)

    signature_parts = []
    if company:
        if company.email:
            signature_parts.append(str(company.email))
        if company.phone:
            signature_parts.append(str(company.phone))
    company_signature_contact = ' | '.join(signature_parts)

    footer_parts = [company_name] + contact_parts
    footer = ' | '.join(footer_parts) or '&mdash; LEADS'

    subject = f'Confirmation of Proposal Acceptance {client_company} – Ref: {ref_no}'
    html_body = _CONFIRMATION_EMAIL_TEMPLATE.format(
        ref_no=ref_no,
        logo_html=logo_html,
        greeting=greeting,
        confirmation_date=confirmation_date,
        order_total=order_total,
        company_name=company_name,
        company_signature_contact=company_signature_contact,
        footer=footer,
    )
    text_body = (
        f'{greeting}\n\n'
        'Thank you for accepting our proposal. We are excited about the opportunity to '
        'partner with your team and look forward to delivering exceptional results for '
        'this engagement.\n\n'
        'Engagement Summary\n'
        f'Project / Proposal Ref: {ref_no}\n'
        f'Confirmation Date: {confirmation_date}\n'
        f'Agreed Value: {order_total}\n'
        'Status: APPROVED\n\n'
        'Next Steps\n'
        '- Invoice & Payment Schedule: Our finance team will share the formal invoice '
        'along with the milestone payment schedule shortly.\n'
        '- Project Onboarding: Our dedicated project lead will connect with you within '
        '24-48 hours to schedule the initial kickoff meeting and finalize the delivery '
        'roadmap.\n\n'
        'If you have any immediate queries or require further details, please feel free '
        'to reach out to us.\n\n'
        f'Thank you once again for your trust in {company_name}!\n\n'
        'Warm regards,\n'
        f'For {company_name}\n'
        'Authorised Signatory\n'
        f'{company_signature_contact}'
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=None,
        to=[quotation.email],
        reply_to=[company.email] if company and company.email else None,
    )
    email.attach_alternative(html_body, 'text/html')
    return email


# ---------------------------------------------------------------------------
# Client details
# ---------------------------------------------------------------------------


def create_client_detail_from_order(order):
    """Create a ``ClientDetail`` for an order that has been accepted.

    Idempotent: returns the existing record when a client detail already
    exists for the same order number. The auto-created row is a starting
    point ("Details Pending") that staff then enrich with SRS, business
    cards and other handover material.
    """
    from .models import ClientDetail

    if order is None:
        return None
    existing = ClientDetail.objects.filter(order_no=order.id).first()
    if existing is not None:
        return existing
    return ClientDetail.objects.create(
        id=f'CD-{order.id}',
        order_no=order.id,
        lead_id=order.lead_id,
        client_name=order.customer,
        company=order.company,
        tenant=order.tenant,
        mobile=order.mobile,
        email=order.email,
        category=order.category,
        accepted_date=date.today().strftime('%Y-%m-%d'),
        collected_by=order.proposal_by or order.staff,
        status=ClientDetail.STATUS_PENDING,
    )