import ssl
import socket
from datetime import datetime, timezone
from typing import Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup
import re
import urllib3
import dns.resolver
import shodan

from .config import settings

# Suppress insecure request warnings for compliance scrapers
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Shared constants ──────────────────────────────────────
REQUEST_TIMEOUT = 8
HTTP_HEADERS = {"User-Agent": "NextLab/2.0 Security Scanner (https://nextlab.ma)"}
DANGEROUS_PORTS = frozenset({21, 22, 23, 25, 445, 1433, 3306, 3389, 5432, 5900, 6379, 27017})

# ── Type alias ────────────────────────────────────────────
ScanCheckResult = Dict[str, str]


def _make_result(check_name: str, status: str, severity: str, detail: str) -> ScanCheckResult:
    """Standardized result builder to avoid typo-prone dict construction."""
    return {
        "check_name": check_name,
        "status": status,
        "severity": severity,
        "detail": detail,
    }


# ══════════════════════════════════════════════════════════
#  SSL Certificate Analysis
# ══════════════════════════════════════════════════════════

def check_ssl(domain: str) -> ScanCheckResult:
    """
    Validates the SSL certificate:
    - Checks if cert is expired
    - Warns if cert validity exceeds 200 days (stricter posture)
    - Reports days remaining
    """
    check = "SSL Certificate"
    try:
        context = ssl.create_default_context()
        context.check_hostname = True

        with socket.create_connection((domain, 443), timeout=REQUEST_TIMEOUT) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()

        not_before = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)

        validity_days = (not_after - not_before).days
        days_remaining = (not_after - datetime.now(timezone.utc)).days

        issuer_parts = dict(x[0] for x in cert.get("issuer", []))
        issuer = issuer_parts.get("organizationName", "Unknown CA")

        if days_remaining < 0:
            return _make_result(check, "fail", "critical",
                                f"Certificate expired {abs(days_remaining)} days ago. Issuer: {issuer}")
        elif days_remaining < 14:
            return _make_result(check, "warning", "high",
                                f"Certificate expires in {days_remaining} days! Renew immediately. Issuer: {issuer}")
        elif validity_days > 200:
            return _make_result(check, "warning", "medium",
                                f"Certificate lifespan ({validity_days} days) exceeds 200-day best practice. "
                                f"{days_remaining} days remaining. Issuer: {issuer}")
        else:
            return _make_result(check, "pass", "info",
                                f"Valid for {days_remaining} more days (total {validity_days} days). Issuer: {issuer}")

    except ssl.SSLCertVerificationError as e:
        return _make_result(check, "fail", "critical", f"SSL verification failed: {e}")
    except socket.timeout:
        return _make_result(check, "fail", "high", "Connection timed out on port 443")
    except Exception as e:
        return _make_result(check, "fail", "high", f"SSL handshake failed: {e}")


# ══════════════════════════════════════════════════════════
#  Security Headers
# ══════════════════════════════════════════════════════════

REQUIRED_HEADERS = {
    "Strict-Transport-Security": "HSTS",
    "Content-Security-Policy": "CSP",
    "X-Frame-Options": "X-Frame-Options",
    "X-Content-Type-Options": "X-Content-Type-Options",
    "Referrer-Policy": "Referrer-Policy",
    "Permissions-Policy": "Permissions-Policy",
}

def check_headers(domain: str) -> ScanCheckResult:
    """Checks for essential HTTP security headers including HSTS, CSP, X-Frame, and more."""
    check = "Security Headers"
    try:
        resp = requests.head(
            f"https://{domain}", timeout=REQUEST_TIMEOUT,
            allow_redirects=True, verify=False, headers=HTTP_HEADERS,
        )
        present = []
        missing = []

        for header, label in REQUIRED_HEADERS.items():
            if header in resp.headers:
                present.append(label)
            else:
                missing.append(label)

        score = len(present)
        total = len(REQUIRED_HEADERS)

        if score == total:
            return _make_result(check, "pass", "info",
                                f"All {total} security headers present: {', '.join(present)}")
        elif score == 0:
            return _make_result(check, "fail", "high",
                                f"No security headers found. Missing: {', '.join(missing)}")
        else:
            return _make_result(check, "warning", "medium",
                                f"Score: {score}/{total}. Missing: {', '.join(missing)}")

    except requests.Timeout:
        return _make_result(check, "fail", "high", "Connection timed out")
    except Exception as e:
        return _make_result(check, "fail", "high", f"Could not connect: {e}")


