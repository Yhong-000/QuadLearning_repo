import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Section from '../models/sectionModel.js';
import Student from '../models/studentModel.js';
import Subject from '../models/subjectModel.js';
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

// Derive __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)


// @desc    Fill out or update a student form
// @route   PUT /api/teachers/student/:studentId/form
// @access  Private (teacher role)
const fillOutStudentForm = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const teacherId = req.user._id; // Authenticated teacher's ID


      // First get the user to get their section
      const user = await User.findById(studentId)
      .populate('sections')
      .populate('strand')
      .populate('yearLevel')

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Get the user's first section
    const userSection = user.sections?.[0];
    if (!userSection) {
        res.status(400);
        throw new Error('Student not assigned to any section');
    }

    // Fetch teacher's assigned sections
    const teacherSections = await Section.find({ teacher: teacherId });
    
    // Check if teacher is authorized for this section
    const isAuthorized = teacherSections.some(section => 
        section._id.toString() === userSection._id.toString()
    );


    if (!isAuthorized) {
        res.status(403);
        throw new Error('Not authorized to update this student');
    }


    // Find the student record
    const student = await Student.findOne({ user: studentId });
    if (!student) {
        res.status(404);
        throw new Error('Student record not found');
    }


    // Update fields based on the student model
    const {
        firstName,
        lastName,
        middleInitial,
        gender,
        birthdate,
        birthplace,
        address,
        guardian,
        school,
        attendance,
        contactNumber,
    } = req.body;

    // Update basic information

    if (firstName) student.firstName = firstName;
    if (lastName) student.lastName = lastName;
    if (middleInitial) student.middleInitial = middleInitial;
    if (gender) student.gender = gender;
    if (birthdate) student.birthdate = birthdate;
    if (birthplace) student.birthplace = birthplace;
    if (address) student.address = address;
    if (guardian) student.guardian = { ...student.guardian, ...guardian };
    if (school) student.school = { ...student.school, ...school };
    if (attendance) student.attendance = { ...student.attendance, ...attendance };
    if (contactNumber) student.contactNumber = contactNumber;

    // Update academic information from the User model
    student.yearLevel = user.yearLevel?._id;
    student.section = user.sections?.[0]?._id;
    student.strand = user.strand?._id;

    // Save the student
    await student.save();

    // Fetch the updated student with populated fields
    const updatedStudent = await Student.findOne({ user: studentId })
        .populate('yearLevel')
        .populate('section')
        .populate('strand');

    res.status(200).json({
        success: true,
        message: 'Student profile updated successfully',
        student: {
            firstName: updatedStudent.firstName,
            lastName: updatedStudent.lastName,
            middleInitial: updatedStudent.middleInitial,
            gender: updatedStudent.gender,
            birthdate: updatedStudent.birthdate,
            birthplace: updatedStudent.birthplace,
            address: updatedStudent.address,
            guardian: updatedStudent.guardian,
            school: updatedStudent.school,
            attendance: updatedStudent.attendance,
            contactNumber: updatedStudent.contactNumber,
            yearLevel: updatedStudent.yearLevel?.name,
            section: updatedStudent.section?.name,
            strand: updatedStudent.strand?.name,
        }

    });
});


// @desc    Get grades for a specific student
// @route   GET /api/grades/student/:studentId
// @access  Private (teacher role)
const getGradesByStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    // Check if the user making the request is a teacher
    if (req.user.role !== 'teacher') {
        res.status(403);
        throw new Error('Not authorized to view grades');
    }

    // Verify if the teacher is assigned to the same section as the student
    const teacherSections = await Section.find({ teacherId: req.user._id });
    const student = await User.findById(studentId).populate('sectionId'); // Ensure section info is populated

    if (!student || student.role !== 'student' || !student.isActive) {
        res.status(404);
        throw new Error('Current student not found or inactive');
    }

    // Check if the student is in any of the teacher's sections
    const isAssignedToSection = teacherSections.some(section => section._id.equals(student.sectionId._id));

    if (!isAssignedToSection) {
        res.status(403);
        throw new Error('Not authorized to view grades for this student');
    }

    // Fetch grades for the active student
    const grades = await Grade.find({ studentId }).populate('subject').sort({ year: 1 });

    if (!grades.length) {
        res.status(404);
        throw new Error('No grades found for this student');
    }

    res.json(grades);
});

// @desc    Import students from Excel file
// @route   POST /api/teachers/student/import
// @access  Private (teacher role)
const importStudents = asyncHandler(async (req, res) => {
    // Check if the file is uploaded
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer); // Load the Excel file from the buffer

    // Access the first sheet in the Excel workbook
    const worksheet = workbook.worksheets[0];

    const students = [];

    // Iterate over each row in the worksheet
    worksheet.eachRow((row, rowIndex) => {
        // Skip the first row if it's the header row
        if (rowIndex === 1) return;

        // Get the data from each row
        const [
            firstName,
            lastName,
            middleInitial,
            gender,
            birthdate,
            province,
            municipality,
            barrio,
            address,
            guardianName,
            guardianOccupation,
            yearLevel,
            sectionId,
            strandId,
            schoolName,
            schoolYear,
            totalYears,
            contactNumber,
        ] = row.values; // Use row.values to get the values from the current row

        // Validate required fields (simplified example)
        if (!firstName || !lastName || !gender || !birthdate || !yearLevel) {
            return; // Skip invalid rows
        }

        // Push the student data into the students array
        students.push({
            firstName,
            lastName,
            middleInitial,
            gender,
            birthdate: new Date(birthdate),
            birthplace: { province, municipality, barrio },
            address,
            guardian: { name: guardianName, occupation: guardianOccupation },
            yearLevel,
            section: sectionId,
            strand: strandId,
            school: { name: schoolName, year: schoolYear },
            attendance: { totalYears },
            contactNumber,
        });
    });

    // Insert the students into the database
    await Student.insertMany(students);

    res.status(201).json({ message: 'Students imported successfully' });
});


// @desc    Add grade for a student
// @route   POST /api/teacher/grades
// @access  Private (teacher role)
const addGrade = asyncHandler(async (req, res) => {
    const { studentId, subjectId, gradeType, gradeValue, semesterId } = req.body;
  
    // Validate input
    if (!studentId || !subjectId || !gradeType || !semesterId) {
      res.status(400);
      throw new Error("All fields are required");
    }
  
    if (gradeValue < 0 || gradeValue > 100) {
      res.status(400);
      throw new Error("Grade must be between 0 and 100");
    }
  
    try {
      // Step 1: Find and update or upsert the semester
      const student = await Student.findOneAndUpdate(
        { user: studentId },
        {
          $setOnInsert: { grades: [] }, // Initialize grades if the student doesn't have it
        },
        { new: true, upsert: true }
      );
  
      if (!student) {
        res.status(404);
        throw new Error("Student not found");
      }
  
      // Check if the semester exists
      const semesterIndex = student.grades.findIndex(
        (g) => g.semester.toString() === semesterId
      );
  
      if (semesterIndex === -1) {
        // Add the new semester
        student.grades.push({
          semester: semesterId,
          subjects: [],
        });
      }
  
      // Check if the subject exists
      const subjectIndex = student.grades[semesterIndex]?.subjects.findIndex(
        (s) => s.subject.toString() === subjectId
      );
  
      if (subjectIndex === -1) {
        // Add the new subject
        student.grades[semesterIndex].subjects.push({
          subject: subjectId,
          midterm: gradeType === "midterm" ? gradeValue : null,
          finals: gradeType === "finals" ? gradeValue : null,
          finalRating: null,
          action: null,
        });
      } else {
        // Update the existing subject
        const subject = student.grades[semesterIndex].subjects[subjectIndex];
        if (gradeType === "midterm") subject.midterm = gradeValue;
        if (gradeType === "finals") subject.finals = gradeValue;
  
        // Recalculate final rating and action
        if (subject.midterm !== null && subject.finals !== null) {
          subject.finalRating = (subject.midterm + subject.finals) / 2;
          subject.action = subject.finalRating >= 75 ? "PASSED" : "FAILED";
        }
      }
  
      // Save the updated document
      await student.save();
  
      res.status(200).json({
        success: true,
        data: {
          studentId,
          subjectId,
          gradeType,
          gradeValue,
        },
      });
    } catch (error) {
      console.error("Error saving grade:", error);
  
      // Handle specific versioning error
      if (error.name === "VersionError") {
        res.status(409);
        throw new Error(
          "Version conflict detected. Please retry the operation."
        );
      }
  
      res.status(500);
      throw new Error("Error saving grade: " + error.message);
    }
  });
