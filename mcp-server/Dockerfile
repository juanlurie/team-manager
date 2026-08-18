FROM python:3.12-slim

# Refresh Debian packages from the current security repository. The upstream slim image can lag
# fixed base packages in its cached layers, which leaves util-linux CVEs visible to image scans.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir httpx "mcp[cli]" uvicorn starlette

COPY server.py .

EXPOSE 8765

ENTRYPOINT ["python3", "server.py"]
