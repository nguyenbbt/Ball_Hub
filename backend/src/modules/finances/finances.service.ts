import { PrismaClient, TransType } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateTransactionInput = {
  description: string;
  amount: number;
  transType: TransType;
  category: string;
  transDate: string;
};

export class FinancesService {
  // TỐI ƯU 1: Áp dụng Pagination và thực thi song song
  async getTransactions(teamId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { teamId },
        orderBy: { transDate: 'desc' },
        skip,
        take: limit,
        // TỐI ƯU 2: Ngăn over-fetching
        select: {
          id: true,
          description: true,
          amount: true,
          transType: true,
          category: true,
          transDate: true,
        }
      }),
      prisma.transaction.count({ where: { teamId } })
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createTransaction(teamId: string, data: CreateTransactionInput) {
    return prisma.transaction.create({
      data: {
        teamId,
        description: data.description,
        amount: Number(data.amount),
        transType: data.transType,
        category: data.category,
        transDate: new Date(data.transDate),
      },
      select: { id: true, description: true, amount: true, transDate: true }
    });
  }

  async updateTransaction(teamId: string, transactionId: string, data: CreateTransactionInput) {
    // VÁ LỖI BẢO MẬT: Bắt buộc kiểm tra transaction này có thuộc về teamId hiện tại không
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, teamId },
      select: { id: true }
    });

    if (!existing) return null;

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: data.description,
        amount: Number(data.amount),
        transType: data.transType,
        category: data.category,
        transDate: new Date(data.transDate),
      },
    });
  }

  async deleteTransaction(teamId: string, transactionId: string) {
    // VÁ LỖI BẢO MẬT: Đảm bảo không xóa nhầm/cố ý xóa transaction của đội khác
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, teamId },
      select: { id: true }
    });

    if (!existing) return null;

    return prisma.transaction.delete({
      where: { id: transactionId },
    });
  }
}