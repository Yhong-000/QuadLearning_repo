import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Section from '../models/sectionModel.js';
import Strand from '../models/strandModel.js';
import Subject from '../models/subjectModel.js';
import Student from '../models/studentModel.js';
import Semester from '../models/semesterModel.js';
import YearLevel from '../models/yearLevelModel.js';
import ArchivedSemester from '../models/archiveSemesterModel.js';
import bcrypt from 'bcryptjs';

import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
// @desc    Create user accounts for teacher or student
// @route   POST /api/admin/users
// @access  Private (admin role)
const createUserAccount = asyncHandler(async (req, res) => {
    console.log('Received request body:', req.body);

    const { 
        username, 
        password, 
        role, 
        sections,
        subjects,
        strand,
        yearLevel,
        semester,     // for students
        semesters,    // for teachers
        advisorySection 
    } = req.body;

    

    // Basic validation for all users
    if (!username || !password || !role) {
        res.status(400);
        throw new Error('Please provide username, password, and role');
    }

    try {

       // Add debug logging for username check
       console.log('Checking username:', username.trim());
        
       // Check if username already exists before trying to create
       const existingUser = await User.findOne({ username: username.trim() });
       console.log('Existing user check result:', existingUser);

       if (existingUser) {
           console.log('Username exists:', existingUser.username);
           res.status(400);
           throw new Error('Username already exists');
       }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create base user object
        let userData = {
            username: username.trim(),
            password: hashedPassword,
            role: role
        };

        // Add role-specific fields
        if (role === 'teacher') {
            // Validate teacher-specific required fields
            if (!Array.isArray(sections) || sections.length === 0) {
                throw new Error('Sections are required for teachers');
            }
            if (!Array.isArray(subjects) || subjects.length === 0) {
                throw new Error('Subjects are required for teachers');
            }
            if (!Array.isArray(semesters) || semesters.length === 0) {
                throw new Error('Semesters are required for teachers');
            }

              // Create teacher user
        const user = await User.create({
            username: username.trim(),
            password: hashedPassword,
            role,
            sections,
            subjects,
            semesters,
            ...(advisorySection && { advisorySection })
        });

        console.log('Created teacher with sections:', sections);

        // Update sections with teacher assignment
        for (const sectionId of sections) {
            const updatedSection = await Section.findByIdAndUpdate(
                sectionId,
                { $addToSet: { teacher: user._id } },
                { new: true }
            );
            console.log('Updated section:', updatedSection); // Debug log
        }

            // Update all assigned subjects to include this teacher
            await Subject.updateMany(
                { _id: { $in: subjects } },
                { $addToSet: { teachers: user._id } }
            );

                // Update advisory section
            if (advisorySection) {
                await Section.findByIdAndUpdate(
                    advisorySection,
                    { advisoryClass: user._id }, // Matches the model field name 'advisoryClass'
                    { new: true }
                );
                console.log('Updated advisory section:', advisorySection);
            }

            // Fetch the fully populated user data
            const populatedUser = await User.findById(user._id)
                .select('-password')
                .populate('sections')
                .populate('subjects')
                .populate('semesters')
                .populate('advisorySection');

            res.status(201).json({
                success: true,
                data: populatedUser
            });

        } else if (role === 'student') {
            // Validate student-specific required fields
            if (!strand || !yearLevel || !semester) {
                throw new Error('Strand, year level, and semester are required for students');
            }

            // Add student fields
            Object.assign(userData, {
                strand,
                yearLevel,
                semester,
                sections: sections ? [sections[0]] : [], // Students only get one section
                subjects: subjects || [] // Add subjects for students
            });
        }

       

        console.log('Creating user with data:', userData);

        // Create the user
        const user = await User.create(userData);
        
        // Create associated student record if role is student
        let student;
        if (role === 'student') {
            student = await Student.create({
                user: user._id,
            });
        }

        const populatedStudent = student ? await Student.findById(student._id)
            .populate('userData')
            .populate('strand')
            .populate('section')
            : null;

        await Section.updateMany(
            { _id: { $in: sections } },
            { $addToSet: { students: user._id } }
        );
        // Populate fields based on role
        const populateFields = ['strand', 'sections'];
        if (role === 'teacher') {
            populateFields.push('subjects', 'semesters', 'advisorySection');
        } else if (role === 'student') {
            populateFields.push('yearLevel', 'semester');
        }

        // Fetch the created user with populated fields
        const populatedUser = await User.findById(user._id)
            .select('-password')
            .populate(populateFields);

        res.status(201).json({
            success: true,
            data: {populatedUser, populatedStudent}
        });

    } catch (error) {
        console.error('Error in createUserAccount:', error);
        res.status(400);
        if (error.code === 11000) {
            throw new Error('Username already exists');
        }
        throw new Error(error.message || 'Failed to create user');
    }
});
// @desc    Reset user password
// @route   PUT /api/admin/resetPassword/:id
// @access  Private (admin role)
const resetUserPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if user making request is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        res.status(403);
        throw new Error('Not authorized to reset passwords');
    }

    // Find the user whose password needs to be reset
    const user = await User.findById(id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.json({
        success: true,
        message: 'Password reset successful'
    });
});

// @desc    Get filtered user accounts by role, ordered by creation date
// @route   GET /api/admin/users/list
// @access  Private (admin role)
const getUserListByRole = asyncHandler(async (req, res) => {
    const { role } = req.query;
    
    const query = role ? { role } : {};
    
    try {
        const users = await User.find(query)
            .populate('strand', 'name')
            .populate('sections', 'name')
            .populate('subjects', 'name')
            .populate('yearLevel', 'name')
            .populate('semester', 'name')
            .populate({
                path: 'semesters',
                populate: [{
                    path: 'strand',
                    select: 'name'
                },
                {
                    path: 'yearLevel',
                    select: 'name'
                }]
            })
            .populate('advisorySection', 'name')  // Add this for teachers
            .select('-password');
        
        console.log('Fetched Users:', users); // Debug log
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500);
        throw new Error('Error fetching users');
    }
});

// @desc    Update user account
// @route   PUT /api/admin/users/:id
// @access  Private (admin role)
// Update the updateUserAccount controller as well
const updateUserAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        username,
        role,
        sections,
        subjects,
        strand,
        yearLevel,
        semester,     // for students
        semesters,    // for teachers
        advisorySection
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    try {
        let updateData = { username };

        if (user.role === 'teacher') {
            // Remove teacher from old sections
            if (user.sections?.length > 0) {
                await Section.updateMany(
                    { teacher: user._id },
                    { $pull: { teacher: user._id } }
                );
            }

            // Add teacher to new sections
            if (sections?.length > 0) {
                await Section.updateMany(
                    { _id: { $in: sections } },
                    { $addToSet: { teacher: user._id } }
                );
            }

            // Remove teacher from old subjects
            if (user.subjects?.length > 0) {
                await Subject.updateMany(
                    { teachers: user._id },
                    { $pull: { teachers: user._id } }
                );
            }

            // Add teacher to new subjects
            if (subjects?.length > 0) {
                await Subject.updateMany(
                    { _id: { $in: subjects } },
                    { $addToSet: { teachers: user._id } }
                );
            }

            // Handle advisory section update
            if (user.advisorySection) {
                // Remove from old advisory section
                await Section.findByIdAndUpdate(
                    user.advisorySection,
                    { $unset: { advisoryClass: "" } }
                );
            }

            // Set new advisory section if provided
            if (advisorySection) {
                await Section.findByIdAndUpdate(
                    advisorySection,
                    { advisoryClass: user._id }
                );
            }

            updateData = {
                ...updateData,
                sections,
                subjects,
                semesters,
                advisorySection: advisorySection || null
            };

        } else if (role === 'student') {
            // Handle student-specific updates
            if (sections) {
                // Remove from old sections
                await Section.updateMany(
                    { students: user._id },
                    { $pull: { students: user._id } }
                );
                
                // Add to new section (students only get one section)
                await Section.findByIdAndUpdate(
                    sections[0],
                    { $addToSet: { students: user._id } }
                );
            }

            updateData = {
                ...updateData,
                strand,
                yearLevel,
                semester,
                sections: sections ? [sections[0]] : user.sections,
                subjects: subjects || user.subjects
            };
        }

        // Update user with new data
        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate([
            'strand',
            'sections',
            'subjects',
            'yearLevel',
            'semester',
            'semesters',
            'advisorySection'
        ]);

        res.json({
            success: true,
            data: updatedUser
        });

    } catch (error) {
        console.error('Update error:', error);
        res.status(400);
        throw new Error(`Failed to update user: ${error.message}`);
    }
});

