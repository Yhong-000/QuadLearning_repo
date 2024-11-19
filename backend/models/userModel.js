import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin', 'superadmin'],
        required: true,
    },
    sections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
      /*   required: function() {
            return this.role === 'student' || this.role === 'teacher';
        } */
    }],
    strand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strand',
    /*     required: function() {
            return this.role === 'student';
        } */
    },
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
   /*      required: function() {
            return this.role === 'student';
        } */
    }],
}, { timestamps: true });


// Password matching method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;