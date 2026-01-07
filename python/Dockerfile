FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required by PaddleOCR
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
	   build-essential \
	   libgl1 \
	   libglib2.0-0 \
	&& rm -rf /var/lib/apt/lists/*

# Copy requirement file and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure uploads directory exists inside container
RUN mkdir -p uploads

# Environment
ENV PYTHONUNBUFFERED=1 \
	PORT=6000 \
	DISABLE_MODEL_SOURCE_CHECK=True

# Expose Flask port
EXPOSE 6000

# Run the Flask server with Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:6000", "--timeout", "120", "--workers", "2", "flask_server:app"]
