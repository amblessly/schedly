# Job Queue Setup Guide

This guide explains how to set up the async job processing system using BullMQ and Redis.

## Prerequisites

### 1. Install Dependencies

```bash
npm install bullmq ioredis
npm install -D tsx
```

### 2. Set Up Redis

**Option A: Local Redis (Recommended for Development)**

1. Download Redis for Windows: https://github.com/microsoftarchive/redis/releases
   Or use WSL/WSL2 with Redis installed via apt.

2. Start Redis server:
```bash
redis-server
```

**Option B: Redis Cloud (Recommended for Production)**

1. Sign up at https://upstash.com or https://redis.com
2. Create a new Redis database
3. Copy the connection URL

**Option C: Docker**

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
```

### 3. Configure Environment Variables

Add to your `.env.local`:

```env
REDIS_URL=redis://localhost:6379
```

For production with cloud Redis:
```env
REDIS_URL=redis://default:your-password@your-redis-url:port
```

## Running the Application

### Development Mode (Two Terminals)

**Terminal 1 - Next.js App:**
```bash
npm run dev
```

**Terminal 2 - Worker Process:**
```bash
npm run dev:worker
```

### Production Mode

**Start the Next.js app:**
```bash
npm run build
npm start
```

**Start the worker (separate process/container):**
```bash
npm run worker
```

## How It Works

1. **User uploads a file** → `/api/flashcards/upload` endpoint
2. **File is stored** → Upload record created with status "processing"
3. **Job is enqueued** → Job added to Redis queue
4. **Worker picks up job** → Processes asynchronously
5. **User polls status** → `/api/flashcards/upload/status/[id]`
6. **Job completes** → Upload status updated to "completed"
7. **User sees results** → Cards displayed from `aiResult` field

## Queue Types

| Queue | Purpose | Worker |
|-------|---------|--------|
| `flashcard-generation` | AI flashcard creation from PDFs/images | flashcardWorker |
| `syllabus-generation` | Syllabus processing | syllabusWorker |
| `schedule-generation` | Schedule optimization/conflict checking | scheduleWorker |

## Monitoring

### Check Queue Stats
```bash
curl http://localhost:3000/api/jobs/flashcard-generation/{jobId}
```

### Redis CLI
```bash
redis-cli
> KEYS bull:*
> LLEN bull:flashcard-generation:wait
```

## Scaling

### Multiple Workers
Run multiple worker instances for higher throughput:
```bash
npm run worker  # Terminal 1
npm run worker  # Terminal 2
```

### Queue Limits
Each worker processes max 5 concurrent jobs, with a rate limit of 10 jobs/second per queue.

## Troubleshooting

### Redis Connection Error
```
[REDIS] Connection error: Error: connect ECONNREFUSED
```
→ Make sure Redis is running: `redis-server`

### Job Not Processing
1. Check Redis is running
2. Check worker is started: `npm run dev:worker`
3. Check queue stats in Redis CLI

### Circuit Breaker Open
```
[CIRCUIT_BREAKER] gemini opened after 10 failures
```
→ Too many consecutive failures. Circuit breaker opens for 60 seconds, then allows test requests.

## Production Considerations

1. **Use managed Redis** (Upstash, Redis Cloud) for reliability
2. **Run workers in separate containers** from the Next.js app
3. **Set up monitoring** for queue depth and worker health
4. **Configure proper retry limits** in BullMQ job options
5. **Use Redis persistence** (AOF) to survive restarts
