import mongoose from 'mongoose';
import validator from 'validator';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import {Skill} from './skillModel.js';
import {Request} from './requestModel.js';

const userSchema = new mongoose.Schema({
    username: {
        type : String,
        // unique : [true, 'This username is already taken! Try another one..'],
        unique: true,
        required :[true,'Please set a username']
    },
    name : {
        type : String,
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    bio: {
        type: String
    },
    displayPicture : {
        type : String,
        default : "/img/users/default-user.jpeg"
    },
    userSkills: {
        type: [String]
    },
    skillsToLearn: {
        type: [String],
        required: [false]
    },
    skillsToTeach: {
        type: [String],
        required: [false]
    },
    requestsReceived: {
        type : [{type: mongoose.Schema.Types.ObjectId, ref: "Request"}]
    },
    teachingConversations : {
        type : [{type: mongoose.Schema.Types.ObjectId, ref: "Chat"}]
    },
    learningConversations : {
        type : [{type: mongoose.Schema.Types.ObjectId, ref: "Chat"}]
    },
    teachingRating : {
        type : Number,
        default : 0
    },
    numberOfRatings : {
        type : Number,
        default : 0
    },
    reviews : {
        type : [{type: mongoose.Schema.Types.ObjectId, ref: "Review"}]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8
    },
    passwordConfirm: {
        type: String,
        minlength: 8
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
});

userSchema.pre('save', async function(next){
    if(!this.isModified('password'))    return next();

    this.password = await bcrypt.hash(this.password,12);

    this.passwordConfirm = undefined;
    next();
});

userSchema.pre(['updateOne', 'findByIdAndUpdate', 'findOneAndUpdate'], async function(next){
        const skillsToTeach = this._update.skillsToTeach;

        if (skillsToTeach){
            //Search Skill Objects and their object Id
            const skillPromises = skillsToTeach.map(async item => {
                
                let foundSkill = await Skill.findOne({ skill: item });
                
                if (!foundSkill) {
                    foundSkill = await Skill.create({ skill: item });
                }
    
                //Storing the user data reference in skill database
                const userId = this.getFilter('_id');
                foundSkill.usersWillingToTeach.push(userId);
                await foundSkill.save();
            });
        }

})

userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
  
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
  
    console.log({ resetToken }, this.passwordResetToken);
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  
      return JWTTimestamp < changedTimestamp;
    }
  
    // False means NOT changed
    return false;
};

export const User = mongoose.model('User', userSchema);
