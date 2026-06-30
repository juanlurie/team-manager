FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir httpx "mcp[cli]" uvicorn starlette

COPY server.py .

EXPOSE 8765

ENTRYPOINT ["python3", "server.py"]
