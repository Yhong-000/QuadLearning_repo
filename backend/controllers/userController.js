import asyncHandler from 'express-async-handler';  
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';

// @desc    Auth user/set token
// route    POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    console.log('Input password:', password);

    // Check if user exists by username
    const user = await User.findOne({ username });
    if (!user) {
        console.log('Invalid username:', username);
        return res.status(401).json({ message: "Invalid username" });
    }

    console.log('Stored password:', user.password);

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
        console.log('Invalid password for username:', username);
        return res.status(401).json({ message: "Invalid password" });
    }

    // If credentials are valid, create a token and set it in a cookie
    generateToken(user._id, res); // Pass the user ID to generateToken

    res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
    });
});

// @desc    Logout user
// route    POST /api/users/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logout User' });
});

export {
    logoutUser,
    authUser
};