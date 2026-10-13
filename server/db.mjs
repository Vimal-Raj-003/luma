import { PrismaClient } from '@prisma/client'
import { loadEnv } from './env.mjs'

loadEnv()
export const db = globalThis.__lumaDb || (globalThis.__lumaDb = new PrismaClient())
