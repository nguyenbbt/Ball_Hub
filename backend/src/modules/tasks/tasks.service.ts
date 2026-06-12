import { PrismaClient, Priority, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: Priority;
  category?: string | null;
  assigneeIds?: string[];
};

export class TasksService {
  // TỐI ƯU 1: Áp dụng Pagination và thực thi song song
  async getTasks(teamId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        // TỐI ƯU 2: Sử dụng select thay vì include để loại bỏ các trường dư thừa từ User
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          status: true,
          category: true,
          assignees: {
            select: {
              user: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          }
        }
      }),
      prisma.task.count({ where: { teamId } })
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createTask(teamId: string, creatorId: string, data: CreateTaskInput) {
    return prisma.task.create({
      data: {
        teamId,
        creatorId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority,
        category: data.category,
        assignees: data.assigneeIds && data.assigneeIds.length > 0 ? {
          create: data.assigneeIds.map((userId: string) => ({ userId }))
        } : undefined,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      }
    });
  }

  async updateTaskStatus(teamId: string, taskId: string, status: TaskStatus) {
    // VÁ LỖI BẢO MẬT: Bắt buộc kiểm tra task này có thuộc về teamId hiện tại không
    const existing = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      select: { id: true, title: true }
    });

    if (!existing) return null;

    return prisma.task.update({
      where: { id: taskId },
      data: { status },
      select: { id: true, title: true, status: true }
    });
  }

  async deleteTask(teamId: string, taskId: string) {
    // VÁ LỖI BẢO MẬT: Đảm bảo không xóa nhầm/cố ý xóa task của đội khác
    const existing = await prisma.task.findFirst({
      where: { id: taskId, teamId },
      select: { id: true }
    });

    if (!existing) return null;

    return prisma.task.delete({
      where: { id: taskId },
    });
  }
}