# ══════════════════════════════════════════════════════════
#  DNS / Email Security (SPF, DMARC, DKIM)
# ══════════════════════════════════════════════════════════

def check_dns(domain: str) -> ScanCheckResult:
    """Checks TXT records for SPF, DMARC, and DKIM configuration."""
    check = "Email Security (SPF/DMARC/DKIM)"
    found = []
    missing = []

    # SPF
    try:
        txt_records = dns.resolver.resolve(domain, "TXT")
        for record in txt_records:
            if "v=spf1" in str(record):
                found.append("SPF")
                break
        else:
            missing.append("SPF")
    except Exception:
        missing.append("SPF")

    # DMARC
    try:
        dmarc_records = dns.resolver.resolve(f"_dmarc.{domain}", "TXT")
        for record in dmarc_records:
            if "v=DMARC1" in str(record):
                found.append("DMARC")
                break
        else:
            missing.append("DMARC")
    except Exception:
        missing.append("DMARC")

    # DKIM (common selectors)
    dkim_found = False
    for selector in ["default", "google", "selector1", "selector2", "k1", "mail"]:
        try:
            dns.resolver.resolve(f"{selector}._domainkey.{domain}", "TXT")
            dkim_found = True
            found.append(f"DKIM ({selector})")
            break
        except Exception:
            continue
    if not dkim_found:
        missing.append("DKIM")

    total = len(found) + len(missing)
    if not missing:
        return _make_result(check, "pass", "info",
                            f"All email security records configured: {', '.join(found)}")
    elif not found:
        return _make_result(check, "fail", "high",
                            f"No email security records found. Missing: {', '.join(missing)}. "
                            f"Domain is vulnerable to phishing/spoofing.")
    else:
        return _make_result(check, "warning", "medium",
                            f"Partially configured ({len(found)}/{total}). "
                            f"Present: {', '.join(found)}. Missing: {', '.join(missing)}")


# ══════════════════════════════════════════════════════════
#  CNDP Moroccan Privacy Compliance
# ══════════════════════════════════════════════════════════

CNDP_REGEX = re.compile(
    r"(Num[eé]ro\s+d[\'']autorisation\s+CNDP|CNDP\s+N°|CNDP.*?aut\w*).*?(\d+[A-Za-z0-9\-\/]+|\d+)",
    re.IGNORECASE,
)

PRIVACY_PATHS = ["/", "/privacy-policy", "/privacy", "/politique-de-confidentialite", "/mentions-legales", "/terms"]

def check_cndp(domain: str) -> ScanCheckResult:
    """Scrapes public pages for CNDP authorization numbers (Moroccan data protection compliance)."""
    check = "CNDP Privacy Compliance"

    for path in PRIVACY_PATHS:
        try:
            resp = requests.get(
                f"https://{domain}{path}",
                headers=HTTP_HEADERS, timeout=REQUEST_TIMEOUT, verify=False,
            )
            if resp.status_code == 200:
                text_content = BeautifulSoup(resp.text, "html.parser").get_text(separator=" ", strip=True)
                match = CNDP_REGEX.search(text_content)
                if match:
                    return _make_result(check, "pass", "info",
                                        f"CNDP Authorization found on {path}: {match.group(0)}")
        except requests.RequestException:
            continue

    return _make_result(check, "warning", "medium",
                        "No CNDP authorization number found on public privacy routes.")


# ══════════════════════════════════════════════════════════
#  Shodan Port Scan (Pro Only)
# ══════════════════════════════════════════════════════════

