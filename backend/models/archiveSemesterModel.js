import mongoose from 'mongoose';

// Define the ArchivedSemester schema
const archivedSemesterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // Name is required
    },
    strand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strand',
        required: true, // Strand reference is required
    },
    yearLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'YearLevel',
        required: true, // Year level reference is required
    },
    startDate: {
        type: Date,
        required: true, // Start date is required
    },
    endDate: {
        type: Date,
        required: true, // End date is required
    },
    archivedAt: {
        type: Date,
        default: Date.now, // Automatically set the archive timestamp
    },
}, { timestamps: true });

// Create the ArchivedSemester model
const ArchivedSemester = mongoose.model('ArchiveSemester', archivedSemesterSchema);

// Export the model
export default ArchivedSemester;