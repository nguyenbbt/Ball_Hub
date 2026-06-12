import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PlayerPosition = {
  x: number;
  y: number;
  name: string;
  initials: string;
  pos: string;
  color: string;
};

type Note = {
  label: string;
  active: boolean;
};

type CreateTacticInput = {
  name: string;
  players: PlayerPosition[];
  notes: Note[];
};

type UpdateTacticInput = Partial<CreateTacticInput>;

export const createTactic = async (teamId: string, data: CreateTacticInput) => {
  return prisma.tactic.create({
    data: {
      teamId,
      name: data.name,
      players: data.players,
      notes: data.notes,
    },
    // TỐI ƯU: Trả về ít dữ liệu nhất có thể sau khi tạo
    select: { id: true, name: true, createdAt: true }
  });
};

// TỐI ƯU 1: Thêm Phân trang và Bỏ qua các trường JSON nặng
export const getTacticsByTeam = async (teamId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [tactics, total] = await Promise.all([
    prisma.tactic.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        // Cố ý không select `players` và `notes` ở đây để giảm tải băng thông
      }
    }),
    prisma.tactic.count({ where: { teamId } })
  ]);

  return {
    data: tactics,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// MỚI: Thêm hàm lấy chi tiết chiến thuật
export const getTacticById = async (teamId: string, tacticId: string) => {
  return prisma.tactic.findFirst({
    where: { id: tacticId, teamId },
    // Trả về toàn bộ data bao gồm JSON
  });
};

export const updateTactic = async (teamId: string, tacticId: string, data: UpdateTacticInput) => {
  // TỐI ƯU 2: Chỉ lấy ID để xác nhận sự tồn tại
  const existing = await prisma.tactic.findFirst({
    where: { id: tacticId, teamId },
    select: { id: true } 
  });

  if (!existing) {
    return null;
  }

  return prisma.tactic.update({
    where: { id: tacticId },
    data,
  });
};

export const deleteTactic = async (teamId: string, tacticId: string) => {
  // TỐI ƯU 2: Chỉ lấy ID để xác nhận sự tồn tại
  const existing = await prisma.tactic.findFirst({
    where: { id: tacticId, teamId },
    select: { id: true }
  });

  if (!existing) {
    return null;
  }

  return prisma.tactic.delete({
    where: { id: tacticId },
  });
};