// @desc    Delete user account
// @route   DELETE /api/admin/users/:id
// @access  Private (admin role)
// Also update the deleteUserAccount controller to remove the student from the section
const deleteUserAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // First find the user to get their sections
        const user = await User.findById(id);
        
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        // If user is a student and has sections, remove them from all sections
        if (user.role === 'student' && user.sections && user.sections.length > 0) {
            console.log('Removing student from sections:', user.sections);
            
            // Remove student from each section they're in
            await Promise.all(user.sections.map(async (sectionId) => {
                await Section.findByIdAndUpdate(
                    sectionId,
                    { $pull: { students: user._id } },
                    { new: true }
                );
            }));
        } else if(user.role === 'teacher') {
            // Remove teacher from all assigned sections
            await Section.updateMany(
                { teacher: user._id },
                { $pull: { teacher: user._id } }
            );

            // Remove teacher from all subjects
            await Subject.updateMany(
                { teachers: user._id },
                { $pull: { teachers: user._id } }
            );

            // Clear advisory section assignment
            await Section.updateMany(
                { advisorySection: user._id },
                { $unset: { advisorySection: "" } }
            );
        }

        // Then delete the user
        await User.findByIdAndDelete(id);
        
        res.json({ 
            message: 'User account and related data deleted successfully',
            deletedUserId: id 
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500);
        throw new Error(`Failed to delete user: ${error.message}`);
    }
});
// @desc    Get all user accounts
// @route   GET /api/admin/users
// @access  Private (admin role)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
        .select('-password') // Exclude the password field
        .populate('strand', 'name') // Replace `strand` ID with the document, selecting only the `name` field
        .populate('sections', 'name') // Replace `section` ID with the document, selecting only the `name` field
        .populate('subjects', 'name'); // Replace `subjects` IDs with documents, selecting only the `name` field
    res.json(users);
});


// @desc    Get all strands
// @route   GET /api/admin/strands
// @access  Private (admin role)
const getAllStrands = asyncHandler(async (req, res) => {
    const strands = await Strand.find();
    res.json(strands);
});

// @desc    Get all sections
// @route   GET /api/admin/sections
// @access  Private (admin role)
const getAllSections = asyncHandler(async (req, res) => {
    const sections = await Section.find()
        .populate('strand', 'name') // Populate strand name
        .populate('yearLevel', 'name') // Add this line to populate year level name
        .populate('advisoryClass', 'username'); // If you need advisor info
    res.json(sections);
});

// @desc    Get all subjects
// @route   GET /api/admin/subjects
// @access  Private (admin role)
const getAllSubjects = asyncHandler(async (req, res) => {
    const subjects = await Subject.find()
        .populate({
            path: 'semester',
            populate: {
                path: 'strand',
                select: 'name'
            }
        })
        .populate('strand', 'name')
        .populate('yearLevel', 'name')
        .populate('teachers', 'username');
    res.json(subjects);
});




// @desc    Create a new strand
// @route   POST /api/admin/strands
// @access  Private (admin role)
const createStrand = asyncHandler(async (req, res) => {

    const { name, description } = req.body;

    const strandExists = await Strand.findOne({ name });
    if (strandExists) {
        res.status(400);
        throw new Error('Strand already exists');
    }


    // Create a new strand with only name and description
    const newStrand = await Strand.create({
        name,
        description
    });

    if (!newStrand) {
        res.status(400);
        throw new Error('Failed to create strand');
    }

    // Respond with the newly created strand
    res.status(201).json(newStrand);

});

