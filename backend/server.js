import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import { createPredefinedSuperAdmin } from './createSAdmin.js';
import adminRoutes from './routes/adminRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import semesterRoutes from './routes/semesterRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import cron from 'node-cron';
import moment from 'moment'; 
import Semester from './models/semesterModel.js'
import { getSemestersForArchiving } from './controllers/adminController.js';
import ArchivedSemester from './models/archiveSemesterModel.js'; 



// Create the predefined accounts
import { createPredefinedStudents } from './createStudent.js';
import { createPredefinedSemester } from './createSemester.js'; 
import { createPredefinedTeachers } from './createTeacher.js'; 
import { createPredefinedSubjects } from './createSubject.js';
import { createPredefinedSection } from './createSection.js';
import { createPredefinedAdmin } from './createAdmin.js';
import { createPredefinedRStudent } from './createRStudent.js';


dotenv.config(); // Load environment variables
const port = process.env.PORT || 5000;

const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.json()); // For parsing application/json
app.use(cookieParser()); // Middleware for parsing cookies


// Connect to the database
connectDB()
    .then(() => {
        console.log('Connected to MongoDB');

        /*cron.schedule('* * * * *', async () => {
            console.log("Cron job triggered");
        
            try {
                // Fetch semesters for archiving, including strand and yearLevel populated
                const semesters = await Semester.find()
                    .populate('strand', 'name')  // Populate strand name
                    .populate('yearLevel', 'name')  // Populate yearLevel name
                    .select('name strand yearLevel startDate endDate'); // Select relevant fields
        
                console.log(`Fetched ${semesters.length} semesters`);
        
                const currentDate = moment().startOf('day');  // Using startOf to ignore the time component
                console.log(`Current Date: ${currentDate.format('YYYY-MM-DD')}`);
        
                for (const semester of semesters) {
                    const endDate = moment(semester.endDate).startOf('day');  // Ensure we're comparing the date part only
                    console.log(`Checking semester: ${semester.name}, End Date: ${endDate.format('YYYY-MM-DD')}`);
        
                    // Check if the current date is after the semester's end date
                    if (currentDate.isAfter(endDate)) {
                        console.log(`Archiving semester: ${semester.name}`);
        
                        try {
                            const archivedSemester = new ArchivedSemester({
                                name: semester.name,
                                strand: semester.strand,
                                yearLevel: semester.yearLevel,
                                startDate: semester.startDate,
                                endDate: semester.endDate,
                            });
                        
                            const result = await archivedSemester.save();
                            console.log('Archived semester saved successfully:', result);
                            await Semester.deleteOne({ _id: semester._id });
                            console.log(`Successfully deleted semester: ${semester.name}`);
                        } catch (error) {
                            console.error('Error saving archived semester:', error);
                        }
                    } else {
                        console.log(`Skipping semester: ${semester.name}, not past end date.`);
                    }
                }
            } catch (error) {
                console.error('Error during cron job execution:', error);
            }
        });*/
        
        
   
        // Create the predefined accounts (uncomment if needed)
        // createPredefinedSuperAdmin();
        // createPredefinedStudents();
        // createPredefinedSemester();
        // createPredefinedTeachers();
        // createPredefinedSubjects();
        // createPredefinedSection();
        // createPredefinedAdmin();
        // createPredefinedRStudent();


        // Start the server
        app.listen(port, () => {
            console.log(`Server started on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit if the server cannot start
    });

// Routes
app.use('/api/users', userRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/student', studentRoutes);

// Basic route
app.get('/', (req, res) => res.send('Server is ready'));

// Error handling middleware
app.use(notFound);
app.use(errorHandler);