// @desc    Update grade for a student
// @route   PUT /api/grades/:id
// @access  Private (teacher role)
const updateGrade = asyncHandler(async (req, res) => {
    const { subject, grade, year } = req.body;
    const { id } = req.params; // Get the grade ID from the URL

    // Check if the user making the request is a teacher
    if (req.user.role !== 'teacher') {
        res.status(403);
        throw new Error('Not authorized to update grades');
    }

    // Find the grade to update
    const existingGrade = await Grade.findById(id);

    if (!existingGrade) {
        res.status(404);
        throw new Error('Grade not found');
    }

    // Validate grade value
    if (grade < 0 || grade > 100) {
        res.status(400);
        throw new Error('Grade must be between 0 and 100');
    }

    // Update the grade details
    existingGrade.subject = subject || existingGrade.subject;
    existingGrade.grade = grade || existingGrade.grade;
    existingGrade.year = year || existingGrade.year;

    const updatedGrade = await existingGrade.save();

    res.json(updatedGrade);
});

// @desc    Delete a grade for a student
// @route   DELETE /api/grades/:id
// @access  Private (teacher role)
const deleteGrade = asyncHandler(async (req, res) => {
    const { id } = req.params; // Get the grade ID from the URL

    // Check if the user making the request is a teacher
    if (req.user.role !== 'teacher') {
        res.status(403);
        throw new Error('Not authorized to delete grades');
    }

    // Find the grade to delete
    const existingGrade = await Grade.findById(id);

    if (!existingGrade) {
        res.status(404);
        throw new Error('Grade not found');
    }

    // Delete the grade
    await existingGrade.remove();

    res.json({ message: 'Grade removed' });
});


// @desc    Generate Form 137 for a student
// @route   GET /api/grades/form137/:studentId
// @access  Private (teacher role)