// @desc    Update a strand
// @route   PUT /api/admin/strands/:id
// @access  Private (admin role)
const updateStrand = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { id } = req.params;

    const strand = await Strand.findById(id);
    if (!strand) {
        res.status(404);
        throw new Error('Strand not found');
    }

    strand.name = name;
    strand.description = description;
    const updatedStrand = await strand.save();

    res.json(updatedStrand);
});

// @desc    Delete a strand
// @route   DELETE /api/admin/strands/:id
// @access  Private (admin role)
const deleteStrand = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const strand = await Strand.findById(id);
    if (!strand) {
        res.status(404);
        throw new Error('Strand not found');
    }

    await Strand.findByIdAndDelete(id);
    res.json({ message: 'Deleted successfully' });
});

// @desc    Create a new section
// @route   POST /api/admin/sections
// @access  Private (admin role)
const createSection = asyncHandler(async (req, res) => {
    const { name, strand, yearLevel } = req.body;
    
    console.log('Received yearLevel:', yearLevel);

    // Validate ObjectId format
    if (!ObjectId.isValid(yearLevel)) {
        res.status(400);
        throw new Error(`Invalid yearLevel ID format: ${yearLevel}`);
    }

    // Try to find the year level
    const yearLevelRecord = await YearLevel.findById(yearLevel);
    console.log('Found yearLevel:', yearLevelRecord);

    if (!yearLevelRecord) {
        res.status(404);
        throw new Error(`Year level not found with ID: ${yearLevel}`);
    }

    const strandRecord = await Strand.findById(strand);
    if (!strandRecord) {
        res.status(404);
        throw new Error('Strand not found');
    }

    try {
        // Create new section
        const newSection = await Section.create({
            name,
            strand: strandRecord._id,
            yearLevel: yearLevelRecord._id
        });

        // Populate the section before sending response
        const populatedSection = await Section.findById(newSection._id)
            .populate('strand', 'name')
            .populate('yearLevel', 'name');

        res.status(201).json(populatedSection);

    } catch (error) {
        console.error('Error creating section:', error);
        res.status(400);
        throw new Error(`Failed to create section: ${error.message}`);
    }
});

// @desc    Update a section
// @route   PUT /api/admin/sections/:id
// @access  Private (admin role)
const updateSection = asyncHandler(async (req, res) => {
    const { name, strand, yearLevel } = req.body;
    const { id } = req.params;

    // Find existing section
    const section = await Section.findById(id);
    if (!section) {
        res.status(404);
        throw new Error('Section not found');
    }

    // Find year level record
    const yearLevelRecord = await YearLevel.findOne({ name: yearLevel });
    if (!yearLevelRecord) {
        res.status(404);
        throw new Error('Year level not found');
    }

    // Update section
    const updatedSection = await Section.findByIdAndUpdate(
        id,
        {
            name: name || section.name,
            strand: strand || section.strand,
            yearLevel: yearLevelRecord._id // Use the year level record's ID
        },
        { new: true }
    ).populate('strand').populate('yearLevel');

    res.json(updatedSection);
});

// @desc    Delete a section
// @route   DELETE /api/admin/sections/:id
// @access  Private (admin role)
const deleteSection = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const section = await Section.findById(id);
    if (!section) {
        res.status(404);
        throw new Error('Section not found');
    }

    await Section.findByIdAndDelete(id);
    res.json({ message: 'Section deleted successfully' });
});

// @desc    Create a new subject
// @route   POST /api/admin/subjects
// @access  Private (admin role)
const createSubject = asyncHandler(async (req, res) => {
    const { name, code, strand, semester, yearLevel } = req.body;

    // Validate required fields
    if (!name || !code || !strand || !semester || !yearLevel) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }


    // Find the semester and strand documents
    const semesterDoc = await Semester.findById(semester).populate('strand');
    const strandDoc = await Strand.findById(strand);

    if (!semesterDoc || !strandDoc) {
        res.status(404);
        throw new Error('Semester or Strand not found');
    }

    try {
        // Create subject
        const subject = await Subject.create({
            name,
            code,
            strand,
            semester,
            yearLevel,
            displayName: `${name} - ${semesterDoc.strand.name}`
        });

        // Update semester with new subject
        await Semester.findByIdAndUpdate(
            semester,
            { $push: { subjects: subject._id } }
        );
        // Populate the references for response
        const populatedSubject = await Subject.findById(subject._id)
            .populate('strand', 'name')
            .populate({
                path: 'semester',
                populate: {
                    path: 'strand',
                    select: 'name'
                }
            })
            .populate('yearLevel', 'name');

        res.status(201).json({
            success: true,
            data: populatedSubject,
            message: 'Subject created and associated successfully'
        });

    } catch (error) {
        // If something goes wrong, we should clean up any partial creation
        if (subject) {
            await Subject.findByIdAndDelete(subject._id);
        }
        res.status(400);
        throw new Error(`Failed to create subject: ${error.message}`);
    }
});

