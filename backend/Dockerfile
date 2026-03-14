FROM python:3.11-slim

# Install system dependencies (WeasyPrint + Arabic/RTL PDF support + curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi-dev \
    fonts-noto-core \
    fonts-hosny-amiri \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create reports directory
RUN mkdir -p /tmp/reports

# Expose API port
EXPOSE 8000

# Health check — lets orchestrators detect unhealthy containers
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