const generateForm137 = asyncHandler(async (req, res, next) => {
    try {
        const { studentId } = req.params;

        // Fetch the student data with necessary relationships populated
        const student = await Student.findById(studentId)
        .populate([
            { path: 'user' },
            { path: 'yearLevel' },
            { path: 'section' },
            { path: 'strand' },
            {
                path: 'grades',
                populate: [
                    { path: 'semester' },
                    { path: 'subjects.subject', model: 'Subject' }
                ]
            }
        ])
        .lean();

        if (!student) {
            res.status(404);
            throw new Error('Student not found');
        }

        // Compute full name dynamically
        const fullName = `${student.firstName} ${student.middleInitial ? student.middleInitial + '.' : ''} ${student.lastName}`.trim();
        const sanitizedStudentName = fullName.replace(/[\/\\?%*:|"<>]/g, '_');

        // Set up PDF document
        const doc = new PDFDocument({ size: 'A4', margin: 30 });
        const pdfDirectory = path.join(__dirname, '../../pdfs');

        if (!fs.existsSync(pdfDirectory)) {
            fs.mkdirSync(pdfDirectory, { recursive: true });
        }

        const filePath = path.join(pdfDirectory, `form137-${sanitizedStudentName}.pdf`);
        const writeStream = fs.createWriteStream(filePath);

        // Configure PDF response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=form137-${sanitizedStudentName}.pdf`);

        doc.pipe(res);
        doc.pipe(writeStream);

        // Start PDF content
        doc.font('Helvetica');

        // Header Section
        const leftImagePath = path.join(__dirname, '../../frontend/img/DepED.png');
        const rightImagePath = path.join(__dirname, '../../frontend/img/TVNHS.png');

        if (fs.existsSync(leftImagePath)) {
            doc.image(leftImagePath, 95, 20, { width: 65, height: 65 });
        } else {
            console.error('Left image not found:', leftImagePath);
        }
        
        // Right image
        if (fs.existsSync(rightImagePath)) {
            doc.image(rightImagePath, 455, 20, { width: 65, height: 65 });
        } else {
            console.error('Right image not found:', rightImagePath);
        }
  
        doc.fontSize(16).text('Republic of the Philippines', 50, 20, { align: 'center' });
        doc.fontSize(14).text('Department of Education', 50, 40, { align: 'center' });
        doc.fontSize(12).text('Senior High School Student Permanent Record', 50, 60, { align: 'center' });
        doc.moveDown();

        doc.fontSize(15).text('Learner Information', 225, 100, { underline: true });
        doc.moveDown();

        const drawField = (label, value, x, y, width = 100) => {
            doc.fontSize(9).text(label, x, y, { width });
            doc.rect(x + width - 55, y - 2, 210, 12).stroke();
            doc.text(value || '', x + width - 50, y, { width: 200 });
        };

        let startY = doc.y;

        // Replace LRN with user.username
        drawField('LRN', student.user.username || 'N/A', 30, startY);
        drawField('Name', fullName || 'N/A', 305, startY);
        drawField('Strand', student.strand?.name || 'N/A', 30, startY + 20);
        drawField('Year Level', student.yearLevel || 'N/A', 305, startY + 20);
        drawField('Section', student.section?.name || 'N/A', 30, startY + 40);
        drawField('Address', student.address || 'N/A', 305, startY + 40);

        doc.fontSize(15).text('Scholastic Grades\n', 220, 285, { underline: true });

        const drawSemesterTable = (semesterTitle, semesterGrades) => {
            doc.moveDown();

            // Center the semester title
            const titleWidth = doc.widthOfString(semesterTitle);
            const xPosition = 225;
            doc.fontSize(10).text(semesterTitle, xPosition, doc.y, { underline: true });

            const tableTop = doc.y + 10;
            const tableWidth = 400;
            const columnWidth = tableWidth / 4;

            // Draw table headers with centered alignment
            doc.fontSize(9)
                .text('Subject', 30, tableTop, { width: columnWidth, align: 'center' })
                .text('Midterm', 30 + 2 * columnWidth, tableTop, { width: columnWidth, align: 'center' })
                .text('Finals', 30 + 3 * columnWidth, tableTop, { width: columnWidth, align: 'center' })
                .text('Final Rating', 30 + 4 * columnWidth, tableTop, { width: columnWidth, align: 'center' });

            let currentY = tableTop + 20;

            if (!semesterGrades || semesterGrades.length === 0) {
                doc.fontSize(10).text('No grades available.', { align: 'center' });
            } else {
                // Loop through subjects and draw rows
                semesterGrades.forEach((grade) => {
                    grade.subjects.forEach((subject) => {
                        doc.fontSize(9)
                            .text(subject.subject.name || 'N/A', 30, currentY, { width: columnWidth, align: 'center' })
                            .text(subject.midterm || 'N/A', 30 + 2 * columnWidth, currentY, { width: columnWidth, align: 'center' })
                            .text(subject.finals || 'N/A', 30 + 3 * columnWidth, currentY, { width: columnWidth, align: 'center' })
                            .text(subject.finalRating || 'N/A', 30 + 4 * columnWidth, currentY, { width: columnWidth, align: 'center' });
                        currentY += 20;
                    });
                });
            }
            doc.moveDown();
        };

        // Filter grades by semester
        const firstSemesterGrades = student.grades?.filter((grade) => grade.semester?.name === '1st Semester') || [];
        const secondSemesterGrades = student.grades?.filter((grade) => grade.semester?.name === '2nd Semester') || [];

        drawSemesterTable('Semester: 1st Semester', firstSemesterGrades);
        drawSemesterTable('Semester: 2nd Semester', secondSemesterGrades);

        doc.end();

        writeStream.on('finish', () => {
            console.log(`Form 137 saved to: ${filePath}`);
        });

        writeStream.on('error', (err) => {
            console.error('Error writing PDF to file:', err);
            res.status(500).send('Error generating the PDF.');
        });

    } catch (error) {
        if (!res.headersSent) {
            next(error);
        } else {
            console.error('Error occurred during PDF generation:', error);
        }
    }

});

const getTeacherSections = asyncHandler(async (req, res) => {
    try {
        const [sections, teacherData] = await Promise.all([
            Section.find({ teacher: req.user._id })
                .populate({
                    path: 'students',
                    model: 'User',
                    select: 'username yearLevel strand sections' // Only select fields we need
                })
                .populate('yearLevel')
                .populate('strand')
                .lean(),
            
            User.findById(req.user._id)
                .populate('advisorySection')
                .lean()
        ]);

        // Format the sections data
        const formattedSections = sections.map(section => ({
            ...section,
            students: section.students.map(student => {
                return {
                    _id: student._id,
                    username: student.username,
                    // Use the student's own yearLevel, not the section's
                    yearLevel: student.yearLevel || 'Not Set',
                    // Use the section's strand instead of student's "Not Set" value
                    strand: section.strand?.name || 'Not Set',
                    sectionName: section.name,
                    isAdvisory: teacherData.advisorySection?._id.toString() === section._id.toString()
                };
            })
        }));

        console.log('Formatted sections:', JSON.stringify(formattedSections, null, 2)); // Debug log

        res.json(formattedSections);
    } catch (error) {
        console.error('Error fetching teacher sections:', error);
        res.status(500).json({ 
            message: 'Error fetching sections',
            error: error.message 
        });
    }
});

const getStudentData = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    
    try {
        
        const student = await Student.findOne({ user: studentId })
            .populate('user')
            .populate('yearLevel')
            .populate('section')
            .populate('strand')
            .lean();

        // Also get the user data to get yearLevel
        const user = await User.findById(studentId)
            .populate('yearLevel')
            .populate('sections')
            .populate('strand');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
          // Combine User and Student profile data
    const studentData = {
        ...student,
        ...student.studentProfile,
        username: student.username
    };

    res.json(studentData);

        // Format the date to YYYY-MM-DD for the input field
        const formattedBirthdate = student.birthdate ? 
            new Date(student.birthdate).toISOString().split('T')[0] : '';

            res.status(200).json({
                success: true,
                student: {
                    firstName: student.firstName,
                    lastName: student.lastName,
                    middleInitial: student.middleInitial,
                    gender: student.gender || '',  // Ensure gender is included
                    birthdate: formattedBirthdate,  // Format the date
                    birthplace: {
                        province: student.birthplace?.province || '',
                        municipality: student.birthplace?.municipality || '',
                        barrio: student.birthplace?.barrio || ''
                    },
                    address: student.address,
                    guardian: {
                        name: student.guardian?.name || '',
                        occupation: student.guardian?.occupation || ''
                    },
                    school: {
                        name: student.school?.name || '',
                        year: student.school?.year || ''
                    },
                    attendance: {
                        totalYears: student.attendance?.totalYears || ''
                    },
                    contactNumber: student.contactNumber,
                    // Academic info
                    yearLevel: user?.yearLevel?.name || '',
                    section: user?.sections?.[0]?.name || '',
                    strand: user?.strand?.name || ''
                }
            });
        } catch (error) {
            console.error('Error fetching student data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching student data',
                error: error.message
            });
        }
    });

