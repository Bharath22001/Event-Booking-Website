const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to login routes
router.get("/login", isNotAuthenticated, (req, res) => {
    res.render("organiser-login", { error: req.query.error });
});

router.post("/login", isNotAuthenticated, (req, res) => {
    const { username, password } = req.body;

    if (artistCredentials[username] && artistCredentials[username] === password) {
        req.session.artist = username;
        req.session.save(() => {
            res.redirect("/organiser/home");
        });
    } else {
        res.redirect("/organiser/login?error=Invalid credentials");
    }
});

// Add logout route
router.get("/logout", isAuthenticated, (req, res) => {
    req.session.destroy(() => {
        res.redirect("/organiser/login");
    });
});

/**
 * @desc Display the organiser login page with option to register new user accounts
 */
// Registration page - GET
router.get("/register", isNotAuthenticated, (req, res) => {
    res.render("organiser-register", { error: req.query.error });
});

// Registration handler - POST
router.post("/register", isNotAuthenticated, async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // Basic validation
    if (!username || !password || !confirmPassword) {
        return res.redirect("/organiser/register?error=All fields are required");
    }

    if (password !== confirmPassword) {
        return res.redirect("/organiser/register?error=Passwords do not match");
    }

    try {
        // Check if username already exists
        const checkUser = "SELECT username FROM organisers WHERE username = ?";
        global.db.get(checkUser, [username], async (err, user) => {
            if (err) {
                console.error("Database error:", err);
                return res.redirect("/organiser/register?error=Registration failed");
            }

            if (user) {
                return res.redirect("/organiser/register?error=Username already exists");
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertQuery = "INSERT INTO organisers (username, password) VALUES (?, ?)";
            global.db.run(insertQuery, [username, hashedPassword], (err) => {
                if (err) {
                    console.error("Error creating user:", err);
                    return res.redirect("/organiser/register?error=Registration failed");
                }
                
                // Redirect to login page on success
                res.redirect("/organiser/login");
            });
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.redirect("/organiser/register?error=Registration failed");
    }
});

// Protect all other organiser routes with authentication middleware
router.use(isAuthenticated);

/**
 * @desc Display the organiser home page with lists of draft and published events
 */
router.get("/home", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const artist = req.session.artist;
    
    // Query to get site settings
    const siteSettingsQuery = "SELECT name, description FROM site_settings WHERE artist = ?";
    
    // Queries for events
    const queryPublished = "SELECT * FROM events WHERE artist = ? AND status = 'published'";
    const queryDrafts = "SELECT * FROM events WHERE artist = ? AND status = 'draft'";

    // First get site settings
    global.db.get(siteSettingsQuery, [artist], (errSettings, siteSettings) => {
        if (errSettings) {
            console.error("Error fetching site settings:", errSettings);
            return next(errSettings);
        }

        // Then get published events
        global.db.all(queryPublished, [artist], (errPublished, publishedEvents) => {
            if (errPublished) {
                console.error("Error fetching published events:", errPublished);
                return next(errPublished);
            }

            // Finally get draft events
            global.db.all(queryDrafts, [artist], (errDrafts, draftEvents) => {
                if (errDrafts) {
                    console.error("Error fetching draft events:", errDrafts);
                    return next(errDrafts);
                }

                res.render("organiser-home", {
                    artistName: artist,
                    siteName: siteSettings?.name || artist + "'s Event Page",
                    siteDescription: siteSettings?.description || "Welcome to my event page!",
                    publishedEvents,
                    draftEvents,
                });
            });
        });
    });
});

/**
 * @desc Create a new draft event and redirect to its edit page
 */
router.get("/create-event", (req, res) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }
    res.render("create-event");
});

// Create Event - POST (your existing post route)
router.post("/create-event", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const { 
        name, 
        description, 
        eventDateTime,
        full_price_tickets,
        full_price,
        concession_tickets,
        concession_price
    } = req.body;
    const artist = req.session.artist;

    const query = `
        INSERT INTO events (
            name, 
            description, 
            date, 
            artist, 
            status,
            full_price_tickets,
            full_price,
            concession_tickets,
            concession_price
        ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
    `;

    global.db.run(query, [
        name, 
        description, 
        eventDateTime, 
        artist, 
        full_price_tickets,
        full_price,
        concession_tickets,
        concession_price
    ], function (err) {
        if (err) {
            console.error("Error creating new event:", err);
            return next(err);
        }
        res.redirect("/organiser/home");
    });
});