def check_shodan(domain: str) -> ScanCheckResult:
    """Queries Shodan for exposed ports and services."""
    check = "Shodan Port Exposure"
    api_key = settings.shodan_api_key
    if not api_key:
        return _make_result(check, "info", "info", "Shodan API key not configured.")

    try:
        ip = socket.gethostbyname(domain)
        api = shodan.Shodan(api_key)

        try:
            host = api.host(ip)
            ports = host.get("ports", [])
            os_info = host.get("os", "Unknown")

            if not ports:
                return _make_result(check, "pass", "info",
                                    f"No open ports found. OS: {os_info}. IP: {ip}")

            found_dangerous = [p for p in ports if p in DANGEROUS_PORTS]
            if found_dangerous:
                return _make_result(check, "warning", "high",
                                    f"High-risk ports exposed: {found_dangerous}. "
                                    f"Total open: {len(ports)} ({sorted(ports)}). IP: {ip}")

            return _make_result(check, "pass", "info",
                                f"Open ports: {sorted(ports)}. No high-risk services exposed. IP: {ip}")

        except shodan.APIError as e:
            if "No information available" in str(e):
                return _make_result(check, "pass", "info",
                                    f"No public footprint on Shodan for {ip}")
            return _make_result(check, "fail", "medium", f"Shodan API error: {e}")

    except socket.gaierror:
        return _make_result(check, "fail", "medium", f"DNS resolution failed for {domain}")
    except Exception as e:
        return _make_result(check, "info", "info", f"Shodan check unavailable: {e}")


# ══════════════════════════════════════════════════════════
#  Technology Fingerprinting (Pro Only)
# ══════════════════════════════════════════════════════════

TECH_SIGNATURES = {
    "Next.js": ["__next", "_next/static", "next/router"],
    "React": ["react", "__REACT_DEVTOOLS"],
    "WordPress": ["/wp-content/", "/wp-includes/", "wp-json"],
    "Laravel": ["laravel_session", "XSRF-TOKEN"],
    "Django": ["csrfmiddlewaretoken", "django"],
    "Nginx": [],
    "Apache": [],
}

def check_tech_fingerprint(domain: str) -> ScanCheckResult:
    """Attempts to detect web technologies by analyzing response headers and body patterns."""
    check = "Technology Fingerprint"
    try:
        resp = requests.get(
            f"https://{domain}", timeout=REQUEST_TIMEOUT,
            verify=False, headers=HTTP_HEADERS, allow_redirects=True,
        )
        detected = []
        body = resp.text.lower()

        # Check server header
        server = resp.headers.get("Server", "").lower()
        if "nginx" in server:
            detected.append("Nginx")
        elif "apache" in server:
            detected.append("Apache")
        elif "cloudflare" in server:
            detected.append("Cloudflare")

        # Check powered-by
        powered_by = resp.headers.get("X-Powered-By", "").lower()
        if powered_by:
            detected.append(f"X-Powered-By: {powered_by}")

        # Check body patterns
        for tech, patterns in TECH_SIGNATURES.items():
            for pattern in patterns:
                if pattern.lower() in body:
                    if tech not in detected:
                        detected.append(tech)
                    break

        if detected:
            return _make_result(check, "pass", "info",
                                f"Detected: {', '.join(detected)}")
        return _make_result(check, "pass", "info",
                            "No identifiable technology signatures detected.")

    except Exception as e:
        return _make_result(check, "info", "info", f"Fingerprinting unavailable: {e}")


# ══════════════════════════════════════════════════════════
#  Scan Orchestration
# ══════════════════════════════════════════════════════════

def run_free_checks(domain: str) -> list[ScanCheckResult]:
    """Run all free-tier checks concurrently."""
    checks = [check_ssl, check_headers, check_dns, check_cndp]
    return _run_concurrent(domain, checks)


def run_pro_checks(domain: str) -> list[ScanCheckResult]:
    """Run all pro-tier checks concurrently (includes free + advanced)."""
    checks = [check_ssl, check_headers, check_dns, check_cndp, check_shodan, check_tech_fingerprint]
    return _run_concurrent(domain, checks)


def _run_concurrent(domain: str, checks: list) -> list[ScanCheckResult]:
    """Execute scan checks concurrently using a thread pool."""
    results = []
    with ThreadPoolExecutor(max_workers=len(checks)) as executor:
        futures = {executor.submit(fn, domain): fn.__name__ for fn in checks}
        for future in as_completed(futures):
            name = futures[future]
            try:
                results.append(future.result())
            except Exception as e:
                results.append(_make_result(name, "fail", "medium", f"Internal error: {e}"))
    return results
