import { PrismaClient, Condition } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateInventoryInput = {
  name: string;
  category: string;
  quantity?: number;
  minQuantity?: number;
  condition?: string | null;
  location?: string | null;
  lastChecked?: string | Date | null;
};

export type UpdateInventoryInput = Partial<CreateInventoryInput>;

export class InventoryService {
  private parseCondition(value?: string | null): Condition {
    const normalized = (value ?? '').toString().trim().toUpperCase();
    if (normalized === Condition.GOOD || normalized === Condition.FAIR || normalized === Condition.POOR) {
      return normalized as Condition;
    }
    return Condition.GOOD;
  }

  // TỐI ƯU 1: Áp dụng Pagination và thực thi song song
  async getInventory(teamId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where: { teamId },
        orderBy: { lastChecked: 'desc' },
        skip,
        take: limit,
        // TỐI ƯU 2: Sử dụng select thay vì lấy mặc định toàn bộ document
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          minQuantity: true,
          condition: true,
          location: true,
          lastChecked: true,
        }
      }),
      prisma.inventory.count({ where: { teamId } })
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createItem(teamId: string, data: CreateInventoryInput) {
    return prisma.inventory.create({
      data: {
        teamId,
        name: data.name,
        category: data.category,
        quantity: data.quantity ?? 0,
        minQuantity: data.minQuantity ?? 0,
        condition: this.parseCondition(data.condition),
        location: data.location ?? null,
        lastChecked: data.lastChecked ? new Date(data.lastChecked) : new Date(),
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        condition: true,
      }
    });
  }

  async updateItem(teamId: string, itemId: string, data: UpdateInventoryInput) {
    // Đảm bảo item thuộc về teamId hiện tại (Tránh BOLA/IDOR)
    const existing = await prisma.inventory.findFirst({
      where: { id: itemId, teamId },
      select: { id: true }
    });

    if (!existing) return null;

    return prisma.inventory.update({
      where: { id: itemId },
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        condition: data.condition ? this.parseCondition(data.condition) : undefined,
        location: data.location,
        lastChecked: data.lastChecked ? new Date(data.lastChecked) : undefined,
      },
    });
  }

  async deleteItem(teamId: string, itemId: string) {
    const existing = await prisma.inventory.findFirst({
      where: { id: itemId, teamId },
      select: { id: true }
    });

    if (!existing) return null;

    return prisma.inventory.delete({
      where: { id: itemId },
    });
  }
}