const filterSubjects = asyncHandler(async (req, res) => {
    const { sections, semesters } = req.body; // Changed from semester to semesters


    if (!sections.length || !semesters.length) {
        return res.status(400).json({ message: 'Sections and semesters are required' });
    }


    try {
        // Get all sections data to access their strand and year level
        const sectionsData = await Section.find({ _id: { $in: sections } });
        
        // Extract unique strands and year levels from sections
        const strands = [...new Set(sectionsData.map(section => section.strand))];
        const yearLevels = [...new Set(sectionsData.map(section => section.yearLevel))];

        // Find subjects that match the criteria
        const filteredSubjects = await Subject.find({
            strand: { $in: strands },
            yearLevel: { $in: yearLevels },
            semester: { $in: semesters } // Changed to use $in operator for multiple semesters
        }).populate('strand yearLevel semester');

        res.json(filteredSubjects);
    } catch (error) {
        res.status(500);
        throw new Error(`Error filtering subjects: ${error.message}`);
    }

});


// @desc    Update a subject
// @route   PUT /api/admin/subjects/:id
// @access  Private (admin role)
const updateSubject = asyncHandler(async (req, res) => {
    const { name, code, semester, yearLevel, strand, } = req.body;
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
    }

    subject.name = name;
    subject.strand = strand;
    subject.yearLevel = yearLevel;
    subject.code = code;
    subject.semester = semester;
    const updatedSubject = await subject.save();

    res.json(updatedSubject);
});

// @desc    Delete a subject
// @route   DELETE /api/admin/subjects/:id
// @access  Private (admin role)
const deleteSubject = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
    }

    // Remove the subject reference from the semester's subjects array
    await Semester.findByIdAndUpdate(
        subject.semester,
        { 
            $pull: { subjects: subject._id }  // Remove the subject ID from the subjects array
        }
    );

    // Delete the subject
    await Subject.findByIdAndDelete(id);

    res.json({ 
        success: true,
        message: 'Subject deleted successfully' 
    });
});

// @desc    Create a new semester
// @route   POST /api/admin/semesters
// @access  Private (admin role)
const createSemester = asyncHandler(async (req, res) => {
    const { name, strand, startDate, endDate, yearLevel } = req.body;

    // Validate required fields
    if (!name || !strand || !startDate || !endDate || !yearLevel) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    const newSemester = await Semester.create({
        name,
        strand,
        startDate,
        endDate,
        yearLevel
    });

    // Populate the strand before sending response
    const populatedSemester = await Semester.findById(newSemester._id)
        .populate('strand', 'name');

    res.status(201).json(populatedSemester);
});

// @desc    Get all strands
// @route   GET /api/admin/strands
// @access  Private (admin role)
const getAllSemesters = asyncHandler(async (req, res) => {
    const semesters = await Semester.find()
        .populate('strand', 'name') // Populate the strand field
        .populate('yearLevel', 'name') // Populate the year level field
        .sort({ createdAt: -1 });

          // Transform the data to include the combined name
    const formattedSemesters = semesters.map(semester => ({
        ...semester._doc,
        displayName: `${semester.name} - ${semester.strand.name}`
    }));
    res.json(formattedSemesters);
});