// @desc    Get teacher's subjects
// @route   GET /api/teacher/subjects
// @access  Private (teacher only)
const getTeacherSubjects = asyncHandler(async (req, res) => {
    const { semesterId } = req.query; // Get semester from query params

    try {
        // Get teacher's subjects filtered by semester
        const teacherData = await User.findById(req.user._id)
            .populate({
                path: 'subjects',
                match: { semester: semesterId }, // Only get subjects for this semester
                select: 'name semester'
            })
            .select('subjects');

        if (!teacherData || !teacherData.subjects) {
            return res.json([]);
        }

        res.json(teacherData.subjects);
        
    } catch (error) {
        console.error('Error in getTeacherSubjects:', error);
        res.status(500);
        throw new Error('Error fetching subjects: ' + error.message);
    }
});

// @desc    Get students for a specific subject and semester
// @route   GET /api/teacher/subject-students
// @access  Private (teacher only)
const getSubjectStudents = asyncHandler(async (req, res) => {
    const { subjectId, semesterId } = req.query;

    if (!subjectId || !semesterId) {
        res.status(400);
        throw new Error('Subject ID and Semester ID are required');
    }

    try {
        // Get the teacher's advisory section
        const teacher = await User.findById(req.user._id)
            .populate('advisorySection')
            .lean();

        const advisorySectionId = teacher.advisorySection?._id;

        // Find the subject
        const subject = await Subject.findById(subjectId)
            .populate('strand')
            .populate('yearLevel');

        if (!subject) {
            res.status(404);
            throw new Error('Subject not found');
        }

        // Get students
        const students = await User.find({
            role: 'student',
            subjects: subjectId,
            semester: semesterId,
            strand: subject.strand._id,
            yearLevel: subject.yearLevel._id
        })
        .populate({
            path: 'sections',
            select: 'name _id'
        })
        .populate('strand')
        .populate('yearLevel')
        .select('username sections strand yearLevel');

        // Map students with advisory information
        const studentsWithAdvisory = students.map(student => ({
            _id: student._id,
            username: student.username,
            sections: student.sections,
            strand: student.strand,
            yearLevel: student.yearLevel,
            // Check if any of the student's sections match the teacher's advisory section
            isAdvisory: student.sections.some(section => 
                section._id.toString() === advisorySectionId?.toString()
            )
        }));

        console.log('Students with advisory:', studentsWithAdvisory); // Debug log
        res.json(studentsWithAdvisory);

    } catch (error) {
        console.error('Error:', error);
        res.status(500);
        throw new Error('Error fetching subject students: ' + error.message);
    }
});


