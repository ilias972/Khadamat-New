-- Phase 3B.2: ensure pgcrypto exists for digest()/gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