const getSemestersForArchiving = asyncHandler(async () => {
    try {
        // Fetch semesters and their end dates from the database
        const semesters = await Semester.find()
            .select('name startDate endDate')  // Select only the name and endDate fields
            .sort({ createdAt: -1 }); // Sort by creation date (optional)

        // Check if there are any semesters
        if (!semesters || semesters.length === 0) {
            console.log('No semesters found for archiving');
            return [];  // Return empty array if no semesters found
        }

        // Return the fetched semesters
        return semesters;
    } catch (error) {
        console.error('Error fetching semesters for archiving:', error);
        throw error;  // Rethrow error to be caught in the cron job
    }
});

// @desc    Update a semester
// @route   PUT /api/admin/semesters/:id
// @access  Private (admin role)
const updateSemester = asyncHandler(async (req, res) => {
    const { name, startDate, endDate, yearLevel } = req.body;
    const { id } = req.params;

    const semester = await Semester.findById(id);
    if (!semester) {
        res.status(404);
        throw new Error('Semester not found');
    }

    // Validate dates if they're being updated
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            res.status(400);
            throw new Error('End date must be after start date');
        }
    }

    // Update the semester
    const updatedSemester = await Semester.findByIdAndUpdate(
        id,
        { 
            name: name || semester.name,
            startDate: startDate || semester.startDate,
            endDate: endDate || semester.endDate,
            yearLevel: yearLevel || semester.yearLevel
        },
        { 
            new: true,
            runValidators: true
        }
    ).populate('strand', 'name');

    if (!updatedSemester) {
        res.status(404);
        throw new Error('Semester not found');
    }

    res.json(updatedSemester);
});

// @desc    Delete a semester
// @route   DELETE /api/admin/semesters/:id
// @access  Private (admin role)
const deleteSemester = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const semester = await Semester.findById(id);
    if (!semester) {
        res.status(404);
        throw new Error('Semester not found');
    }

    await Semester.findByIdAndDelete(id);
    res.json({ message: 'Semester deleted successfully' });
});

// @desc    Initialize year levels
// @route   POST /api/admin/yearLevels/init
// @access  Private (admin role)
const initializeYearLevels = asyncHandler(async (req, res) => {
    // Check if year levels already exist
    const existingYearLevels = await YearLevel.find();
    if (existingYearLevels.length > 0) {
        return res.status(200).json({ message: 'Year levels already initialized' });
    }

    // Create both year levels
    const yearLevels = await YearLevel.create([
        { name: 'Grade 11', description: 'First year senior high' },
        { name: 'Grade 12', description: 'Second year senior high' }
    ]);

    res.status(201).json({
        success: true,
        data: yearLevels,
        message: 'Year levels initialized successfully'
    });
});

// @desc    Get all year levels
// @route   GET /api/admin/yearLevels
// @access  Private (admin role)
const getAllYearLevels = asyncHandler(async (req, res) => {
    const yearLevels = await YearLevel.find();
    res.json(yearLevels);
});

const getAvailableAdvisorySections = asyncHandler(async (req, res) => {
    try {
        // Get all sections
        const allSections = await Section.find();
        
        // Get sections that are already assigned as advisory sections
        const assignedSections = await User.find(
            { role: 'teacher', advisorySection: { $ne: null } },
            'advisorySection'
        );
        
        // Create a Set of assigned section IDs for quick lookup
        const assignedSectionIds = new Set(
            assignedSections.map(user => user.advisorySection.toString())
        );
        
        // Filter out sections that are already assigned
        const availableSections = allSections.map(section => ({
            _id: section._id,
            name: section.name,
            hasAdviser: assignedSectionIds.has(section._id.toString())
        }));

        res.json(availableSections);
    } catch (error) {
        res.status(500);
        throw new Error('Error fetching available advisory sections');
    }
});



// Exporting functions
export { 
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    resetUserPassword,
    createSemester,
    updateSemester,
    deleteSemester,
    createStrand,
    updateStrand,
    deleteStrand,
    createSection,
    updateSection,
    deleteSection,
    createSubject,
    updateSubject,
    deleteSubject, 
    getAllUsers,
    getAllStrands,
    getAllSections,
    getAllSubjects,
    getAllSemesters,
    getUserListByRole,
    initializeYearLevels,
    getAllYearLevels,
    filterSubjects,
    getAvailableAdvisorySections,
    getSemestersForArchiving
};