import { vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

export const prisma = {
  $transaction: vi.fn(),
  content: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient
