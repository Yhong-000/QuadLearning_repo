import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js'; // Assuming this is the correct path for your User model
import bcrypt from 'bcryptjs';

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected...');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    });

// Predefined teacher data
const predefinedTeachers = [
    {
        username: 'teacher001',
        password: 'password123', // In a real app, this should be hashed
        name: 'John Doe',
        role: 'teacher',
        subject: '',
        sectionId: '',  // You can leave this blank or assign a section after creation
        profileCompleted: true,
        isActive: true
    },
    {
        username: 'teacher002',
        password: 'password456',
        name: 'Jane Smith',
        role: 'teacher',
        subject: '',
        sectionId: '', // Same here
        profileCompleted: true,
        isActive: true
    },
    {
        username: 'teacher003',
        password: 'password789',
        name: 'Michael Johnson',
        role: 'teacher',
        subject: '',
        sectionId: '', // Same here
        profileCompleted: true,
        isActive: true
    },
    // Add more teachers here as needed
];

// Function to create predefined teachers
const createPredefinedTeachers = async () => {
    try {
        for (let teacher of predefinedTeachers) {
            // Hash the password before saving to the database
            const salt = await bcrypt.genSalt(10);
            teacher.password = await bcrypt.hash(teacher.password, salt);

            // Create the teacher record in the database
            const createdTeacher = await User.create(teacher);
            console.log(`Teacher ${createdTeacher.name} created successfully`);
        }

        // Disconnect after all teachers are created
        mongoose.connection.close();
    } catch (error) {
        console.error('Error creating teachers:', error);
        mongoose.connection.close();
    }
};

// Run the function to create predefined teachers
export { createPredefinedTeachers };