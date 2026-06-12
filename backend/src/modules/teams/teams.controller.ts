import { Response, NextFunction } from 'express';
import { TeamsService } from './teams.service';
import { AuthRequest } from '../../middlewares/auth.middleware'; 

const teamsService = new TeamsService();

export const getPendingTeams = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await teamsService.getPendingTeams(page, limit);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateTeamStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await teamsService.updateTeamStatus(id, status);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const createTeam = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coachId = req.user?.id;
    const teamId = req.user?.teamId ?? null;

    if (!coachId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    if (teamId) { res.status(403).json({ message: 'Forbidden: Coach already belongs to a team.' }); return; }

    const { name } = req.body;
    const result = await teamsService.createTeam(coachId, name);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const joinTeam = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const playerId = req.user!.id;
    const { inviteCode } = req.body;
    const result = await teamsService.joinTeam(playerId, inviteCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getRoster = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // TỐI ƯU HIỆU SUẤT: Lấy trực tiếp teamId từ Token, bỏ qua việc query DB tìm user
    const teamId = req.user?.teamId;
    
    if (!teamId) {
      res.status(200).json({ team: null, coach: null, players: [] });
      return;
    }

    const result = await teamsService.getRoster(teamId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};