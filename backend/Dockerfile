FROM python:3.11-slim

# Install system dependencies (WeasyPrint + Arabic/RTL PDF support)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi-dev \
    fonts-noto-core \
    fonts-hosny-amiri \
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

# Start with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
