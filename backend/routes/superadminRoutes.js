import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    createAdminAccount,
    updateAdminAccount,
    deleteAdminAccount,
} from '../controllers/superadminController.js'; // Adjust the import path as necessary

const router = express.Router();

// @desc    Create a new admin account
// @route   POST /api/superadmin
// @access  Private/Superadmin
router.post('/', protect, authorizeRoles('superadmin'), createAdminAccount);

// @desc    Update an admin account
// @route   PUT /api/superadmin/:id
// @access  Private/Superadmin
router.put('/:id', protect, authorizeRoles('superadmin'), updateAdminAccount);

// @desc    Delete an admin account
// @route   DELETE /api/superadmin/:id
// @access  Private/Superadmin
router.delete('/:id', protect, authorizeRoles('superadmin'), deleteAdminAccount);

export default router;