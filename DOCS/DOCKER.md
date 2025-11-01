# Docker Setup for AthenaSphere

This guide will help you run the AthenaSphere application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- Supabase account with project credentials

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd AthenaSphere
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_anon_key_here
   ```

3. **Build and run the containers**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## Docker Commands

### Start the application
```bash
docker-compose up
```

### Start in detached mode (background)
```bash
docker-compose up -d
```

### Stop the application
```bash
docker-compose down
```

### Rebuild containers
```bash
docker-compose up --build
```

### View logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend

# Follow logs
docker-compose logs -f
```

### Remove containers and volumes
```bash
docker-compose down -v
```

## Container Details

### Backend Container
- **Port**: 8080
- **Technology**: Go (Fiber framework)
- **Build**: Multi-stage build with Alpine Linux
- **Health Check**: Enabled

### Frontend Container
- **Port**: 3000
- **Technology**: Next.js 15
- **Build**: Multi-stage build with Node.js Alpine
- **Output**: Standalone production build
- **Health Check**: Enabled

## Network

Both containers run on a shared Docker network (`athenasphere-network`) allowing them to communicate internally.

## Troubleshooting

### Port already in use
If ports 3000 or 8080 are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port (left side)
```

### Environment variables not loading
Make sure your `.env` file is in the root directory and contains all required variables.

### Container fails to start
Check the logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Production Deployment

For production deployment:

1. Update environment variables with production values
2. Configure proper SSL/TLS certificates
3. Use a reverse proxy (nginx/traefik)
4. Consider using Docker Swarm or Kubernetes for orchestration
5. Set up proper monitoring and logging

## Development vs Production

For development, you might want to use volume mounts for hot reloading. Create a `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  backend:
    volumes:
      - ./backend:/app
    command: air # Use Air for hot reload in Go

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```
