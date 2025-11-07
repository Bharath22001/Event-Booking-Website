const express = require("express");
const router = express.Router();

/**
 * @desc Display the attendee home page with all published events
 */
router.get("/home", (req, res, next) => {
    // Query to get site settings
    const siteQuery = "SELECT name, description FROM site_settings LIMIT 1";
    // Query to get all published events happening now or in the future
    const eventsQuery = `
        SELECT * FROM events 
        WHERE status = 'published' 
        AND date >= date('now') 
        ORDER BY date ASC
    `;

    // First get site settings
    global.db.get(siteQuery, [], (errSettings, siteSettings) => {
        if (errSettings) {
            console.error("Error fetching site settings:", errSettings);
            return next(errSettings); // Pass error to next middleware
        }

        // Then get events
        global.db.all(eventsQuery, [], (errEvents, events) => {
            if (errEvents) {
                console.error("Error fetching events:", errEvents);
                return next(errEvents); // Pass error to next middleware
            }

            // Render the attendee-home view with the site settings and events data
            res.render("attendee-home", {
                siteName: siteSettings?.name || "Event Booking Site", // Fallback name if siteSettings is undefined
                siteDescription: siteSettings?.description || "Welcome to our events!", // Fallback description
                events // Pass the events array to the view
            });
        });
    });
});

/**
 * @desc Display a specific event's details and booking form
 */
router.get("/event/:id", (req, res, next) => {
    const eventId = req.params.id; // Extract event ID from the request parameters
    const eventQuery = `
        SELECT e.*, 
               (e.full_price_tickets - COALESCE(SUM(b.full_price_quantity), 0)) as remaining_full_price,
               (e.concession_tickets - COALESCE(SUM(b.concession_quantity), 0)) as remaining_concession
        FROM events e
        LEFT JOIN bookings b ON e.id = b.event_id
        WHERE e.id = ? AND e.status = 'published'
        GROUP BY e.id
    `;

    // Execute the query to get event details along with available tickets
    global.db.get(eventQuery, [eventId], (err, event) => {
        if (err) {
            console.error("Error fetching event:", err);
            return next(err); // Pass error to next middleware
        }

        if (!event) {
            return res.status(404).send("Event not found"); // Return 404 if event not found
        }

        // Render the attendee-event view with the event data
        res.render("attendee-event", {
            event, // Pass the event object to the view
            success: req.query.success, // Pass success message if present
            error: req.query.error // Pass error message if present
        });
    });
});

/**
 * @desc Handle ticket booking submission
 */
router.post("/book/:id", (req, res, next) => {
    const eventId = req.params.id; // Extract event ID from the request parameters
    const { attendeeName, fullPriceQuantity, concessionQuantity } = req.body; // Extract booking details from request body

    // Validate input
    if (!attendeeName || (!fullPriceQuantity && !concessionQuantity)) {
        return res.redirect(`/attendee/event/${eventId}?error=Please provide your name and select at least one ticket`);
    }

    // Check ticket availability
    const checkQuery = `
        SELECT e.*,
               (e.full_price_tickets - COALESCE(SUM(b.full_price_quantity), 0)) as remaining_full_price,
               (e.concession_tickets - COALESCE(SUM(b.concession_quantity), 0)) as remaining_concession
        FROM events e
        LEFT JOIN bookings b ON e.id = b.event_id
        WHERE e.id = ?
        GROUP BY e.id
    `;

    // Execute the query to check ticket availability
    global.db.get(checkQuery, [eventId], (err, event) => {
        if (err) {
            return next(err); // Pass error to next middleware
        }

        if (!event) {
            return res.redirect(`/attendee/event/${eventId}?error=Event not found`); // Redirect if event not found
        }

        // Validate quantities
        if (fullPriceQuantity > event.remaining_full_price || 
            concessionQuantity > event.remaining_concession) {
            return res.redirect(`/attendee/event/${eventId}?error=Not enough tickets available`);
        }

        // Insert booking into the database
        const insertQuery = `
            INSERT INTO bookings (
                event_id, 
                attendee_name, 
                full_price_quantity, 
                concession_quantity,
                booking_date
            ) VALUES (?, ?, ?, ?, datetime('now'))
        `;

        // Execute the insert query
        global.db.run(insertQuery, [
            eventId,
            attendeeName,
            fullPriceQuantity || 0,
            concessionQuantity || 0
        ], (insertErr) => {
            if (insertErr) {
                return next(insertErr); // Pass error to next middleware
            }
            res.redirect(`/attendee/event/${eventId}?success=Booking successful!`); // Redirect with success message
        });
    });
});

module.exports = router;
