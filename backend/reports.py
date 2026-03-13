from jinja2 import Template
from weasyprint import HTML, CSS
import os
from datetime import datetime

pdf_template = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap');
        
        body {
            font-family: 'Amiri', serif;
            margin: 40px;
            color: #333;
            line-height: 1.6;
            direction: rtl;
        }
        h1 {
            color: #4c1d95; /* NextLab Brand Purple */
            text-align: center;
            border-bottom: 2px solid #8b5cf6;
            padding-bottom: 10px;
        }
        .section {
            margin-top: 30px;
        }
        .status-pass { color: #16a34a; font-weight: bold; }
        .status-fail { color: #dc2626; font-weight: bold; }
        .status-warning { color: #d97706; font-weight: bold; }
        .status-info { color: #4c1d95; font-weight: bold; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
        }
        th {
            background-color: #f5f3ff;
            color: #4c1d95;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 0.8em;
            color: #777;
        }
        .highlight {
            background-color: #f3f4f6;
            padding: 15px;
            border-right: 4px solid #8b5cf6;
            margin: 10px 0;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>تقرير الذكاء الاصطناعي للأمن السيبراني - NextLab</h1>
    
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px;">
        <p style="margin: 0;"><strong>النطاق المُستهدف (Domain):</strong> <span dir="ltr">{{ domain }}</span></p>
        <p style="margin: 0;"><strong>تاريخ الفحص:</strong> <span dir="ltr">{{ date }}</span></p>
    </div>

    <div class="section">
        <h2 style="color: #6d28d9;">ملخص العلاج بالذكاء الاصطناعي (AI Summary)</h2>
        <div class="highlight">
            <p>{{ ai_remediation }}</p>
        </div>
    </div>

    <div class="section">
        <h2 style="color: #6d28d9;">تفاصيل فحص الإمتثال والأمان (Technical Results)</h2>
        <table>
            <tr>
                <th>اسم الفحص (Check)</th>
                <th>الحالة (Status)</th>
                <th>التفاصيل (Details)</th>
            </tr>
            {% for check in checks %}
            <tr>
                <td>{{ check.name }}</td>
                <td class="status-{{ check.status }}">{{ check.status_translation }}</td>
                <td>{{ check.detail }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>

    <div class="footer">
        تم إنشاء هذا التقرير وتصديره تلقائيًا بواسطة أنظمة <strong>NextLab Security Scanner</strong>.
    </div>
</body>
</html>
"""

def translate_status(status: str) -> str:
    mapping = {
        "pass": "تم الإجتياز (Pass)",
        "fail": "خطر / فشل (Fail)",
        "warning": "تحذير قانوني/أمني (Warning)"
    }
    return mapping.get(status.lower(), "معلومة (Info)")

def generate_arabic_pdf_report(domain: str, ai_remediation: str, scan_results: list) -> str:
    """
    Generates an RTL Arabic PDF report leveraging the Amiri font via WeasyPrint.
    Returns the file path of the generated report.
    """
    processed_checks = []
    for sr in scan_results:
        processed_checks.append({
            "name": sr.get("check_name", "Unknown Check"),
            "status": sr.get("status", "info"),
            "status_translation": translate_status(sr.get("status", "")),
            "detail": sr.get("detail", "")
        })

    template = Template(pdf_template)
    html_content = template.render(
        domain=domain,
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        ai_remediation=ai_remediation,
        checks=processed_checks
    )
    
    # Store locally to /tmp, this would upload to S3 / Supabase Storage in production
    os.makedirs("/tmp/reports", exist_ok=True)
    slug = domain.replace(".", "_")
    output_filepath = f"/tmp/reports/{slug}_security_report.pdf"
    
    try:
        # We pass base_url so web fonts like Amiri load successfully via network
        HTML(string=html_content, base_url=".").write_pdf(output_filepath)
        return output_filepath
    except Exception as e:
        print(f"Failed to generate Arabic WeasyPrint PDF: {e}")
        return None
