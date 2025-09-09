declare module '@prisma/client' {
  export class PrismaClient {
    $transaction: <T>(fn: (prisma: PrismaClient) => Promise<T>) => Promise<T>
    [key: string]: any
  }
}
