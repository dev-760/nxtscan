import ssl
import socket
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
import re
import urllib3
import dns.resolver

# Suppress insecure request warnings for CNDP scraper when connecting to misconfigured domains
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def check_ssl(domain: str) -> dict:
    """
    Check the SSL certificate properties.
    Specifically checks if the certificate validity exceeds the 200-day limit.
    """
    try:
        context = ssl.create_default_context()
        context.check_hostname = True
        
        with socket.create_connection((domain, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                
        not_before = datetime.strptime(cert['notBefore'], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        not_after = datetime.strptime(cert['notAfter'], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        
        validity_days = (not_after - not_before).days
        days_remaining = (not_after - datetime.now(timezone.utc)).days
        
        # SSL Sentinel Logic: Enforcing 200-day limit validation
        if validity_days > 200:
            status = "fail"
            detail = f"Violation: Certificate lifespan ({validity_days} days) exceeds the strict 200-day maximum validity limit."
        elif days_remaining < 0:
            status = "fail"
            detail = f"Violation: Certificate expired {abs(days_remaining)} days ago."
        else:
            status = "pass"
            detail = f"Valid: Certificate complies with duration limits. {days_remaining} days remaining (Total: {validity_days} days)."
            
        return {
            "check_name": "SSL Sentinel (200-day limit)",
            "status": status,
            "severity": "high" if status == "fail" else "info",
            "detail": detail
        }
    except Exception as e:
        return {"check_name": "SSL Sentinel (200-day limit)", "status": "fail", "severity": "high", "detail": f"SSL Handshake failed: {str(e)}"}


def check_cndp(domain: str) -> dict:
    """
    Scrapes the domain homepage and common privacy policy routes
    looking for CNDP (Commission Nationale de contrôle de la protection des Données) 
    authorization numbers to ensure Moroccan legal compliance.
    """
    search_paths = [
        "/",
        "/privacy-policy",
        "/privacy",
        "/politique-de-confidentialite",
        "/mentions-legales",
        "/terms"
    ]
    
    headers = {"User-Agent": "NextScan/1.0 Privacy Checker (Compliance Verification)"}
    
    cndp_found = False
    details = "Violation: No 'Numéro d'autorisation CNDP' or compliance declaration found on public privacy routes."
    
    # Matches variations of "Numéro d'autorisation CNDP" or simple CNDP mentions with IDs
    cndp_regex = re.compile(r'(Num[eé]ro\s+d[\'’]autorisation\s+CNDP|CNDP\s+N°|CNDP.*?aut\w*).*?(\d+[A-Za-z0-9\-\/]+|\d+)', re.IGNORECASE)
    
    for path in search_paths:
        try:
            url = f"https://{domain}{path}"
            # Verify=False to allow checking sites with busted SSLs during compliance check
            resp = requests.get(url, headers=headers, timeout=5, verify=False) 
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                text_content = soup.get_text(separator=' ', strip=True)
                
                match = cndp_regex.search(text_content)
                if match:
                    cndp_found = True
                    details = f"Compliant: CNDP Authorization found on {path} -> {match.group(0)}"
                    break
        except requests.exceptions.RequestException:
            continue
            
    return {
        "check_name": "CNDP Privacy Compliance",
        "status": "pass" if cndp_found else "warning",
        "severity": "medium",
        "detail": details
    }

def check_headers(domain: str) -> dict:
    """
    Checks for essential HTTP security headers like HSTS, CSP, and X-Frame-Options.
    """
    try:
        url = f"https://{domain}"
        resp = requests.head(url, timeout=5, allow_redirects=True, verify=False)
        headers_found = []
        missing = []
        
        if "Strict-Transport-Security" in resp.headers:
            headers_found.append("HSTS")
        else:
            missing.append("HSTS")
            
        if "Content-Security-Policy" in resp.headers:
            headers_found.append("CSP")
        else:
            missing.append("CSP")
            
        if "X-Frame-Options" in resp.headers:
            headers_found.append("X-Frame-Options")
        else:
            missing.append("X-Frame-Options")

        if len(missing) == 0:
            return {"check_name": "Security Headers", "status": "pass", "severity": "info", "detail": f"All essential headers present: {', '.join(headers_found)}"}
        elif len(headers_found) == 0:
            return {"check_name": "Security Headers", "status": "fail", "severity": "high", "detail": "CRITICAL: No essential security headers found."}
        else:
            return {"check_name": "Security Headers", "status": "warning", "severity": "medium", "detail": f"Missing headers: {', '.join(missing)}. Present: {', '.join(headers_found)}"}
    except Exception as e:
        return {"check_name": "Security Headers", "status": "fail", "severity": "high", "detail": f"Could not connect to evaluate headers: {str(e)}"}

def check_dns(domain: str) -> dict:
    """
    Checks TXT records for SPF and DMARC configuration to prevent email spoofing.
    """
    has_spf = False
    has_dmarc = False
    details = []
    
    # Check SPF on apex domain
    try:
        txt_records = dns.resolver.resolve(domain, 'TXT')
        for record in txt_records:
            if "v=spf1" in str(record):
                has_spf = True
                details.append("SPF Found")
                break
    except Exception:
        pass

    # Check DMARC on _dmarc subdomain
    try:
        dmarc_records = dns.resolver.resolve(f"_dmarc.{domain}", 'TXT')
        for record in dmarc_records:
            if "v=DMARC1" in str(record):
                has_dmarc = True
                details.append("DMARC Found")
                break
    except Exception:
        pass

    if has_spf and has_dmarc:
        return {"check_name": "DNS Email Security", "status": "pass", "severity": "info", "detail": "SPF and DMARC are configured perfectly."}
    elif not has_spf and not has_dmarc:
        return {"check_name": "DNS Email Security", "status": "fail", "severity": "high", "detail": "Critial: Missing both SPF and DMARC records (Domain is highly vulnerable to phishing/spoofing)."}
    else:
        missing = "DMARC" if has_spf else "SPF"
        return {"check_name": "DNS Email Security", "status": "warning", "severity": "medium", "detail": f"Partially configured. Missing: {missing}"}

import shodan
import os

def check_shodan(domain: str) -> dict:
    """
    [PRO ONLY] Queries Shodan to find exposed ports and services associated with the domain's IP.
    """
    api_key = os.environ.get("SHODAN_API_KEY", "")
    if not api_key:
        return {"check_name": "Shodan Ports", "status": "info", "severity": "info", "detail": "Shodan API Key missing from infrastructure config."}
    
    try:
        ip = socket.gethostbyname(domain)
        api = shodan.Shodan(api_key)
        
        # Wrapped in try-except because Shodan throws APIError if IP isn't in their DB
        try:
            host = api.host(ip)
            ports = host.get("ports", [])
            
            if not ports:
                return {"check_name": "Shodan Ports", "status": "pass", "severity": "info", "detail": "No open ports found by Shodan."}
            
            # Highlight dangerous ports (22 SSH, 3389 RDP, 21 FTP, 23 Telnet, 3306/5432 DBs)
            dangerous = [21, 22, 23, 3389, 3306, 5432, 27017]
            found_dangerous = [p for p in ports if p in dangerous]
            
            if found_dangerous:
                return {"check_name": "Shodan Ports", "status": "warning", "severity": "high", "detail": f"Exposed high-risk ports detected: {found_dangerous}. Total open ports: {len(ports)}."}
            
            return {"check_name": "Shodan Ports", "status": "pass", "severity": "info", "detail": f"Found open ports: {ports}."}
            
        except shodan.APIError as e:
            if "No information available" in str(e):
                return {"check_name": "Shodan Ports", "status": "pass", "severity": "info", "detail": "No public footprint found on Shodan."}
            return {"check_name": "Shodan Ports", "status": "fail", "severity": "medium", "detail": f"Shodan API error: {str(e)}"}
            
    except Exception as e:
        return {"check_name": "Shodan Ports", "status": "info", "severity": "info", "detail": f"Could not perform Shodan check: {str(e)}"}