// Edit Event - POST
router.post("/edit-event/:id", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const eventId = req.params.id;
    const { 
        name, 
        description, 
        eventDateTime,
        full_price_tickets,
        full_price,
        concession_tickets,
        concession_price
    } = req.body;

    const query = `
        UPDATE events 
        SET name = ?, 
            description = ?, 
            date = ?, 
            full_price_tickets = ?,
            full_price = ?,
            concession_tickets = ?,
            concession_price = ?,
            last_modified = datetime('now')
        WHERE id = ? AND artist = ?
    `;

    global.db.run(query, [
        name, 
        description, 
        eventDateTime,
        full_price_tickets,
        full_price,
        concession_tickets,
        concession_price,
        eventId, 
        req.session.artist
    ], function (err) {
        if (err) {
            console.error("Error updating event:", err);
            return next(err);
        }
        res.redirect("/organiser/home");
    });
});

// Edit Event - GET
router.get("/edit-event/:id", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const eventId = req.params.id;
    const query = "SELECT * FROM events WHERE id = ? AND artist = ?";

    global.db.get(query, [eventId, req.session.artist], (err, event) => {
        if (err) {
            console.error("Error fetching event:", err);
            return next(err);
        }
        if (!event) {
            return res.status(404).send("Event not found");
        }
        res.render("edit-event", { event });
    });
});

// Edit Event - POST
router.post("/edit-event/:id", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const eventId = req.params.id;
    const { name, description, eventDateTime } = req.body;

    const query = 
        "UPDATE events SET name = ?, description = ?, date = ?, last_modified = datetime('now') " +
        "WHERE id = ? AND artist = ?";

    global.db.run(query, [name, description, eventDateTime, eventId, req.session.artist], function (err) {
        if (err) {
            console.error("Error updating event:", err);
            return next(err);
        }
        res.redirect("/organiser/home");
    });
});

// Delete Event - POST
router.post("/delete/:id", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const eventId = req.params.id;
    const query = "DELETE FROM events WHERE id = ? AND artist = ?";

    global.db.run(query, [eventId, req.session.artist], function (err) {
        if (err) {
            console.error("Error deleting event:", err);
            return next(err);
        }
        res.redirect("/organiser/home");
    });
});

/**
 * @desc Publish a draft event
 */
router.post("/publish/:id", (req, res, next) => {
    const query = "UPDATE events SET status = 'published' WHERE id = ?";
    const queryParams = [req.params.id];
    
    global.db.run(query, queryParams, function (err) {
        if (err) {
            console.error("Error publishing event:", err);
            next(err);
        } else {
            res.redirect("/organiser/home");
        }
    });
});

module.exports = router;

// Site Settings Page - GET
router.get("/site-settings", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const artist = req.session.artist;
    const query = "SELECT name, description FROM site_settings WHERE artist = ?";

    global.db.get(query, [artist], (err, settings) => {
        if (err) {
            console.error("Error fetching site settings:", err);
            return next(err);
        }

        // If no settings exist yet, provide defaults
        res.render("site-settings", {
            artistName: artist,
            siteName: settings?.name || artist + "'s Event Page",
            siteDescription: settings?.description || "Welcome to my event page!"
        });
    });
});

// Site Settings Page - POST
router.post("/site-settings", (req, res, next) => {
    if (!req.session.artist) {
        return res.redirect("/organiser/login");
    }

    const { siteName, siteDescription } = req.body;
    const artist = req.session.artist;

    if (!siteName || !siteDescription) {
        return res.status(400).send("All fields are required.");
    }

    const query = `
        INSERT INTO site_settings (artist, name, description) 
        VALUES (?, ?, ?) 
        ON CONFLICT(artist) 
        DO UPDATE SET name = ?, description = ?
    `;
    
    global.db.run(query, [artist, siteName, siteDescription, siteName, siteDescription], (err) => {
        if (err) {
            console.error("Error updating site settings:", err);
            return next(err);
        }

        res.redirect("/organiser/home");
    });
});

