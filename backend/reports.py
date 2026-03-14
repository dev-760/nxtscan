import os
import logging
from datetime import datetime, timezone

from jinja2 import Template
from weasyprint import HTML

logger = logging.getLogger("nextlab.reports")

# ── Status translations ───────────────────────────────────

STATUS_TRANSLATIONS = {
    "pass": "تم الإجتياز (Pass)",
    "fail": "خطر / فشل (Fail)",
    "warning": "تحذير قانوني/أمني (Warning)",
    "info": "معلومة (Info)",
}

SEVERITY_COLORS = {
    "critical": "#dc2626",
    "high": "#ea580c",
    "medium": "#d97706",
    "low": "#2563eb",
    "info": "#6d28d9",
}


def translate_status(status: str) -> str:
    return STATUS_TRANSLATIONS.get(status.lower(), "معلومة (Info)")


def severity_color(severity: str) -> str:
    return SEVERITY_COLORS.get(severity.lower(), "#6d28d9")


# ── PDF Template ──────────────────────────────────────────

PDF_TEMPLATE = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Amiri', serif;
            margin: 40px;
            color: #1f2937;
            line-height: 1.7;
            direction: rtl;
            background: #fff;
        }

        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 3px solid #7c5ce7;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #4c1d95;
            font-size: 22px;
            margin-bottom: 8px;
        }

        .header .subtitle {
            color: #6b7280;
            font-size: 12px;
        }

        .meta {
            display: flex;
            justify-content: space-between;
            background: #f8f7ff;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 24px;
            font-size: 13px;
        }

        .meta strong { color: #4c1d95; }

        .section {
            margin-top: 28px;
            page-break-inside: avoid;
        }

        .section h2 {
            color: #5b21b6;
            font-size: 17px;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid #e5e7eb;
        }

        .ai-box {
            background: #f5f3ff;
            padding: 16px;
            border-right: 4px solid #7c5ce7;
            border-radius: 0 6px 6px 0;
            white-space: pre-wrap;
            font-size: 13px;
            line-height: 1.8;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 12px;
        }

        th {
            background: #5b21b6;
            color: white;
            padding: 10px 12px;
            text-align: right;
            font-weight: bold;
        }

        td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 12px;
            text-align: right;
            vertical-align: top;
        }

        tr:nth-child(even) td { background: #fafafa; }

        .status-pass { color: #059669; font-weight: bold; }
        .status-fail { color: #dc2626; font-weight: bold; }
        .status-warning { color: #d97706; font-weight: bold; }
        .status-info { color: #6d28d9; font-weight: bold; }

        .severity-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            color: white;
        }

        .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
        }

        .score-section {
            text-align: center;
            margin: 20px 0;
        }

        .score-circle {
            display: inline-block;
            width: 80px;
            height: 80px;
            line-height: 80px;
            border-radius: 50%;
            font-size: 28px;
            font-weight: bold;
            color: white;
        }

        .score-label {
            display: block;
            margin-top: 8px;
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ تقرير الأمن السيبراني — NextLab</h1>
        <div class="subtitle">AI-Powered Cybersecurity Intelligence Report</div>
    </div>

    <div class="meta">
        <div><strong>النطاق المُستهدف:</strong> <span dir="ltr">{{ domain }}</span></div>
        <div><strong>تاريخ الفحص:</strong> <span dir="ltr">{{ date }}</span></div>
        <div><strong>عدد الفحوصات:</strong> {{ check_count }}</div>
    </div>

    <!-- Security Score -->
    <div class="score-section">
        <div class="score-circle" style="background: {{ score_color }};">{{ score }}%</div>
        <span class="score-label">Security Posture Score / درجة الأمان</span>
    </div>

    <!-- AI Summary -->
    <div class="section">
        <h2>🤖 ملخص العلاج بالذكاء الاصطناعي (AI Remediation)</h2>
        <div class="ai-box">{{ ai_remediation }}</div>
    </div>

    <!-- Technical Results -->
    <div class="section">
        <h2>📋 تفاصيل الفحص الأمني (Technical Results)</h2>
        <table>
            <thead>
                <tr>
                    <th>اسم الفحص (Check)</th>
                    <th>الحالة (Status)</th>
                    <th>الخطورة (Severity)</th>
                    <th>التفاصيل (Details)</th>
                </tr>
            </thead>
            <tbody>
                {% for check in checks %}
                <tr>
                    <td><strong>{{ check.name }}</strong></td>
                    <td class="status-{{ check.status }}">{{ check.status_translation }}</td>
                    <td>
                        <span class="severity-badge" style="background: {{ check.severity_color }};">
                            {{ check.severity | upper }}
                        </span>
                    </td>
                    <td>{{ check.detail }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <div class="footer">
        تم إنشاء هذا التقرير تلقائيًا بواسطة <strong>NextLab Security Scanner v2.0</strong><br>
        This report was auto-generated by NextLab. All data is encrypted at rest.
    </div>
</body>
</html>
"""


def _calculate_score(scan_results: list) -> tuple[int, str]:
    """Calculate a security posture score (0-100) from scan results."""
    if not scan_results:
        return 0, "#dc2626"

    weights = {"pass": 100, "info": 80, "warning": 40, "fail": 0}
    total = sum(weights.get(r.get("status", ""), 50) for r in scan_results)
    score = round(total / len(scan_results))

    if score >= 80:
        color = "#059669"  # green
    elif score >= 50:
        color = "#d97706"  # amber
    else:
        color = "#dc2626"  # red

    return score, color


def generate_arabic_pdf_report(domain: str, ai_remediation: str, scan_results: list) -> str | None:
    """
    Generate a bilingual Arabic/English PDF report using WeasyPrint.
    Returns the file path of the generated report, or None on failure.
    """
    # Compute security score
    score, score_color = _calculate_score(scan_results)

    # Process check results for template
    processed_checks = []
    for sr in scan_results:
        processed_checks.append({
            "name": sr.get("check_name", "Unknown"),
            "status": sr.get("status", "info"),
            "status_translation": translate_status(sr.get("status", "")),
            "severity": sr.get("severity", "info"),
            "severity_color": severity_color(sr.get("severity", "info")),
            "detail": sr.get("detail", ""),
        })

    # Render HTML
    template = Template(PDF_TEMPLATE)
    html_content = template.render(
        domain=domain,
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        ai_remediation=ai_remediation,
        checks=processed_checks,
        check_count=len(processed_checks),
        score=score,
        score_color=score_color,
    )

    # Output path
    reports_dir = os.environ.get("REPORTS_DIR", "/tmp/reports")
    os.makedirs(reports_dir, exist_ok=True)

    slug = domain.replace(".", "_")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(reports_dir, f"{slug}_{timestamp}.pdf")

    try:
        HTML(string=html_content, base_url=".").write_pdf(output_path)
        logger.info("PDF report generated: %s", output_path)
        return output_path
    except Exception as e:
        logger.error("PDF generation failed for %s: %s", domain, e)
        return None
