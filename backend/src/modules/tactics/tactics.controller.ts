import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as tacticService from './tactics.service';

export const createTacticHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const tactic = await tacticService.createTactic(teamId, req.body);
    res.status(201).json({ success: true, data: tactic });
  } catch (error) {
    next(error);
  }
};

export const getTeamTacticsHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await tacticService.getTacticsByTeam(teamId, page, limit);
    // ĐÃ FIX: Tách data và meta rõ ràng để frontend đọc được Array
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const getTacticByIdHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const tactic = await tacticService.getTacticById(teamId, id);
    if (!tactic) {
      res.status(404).json({ message: 'Không tìm thấy chiến thuật.' });
      return;
    }

    res.status(200).json({ success: true, data: tactic });
  } catch (error) {
    next(error);
  }
};

export const updateTacticHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const tactic = await tacticService.updateTactic(teamId, id, req.body);
    if (!tactic) {
      res.status(404).json({ message: 'Không tìm thấy chiến thuật.' });
      return;
    }

    res.status(200).json({ success: true, data: tactic });
  } catch (error) {
    next(error);
  }
};

export const deleteTacticHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const deleted = await tacticService.deleteTactic(teamId, id);
    if (!deleted) {
      res.status(404).json({ message: 'Không tìm thấy chiến thuật.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Xóa thành công' });
  } catch (error) {
    next(error);
  }
};