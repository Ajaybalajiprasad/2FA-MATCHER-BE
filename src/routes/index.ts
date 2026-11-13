import { Router } from 'express';
import metaRoutes from './metaRoutes';

const router: Router = Router();

router.use('/meta', metaRoutes);

export default router;
