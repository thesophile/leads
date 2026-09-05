# Migration splits the single company terms field into a "summary" and a "full"
# version used for proposal and order form generation. Existing terms_html
# content moves into terms_full_html; companies without any terms get generic
# defaults that apply to most businesses.

from django.db import migrations, models

DEFAULT_TERMS_SUMMARY = """
<h4>1. Payment Terms</h4>
<p>A non-refundable advance of 50% of the order value is payable on acceptance of the order form. The balance must be cleared in full before the goods/services are delivered or completed. Payments by bank transfer only.</p>
<h4>2. Taxes</h4>
<p>All prices are exclusive of applicable taxes, which will be charged at the prevailing rates.</p>
<h4>3. Delivery Timeline</h4>
<p>The scope and timelines agreed in the order form will be strictly followed. Any change requested after acceptance may affect the timeline and cost.</p>
<h4>4. Support &amp; Warranty</h4>
<p>Post-delivery support is provided as specified in the order form for the agreed period. Support beyond the agreed period is billed separately.</p>
""".strip()

DEFAULT_TERMS_FULL = """
<h4>1. Acceptance of Order</h4>
<p>This Order Form constitutes a binding agreement between the parties upon execution. Any change to the order must be in writing and accepted by both parties.</p>
<h4>2. Payment Terms &amp; Billing</h4>
<p>A non-refundable advance of 50% of the total order value is payable on acceptance. The remaining 50% must be paid in full before the goods/services are delivered or completed. All payments must be made by bank transfer or UPI to the account specified by the Company. Prices are exclusive of taxes unless stated otherwise. If payment is delayed beyond the agreed schedule, the Company reserves the right to withhold delivery/completion and to charge a late fee of 1.5% per month on the outstanding amount.</p>
<h4>3. Changes &amp; Variations</h4>
<p>Any addition, modification, or substitution to the agreed scope requested after acceptance shall be treated as a variation and billed separately. The Company is not bound to execute variations unless agreed in writing.</p>
<h4>4. Delivery &amp; Timelines</h4>
<p>The deliverables and timelines in the Order Form are estimates made in good faith. The Company will make reasonable efforts to meet the agreed schedule. Timelines may be extended where delays are caused by the Client, including late provision of information, approvals, materials, or access.</p>
<h4>5. Client Responsibilities</h4>
<p>The Client must provide all required information, materials, approvals, and access needed for execution within the agreed timeframes, and is solely responsible for the legality and accuracy of the content they supply.</p>
<h4>6. Intellectual Property</h4>
<p>Ownership of the final deliverables transfers to the Client on full and final payment. Until all payments are received in full, all work product remains the property of the Company. The Company may display the work in its portfolio unless a confidentiality agreement states otherwise.</p>
<h4>7. Confidentiality</h4>
<p>Each party shall keep confidential all non-public information received from the other party and use it solely for performing this agreement.</p>
<h4>8. Limitation of Liability</h4>
<p>The Company's total liability arising out of or in connection with this order shall not exceed the value of the fees actually paid by the Client. The Company shall not be liable for any indirect, incidental, or consequential losses, including loss of profits, data, or business opportunity.</p>
<h4>9. Termination</h4>
<p>Either party may terminate this order by written notice if the other party commits a material breach that remains uncured for 15 days after notice. On termination, the Client shall pay for all work performed and costs incurred up to the date of termination; the advance is non-refundable.</p>
<h4>10. Force Majeure</h4>
<p>Neither party is liable for any failure or delay caused by events beyond its reasonable control, including natural disasters, strikes, war, government action, or network failures.</p>
<h4>11. Governing Law &amp; Jurisdiction</h4>
<p>This order shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts where the Company's registered office is situated.</p>
""".strip()


def seed_terms(apps, schema_editor):
    Company = apps.get_model('accounts', 'Company')
    for company in Company.objects.all().iterator():
        changed = False
        if company.terms_html:
            move = str(company.terms_html).strip()
            if not company.terms_full_html:
                company.terms_full_html = move
            changed = True
        if not company.terms_summary_html:
            company.terms_summary_html = DEFAULT_TERMS_SUMMARY
            changed = True
        if not company.terms_full_html:
            company.terms_full_html = DEFAULT_TERMS_FULL
            changed = True
        if changed:
            company.save()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_company_financial_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='terms_summary_html',
            field=models.TextField(blank=True, help_text='Short Terms &amp; Conditions summary shown on proposals and order forms.'),
        ),
        migrations.AddField(
            model_name='company',
            name='terms_full_html',
            field=models.TextField(blank=True, help_text='Full Terms &amp; Conditions shown on proposals and order forms.'),
        ),
        migrations.RunPython(seed_terms, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='company',
            name='terms_html',
        ),
    ]