// @desc    Get grades for students in a subject
// @route   GET /api/teacher/grades/:subjectId
// @access  Private (teacher only)
const getSubjectGrades = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { semesterId } = req.query;

    if (!subjectId || !semesterId) {
        res.status(400);
        throw new Error('Subject ID and Semester ID are required');
    }

    try {
        // Find all students who have grades for this subject and semester
        const students = await Student.find({
            'grades.semester': semesterId,
            'grades.subjects.subject': subjectId
        });

        // Format the grades data
        const gradesData = {};
        
        students.forEach(student => {
            // Find the semester grades
            const semesterGrades = student.grades.find(
                g => g.semester.toString() === semesterId
            );
            
            if (semesterGrades) {
                // Find the subject grades within the semester
                const subjectGrades = semesterGrades.subjects.find(
                    s => s.subject.toString() === subjectId
                );

                if (subjectGrades) {
                    gradesData[student.user] = {
                        [subjectId]: {
                            midterm: subjectGrades.midterm,
                            finals: subjectGrades.finals,
                            finalRating: subjectGrades.finalRating,
                            action: subjectGrades.action
                        }
                    };
                }
            }
        });

        res.json(gradesData);
        
    } catch (error) {
        console.error('Error in getSubjectGrades:', error);
        res.status(500);
        throw new Error('Error fetching grades: ' + error.message);
    }
});

const getTeacherAdvisoryClass = asyncHandler(async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user._id })
            .populate('advisoryClass')
            .lean();

        if (!teacher || !teacher.advisoryClass) {
            return res.status(404).json({
                success: false,
                message: 'No advisory class found for this teacher'
            });
        }

        res.status(200).json({
            success: true,
            advisoryClassId: teacher.advisoryClass._id,
            advisoryClassName: teacher.advisoryClass.name
        });
    } catch (error) {
        console.error('Error fetching teacher advisory class:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching advisory class information'
        });
    }
});

    

export { 
    getGradesByStudent, 
    addGrade, 
    updateGrade, 
    deleteGrade, 
    generateForm137, 

    fillOutStudentForm,
    importStudents,
    getTeacherSections,
    getStudentData,
    getTeacherSubjects,
    getSubjectStudents,
    getSubjectGrades,
    getTeacherAdvisoryClass
};