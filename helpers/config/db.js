const mongoose = require('mongoose');
const User = require('../models/User'); // <-- Added User model import

// Prepare for Mongoose v7 strictQuery default change
mongoose.set('strictQuery', false);

// --- Function to create admin user on startup ---
const ensureAdminExists = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn('Warning: ADMIN_EMAIL or ADMIN_PASSWORD not set in .env. Skipping admin creation.');
      return;
    }

    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      const newUser = new User({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      await newUser.save();
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
  }
};

// --- Function to create clerk user on startup ---
const ensureClerkExists = async () => {
  try {
    const clerkEmail = process.env.CLERK_EMAIL;
    const clerkPassword = process.env.CLERK_PASSWORD;

    if (!clerkEmail || !clerkPassword) {
      console.warn('Warning: CLERK_EMAIL or CLERK_PASSWORD not set in .env. Skipping clerk creation.');
      return;
    }

    const clerkUser = await User.findOne({ email: clerkEmail });

    if (!clerkUser) {
      const newClerk = new User({
        name: 'Clerk',
        email: clerkEmail,
        password: clerkPassword,
        role: 'clerk'
      });
      await newClerk.save();
      console.log('Clerk user created successfully.');
    } else {
      console.log('Clerk user already exists.');
    }
  } catch (error) {
    console.error('Error ensuring clerk user exists:', error);
  }
};


const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    // If MONGO_URI is missing or doesn't look like a valid connection string, fall back to local MongoDB
    if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
      console.warn('\nWarning: Invalid or missing MONGO_URI. Falling back to local MongoDB at mongodb://127.0.0.1:27017/swift-handyman\n');
      uri = 'mongodb://127.0.0.1:27017/swift-handyman';
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // --- Ensure default users exist after connection ---
    await ensureAdminExists();
    await ensureClerkExists();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;