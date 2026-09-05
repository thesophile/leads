"""Server-side document and notification helpers.

``render_quotation_pdf`` produces the printable proposal document that is
attached to the client email, and ``build_client_email`` composes that email
(main quotation content inline + PDF + decision buttons).
"""

import io
import logging
import re

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
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


# ---------------------------------------------------------------------------
# Client email
# ---------------------------------------------------------------------------


def _strip_html(html):
    text = str(html or '')
    text = re.sub(r'<[^>]+>', ' ', text)
    text = text.replace('&nbsp;', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


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
                Please find our quotation for <strong>{company}</strong>. We have also attached the full
                proposal document to this email for your reference.
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
                You can review the full details and share your decision online. To accept this quotation,
                tap <strong>Accept</strong>; to decline it, tap <strong>Decline</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td align="center" style="padding:4px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:6px; background-color:#10b981;">
                          <a href="{accept_url}" style="display:inline-block; padding:12px 26px; color:#ffffff; font-size:13px; font-weight:bold; text-decoration:none;">Accept</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="center" style="padding:4px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:6px; background-color:#f43f5e;">
                          <a href="{decline_url}" style="display:inline-block; padding:12px 26px; color:#ffffff; font-size:13px; font-weight:bold; text-decoration:none;">Decline</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="center" style="padding:4px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:6px; border:1px solid #cbd5e1; background-color:#ffffff;">
                          <a href="{view_url}" style="display:inline-block; padding:12px 26px; color:#0f172a; font-size:13px; font-weight:bold; text-decoration:none;">View in site</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#64748b; font-size:11px; margin:0; line-height:1.5;">
                This link is unique to you and will work for one response. Please do not share it further.
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
        greeting_note=greeting_note,
        total=total,
        discount=discount,
        net=net,
        scope_html=scope_html,
        accept_url=f'{link}?action=accept',
        decline_url=f'{link}?action=decline',
        view_url=link,
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