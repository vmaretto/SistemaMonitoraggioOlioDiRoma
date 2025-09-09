import { describe, expect, it, vi } from 'vitest'
import { prisma } from '../lib/db'

vi.mock('../lib/db')

describe('prisma client mock', () => {
  it('allows mocking prisma queries', async () => {
    (prisma.content.findMany as any).mockResolvedValueOnce([])
    const result = await prisma.content.findMany()
    expect(result).toEqual([])
    expect(prisma.content.findMany).toHaveBeenCalled()
  })
})
