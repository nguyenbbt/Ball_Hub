import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createItem, deleteItem, getInventory, updateItem } from './inventory.controller';

export const inventoryRouter = Router();

inventoryRouter.get('/', authMiddleware, getInventory);
inventoryRouter.post('/', authMiddleware, createItem);
inventoryRouter.put('/:id', authMiddleware, updateItem);
inventoryRouter.delete('/:id', authMiddleware, deleteItem);
