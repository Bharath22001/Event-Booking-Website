/**
* index.js
* This is your main app entry point
*/

// Set up express, bodyparser and EJS
const express = require('express');
const app = express();
const port = 3000;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); // set location of static files

// Set up SQLite
const sqlite3 = require("sqlite3").verbose();
const fs = require('fs');

// Initialize database with schema
global.db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        try {
            // Read the schema file
            const schema = fs.readFileSync('./db_schema.sql', 'utf8');
            
            // Execute the schema
            global.db.exec(schema, (err) => {
                if (err) {
                    console.error("Error creating database schema:", err.message);
                } else {
                    console.log("Database schema initialized successfully");
                }
            });
        } catch (error) {
            console.error("Error reading schema file:", error);
        }
    }
});

// Handle requests to the home page 
app.get("/", (req, res) => {
    res.render("home");
});

// Enable session middleware
const session = require("express-session");
app.use(
    session({
        secret: "your_secret_key", // Replace with a secure key
        resave: false,
        saveUninitialized: true
    })
);

app.use(
    session({
        secret: process.env.SESSION_SECRET || "your_secret_key", // Should be in environment variable
        resave: false,
        saveUninitialized: false, // Changed to false for better security
        cookie: {
            httpOnly: true, // Prevents client-side access to the cookie
            secure: process.env.NODE_ENV === "production", // Enable in production
            maxAge: 1000 * 60 * 60 * 2 // 2 hour session
        }
    })
);

// Add all the route handlers
const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);
const organiserRoutes = require("./routes/organiser");
app.use("/organiser", organiserRoutes);
const attendeeRoutes = require("./routes/attendee");
app.use("/attendee", attendeeRoutes);

// Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});